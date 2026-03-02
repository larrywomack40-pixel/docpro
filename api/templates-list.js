const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAGE_SIZE = 30;

const CATS = [
  { id: 1, slug: 'invoices' }, { id: 2, slug: 'pay-stubs' },
  { id: 3, slug: 'receipts' }, { id: 4, slug: 'contracts' },
  { id: 5, slug: 'business' }, { id: 6, slug: 'employment' },
  { id: 7, slug: 'legal' }, { id: 8, slug: 'real-estate' },
  { id: 9, slug: 'healthcare' }, { id: 10, slug: 'construction' },
  { id: 11, slug: 'education' }, { id: 12, slug: 'personal' },
  { id: 13, slug: 'government' }, { id: 14, slug: 'automotive' }
];

module.exports = async function handler(req, res) {
  // Sitemap generation (GET ?sitemap=index or ?sitemap=cat&cat=slug)
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  if (req.query.sitemap === 'index' || req.query.sitemap === 'true') {
    const BASE_URL = 'https://www.draftmyforms.com';
    const today = new Date().toISOString().split('T')[0];
    // Note: & must be &amp; in XML
    const sitemaps = CATS.map(c =>
      `  <sitemap><loc>${BASE_URL}/api/templates-list?sitemap=cat&amp;cat=${c.slug}</loc><lastmod>${today}</lastmod></sitemap>`
    ).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
  <sitemap><loc>${BASE_URL}/sitemap.xml</loc><lastmod>${today}</lastmod></sitemap>
</sitemapindex>`;
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(xml);
  }

  if (req.query.sitemap === 'cat' && req.query.cat) {
    const BASE_URL = 'https://www.draftmyforms.com';
    const today = new Date().toISOString().split('T')[0];
    const catObj = CATS.find(c => c.slug === req.query.cat);
    if (!catObj) return res.status(404).json({ error: 'Category not found' });
    const { data: templates } = await supabase.from('seo_templates')
      .select('slug').eq('category_id', catObj.id).limit(10000);
    const urls = (templates || []).map(t =>
      `  <url><loc>${BASE_URL}/templates.html?template=${encodeURIComponent(t.slug)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    ).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(xml);
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      page = '1',
      search = '',
      industry = '',
      document_type = '',
      style_id = '',
      tier = '',
      limit = String(PAGE_SIZE)
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || PAGE_SIZE));
    const offset = (pageNum - 1) * pageSize;

    // Build query
    let query = supabase
      .from('templates')
      .select('id, name, slug, category, tier, style_id, style_name, industry, document_type, primary_color, secondary_color, accent_color, heading_font, body_font, mood, is_active, sort_order', { count: 'exact' })
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Filters
    if (industry && industry !== 'all') {
      query = query.eq('industry', industry);
    }
    if (document_type && document_type !== 'all') {
      query = query.eq('document_type', document_type);
    }
    if (style_id && style_id !== 'all') {
      query = query.eq('style_id', style_id);
    }
    if (tier && tier !== 'all') {
      query = query.eq('tier', tier);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,industry.ilike.%${search}%,style_name.ilike.%${search}%,document_type.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch templates', detail: error.message });
    }

    return res.status(200).json({
      templates: data || [],
      pagination: {
        page: pageNum,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: offset + pageSize < (count || 0)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
