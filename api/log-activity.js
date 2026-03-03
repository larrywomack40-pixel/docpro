const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // ---- VISITOR TRACKING (type=visit in body) ----
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cGVxZXV1d2Rta25kdnRiaHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzNzkwNDMsImV4cCI6MjA2OTU1MDQzfQ.aEixeQPtdXIxWUmCVXYba0G6x5Zs-2XRwt0gaA30ORk';
      const SB_URL = 'https://mupeqeuuwdmkndvtbhzb.supabase.co';
        if (req.method === 'POST' && req.body && req.body.type === 'visit') {
            try {
                  const body = req.body;
                        const sid = body.session_id || 'unknown';
                              const page = body.landing_page || '/';
                                    const fwd = req.headers['x-forwarded-for'];
                                          const ip = fwd ? fwd.split(',')[0].trim() : (req.headers['x-real-ip'] || 'unknown');
                                                const ua = req.headers['user-agent'] || '';
                                                      let b='Other',o='Other',d='Desktop';
                                                            if (ua.includes('Chrome')&&!ua.includes('Edg')) b='Chrome'; else if (ua.includes('Firefox')) b='Firefox'; else if (ua.includes('Safari')&&!ua.includes('Chrome')) b='Safari'; else if (ua.includes('Edg')) b='Edge';
                                                                  if (ua.includes('Windows')) o='Windows'; else if (ua.includes('Mac OS')) o='macOS'; else if (ua.includes('Android')) o='Android'; else if (ua.includes('Linux')) o='Linux'; else if (ua.includes('iPhone')||ua.includes('iPad')) o='iOS';
                                                                        if (ua.includes('Mobile')||ua.includes('Android')||ua.includes('iPhone')) d='Mobile'; else if (ua.includes('iPad')) d='Tablet';
                                                                              let country='',region='',city='',timezone='',isp='';
                                                                                    try { const gr=await fetch(`https://ipapi.co/${ip}/json/`); if(gr.ok){const g=await gr.json();country=g.country_name||'';region=g.region||'';city=g.city||'';timezone=g.timezone||'';isp=g.org||'';} } catch(e){}
                                                                                          const vSb = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY);
                                                                                                const {data:ex} = await vSb.from('visitor_sessions').select('id,pages_viewed').eq('session_id',sid).maybeSingle();
                                                                                                      if(ex){ const pages=ex.pages_viewed||[]; if(!pages.includes(page))pages.push(page); await vSb.from('visitor_sessions').update({pages_viewed:pages,updated_at:new Date().toISOString()}).eq('session_id',sid); return res.status(200).json({status:'updated',country,city}); }
                                                                                                            await vSb.from('visitor_sessions').insert({session_id:sid,ip_address:ip,country,region,city,timezone,isp,device_type:d,browser:b,os:o,referrer:body.referrer||'',landing_page:page,utm_source:body.utm_source||'',utm_medium:body.utm_medium||'',utm_campaign:body.utm_campaign||'',pages_viewed:[page]});
                                                                                                                  return res.status(200).json({status:'created',country,city});
                                                                                                                      } catch(e){ return res.status(200).json({status:'ok'}); }
                                                                                                                        }
                                                                                                                          if (req.method === 'GET' && req.query.type === 'visitors') {
                                                                                                                              try {
                                                                                                                                    const token=(req.headers.authorization||'').replace('Bearer ','');
                                                                                                                                          const vSb=createClient(SB_URL,process.env.SUPABASE_SERVICE_ROLE_KEY||ANON_KEY);
                                                                                                                                                const {data:{user},error:ae}=await vSb.auth.getUser(token);
                                                                                                                                                      if(ae||!user||user.email!=='larrywomack40@gmail.com') return res.status(403).json({error:'Admin only'});
                                                                                                                                                            const {data:visitors,count}=await vSb.from('visitor_sessions').select('*',{count:'exact'}).order('created_at',{ascending:false}).limit(parseInt(req.query.limit)||100);
                                                                                                                                                                  const cM={},rM={},bM={},dM={};
                                                                                                                                                                        (visitors||[]).forEach(v=>{if(v.country)cM[v.country]=(cM[v.country]||0)+1;const ref=v.referrer?(()=>{try{return new URL(v.referrer).hostname}catch(e){return v.referrer}})():'Direct';rM[ref]=(rM[ref]||0)+1;if(v.browser)bM[v.browser]=(bM[v.browser]||0)+1;if(v.device_type)dM[v.device_type]=(dM[v.device_type]||0)+1;});
                                                                                                                                                                              return res.status(200).json({total:count,visitors:visitors||[],summary:{topCountries:Object.entries(cM).sort((a,b)=>b[1]-a[1]).slice(0,10),topReferrers:Object.entries(rM).sort((a,b)=>b[1]-a[1]).slice(0,10),browsers:Object.entries(bM).sort((a,b)=>b[1]-a[1]),devices:Object.entries(dM).sort((a,b)=>b[1]-a[1])}});
                                                                                                                                                                                  } catch(e){ return res.status(500).json({error:e.message}); }
                                                                                                                                                                                    }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'No userId' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const today = new Date().toISOString().split('T')[0]; // "2026-02-26"

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('active_days_log, active_days_count, plan')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      return res.status(200).json({ ok: true, note: 'Profile not found' });
    }

    // Only track for free plan users
    if (profile.plan !== 'free') {
      return res.status(200).json({ ok: true, activeDays: profile.active_days_count || 0 });
    }

    const existingDays = profile.active_days_log || [];

    // Already logged today
    if (existingDays.includes(today)) {
      return res.status(200).json({
        ok: true,
        alreadyLogged: true,
        activeDays: existingDays.length,
        trialEligible: existingDays.length < 3
      });
    }

    // Log new active day
    const newDays = [...existingDays, today];
    const newCount = newDays.length;

    await supabaseAdmin.from('profiles').update({
      active_days_log: newDays,
      active_days_count: newCount,
      trial_eligible: newCount < 3
    }).eq('id', userId);

    return res.status(200).json({
      ok: true,
      activeDays: newCount,
      trialEligible: newCount < 3
    });

  } catch (err) {
    console.error('log-activity error:', err.message);
    return res.status(500).json({ error: 'Activity logging failed' });
  }
};
