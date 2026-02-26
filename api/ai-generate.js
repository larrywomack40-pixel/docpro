const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, docType, plan, userId, currentContent, mode, templateStyle, fileData, fileName } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'AI service not configured' });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a professional document generator for DraftMyForms.com. You create premium, professional-grade HTML documents.

CRITICAL RULES:
- Output ONLY the HTML content for the document body (no <html>, <head>, <body> tags)
- Use clean inline styles for ALL formatting
- Every document must look PREMIUM and PROFESSIONAL - never generic or plain
- Use professional fonts: 'Playfair Display', Georgia, serif for headings; 'DM Sans', -apple-system, sans-serif for body
- Primary accent color: #c99532 (gold) for headers, borders, accents
- Text color: #2d2926 (dark brown), Muted: #8a7f76
- Background accents: #f9f4f3 (warm paper), #fffcf9 (card)
- Success/green: #3a6633, Danger/red: #c24b3b
- Include proper spacing, padding, margins for a polished look
- Tables should have styled headers with gold (#c99532) background and white text
- Use horizontal rules with gold color for section dividers
- Include realistic placeholder data when creating new documents
- Signature blocks should have proper lines and spacing
- For logos: if the user mentions a company name, create an elegant text-based logo header using styled divs
- Make every document print-ready and professional

DOCUMENT TYPES YOU SUPPORT (but not limited to - create ANY document type requested):
Invoices, Receipts, Contracts, Agreements, NDAs, Letters (all types), Resumes, CVs, Proposals, Reports, Forms, Applications, Certificates, Purchase Orders, Bills of Sale, Leases, Wills, Power of Attorney, Affidavits, Memorandums, Meeting Minutes, Business Plans, Marketing Plans, Project Plans, SOWs, RFPs, Policies, Procedures, Manuals, Guides, Presentations, Newsletters, Press Releases, Brochures, Flyers, Labels, Business Cards, Letterheads, Envelopes, Name Tags, Tickets, Coupons, Gift Cards, Menus, Programs, Agendas, Itineraries, Budgets, Timesheets, Expense Reports, and ANY other document type.



VISUAL DESIGN EXCELLENCE (Issue 17):
- For creative/personal documents (birthday letters, invitations, event flyers, holiday cards, wedding invitations):
  * Use CSS background gradients, patterns, or themed color schemes
  * Add decorative borders with CSS border-image or box-shadow effects
  * Use themed emoji or Unicode decorative characters as visual elements
  * Create visual headers with gradient backgrounds and large decorative typography
  * Add subtle background patterns using CSS repeating-linear-gradient
  * For birthday: use warm colors, celebration emojis (🎂🎈🎉), festive borders
  * For weddings: use elegant pastels, floral Unicode (❀✿🌸), cursive fonts
  * For holidays: use seasonal colors and themed decorative elements
  * For invitations: use premium card-like styling with shadows and borders

- For business documents, use the premium gold-accented style consistently
- Use CSS box-shadow for depth and visual hierarchy
- Use CSS linear-gradient for section backgrounds and accent bars
- Add subtle decorative dividers between sections (not just plain <hr>)
- For charts/metrics, create visual bar charts using CSS div widths
- Use CSS Grid and Flexbox for sophisticated layouts
- Include CSS-only decorative elements (circles, lines, shapes) using pseudo-elements described in inline styles
- Make tables visually striking with alternating row colors and proper spacing

STYLE GUIDELINES:
- Professional: Clean lines, consistent spacing, proper hierarchy
- Premium: Use subtle gradients, elegant borders, refined typography
- Modern: Balance white space, use clear visual hierarchy
- Branded: Incorporate gold (#c99532) accents tastefully, not overwhelming

${mode === 'edit' ? 'EDITING MODE: The user wants to modify an existing document. Apply their requested changes while preserving the overall structure and style. Return the COMPLETE updated document HTML.' : ''}
${mode === 'create' ? 'CREATION MODE: Generate a complete, ready-to-use document with all necessary sections and realistic sample data.' : ''}
${templateStyle ? 'TEMPLATE STYLE: ' + templateStyle : ''}
${docType === 'logo' ? 'LOGO MODE: Create an elegant SVG logo. Output ONLY the SVG code. Use #c99532 gold as primary color. Make it professional, modern, and suitable for business documents. Size should be around 200x80 pixels.' : ''}`;

  let userMessage = prompt;
  if (currentContent && mode === 'edit') {
    userMessage = `Here is the current document HTML:\n\n${currentContent}\n\nUser request: ${prompt}\n\nPlease apply the requested changes and return the complete updated HTML.`;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const responseText = message.content[0].text;
    
    // Extract HTML from response (handle markdown code blocks)
    let html = responseText;
    const htmlMatch = responseText.match(/\`\`\`html?\n([\s\S]*?)\`\`\`/);
    if (htmlMatch) {
      html = htmlMatch[1];
    } else {
      const svgMatch = responseText.match(/\`\`\`svg?\n([\s\S]*?)\`\`\`/);
      if (svgMatch) html = svgMatch[1];
      const xmlMatch = responseText.match(/\`\`\`xml?\n([\s\S]*?)\`\`\`/);
      if (xmlMatch) html = xmlMatch[1];
    }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({
      html: html.trim(),
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({ error: 'AI generation failed: ' + (error.message || 'Unknown error') });
  }
};
