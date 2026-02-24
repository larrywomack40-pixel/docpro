const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
  [process.env.STRIPE_BUSINESS_PRICE_ID]: 'business',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, sessionId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // If sessionId provided, verify the specific checkout session
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid' || session.status === 'complete') {
        const subscriptionId = session.subscription;
        let planName = session.metadata?.plan || 'pro';
        let customerId = session.customer;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          if (priceId && PRICE_TO_PLAN[priceId]) planName = PRICE_TO_PLAN[priceId];
        }

        // Update Supabase
        await supabase.from('profiles').update({
          plan: planName, stripe_customer_id: customerId, updated_at: new Date().toISOString()
        }).eq('id', userId);

        return res.status(200).json({ plan: planName, status: 'active' });
      }
    }

    // Otherwise check by looking up the user's Stripe customer
    const { data: profile } = await supabase.from('profiles')
      .select('stripe_customer_id, plan').eq('id', userId).single();

    if (profile?.stripe_customer_id) {
      // Check active subscriptions for this customer
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id, status: 'active', limit: 1
      });
      const trialSubs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id, status: 'trialing', limit: 1
      });
      const allActive = [...subs.data, ...trialSubs.data];

      if (allActive.length > 0) {
        const sub = allActive[0];
        const priceId = sub.items.data[0]?.price?.id;
        const planName = (priceId && PRICE_TO_PLAN[priceId]) ? PRICE_TO_PLAN[priceId] : profile.plan;
        const status = sub.status; // 'active' or 'trialing'
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

        // Sync plan to Supabase if different
        if (planName !== profile.plan) {
          await supabase.from('profiles').update({
            plan: planName, updated_at: new Date().toISOString()
          }).eq('id', userId);
        }

        return res.status(200).json({ plan: planName, status, trialEnd });
      } else {
        // No active subscription - downgrade to free
        if (profile.plan !== 'free') {
          await supabase.from('profiles').update({
            plan: 'free', updated_at: new Date().toISOString()
          }).eq('id', userId);
        }
        return res.status(200).json({ plan: 'free', status: 'none' });
      }
    }

    return res.status(200).json({ plan: profile?.plan || 'free', status: 'none' });
  } catch (err) {
    console.error('Verify session error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
