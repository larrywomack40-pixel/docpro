const { createClient } = require('@supabase/supabase-js');
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cGVxZXV1d2Rta25kdnRiaHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NDAxMzIsImV4cCI6MjA1NTQxNjEzMn0.C0VcGBJRYxGnPOfjJnJtJnAHc2HGx1vc6F1WN04_vqI';
const SB_URL = 'https://mupeqeuuwdmkndvtbhzb.supabase.co';

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
          const { email, source } = req.body || {};
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  return res.status(400).json({ error: 'Valid email required' });
          }

      const client = createClient(SB_URL, ANON_KEY);

      const { data: existing } = await client
            .from('email_leads')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .limit(1);

      if (existing && existing.length > 0) {
              return res.status(200).json({ success: true, message: 'Already subscribed' });
      }

      const { error } = await client
            .from('email_leads')
            .insert({
                      email: email.toLowerCase().trim(),
                      source: source || 'homepage',
                      created_at: new Date().toISOString()
            });

      if (error) {
              return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({ success: true, message: 'Subscribed successfully' });
    } catch (err) {
          return res.status(500).json({ success: false, error: err.message });
    }
};
