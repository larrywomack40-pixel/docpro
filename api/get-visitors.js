// /api/get-visitors.js — Admin endpoint to retrieve visitor analytics
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mupeqeuuwdmkndvtbhzb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cGVxZXV1d2Rta25kdnRiaHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzNzkwNDMsImV4cCI6MjA2OTU1MDQzfQ.aEixeQPtdXIxWUmCVXYba0G6x5Zs-2XRwt0gaA30ORk';
const ADMIN_EMAIL = 'larrywomack40@gmail.com';

module.exports = async function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', 'https://www.draftmyforms.com');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') return res.status(200).end();
              if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

                // Verify admin session via Bearer token
                  const authHeader = req.headers.authorization || '';
                    const token = authHeader.replace('Bearer ', '');
                      if (!token) return res.status(401).json({ error: 'Unauthorized' });

                        try {
                                const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

                                    // Verify the token belongs to admin
                                        const { data: { user }, error: authErr } = await sb.auth.getUser(token);
                                            if (authErr || !user || user.email !== ADMIN_EMAIL) {
                                                      return res.status(403).json({ error: 'Admin access required' });
                                            }

                                                const limit = parseInt(req.query.limit) || 100;
                                                    const offset = parseInt(req.query.offset) || 0;

                                                        const { data: visitors, error, count } = await sb
                                                              .from('visitor_sessions')
                                                                    .select('*', { count: 'exact' })
                                                                          .order('created_at', { ascending: false })
                                                                                .range(offset, offset + limit - 1);

                                                                                    if (error) throw error;

                                                                                        // Build summary stats
                                                                                            const countryMap = {}, referrerMap = {}, browserMap = {}, deviceMap = {};
                                                                                                (visitors || []).forEach(v => {
                                                                                                          if (v.country) countryMap[v.country] = (countryMap[v.country] || 0) + 1;
                                                                                                                const ref = v.referrer ? new URL(v.referrer).hostname : 'Direct';
                                                                                                                      referrerMap[ref] = (referrerMap[ref] || 0) + 1;
                                                                                                                            if (v.browser) browserMap[v.browser] = (browserMap[v.browser] || 0) + 1;
                                                                                                                                  if (v.device_type) deviceMap[v.device_type] = (deviceMap[v.device_type] || 0) + 1;
                                                                                                });

                                                                                                    const topCountries = Object.entries(countryMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
                                                                                                        const topReferrers = Object.entries(referrerMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
                                                                                                            const browsers = Object.entries(browserMap).sort((a,b)=>b[1]-a[1]);
                                                                                                                const devices = Object.entries(deviceMap).sort((a,b)=>b[1]-a[1]);

                                                                                                                    return res.status(200).json({
                                                                                                                              total: count,
                                                                                                                                    visitors: visitors || [],
                                                                                                                                          summary: { topCountries, topReferrers, browsers, devices }
                                                                                                                    });
                        } catch (err) {
                                console.error('Get visitors error:', err.message);
                                    return res.status(500).json({ error: err.message });
                        }
};
                        }
                                                                                                                    })
                                                                                                })
                                            }
                        }
}