const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAILS = ['larrywomack40@gmail.com'];

async function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !ADMIN_EMAILS.includes(user.email)) return null;
  return user;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const action = req.query.action || (req.body && req.body.action);

  try {
    // GET /api/admin-api?action=stats
    if (action === 'stats') {
      var today = new Date().toISOString().split('T')[0];
      var thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();
      var [docsToday, docsMonth, activeUsers, unresolvedFlags] = await Promise.all([
        supabase.from('document_history').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('document_history').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
        supabase.from('user_sessions').select('user_id', { count: 'exact', head: true }).gte('last_active_at', today),
        supabase.from('activity_flags').select('*', { count: 'exact', head: true }).eq('resolved', false)
      ]);
      return res.json({
        docs_today: docsToday.count || 0,
        docs_30d: docsMonth.count || 0,
        active_users_today: activeUsers.count || 0,
        unresolved_flags: unresolvedFlags.count || 0
      });
    }

    // GET /api/admin-api?action=live-feed&since=ISO_DATE
    if (action === 'live-feed') {
      var since = req.query.since || (req.body && req.body.since) || new Date(Date.now() - 24*60*60*1000).toISOString();
      var { data: docs } = await supabase.from('document_history')
        .select('*').gte('created_at', since)
        .order('created_at', { ascending: false }).limit(50);
      return res.json({ docs: docs || [] });
    }

    // GET /api/admin-api?action=users
    if (action === 'users') {
      var userId = req.query.userId;
      if (userId) {
        var [docs, sessions, flags] = await Promise.all([
          supabase.from('document_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
          supabase.from('user_sessions').select('*').eq('user_id', userId).order('logged_in_at', { ascending: false }).limit(20),
          supabase.from('activity_flags').select('*').eq('user_id', userId).order('created_at', { ascending: false })
        ]);
        return res.json({ documents: docs.data, sessions: sessions.data, flags: flags.data });
      }
      var { data: users } = await supabase.rpc('get_user_activity_summary');
      return res.json({ users: users || [] });
    }

    // GET /api/admin-api?action=flags
    if (action === 'flags') {
      var { data: flags } = await supabase.from('activity_flags')
        .select('*').eq('resolved', false)
        .order('created_at', { ascending: false });
      return res.json({ flags: flags || [] });
    }

    // PATCH /api/admin-api?action=resolve-flag
    if (action === 'resolve-flag' && req.method === 'PATCH') {
      var flagId = req.body.flagId;
      var { data } = await supabase.from('activity_flags')
        .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: admin.email })
        .eq('id', flagId).select().single();
      return res.json({ flag: data });
    }

    // GET /api/admin-api?action=all-profiles
    if (action === 'all-profiles') {
      var { data: profiles } = await supabase.from('profiles')
        .select('id, email, display_name, plan, role, stripe_customer_id, created_at')
        .order('created_at', { ascending: false });
      return res.json({ profiles: profiles || [] });
    }

    // URL Click Tracking
    if (action === 'url_clicks') {
      const { data: clicks, error: clickErr } = await supabase
        .from('url_clicks_summary')
        .select('*')
        .limit(50);
      if (clickErr) {
        return res.status(500).json({ error: 'Failed to fetch click data', detail: clickErr.message });
      }
      return res.status(200).json({ clicks: clicks || [] });
    }

    // GET /api/admin-api?action=lifecycle
    // Per-user activation + churn funnel, plus aggregate stage counts.
    if (action === 'lifecycle') {
      const { data: rows, error: lfErr } = await supabase.rpc('get_lifecycle_funnel');
      if (lfErr) {
        return res.status(500).json({ error: 'Failed to load lifecycle funnel', detail: lfErr.message });
      }
      const users = rows || [];
      const funnel = {
        signed_up: users.length,
        reached_editor: users.filter(function (u) { return u.reached_editor; }).length,
        generated_doc: users.filter(function (u) { return u.generated_doc; }).length,
        saved_doc: users.filter(function (u) { return u.saved_doc; }).length,
        converted: users.filter(function (u) { return u.upgraded; }).length
      };
      const stages = {};
      users.forEach(function (u) { stages[u.lifecycle_stage] = (stages[u.lifecycle_stage] || 0) + 1; });
      return res.status(200).json({ users: users, funnel: funnel, stages: stages });
    }

    // GET /api/admin-api?action=user-timeline&userId=UUID
    // Merged chronological event timeline for a single user (events + documents + sessions).
    if (action === 'user-timeline') {
      const uid = req.query.userId || (req.body && req.body.userId);
      if (!uid) return res.status(400).json({ error: 'userId required' });
      const [evs, docs, sess] = await Promise.all([
        supabase.from('user_events').select('event_name, page, metadata, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(200),
        supabase.from('document_history').select('action, document_type, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(100),
        supabase.from('user_sessions').select('logged_in_at, last_active_at, ip_address').eq('user_id', uid).order('logged_in_at', { ascending: false }).limit(50)
      ]);
      const timeline = [];
      (evs.data || []).forEach(function (e) { timeline.push({ type: 'event', label: e.event_name, page: e.page, meta: e.metadata, at: e.created_at }); });
      (docs.data || []).forEach(function (d) { timeline.push({ type: 'document', label: (d.action || 'document') + (d.document_type ? ' (' + d.document_type + ')' : ''), at: d.created_at }); });
      (sess.data || []).forEach(function (s) { timeline.push({ type: 'session', label: 'login', at: s.logged_in_at }); });
      timeline.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
      return res.status(200).json({ timeline: timeline });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
