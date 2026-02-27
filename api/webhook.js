const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Price ID to plan name mapping
const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
  [process.env.STRIPE_BUSINESS_PRICE_ID]: 'business',
};

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
    const userId = session.client_reference_id || session.metadata?.userId;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    if (!userId) return res.status(400).json({ error: 'No userId in session' });

    let planName = session.metadata?.plan || 'pro';
    try {
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id;
        if (priceId && PRICE_TO_PLAN[priceId]) planName = PRICE_TO_PLAN[priceId];
      }
    } catch (err) { console.error('Sub retrieve error:', err.message); }

    const { error } = await supabase.from('profiles').update({
      plan: planName, stripe_customer_id: customerId, updated_at: new Date().toISOString()
    }).eq('id', userId);
    if (error) return res.status(500).json({ error: 'Failed to update plan' });
    console.log('Updated ' + userId + ' to ' + planName);

    // Fire-and-forget payment receipt email
    try {
      const customerEmail = session.customer_details && session.customer_details.email
        || session.customer_email || null;
      if (customerEmail && process.env.VERCEL_URL) {
        const emailUrl = 'https://' + process.env.VERCEL_URL + '/api/send-email';
        const amount = session.amount_total ? (session.amount_total / 100).toFixed(2) : '9.99';
        fetch(emailUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            email: customerEmail,
            type: 'payment_receipt',
            data: { planName: planName, amount: amount }
          })
        }).catch(() => {});
      }
    } catch (emailErr) { /* non-blocking */ }
  }

  if (event.type === 'invoice.paid') {
    const inv = event.data.object;
    if (inv.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(inv.subscription);
        const priceId = sub.items.data[0]?.price?.id;
        const plan = (priceId && PRICE_TO_PLAN[priceId]) ? PRICE_TO_PLAN[priceId] : 'pro';
        await supabase.from('profiles').update({ plan, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', inv.customer);
      } catch (err) { console.error('invoice.paid error:', err.message); }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const { error } = await supabase.from('profiles').update({
      plan: 'free', updated_at: new Date().toISOString()
    }).eq('stripe_customer_id', sub.customer);
    if (error) return res.status(500).json({ error: 'Failed to downgrade' });
    console.log('Downgraded customer ' + sub.customer);
  }

  if (event.type === 'customer.subscription.trial_will_end') {
    console.log('Trial ending for ' + event.data.object.customer);
  }

  res.status(200).json({ received: true });
};
