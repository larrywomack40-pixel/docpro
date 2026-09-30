const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { adminClient } = require('../lib/auth');
const { sendEmail } = require('../lib/email');

const supabase = adminClient();

// Price ID to plan name mapping
const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
  [process.env.STRIPE_BUSINESS_PRICE_ID]: 'business',
};

// Plan for a subscription, or null when it doesn't grant one (unknown price, unpaid, cancelled...).
function planForSubscription(sub) {
  if (!sub || !['active', 'trialing'].includes(sub.status)) return null;
  const priceId = sub.items && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.id;
  return (priceId && PRICE_TO_PLAN[priceId]) || null;
}

// True when the customer still has another subscription that grants a plan.
async function hasOtherActiveSub(customerId, exceptId) {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  return subs.data.some(s => s.id !== exceptId && planForSubscription(s));
}

// Referral rewards need the subscription id. Saved separately so a missing
// stripe_subscription_id column (see supabase/security-fixes.sql) can't block plan updates.
async function saveSubscriptionId(match, subscriptionId) {
  if (!subscriptionId) return;
  const [col, val] = Object.entries(match)[0];
  const { error } = await supabase.from('profiles').update({ stripe_subscription_id: subscriptionId }).eq(col, val);
  if (error) console.error('Saving stripe_subscription_id failed:', error.message);
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let rawBody;
  if (req.body && Buffer.isBuffer(req.body)) {
    rawBody = req.body;
  } else if (typeof req.body === 'string') {
    rawBody = Buffer.from(req.body);
  } else {
    rawBody = await getRawBody(req);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook sig failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id || session.metadata?.userId || session.metadata?.supabase_uid;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    // Returning an error here makes Stripe retry for days, so only log unmatched sessions.
    if (!userId) {
      console.error('checkout.session.completed without a user id:', session.id);
      return res.status(200).json({ received: true, ignored: 'no user id' });
    }

    let planName = null;
    try {
      if (subscriptionId) planName = planForSubscription(await stripe.subscriptions.retrieve(subscriptionId));
    } catch (err) { console.error('Sub retrieve error:', err.message); }
    if (!planName) {
      console.error('checkout.session.completed with no plan-granting subscription:', session.id);
      return res.status(200).json({ received: true, ignored: 'no active subscription' });
    }

    const { error } = await supabase.from('profiles').update({
      plan: planName, stripe_customer_id: customerId, updated_at: new Date().toISOString()
    }).eq('id', userId);
    if (error) return res.status(500).json({ error: 'Failed to update plan' });
    await saveSubscriptionId({ id: userId }, subscriptionId);
    console.log('Updated ' + userId + ' to ' + planName);

    const customerEmail = session.customer_details && session.customer_details.email || session.customer_email || null;
    if (customerEmail) {
      const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : '9.99';
      await sendEmail({ userId, email: customerEmail, type: 'payment_receipt', data: { planName, amount } });
    }
  }

  // Subscription created, upgraded, downgraded, past due, unpaid...: keep the profile's plan in step.
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    try {
      const plan = planForSubscription(sub);
      if (plan) {
        await supabase.from('profiles').update({ plan, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', sub.customer);
        await saveSubscriptionId({ stripe_customer_id: sub.customer }, sub.id);
      } else if (['canceled', 'unpaid', 'incomplete_expired', 'past_due'].includes(sub.status) && !(await hasOtherActiveSub(sub.customer, sub.id))) {
        await supabase.from('profiles').update({ plan: 'free', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', sub.customer);
      }
    } catch (err) { console.error(event.type + ' error:', err.message); }
  }

  if (event.type === 'invoice.paid') {
    const inv = event.data.object;
    if (inv.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(inv.subscription);
        const plan = planForSubscription(sub);
        if (plan) {
          await supabase.from('profiles').update({ plan, updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', inv.customer);
          await saveSubscriptionId({ stripe_customer_id: inv.customer }, sub.id);
        }
      } catch (err) { console.error('invoice.paid error:', err.message); }
    }
  }

  
  // ─────────────────────────────────────────────────────────────────
  // REFERRAL REWARD: When a referred user makes their first post-trial
  // subscription payment, credit the referring user one free month
  // ─────────────────────────────────────────────────────────────────
  if (event.type === 'invoice.paid') {
    try {
      const inv = event.data.object;
      if (inv.subscription && inv.billing_reason === 'subscription_cycle') {
        const { data: refProfile } = await supabase.from('profiles').select('id, plan').eq('stripe_customer_id', inv.customer).single();
        if (refProfile && ['pro','business'].includes(refProfile.plan)) {
          const { data: refRecord } = await supabase.from('referrals').select('id, referrer_id, status').eq('referee_id', refProfile.id).eq('status', 'signed_up').single();
          if (refRecord) {
            const { data: alreadyDone } = await supabase.from('referral_rewards').select('id').eq('referred_user_id', refProfile.id).eq('status', 'credited').maybeSingle();
            if (!alreadyDone) {
              const { data: referrerP } = await supabase.from('profiles').select('stripe_customer_id, stripe_subscription_id, referral_months_earned').eq('id', refRecord.referrer_id).single();
              if (referrerP && referrerP.stripe_subscription_id) {
                const sub = await stripe.subscriptions.retrieve(referrerP.stripe_subscription_id);
                const amt = sub.items.data[0]?.price?.unit_amount || 999;
                await stripe.customers.createBalanceTransaction(referrerP.stripe_customer_id, { amount: -amt, currency: 'usd', description: 'DraftMyForms referral reward - 1 free month' });
                await supabase.from('referral_rewards').insert({ referring_user_id: refRecord.referrer_id, referred_user_id: refProfile.id, referral_id: refRecord.id, stripe_invoice_id: inv.id, credit_amount_cents: amt, status: 'credited', reward_applied_at: new Date().toISOString() });
                await supabase.from('referrals').update({ status: 'converted', converted_at: new Date().toISOString() }).eq('id', refRecord.id);
                await supabase.from('profiles').update({ referral_months_earned: (referrerP.referral_months_earned || 0) + 1, referral_last_reward_at: new Date().toISOString() }).eq('id', refRecord.referrer_id);
                console.log('Referral reward credited to', refRecord.referrer_id, 'amount:', amt);
              }
            }
          }
        }
      }
    } catch(refErr) { console.error('Referral reward error (non-fatal):', refErr.message); }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const { data: profile } = await supabase.from('profiles').select('id, email')
      .eq('stripe_customer_id', sub.customer).maybeSingle();
    let stillSubscribed = false;
    try { stillSubscribed = await hasOtherActiveSub(sub.customer, sub.id); } catch (e) { console.error('Sub list error:', e.message); }
    if (!stillSubscribed) {
      const { error } = await supabase.from('profiles').update({
        plan: 'free',
        updated_at: new Date().toISOString()
      }).eq('stripe_customer_id', sub.customer);
      if (error) return res.status(500).json({ error: 'Failed to downgrade' });
      console.log('Downgraded customer ' + sub.customer);
      if (profile && profile.email) {
        await sendEmail({ userId: profile.id, email: profile.email, type: 'subscription_cancelled', data: {} });
      }
    }
  }

  if (event.type === 'customer.subscription.trial_will_end') {
    const trialSub = event.data.object;
    console.log('Trial ending for ' + trialSub.customer);
    const { data: trialProfile } = await supabase.from('profiles').select('id, email')
      .eq('stripe_customer_id', trialSub.customer).maybeSingle();
    if (trialProfile && trialProfile.email) {
      const daysLeft = trialSub.trial_end ? Math.ceil((trialSub.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) : 3;
      await sendEmail({ userId: trialProfile.id, email: trialProfile.email, type: 'trial_ending', data: { daysLeft } });
    }
  }

  if (event.type === 'invoice.payment_failed') {
    try {
      const inv = event.data.object;
      let failedEmail = inv.customer_email || null;
      if (!failedEmail && inv.customer) {
        try {
          const cust = await stripe.customers.retrieve(inv.customer);
          failedEmail = cust.email;
        } catch (e) { console.error('Customer lookup error:', e.message); }
      }
      if (failedEmail) {
        const { data: failedProfile } = await supabase.from('profiles').select('id')
          .eq('stripe_customer_id', inv.customer).maybeSingle();
        await sendEmail({ userId: failedProfile ? failedProfile.id : null, email: failedEmail, type: 'payment_failed', data: { attempt: inv.attempt_count || 1 } });
      }
    } catch (pfErr) { console.error('payment_failed handler error:', pfErr.message); }
  }

  res.status(200).json({ received: true });
};
