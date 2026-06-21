const { createClient } = require('@supabase/supabase-js');

const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cGVxZXV1d2Rta25kdnRiaHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzkwNDMsImV4cCI6MjA4Njk1NTA0M30.aEixeQPtdXIxWUmCVXYba0G6x5Zs-2XRwt0gaA30ORk';
const SB_URL = 'https://mupeqeuuwdmkndvtbhzb.supabase.co';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') return res.status(200).end();

  // --- link_session: associate a visitor_sessions row with a registered user (additive, non-breaking) ---
  try {
    let __body = req.body;
    if (typeof __body === 'string') { try { __body = JSON.parse(__body); } catch (e) { __body = {}; } }
    const __action = (req.query && req.query.action) || (__body && __body.action);
    if (__action === 'link_session') {
      const __SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!__SVC) { return res.status(500).json({ error: 'Server not configured' }); }
      const __sid = __body && __body.session_id;
      if (!__sid) { return res.status(400).json({ error: 'Missing session_id' }); }
      const __authHeader = req.headers.authorization || '';
      const __token = __authHeader.replace('Bearer ', '');
      if (!__token) { return res.status(401).json({ error: 'Unauthorized' }); }
      const __admin = createClient(SB_URL, __SVC, { auth: { persistSession: false } });
      const { data: __ud, error: __ue } = await __admin.auth.getUser(__token);
      if (__ue || !__ud || !__ud.user || !__ud.user.email) { return res.status(401).json({ error: 'Invalid session' }); }
      const { error: __upe } = await __admin.from('visitor_sessions').update({ user_email: __ud.user.email }).eq('session_id', __sid);
      if (__upe) { return res.status(500).json({ error: 'Update failed' }); }
      return res.status(200).json({ ok: true });
    }
  } catch (e) { /* fall through to normal handling on any error */ }

          // GET: return visitor sessions for admin dashboard
            if (req.method === 'GET') {
                try {
                      const authHeader = req.headers.authorization || '';
                            const token = authHeader.replace('Bearer ', '');
                                  if (!token) return res.status(401).json({ error: 'Unauthorized' });
                                        const client = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY);
                                              const { data: { user }, error: uErr } = await client.auth.getUser(token);
                                                    if (uErr || !user || user.email !== 'larrywomack40@gmail.com') return res.status(403).json({ error: 'Forbidden' });
                                                          const { data: visitors } = await client.from('visitor_sessions').select('*').order('created_at', { ascending: false }).limit(200);
                                                                return res.status(200).json({ visitors: visitors || [] });
                                                                    } catch(e) { return res.status(500).json({ error: e.message }); }
                                                                      }

                                                                        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

                                                                          // ---- VISITOR TRACKING (type=visit in body) ----
                                                                            const body = req.body || {};
                                                                              if (body.type === 'visit') {
                                                                                  try {
                                                                                        const sid = body.session_id || 'unknown';
                                                                                              const page = body.landing_page || body.page || '/';
                                                                                                    const fwd = req.headers['x-forwarded-for'] || '';
                                                                                                          const ip = fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress || '';
                                                                                                                const ua = req.headers['user-agent'] || '';
                                                                                                                      let b = 'Other', os = 'Other', device = 'Desktop';
                                                                                                                            if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) b = 'Chrome';
                                                                                                                                  else if (/Firefox/i.test(ua)) b = 'Firefox';
                                                                                                                                        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) b = 'Safari';
                                                                                                                                              else if (/Edge/i.test(ua)) b = 'Edge';
                                                                                                                                                    if (/Windows/i.test(ua)) os = 'Windows';
                                                                                                                                                          else if (/Mac/i.test(ua)) os = 'macOS';
                                                                                                                                                                else if (/Linux/i.test(ua)) os = 'Linux';
                                                                                                                                                                      else if (/Android/i.test(ua)) { os = 'Android'; device = 'Mobile'; }
                                                                                                                                                                            else if (/iPhone|iPad/i.test(ua)) { os = 'iOS'; device = /iPad/i.test(ua) ? 'Tablet' : 'Mobile'; }
                                                                                                                                                                                  if (/Mobile/i.test(ua) && device === 'Desktop') device = 'Mobile';

                                                                                                                                                                                        let geo = {};
                                                                                                                                                                                              try {
                                                                                                                                                                                                      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
                                                                                                                                                                                                                const gResp = await fetch(`https://ipapi.co/${ip}/json/`);
                                                                                                                                                                                                                          if (gResp.ok) geo = await gResp.json();
                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                        } catch(ge) {}

                                                                                                                                                                                                                                              const client = createClient(SB_URL, ANON_KEY);
                                                                                                                                                                                                                                                    const { error: upsertErr } = await client.from('visitor_sessions').upsert({
                                                                                                                                                                                                                                                            session_id: sid,
                                                                                                                                                                                                                                                                    landing_page: page,
                                                                                                                                                                                                                                                                            ip_address: ip,
                                                                                                                                                                                                                                                                                    country: geo.country_name || '',
                                                                                                                                                                                                                                                                                            region: geo.region || '',
                                                                                                                                                                                                                                                                                                    city: geo.city || '',
                                                                                                                                                                                                                                                                                                            timezone: geo.timezone || '',
                                                                                                                                                                                                                                                                                                                    isp: geo.org || '',
                                                                                                                                                                                                                                                                                                                            device_type: device,
                                                                                                                                                                                                                                                                                                                                    browser: b,
                                                                                                                                                                                                                                                                                                                                            os: os,
                                                                                                                                                                                                                                                                                                                                                    referrer: body.referrer || '',
                                                                                                                                                                                                                                                                                                                                                            utm_source: body.utm_source || '',
                                                                                                                                                                                                                                                                                                                                                                    utm_medium: body.utm_medium || '',
                                                                                                                                                                                                                                                                                                                                                                            utm_campaign: body.utm_campaign || '',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        pages_viewed: [page],
updated_at: new Date().toISOString()
                                                                                                                                                                                                                                                                                                                                                                                          }, { onConflict: 'session_id', ignoreDuplicates: false });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                if (upsertErr) return res.status(200).json({ ok: false, error: upsertErr.message });
        // Append page to pages_viewed array for subsequent visits
                                                                                                                                                                                                                                                                                                                                                                                                try { await client.rpc('append_page_to_session', { p_session_id: sid, p_page: page }); } catch(re) {}
