// /api/track-visitor.js — Visitor tracking with IP geolocation
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mupeqeuuwdmkndvtbhzb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cGVxZXV1d2Rta25kdnRiaHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzNzkwNDMsImV4cCI6MjA2OTU1MDQzfQ.aEixeQPtdXIxWUmCVXYba0G6x5Zs-2XRwt0gaA30ORk';

function getClientIP(req) {
      const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) return forwarded.split(',')[0].trim();
          return req.headers['x-real-ip'] || req.connection?.remoteAddress || 'unknown';
}

function parseUserAgent(ua) {
      if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
        let browser = 'Other', os = 'Other', device = 'Desktop';
          // Browser detection
            if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
              else if (ua.includes('Firefox')) browser = 'Firefox';
                else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
                  else if (ua.includes('Edg')) browser = 'Edge';
                    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'IE';
                      // OS detection
                        if (ua.includes('Windows')) os = 'Windows';
                          else if (ua.includes('Mac OS X')) os = 'macOS';
                            else if (ua.includes('Linux')) os = 'Linux';
                              else if (ua.includes('Android')) os = 'Android';
                                else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                                  // Device detection
                                    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device = 'Mobile';
                                      else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'Tablet';
                                        return { browser, os, device };
}

module.exports = async function handler(req, res) {
      // CORS headers
        res.setHeader('Access-Control-Allow-Origin', 'https://www.draftmyforms.com');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

              if (req.method === 'OPTIONS') return res.status(200).end();
                if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

                  try {
                        const body = req.body || {};
                            const sessionId = body.session_id || 'unknown';
                                const landingPage = body.landing_page || '/';
                                    const referrer = body.referrer || '';
                                        const utmSource = body.utm_source || '';
                                            const utmMedium = body.utm_medium || '';
                                                const utmCampaign = body.utm_campaign || '';

                                                    const ip = getClientIP(req);
                                                        const ua = req.headers['user-agent'] || '';
                                                            const { browser, os, device } = parseUserAgent(ua);

                                                                // Geo-locate IP
                                                                    let country = '', region = '', city = '', timezone = '', isp = '';
                                                                        try {
                                                                                  const geoResp = await fetch(`https://ipapi.co/${ip}/json/`);
                                                                                        if (geoResp.ok) {
                                                                                                    const geo = await geoResp.json();
                                                                                                            country = geo.country_name || '';
                                                                                                                    region = geo.region || '';
                                                                                                                            city = geo.city || '';
                                                                                                                                    timezone = geo.timezone || '';
                                                                                                                                            isp = geo.org || '';
                                                                                        }
                                                                        } catch (e) {
                                                                                  // Geo lookup failed, continue without it
                                                                        }

                                                                            const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

                                                                                // Check if session already exists (update) or create new record
                                                                                    const { data: existing } = await sb
                                                                                          .from('visitor_sessions')
                                                                                                .select('id, pages_viewed')
                                                                                                      .eq('session_id', sessionId)
                                                                                                            .maybeSingle();

                                                                                                                if (existing) {
                                                                                                                          // Update existing session
                                                                                                                                const pages = existing.pages_viewed || [];
                                                                                                                                      if (!pages.includes(landingPage)) pages.push(landingPage);
                                                                                                                                            await sb
                                                                                                                                                    .from('visitor_sessions')
                                                                                                                                                            .update({ pages_viewed: pages, updated_at: new Date().toISOString() })
                                                                                                                                                                    .eq('session_id', sessionId);
                                                                                                                                                                          return res.status(200).json({ status: 'updated', country, city });
                                                                                                                } else {
                                                                                                                          // Insert new session
                                                                                                                                const { error } = await sb.from('visitor_sessions').insert({
                                                                                                                                            session_id: sessionId,
                                                                                                                                                    ip_address: ip,
                                                                                                                                                            country, region, city, timezone, isp,
                                                                                                                                                                    device_type: device,
                                                                                                                                                                            browser, os, referrer,
                                                                                                                                                                                    landing_page: landingPage,
                                                                                                                                                                                            utm_source: utmSource,
                                                                                                                                                                                                    utm_medium: utmMedium,
                                                                                                                                                                                                            utm_campaign: utmCampaign,
                                                                                                                                                                                                                    pages_viewed: [landingPage],
                                                                                                                                });
                                                                                                                                      if (error) throw error;
                                                                                                                                            return res.status(200).json({ status: 'created', country, city });
                                                                                                                }
                  } catch (err) {
                        console.error('Track visitor error:', err.message);
                            return res.status(500).json({ error: err.message });
                  }
};
                  }
                                                                                                                                })
                                                                                                                }
                                                                                                                }
                                                                        }
                                                                                        }
                                                                        }
                  }
}
}
}