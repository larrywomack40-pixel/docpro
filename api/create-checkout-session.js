const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    res.setHeader('Allow', 'POST');
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

    const trialDays = TRIAL_DAYS[plan] || 0;

    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin || 'https://draftmyforms.com'}/dashboard.html?payment=success`,
      cancel_url: `${req.headers.origin || 'https://draftmyforms.com'}/?payment=cancelled`,
      client_reference_id: userId,
      customer_email: userEmail || undefined,
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
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
