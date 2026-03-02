const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAIL = 'larrywomack40@gmail.com';

// Helper: fire-and-forget email via internal API
function sendEmail(siteUrl, payload) {
  return fetch(siteUrl + '/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(function(e) { console.error('sendEmail fire error:', e.message); });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, email, userAgent, isNewUser, referralCode } = req.body;
    if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const siteUrl = process.env.SITE_URL || ('https://' + (process.env.VERCEL_URL || 'www.draftmyforms.com'));

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
      sendEmail(siteUrl, {
        userId: userId,
        email: email,
        type: 'welcome',
        data: { userName: email.split('@')[0] }
      });

      // 3. Admin: new signup notification
      sendEmail(siteUrl, {
        userId: 'admin',
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
            .single();

          if (referrer && referrer.id !== userId) {
            // Insert referral record
            await supabase.from('referrals').insert({
              referrer_id: referrer.id,
              referee_id: userId,
              referee_email: email,
              referral_code: referralCode.toUpperCase().trim(),
              status: 'completed',
              converted_at: new Date().toISOString()
            }).onConflict ? null : null; // ignore if table uses upsert

            // Notify referrer
            sendEmail(siteUrl, {
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
