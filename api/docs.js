// api/docs.js
// Merged handler for /api/docs/* routes (generate-for-user + user-history)
// Consolidates two functions into one to stay within Vercel Hobby 12-function limit.
// Route by URL path:
//   POST /api/docs/generate-for-user  -> generate
//   GET  /api/docs/user-history       -> history
//   POST /api/docs                    -> generate (legacy alias)
//   GET  /api/docs                    -> history  (legacy alias)

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ── Lazy-load renderer modules ────────────────────────────────────────────────
function loadRenderer(name) {
  try { return require('../lib/docs/renderers/' + name); } catch(e) { return null; }
}
function loadUtils() {
  try { return require('../lib/docs/utils'); } catch(e) { return null; }
}
function loadCatalog() {
  try { return require('../lib/docs/catalog'); } catch(e) { return null; }
}

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getUserFromToken(req, supabase) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// ── Generate handler ──────────────────────────────────────────────────────────
async function handleGenerate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const user = await getUserFromToken(req, supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { slug, fields } = req.body || {};
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  // Plan check
  const PLAN_RANK = { free: 0, pro: 1, business: 2 };
  const catalog = loadCatalog();
  const docDef = catalog ? catalog[slug] : null;
  if (!docDef) return res.status(404).json({ error: 'Unknown document slug: ' + slug });

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();
  const userPlan = (profile && profile.plan) ? profile.plan.toLowerCase() : 'free';
  const required = docDef.plan || 'free';
  if ((PLAN_RANK[userPlan] || 0) < (PLAN_RANK[required] || 0)) {
    return res.status(403).json({ error: 'Plan required', code: 'PLAN_REQUIRED', required_plan: required });
  }

  // Render
  const renderer = loadRenderer(docDef.renderer);
  const utils = loadUtils();
  if (!renderer || !utils) {
    return res.status(500).json({ error: 'Renderer not available' });
  }

  let pdfBuffer;
  try {
    const htmlContent = renderer.render(slug, fields || {}, docDef);
    pdfBuffer = await utils.htmlToPdf(htmlContent);
  } catch (renderErr) {
    console.error('Render error:', renderErr);
    return res.status(500).json({ error: 'Document render failed: ' + renderErr.message });
  }

  // Upload to Supabase Storage
  const bucket = process.env.DOCS_BUCKET || 'generated-documents';
  const fileName = slug + '-' + user.id + '-' + Date.now() + '.pdf';
  const filePath = user.id + '/' + fileName;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    if (uploadError.message && uploadError.message.includes('Bucket not found')) {
      return res.status(503).json({ error: 'Storage not configured', code: 'STORAGE_BUCKET_MISSING' });
    }
    return res.status(500).json({ error: 'Upload failed: ' + uploadError.message });
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);

  const downloadUrl = (!signedError && signedData) ? signedData.signedUrl : null;

  // Record in generated_documents
  await supabase.from('generated_documents').insert({
    user_id: user.id,
    slug,
    title: docDef.title || slug,
    category: docDef.category || 'unknown',
    file_path: filePath,
    download_url: downloadUrl
  });

  return res.status(200).json({ ok: true, download_url: downloadUrl });
}

// ── History handler ───────────────────────────────────────────────────────────
async function handleHistory(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const user = await getUserFromToken(req, supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('generated_documents')
    .select('id, slug, title, category, created_at, download_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });

  const docs = (data || []).map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    created_at: row.created_at,
    download_url: row.download_url || null
  }));

  return res.status(200).json({ docs });
}

// ── Router ────────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlPath = (req.url || '').split('?')[0].replace(/\/+$/, '');
  const isGenerate = urlPath.endsWith('generate-for-user') || req.method === 'POST';
  const isHistory = urlPath.endsWith('user-history') || (req.method === 'GET' && !isGenerate);

  if (isGenerate) return handleGenerate(req, res);
  if (isHistory) return handleHistory(req, res);
  return res.status(404).json({ error: 'Not found' });
};
