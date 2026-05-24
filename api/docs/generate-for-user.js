// api/docs/generate-for-user.js
// POST /api/docs/generate-for-user
// Requires: Authorization: Bearer <supabase_jwt>
// Body: { slug: string, fields: object }
// Returns: { ok: true, download_url: string, doc_id: string }
// Errors: 400 MISSING_FIELDS, 401 UNAUTHORIZED, 403 PLAN_REQUIRED, 503 STORAGE_BUCKET_MISSING

const { createClient } = require('@supabase/supabase-js');
const { CATALOG, PLAN_TIER, planAllows } = require('../../lib/docs/catalog');

const RENDERER_MAP = {
  financial: require('../../lib/docs/renderers/financial'),
  legal: require('../../lib/docs/renderers/legal'),
  estate: require('../../lib/docs/renderers/estate'),
  assessment: require('../../lib/docs/renderers/assessment')
};

const STORAGE_BUCKET = 'generated-docs';
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 days

function getBusinessInfo() {
  return {
    name: process.env.WMK_BUSINESS_NAME || 'WMK Speciality Services LLC',
    address: process.env.WMK_BUSINESS_ADDRESS || '',
    phone: process.env.WMK_BUSINESS_PHONE || '',
    email: process.env.WMK_BUSINESS_EMAIL || ''
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
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

  const { slug, fields } = req.body || {};
  if (!slug || !fields || typeof fields !== 'object') {
    return res.status(400).json({ ok: false, error: 'slug and fields are required', code: 'MISSING_FIELDS' });
  }

  const catalogEntry = CATALOG[slug];
  if (!catalogEntry) {
    return res.status(400).json({ ok: false, error: 'Unknown document slug', code: 'MISSING_FIELDS' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();
  const userPlan = (profile && profile.plan) ? profile.plan : 'free';

  if (!planAllows(userPlan, slug)) {
    return res.status(403).json({
      ok: false,
      error: 'Your current plan does not include this document.',
      code: 'PLAN_REQUIRED',
      required_plan: catalogEntry.plan
    });
  }

  const renderer = RENDERER_MAP[catalogEntry.renderer];
  if (!renderer) {
    return res.status(500).json({ ok: false, error: 'Renderer not found for this document type' });
  }

  let pdfBuffer;
  try {
    const businessInfo = catalogEntry.business_from_env ? getBusinessInfo() : null;
    pdfBuffer = await renderer.render(slug, fields, businessInfo);
  } catch (renderErr) {
    console.error('Render error:', renderErr);
    return res.status(500).json({ ok: false, error: 'PDF generation failed' });
  }

  const timestamp = Date.now();
  const storagePath = user.id + '/' + slug + '-' + timestamp + '.pdf';

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    if (uploadError.message && uploadError.message.toLowerCase().includes('bucket')) {
      return res.status(503).json({
        ok: false,
        error: 'Document storage is not configured. Please contact support.',
        code: 'STORAGE_BUCKET_MISSING'
      });
    }
    console.error('Upload error:', uploadError);
    return res.status(500).json({ ok: false, error: 'Failed to store document' });
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (signedError || !signedData) {
    return res.status(500).json({ ok: false, error: 'Failed to create download link' });
  }

  const { data: insertData, error: insertError } = await supabase
    .from('generated_documents')
    .insert({
      user_id: user.id,
      slug: slug,
      title: catalogEntry.title,
      category: catalogEntry.category,
      storage_path: storagePath,
      download_url: signedData.signedUrl
    })
    .select('id')
    .single();

  const docId = (insertData && insertData.id) ? insertData.id : null;

  return res.status(200).json({
    ok: true,
    download_url: signedData.signedUrl,
    doc_id: docId
  });
};
