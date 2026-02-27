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
          const { userId, email, userAgent, isNewUser } = req.body;
          if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' });

      const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

      // 1. Log session to user_sessions table
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
      } catch (sessErr) { console.error('Session log error:', sessErr.message); }

      // 2. Welcome email for new users (check email_log to avoid duplicates)
      if (isNewUser && process.env.VERCEL_URL) {
              try {
                        const emailUrl = 'https://' + process.env.VERCEL_URL + '/api/send-email';
                        fetch(emailUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                                  userId: userId,
                                                  email: email,
                                                  type: 'welcome',
                                                  data: { userName: email.split('@')[0] }
                                    })
                        }).catch(() => {});
              } catch (e) { /* non-blocking */ }
      }

      // 3. Suspicious activity detection: multi-IP check
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
      } catch (flagErr) { console.error('Flag check error:', flagErr.message); }

      return res.status(200).json({ success: true });
    } catch (err) {
          console.error('Auth callback error:', err.message);
          return res.status(500).json({ error: err.message });
    }
};
