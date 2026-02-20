const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://mupeqeuuwdmkndvtbhzb.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

// Price ID to plan name mapping
const PRICE_TO_PLAN = {
    [process.env.STRIPE_PRO_PRICE_ID]: 'pro',
    [process.env.STRIPE_BUSINESS_PRICE_ID]: 'business',
};

// Disable body parsing so we can access the raw body for signature verification
export const config = {
    api: {
          bodyParser: false,
    },
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
    if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST');
          return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const rawBody = await getRawBody(req);

    let event;
    try {
          event = stripe.webhooks.constructEvent(
                  rawBody,
                  sig,
                  process.env.STRIPE_WEBHOOK_SECRET
                );
    } catch (err) {
          console.error('Webhook signature verification failed:', err.message);
          return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const userId = session.client_reference_id || session.metadata?.userId;
          const customerId = session.customer;

      if (!userId) {
              console.error('No userId found in session');
              return res.status(400).json({ error: 'No userId in session' });
      }

      // Get the subscription to find the price ID
      let planName = 'pro'; // default
      try {
              if (session.subscription) {
                        const subscription = await stripe.subscriptions.retrieve(session.subscription);
                        const priceId = subscription.items.data[0]?.price?.id;
                        if (priceId && PRICE_TO_PLAN[priceId]) {
                                    planName = PRICE_TO_PLAN[priceId];
                        }
              }
      } catch (err) {
              console.error('Error retrieving subscription:', err.message);
      }

      // Update the user's plan in Supabase profiles table
      const { error } = await supabase
            .from('profiles')
            .update({
                      plan: planName,
                      stripe_customer_id: customerId,
                      updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

      if (error) {
              console.error('Supabase update error:', error);
              return res.status(500).json({ error: 'Failed to update user plan' });
      }

      console.log(`Updated user ${userId} to plan: ${planName}`);
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
          const subscription = event.data.object;
          const customerId = subscription.customer;

      // Find user by stripe_customer_id and downgrade to free
      const { error } = await supabase
            .from('profiles')
            .update({
                      plan: 'free',
                      updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);

      if (error) {
              console.error('Supabase downgrade error:', error);
              return res.status(500).json({ error: 'Failed to downgrade user plan' });
      }

      console.log(`Downgraded customer ${customerId} to free plan`);
    }

    res.status(200).json({ received: true });
};
