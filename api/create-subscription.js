const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { plan, userId, email } = req.body;
    if (!plan || !userId || !email) return res.status(400).json({ error: 'Missing required fields' });

    const priceId = plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_BUSINESS_PRICE_ID;
    if (!priceId) return res.status(500).json({ error: 'Price ID not configured for plan: ' + plan });

    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id, plan, trial_used').eq('id', userId).single();
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_uid: userId } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

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
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);
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
