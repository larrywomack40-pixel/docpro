const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
          const { userId, customerId } = req.body;

      // Accept either userId (to look up) or customerId (direct)
      let stripeCustomerId = customerId || null;
          let userEmail = null;

      if (userId) {
              // Look up profile from Supabase
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('stripe_customer_id, email')
                .eq('id', userId)
                .single();

            if (profileError || !profile) {
                      return res.status(404).json({ error: 'User not found' });
            }

            stripeCustomerId = profile.stripe_customer_id;
              userEmail = profile.email;
      }

      // If no stripe_customer_id in DB, try searching Stripe by email
      if (!stripeCustomerId && userEmail) {
              const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
              if (customers.data.length > 0) {
                        stripeCustomerId = customers.data[0].id;
                        // Save to Supabase for future lookups
                if (userId) {
                            await supabase
                              .from('profiles')
                              .update({ stripe_customer_id: stripeCustomerId })
                              .eq('id', userId);
                }
              }
      }

      if (!stripeCustomerId) {
              return res.status(400).json({ error: 'No Stripe subscription found for this account. If your plan was manually assigned, no subscription management is needed.' });
      }

      // Create a Stripe Customer Portal session
      const portalSession = await stripe.billingPortal.sessions.create({
              customer: stripeCustomerId,
              return_url: (req.headers.origin || 'https://www.draftmyforms.com') + '/dashboard.html',
      });

      res.status(200).json({ url: portalSession.url });
    } catch (err) {
          console.error('Portal session error:', err.message);
          res.status(500).json({ error: err.message });
    }
};
