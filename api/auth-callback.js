const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { adminClient, getUser } = require('../lib/auth');
const { sendEmail, ADMIN_EMAIL } = require('../lib/email');

const supabase = adminClient();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Who signed in comes from their Supabase token, not from the request body.
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    const userId = user.id;
    const email = user.email;
    const { userAgent, referralCode, action } = req.body || {};

    // Settings -> Delete account. Lives here because the Hobby plan allows only 12 functions.
    if (action === 'delete_account') return deleteAccount(user, res);

    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

    // New = account made in the last day that has never logged a session before.
    const { count: priorSessions } = await supabase.from('user_sessions')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId);
    const isNewUser = !priorSessions && (Date.now() - new Date(user.created_at).getTime()) < 24 * 60 * 60 * 1000;

    // 1. Log session
    try {
      await supabase.from('user_sessions').insert({
        user_id: userId,
        email: email,
        ip_address: ip.split(',')[0].trim(),
        user_agent: (userAgent || '').substring(0, 500),
        logged_in_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        is_active: true
      });
    } catch (sessErr) {
      console.error('Session log error:', sessErr.message);
    }

    // ── NEW USER FLOW ──
    if (isNewUser) {

      // 2. Welcome email
      await sendEmail({
        userId: userId,
        email: email,
        type: 'welcome',
        data: { userName: email.split('@')[0] }
      });

      // 3. Admin: new signup notification
      await sendEmail({
        userId: null,
        email: ADMIN_EMAIL,
        type: 'new_signup_admin',
        data: { newUserEmail: email, referralCode: referralCode || 'none' }
      });

      // 4. Process referral if code provided
      if (referralCode && typeof referralCode === 'string' && referralCode.length > 2) {
        try {
          // Find referrer by code
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id, email, display_name')
            .eq('referral_code', referralCode.toUpperCase().trim())
            .maybeSingle();

          if (referrer && referrer.id !== userId) {
            // 'signed_up' until the new user's first paid renewal; webhook.js then rewards the referrer.
            const { error: refInsertErr } = await supabase.from('referrals').insert({
              referrer_id: referrer.id,
              referee_id: userId,
              referee_email: email,
              referral_code: referralCode.toUpperCase().trim(),
              status: 'signed_up'
            });
            if (refInsertErr) throw refInsertErr;

            // Notify referrer
            await sendEmail({
              userId: referrer.id,
              email: referrer.email,
              type: 'referral_converted',
              data: {
                userName: referrer.display_name || referrer.email.split('@')[0],
                refereeName: email.split('@')[0]
              }
            });

            console.log('Referral processed: ' + referralCode + ' -> ' + email);
          }
        } catch (refErr) {
          console.error('Referral processing error:', refErr.message);
        }
      }
    }

    // 5. Suspicious activity: multi-IP check
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('ip_address')
        .eq('user_id', userId)
        .gte('logged_in_at', oneDayAgo);

      if (sessions) {
        const uniqueIPs = [...new Set(sessions.map(s => s.ip_address))];
        if (uniqueIPs.length >= 4) {
          await supabase.from('activity_flags').insert({
            user_id: userId,
            email: email,
            flag_type: 'multi_ip',
            severity: 'medium',
            details: { unique_ips: uniqueIPs.length, ips: uniqueIPs.slice(0, 10) }
          });
        }
      }
    } catch (flagErr) {
      console.error('Flag check error:', flagErr.message);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Auth callback error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Stop billing first, then remove the user's data and login.
async function deleteAccount(user, res) {
  try {
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle();
    if (profile && profile.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'all', limit: 20 });
      for (const sub of subs.data) {
        if (!['canceled', 'incomplete_expired'].includes(sub.status)) await stripe.subscriptions.cancel(sub.id);
      }
    }
    for (const [table, col] of [['user_preferences', 'user_id'], ['saved_documents', 'user_id'], ['user_sessions', 'user_id'], ['profiles', 'id']]) {
      const { error } = await supabase.from(table).delete().eq(col, user.id);
      if (error) console.error('delete_account ' + table + ':', error.message);
    }
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error('delete_account auth user:', delErr.message);
      return res.status(500).json({ error: 'Subscription cancelled, but the login could not be removed' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('delete_account error:', err.message);
    return res.status(500).json({ error: 'Account deletion failed' });
  }
}
