const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
