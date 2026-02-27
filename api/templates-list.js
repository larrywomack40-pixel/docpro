const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PAGE_SIZE = 30;

module.exports = async function handler(req, res) {
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
