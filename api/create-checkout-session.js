const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map plan names to Stripe Price IDs (set these in Vercel environment variables)
const PLAN_PRICES = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  business: process.env.STRIPE_BUSINESS_PRICE_ID,
};

// Trial periods: Pro = 3 days, Business = no trial (Issue 18)
const TRIAL_DAYS = {
  pro: 3,
  business: 0,
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, userId, userEmail } = req.body;

    if (!plan || !userId) {
      return res.status(400).json({ error: 'Missing plan or userId' });
    }

    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan: ' + plan });
    }

    let trialDays = 0; // Will be set based on trial_eligible

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, trial_eligible')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Check trial eligibility: only grant trial if user is eligible (fewer than 3 active days)
    const isTrialEligible = profile?.trial_eligible !== false; // Default to true if column not set
    if (plan === 'pro' && isTrialEligible) {
        trialDays = TRIAL_DAYS[plan] || 3;
    }
    console.log('[Checkout] Plan:', plan, '| Trial eligible:', isTrialEligible, '| Trial days:', trialDays);

    // If user already has a customer ID, check if they have an active subscription
    if (customerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        });
        if (subscriptions.data.length > 0) {
          // User already has an active subscription - redirect to portal instead
          return res.status(409).json({
            error: 'Active subscription exists',
            message: 'You already have an active subscription. Use Manage Subscription to change plans.',
            hasActiveSubscription: true,
          });
        }

        // Also check for trialing subscriptions
        const trialingSubs = await stripe.subscriptions.list({
          customer: customerId,
          status: 'trialing',
          limit: 1,
        });
        if (trialingSubs.data.length > 0) {
          return res.status(409).json({
            error: 'Active trial exists',
            message: 'You already have an active trial. Use Manage Subscription to change plans.',
            hasActiveSubscription: true,
          });
        }
      } catch (e) {
        // Customer might not exist in Stripe anymore, create new
        customerId = null;
      }
    }

    // Create or reuse Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Save the Stripe customer ID to Supabase
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Build checkout session config
    const sessionConfig = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'https://www.draftmyforms.com/dashboard.html?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.draftmyforms.com/dashboard.html?payment=cancelled',
      client_reference_id: userId,
      metadata: {
        userId: userId,
        plan: plan,
      },
    };

    // Add trial period for Pro plan only (Issue 18)
    if (trialDays > 0) {
      sessionConfig.subscription_data = {
        trial_period_days: trialDays,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
};
