const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST');
          return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
          const { priceId, userId, userEmail } = req.body;

      if (!priceId || !userId) {
              return res.status(400).json({ error: 'Missing priceId or userId' });
      }

      const session = await stripe.checkout.sessions.create({
              mode: 'subscription',
              payment_method_types: ['card'],
              line_items: [
                {
                            price: priceId,
                            quantity: 1,
                },
                      ],
              success_url: `${req.headers.origin || 'https://draftmyforms.com'}/?payment=success`,
              cancel_url: `${req.headers.origin || 'https://draftmyforms.com'}/?payment=cancelled`,
              client_reference_id: userId,
              customer_email: userEmail || undefined,
              metadata: {
                        userId: userId,
              },
      });

      res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (err) {
          console.error('Stripe checkout error:', err.message);
          res.status(500).json({ error: err.message });
    }
};
