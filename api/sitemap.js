const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = 'https://www.draftmyforms.com';

const CATEGORIES = [
  { id: 1, slug: 'invoices' },
  { id: 2, slug: 'pay-stubs' },
  { id: 3, slug: 'receipts' },
  { id: 4, slug: 'contracts' },
  { id: 5, slug: 'business' },
  { id: 6, slug: 'employment' },
  { id: 7, slug: 'legal' },
  { id: 8, slug: 'real-estate' },
  { id: 9, slug: 'healthcare' },
  { id: 10, slug: 'construction' },
  { id: 11, slug: 'education' },
  { id: 12, slug: 'personal' },
  { id: 13, slug: 'government' },
  { id: 14, slug: 'automotive' }
];

module.exports = async function handler(req, res) {
  // Rate limiting
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  const { cat } = req.query;

  try {
    if (!cat) {
      // Return sitemap index
      const sitemapIndex = generateSitemapIndex();
      res.setHeader('Content-Type', 'application/xml');
      return res.status(200).send(sitemapIndex);
    }

    // Return category-specific sitemap
    const category = CATEGORIES.find(c => c.slug === cat);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Fetch templates for this category (paginated)
    const { data: templates, error } = await supabase
      .from('seo_templates')
      .select('slug, updated_at')
      .eq('category_id', category.id)
      .order('id', { ascending: true })
      .limit(10000);

    if (error) throw error;

    const sitemap = generateCategorySitemap(category.slug, templates || []);
    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(sitemap);

  } catch (err) {
    console.error('Sitemap error:', err);
    return res.status(500).json({ error: 'Failed to generate sitemap' });
  }
};

function generateSitemapIndex() {
  const today = new Date().toISOString().split('T')[0];
  const sitemaps = CATEGORIES.map(c =>
    `  <sitemap>
    <loc>${BASE_URL}/api/sitemap?cat=${c.slug}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

function generateCategorySitemap(categorySlug, templates) {
  const today = new Date().toISOString().split('T')[0];
  const urls = templates.map(t => {
    const lastmod = t.updated_at ? t.updated_at.split('T')[0] : today;
    return `  <url>
    <loc>${BASE_URL}/templates.html?template=${encodeURIComponent(t.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
