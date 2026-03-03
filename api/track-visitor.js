// /api/track-visitor.js — Visitor tracking (POST to track, GET for admin analytics)
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mupeqeuuwdmkndvtbhzb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cGVxZXV1d2Rta25kdnRiaHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzNzkwNDMsImV4cCI6MjA2OTU1MDQzfQ.aEixeQPtdXIxWUmCVXYba0G6x5Zs-2XRwt0gaA30ORk';
const ADMIN_EMAIL = 'larrywomack40@gmail.com';

function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
    return fwd ? fwd.split(',')[0].trim() : (req.headers['x-real-ip'] || 'unknown');
    }
    function parseUA(ua) {
      if (!ua) return { browser:'Unknown', os:'Unknown', device:'Desktop' };
        let b='Other', o='Other', d='Desktop';
          if (ua.includes('Chrome') && !ua.includes('Edg')) b='Chrome';
            else if (ua.includes('Firefox')) b='Firefox';
              else if (ua.includes('Safari') && !ua.includes('Chrome')) b='Safari';
                else if (ua.includes('Edg')) b='Edge';
                  if (ua.includes('Windows')) o='Windows';
                    else if (ua.includes('Mac OS')) o='macOS';
                      else if (ua.includes('Android')) o='Android';
                        else if (ua.includes('Linux')) o='Linux';
                          else if (ua.includes('iPhone') || ua.includes('iPad')) o='iOS';
                            if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) d='Mobile';
                              else if (ua.includes('iPad')) d='Tablet';
                                return { browser:b, os:o, device:d };
                                }

                                module.exports = async function handler(req, res) {
                                  res.setHeader('Access-Control-Allow-Origin', '*');
                                    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
                                      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                                        if (req.method === 'OPTIONS') return res.status(200).end();

                                          const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

                                            // GET = admin analytics
                                              if (req.method === 'GET') {
                                                  const authHeader = req.headers.authorization || '';
                                                      const token = authHeader.replace('Bearer ', '');
                                                          if (!token) return res.status(401).json({ error: 'Unauthorized' });
                                                              const { data: { user }, error: authErr } = await sb.auth.getUser(token);
                                                                  if (authErr || !user || user.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Admin only' });
                                                                      const limit = parseInt(req.query.limit) || 100;
                                                                          const { data: visitors, error, count } = await sb.from('visitor_sessions')
                                                                                .select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(limit);
                                                                                    if (error) return res.status(500).json({ error: error.message });
                                                                                        const cMap={}, rMap={}, bMap={}, dMap={};
                                                                                            (visitors||[]).forEach(v => {
                                                                                                  if (v.country) cMap[v.country]=(cMap[v.country]||0)+1;
                                                                                                        const ref = v.referrer ? (()=>{try{return new URL(v.referrer).hostname}catch(e){return v.referrer}})() : 'Direct';
                                                                                                              rMap[ref]=(rMap[ref]||0)+1;
                                                                                                                    if (v.browser) bMap[v.browser]=(bMap[v.browser]||0)+1;
                                                                                                                          if (v.device_type) dMap[v.device_type]=(dMap[v.device_type]||0)+1;
                                                                                                                              });
                                                                                                                                  return res.status(200).json({ total: count, visitors: visitors||[],
                                                                                                                                        summary: {
                                                                                                                                                topCountries: Object.entries(cMap).sort((a,b)=>b[1]-a[1]).slice(0,10),
                                                                                                                                                        topReferrers: Object.entries(rMap).sort((a,b)=>b[1]-a[1]).slice(0,10),
                                                                                                                                                                browsers: Object.entries(bMap).sort((a,b)=>b[1]-a[1]),
                                                                                                                                                                        devices: Object.entries(dMap).sort((a,b)=>b[1]-a[1])
                                                                                                                                                                              }
                                                                                                                                                                                  });
                                                                                                                                                                                    }

                                                                                                                                                                                      // POST = track visitor
                                                                                                                                                                                        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
                                                                                                                                                                                          try {
                                                                                                                                                                                              const body = req.body || {};
                                                                                                                                                                                                  const sessionId = body.session_id || 'unknown';
                                                                                                                                                                                                      const landingPage = body.landing_page || '/';
                                                                                                                                                                                                          const ip = getIP(req);
                                                                                                                                                                                                              const { browser, os, device } = parseUA(req.headers['user-agent']);
                                                                                                                                                                                                                  let country='', region='', city='', timezone='', isp='';
                                                                                                                                                                                                                      try {
                                                                                                                                                                                                                            const gr = await fetch(`https://ipapi.co/${ip}/json/`);
                                                                                                                                                                                                                                  if (gr.ok) { const g=await gr.json(); country=g.country_name||''; region=g.region||''; city=g.city||''; timezone=g.timezone||''; isp=g.org||''; }
                                                                                                                                                                                                                                      } catch(e) {}
                                                                                                                                                                                                                                          const { data: existing } = await sb.from('visitor_sessions').select('id,pages_viewed').eq('session_id', sessionId).maybeSingle();
                                                                                                                                                                                                                                              if (existing) {
                                                                                                                                                                                                                                                    const pages = existing.pages_viewed || [];
                                                                                                                                                                                                                                                          if (!pages.includes(landingPage)) pages.push(landingPage);
                                                                                                                                                                                                                                                                await sb.from('visitor_sessions').update({ pages_viewed: pages, updated_at: new Date().toISOString() }).eq('session_id', sessionId);
                                                                                                                                                                                                                                                                      return res.status(200).json({ status: 'updated', country, city });
                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                              const { error } = await sb.from('visitor_sessions').insert({
                                                                                                                                                                                                                                                                                    session_id: sessionId, ip_address: ip, country, region, city, timezone, isp,
                                                                                                                                                                                                                                                                                          device_type: device, browser, os,
                                                                                                                                                                                                                                                                                                referrer: body.referrer||'', landing_page: landingPage,
                                                                                                                                                                                                                                                                                                      utm_source: body.utm_source||'', utm_medium: body.utm_medium||'', utm_campaign: body.utm_campaign||'',
                                                                                                                                                                                                                                                                                                            pages_viewed: [landingPage]
                                                                                                                                                                                                                                                                                                                });
                                                                                                                                                                                                                                                                                                                    if (error) throw error;
                                                                                                                                                                                                                                                                                                                        return res.status(200).json({ status: 'created', country, city });
                                                                                                                                                                                                                                                                                                                          } catch(err) {
                                                                                                                                                                                                                                                                                                                              console.error('Track error:', err.message);
                                                                                                                                                                                                                                                                                                                                  return res.status(500).json({ error: err.message });
                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                    };