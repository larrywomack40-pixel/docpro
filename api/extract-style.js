const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, html, documentType } = req.body;
  if (!userId || !html || !documentType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Service not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You analyze HTML documents and extract their visual design fingerprint. Return ONLY valid JSON with these fields: primary_color (hex), accent_color (hex or null), font_family, header_style ("navy_bar", "underlined", "bordered", "accent_line", "plain_bold"), body_font_size, table_style ("full_grid", "minimal", "striped", "borderless"), section_spacing ("compact", "normal", "spacious"), company_name (if found, else null), company_address (if found, else null), company_phone (if found, else null)',
        messages: [{
          role: 'user',
          content: 'Extract the style fingerprint from this ' + documentType + ':\n\n' + html.substring(0, 4000)
        }]
      })
    });

    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const fingerprint = JSON.parse(text);

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    await supabase.from('document_styles').upsert({
      user_id: userId,
      document_type: documentType,
      style_fingerprint: fingerprint,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,document_type' });

    return res.status(200).json({ success: true, fingerprint });
  } catch (error) {
    console.error('Style extraction error:', error.message);
    return res.status(500).json({ error: 'Style extraction failed' });
  }
};
