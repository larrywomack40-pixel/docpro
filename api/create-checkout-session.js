const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLAN_PRICES = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  business: process.env.STRIPE_BUSINESS_PRICE_ID,
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, userId, userEmail, priceId } = req.body;

    // Support both priceId directly or plan name
    const resolvedPriceId = priceId || PLAN_PRICES[plan];
    if (!resolvedPriceId) {
      return res.status(400).json({ error: 'Missing priceId or invalid plan: ' + plan });
    }
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, trial_eligible')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || '',
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabase.from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Check for existing active subscription
    const [activeSubs, trialSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 }),
      stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 1 }),
    ]);

    if (activeSubs.data.length > 0 || trialSubs.data.length > 0) {
      return res.status(409).json({
        error: 'Active subscription exists',
        message: 'You already have an active subscription.',
        hasActiveSubscription: true,
      });
    }

    // Trial logic for pro plan
    const isTrialEligible = profile?.trial_eligible !== false;
    const trialDays = (plan === 'pro' && isTrialEligible) ? 3 : 0;

    const subParams = {
      customer: customerId,
      items: [{ price: resolvedPriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId, plan: plan || 'custom' },
    };

    if (trialDays > 0) {
      subParams.trial_period_days = trialDays;
      subParams.trial_settings = { end_behavior: { missing_payment_method: 'cancel' } };
      subParams.expand = ['latest_invoice.payment_intent', 'pending_setup_intent'];
    }

    const subscription = await stripe.subscriptions.create(subParams);

    let clientSecret = null;
    let intentType = 'none';

    if (trialDays > 0 && subscription.pending_setup_intent) {
      const si = typeof subscription.pending_setup_intent === 'string'
        ? await stripe.setupIntents.retrieve(subscription.pending_setup_intent)
        : subscription.pending_setup_intent;
      clientSecret = si.client_secret;
      intentType = 'setup';
    } else if (subscription.latest_invoice?.payment_intent) {
      const pi = subscription.latest_invoice.payment_intent;
      clientSecret = typeof pi === 'string'
        ? (await stripe.paymentIntents.retrieve(pi)).client_secret
        : pi.client_secret;
      intentType = 'payment';
    }

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret,
      intentType,
      customerId,
      plan: plan || 'custom',
      trialDays,
    });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
};
