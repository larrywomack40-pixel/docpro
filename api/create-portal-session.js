const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { adminClient, getUser } = require('../lib/auth');

const supabase = adminClient();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // The customer always comes from the signed-in user, never from the request body.
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in first.' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    let stripeCustomerId = profile && profile.stripe_customer_id;

    // Older accounts may not have the customer id saved yet; find it by the verified email.
    if (!stripeCustomerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;
        await supabase.from('profiles').update({ stripe_customer_id: stripeCustomerId }).eq('id', user.id);
      }
    }

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe subscription found for this account. If your plan was manually assigned, no subscription management is needed.' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: (process.env.SITE_URL || 'https://www.draftmyforms.com') + '/dashboard.html',
    });

    res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error('Portal session error:', err.message);
    res.status(500).json({ error: 'Could not open billing. Please try again.' });
  }
};