return res.status(200).json({ ok: true });
                                                                                                                                                                                                                                                                                                                                                                                                    } catch(e) { return res.status(200).json({ ok: false, error: e.message }); }
                                                                                                                                                                                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                                                                                                                                                                                        // ---- EMAIL LEAD CAPTURE (type=email-lead) ----
  if (body.type === 'email-lead') {
    try {
      var le = (body.email || '').toLowerCase().trim();
      if (!le || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(le)) return res.status(400).json({error:'Valid email required'});
      var lc = createClient(SB_URL, ANON_KEY);
      var dup = await lc.from('email_leads').select('id').eq('email',le).limit(1);
      if (dup.data && dup.data.length > 0) return res.status(200).json({success:true,message:'Already subscribed'});
      var ins = await lc.from('email_leads').insert({email:le,source:body.source||'homepage',created_at:new Date().toISOString()});
      if (ins.error) return res.status(500).json({success:false,error:ins.error.message});
      return res.status(200).json({success:true,message:'Subscribed successfully'});
    } catch(ex) { return res.status(500).json({success:false,error:ex.message}); }
  }

  // Original log-activity (userId-based activity logging)
                                                                                                                                                                                                                                                                                                                                                                                                          try {
                                                                                                                                                                                                                                                                                                                                                                                                              const { userId, action, metadata } = req.body;
                                                                                                                                                                                                                                                                                                                                                                                                                  if (!userId) return res.status(400).json({ error: 'userId required' });
                                                                                                                                                                                                                                                                                                                                                                                                                      const client = createClient(SB_URL, ANON_KEY);
                                                                                                                                                                                                                                                                                                                                                                                                                          const { error } = await client.from('activity_log').insert({ user_id: userId, action, metadata });
                                                                                                                                                                                                                                                                                                                                                                                                                              if (error) return res.status(500).json({ error: error.message });
                                                                                                                                                                                                                                                                                                                                                                                                                                  return res.status(200).json({ ok: true });
                                                                                                                                                                                                                                                                                                                                                                                                                                    } catch(e) {
                                                                                                                                                                                                                                                                                                                                                                                                                                        return res.status(500).json({ error: e.message });
                                                                                                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                                                                                                          };

// behavioral analytics ingest enabled
