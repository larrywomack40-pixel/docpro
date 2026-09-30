const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { adminClient, getUser } = require('../lib/auth');

const supabase = adminClient();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // GET: Return Stripe publishable key for frontend
  if (req.method === 'GET') {
    const pk = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!pk) return res.status(500).json({ error: 'Stripe publishable key not configured' });
    return res.status(200).json({ publishableKey: pk });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in first.' });
    const userId = user.id;
    const email = user.email;
    const { plan } = req.body || {};
    if (plan !== 'pro' && plan !== 'business') return res.status(400).json({ error: 'Unknown plan' });

    const priceId = plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_BUSINESS_PRICE_ID;
    if (!priceId) return res.status(500).json({ error: 'Price ID not configured for plan: ' + plan });

    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id, plan, trial_used').eq('id', userId).single();
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_uid: userId } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    // Don't pile up subscriptions: drop earlier ones that were never paid for.
    const existing = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    if (existing.data.some(s => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due')) {
      return res.status(409).json({ error: 'You already have a subscription. Use Manage Billing to change plans.' });
    }
    for (const old of existing.data.filter(s => s.status === 'incomplete')) {
      try { await stripe.subscriptions.cancel(old.id); } catch (e) { console.error('Cancel incomplete sub error:', e.message); }
    }

    // One trial per account, ever.
    const trialDays = (plan === 'pro' && !profile?.trial_used) ? 3 : 0;

    const subscriptionParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { supabase_uid: userId, plan }
    };

    if (trialDays > 0) {
      subscriptionParams.trial_period_days = trialDays;
      subscriptionParams.payment_settings.payment_method_types = ['card'];
      subscriptionParams.expand = ['pending_setup_intent'];
      // No card by the end of the trial means no subscription.
      subscriptionParams.trial_settings = { end_behavior: { missing_payment_method: 'cancel' } };
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);
    if (trialDays > 0) await supabase.from('profiles').update({ trial_used: true }).eq('id', userId);
    let clientSecret, intentType;

    if (trialDays > 0 && subscription.pending_setup_intent) {
      clientSecret = subscription.pending_setup_intent.client_secret;
      intentType = 'setup';
    } else if (subscription.latest_invoice?.payment_intent) {
      clientSecret = subscription.latest_invoice.payment_intent.client_secret;
      intentType = 'payment';
    } else {
      return res.status(500).json({ error: 'Could not retrieve payment intent' });
    }

    return res.status(200).json({ subscriptionId: subscription.id, clientSecret, intentType, plan, trialDays });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
};
