// api/docs/user-history.js
// GET /api/docs/user-history
// Requires: Authorization: Bearer <supabase_jwt>
// Returns: { ok: true, docs: [ { id, slug, title, category, created_at, download_url } ] }
// Errors: 401 UNAUTHORIZED, 500

const { createClient } = require('@supabase/supabase-js');

const HISTORY_LIMIT = 50;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Authorization required', code: 'UNAUTHORIZED' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session', code: 'UNAUTHORIZED' });
  }

  const { data: docs, error: queryError } = await supabase
    .from('generated_documents')
    .select('id, slug, title, category, created_at, download_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (queryError) {
    console.error('History query error:', queryError);
    return res.status(500).json({ ok: false, error: 'Failed to load document history' });
  }

  return res.status(200).json({
    ok: true,
    docs: docs || []
  });
};
