// api/link-session.js
// Links a visitor_sessions row to a registered user by setting user_email.
// Isolated, additive endpoint - does not modify existing tracking logic.
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { return res.status(200).end(); }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) { return res.status(500).json({ error: 'Server not configured' }); }

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const sessionId = body && body.session_id;
    if (!sessionId) { return res.status(400).json({ error: 'Missing session_id' }); }

    // Verify the caller is a real authenticated user via their bearer token.
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData || !userData.user || !userData.user.email) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    const email = userData.user.email;

    // Only update an existing session row; never create one. Match by session_id.
    const { error: updErr } = await admin
      .from('visitor_sessions')
      .update({ user_email: email })
      .eq('session_id', sessionId);
    if (updErr) { return res.status(500).json({ error: 'Update failed' }); }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};
