const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

// Credit limits per plan (generations per month)
const PLAN_LIMITS = {
  free: 5,
  starter: 50,
  pro: 50,
  business: 999999,
  enterprise: 999999h
};

// ═══════════════ RESPONSE CLEANUP ═══════════════
function cleanAIResponse(text) {
  let html = text.trim();
  // Remove markdown code fences
  html = html.replace(/^```html?\s*\n?/i, '');
  html = html.replace(/\n?\s*```\s*$/i, '');
  // Remove any preamble text before the first HTML tag
  const firstTag = html.indexOf('<');
  if (firstTag > 0 && firstTag < 300) {
    html = html.substring(firstTag);
  }
  // Remove any trailing text after the last HTML tag
  const lastTag = html.lastIndexOf('>');
  if (lastTag > 0 && lastTag < html.length - 5) {
    html = html.substring(0, lastTag + 1);
  }
  return html;
}
// ═══════════════ SYSTEM PROMPTS ═══════════════
const CREATE_SYSTEM_PROMPT = `You are an expert document designer that generates publication-quality HTML documents. Your output must look like it came from a professional payroll, legal, or HR software system — NOT a basic web page.

CRITICAL RULES:
1. Return ONLY raw HTML. No markdown fencing, no explanation, no backticks. Just HTML starting with < and ending with >.
2. Self-contained: all styles inline or in a single <style> block at top.
3. Single-page by default. Use 8pt-9pt body text, tight padding, compact margins.
4. Print-ready with @page and @media print rules.

=== LAYOUT FOUNDATION ===
Every document MUST start with this wrapper:
<style>
  @page { size: letter; margin: 0; }
  @media print { * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  body { margin: 0; padding: 0; }
</style>
<div style="max-width: 7.6in; margin: 0 auto; padding: 0.35in 0.45in; font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #1a1a1a; line-height: 1.3;">
  <!-- document content here -->
</div>

=== TWO HEADER STYLES (use both appropriately, not just one) ===

STYLE A — Navy section bars (for major section titles like "Summary", "Earnings", "Tax Deductions"):
<div style="background: #1B3A5C; color: #fff; font-weight: bold; font-size: 9pt; padding: 3px 6px; margin-top: 4px;">Section Title</div>

STYLE B — Underlined bold column headers (for table column names within a section):
<span style="font-weight: bold; text-decoration: underline; font-size: 8pt;">Column Name</span>

=== TWO TABLE BORDER STYLES (use both appropriately) ===

STYLE 1 — Full grid borders (for data-heavy tables like Summary, Earnings, Line Items):
<table style="width: 100%; border-collapse: collapse; border: 0.5px solid #000;">
  <tr style="background: #1B3A5C;">
    <th style="color: #fff; font-size: 7.5pt; font-weight: bold; padding: 2.5px 4px; border: 0.5px solid #000; text-align: right;">Column</th>
  </tr>
  <tr>
    <td style="padding: 2.5px 4px; border: 0.5px solid #000; font-size: 8pt; text-align: right;">$867.41</td>
  </tr>
</table>

STYLE 2 — Minimal borders (for lighter tables like Tax Withholding, Year to Date):
<table style="width: 100%; border-collapse: collapse;">
  <tr style="border-bottom: 0.5px solid #000;">
    <td style="font-weight: bold; text-decoration: underline; padding: 2px 4px;">Description</td>
    <td style="font-weight: bold; text-decoration: underline; padding: 2px 4px; text-align: right;">Amount</td>
  </tr>
  <tr>
    <td style="padding: 2px 4px;">Item name</td>
    <td style="padding: 2px 4px; text-align: right;">$14.24</td>
  </tr>
</table>
=== TYPOGRAPHY RULES ===
- Section headers (navy bars): 9pt bold white
- Table column headers (navy row): 7.5pt bold white
- Table column headers (underlined): 8pt bold black underline
- Body/data text: 8pt regular black
- Currency/numbers: 8pt, ALWAYS text-align: right
- Bold totals: 8pt bold, text-align: right
- Small text (sub-labels, notes): 7pt
- Document titles: 12-14pt bold max
- NEVER use font-size larger than 14pt anywhere

=== SPACING RULES ===
- Cell padding: 2-3px vertical, 3-5px horizontal. NEVER 8px+ padding.
- Section gaps: 2-4px between sections. NEVER 10px+ gaps.
- Page margins: 0.35-0.45 inches. NEVER 0.75+ inches.
- Table rows should feel dense and compact, not airy.
- If a document should fit on 1 page, use 8pt text and 2px padding. Compress until it fits.

=== DOCUMENT-SPECIFIC PATTERNS ===

PAY STUBS:
- Company logo area (bold company name in navy box) at top left
- Employee info + employer info side by side in bordered boxes
- Period Type row: navy column headers, bordered data row
- "Additional Pay Information": centered underlined bold header, centered data
- Summary table: FULL GRID borders, navy column headers, Current + YTD Totals rows
- Earnings table: FULL GRID borders, navy column headers, hours/rate/amount
- Year to Date Earnings: navy bar section header → underlined column names → MINIMAL border data
- Tax Deductions: navy bar header → underlined column names → data with vertical column separators
- Net Pay Distribution: navy bar header → bold column names → full grid data
- ALL ON ONE PAGE. If tight, use 7.5pt and 2px padding.

INVOICES:
- Company header block (name, address, phone) at top left
- "INVOICE" label: prominent — either navy bar or large bold text right-aligned
- Invoice details (number, date, due date): clear block, right-aligned
- Bill To section with client details
- Line items table: FULL GRID with navy column headers (Item, Qty, Rate, Amount)
- Subtotal, Tax, Total: right-aligned stack, total row bold with top border
- Payment terms ("Net 30", "Due on Receipt") clearly stated at bottom
- ONE PAGE for under 10 line items.

CONTRACTS & AGREEMENTS:
- Title: centered, 12-14pt bold, all caps or title case
- "This Agreement" opening: identifies parties and effective date
- Numbered sections: 1., 2., 3. with bold section titles
- Body text: 10pt, 1.3-1.4 line-height
- Signature block at bottom: two columns (Party A | Party B)
  ________________________________
  [Name]
  [Title]
  Date: _______________
- CAN be multi-page. Include page numbers bottom center.

RESUMES:
- Name: 16-18pt bold at top
- Contact: phone | email | city, state (one line, 8pt)
- Section dividers: solid 0.5px lines, full width
- Section titles: 10pt bold
- Experience: Company bold, title italic, dates right-aligned on same line
- Bullets: use • character, 8pt, with hanging indent
- Skills: comma-separated or two-column grid
- MUST fit ONE PAGE unless user says otherwise.

BUSINESS LETTERS:
- Sender info at top (left-aligned or centered letterhead)
- Date, then recipient info, then "Dear [Name]:"
- Body: 10pt, 1.3 line-height, blank line between paragraphs
- Closing: "Sincerely," then 3-4 blank lines then typed name
- ONE PAGE.

RECEIPTS:
- Company name centered bold 12pt
- Store address + phone centered 8pt
- Transaction details left-aligned
- Items: two-column layout (Item ... Price)
- Dashed dividers between sections
- Total bold, larger than line items

NDAs:
- "NON-DISCLOSURE AGREEMENT" centered 14pt bold
- Formal contract formatting with numbered sections
- Key definitions in bold first use
- Two-column signature block at bottom
- Usually 2-3 pages

PROPOSALS:
- Title page: centered company name, project name, date, prepared for
- Executive summary: 2-3 compelling paragraphs
- Pricing table: full grid with navy headers
- Timeline table: Phase | Description | Duration
- CAN be multi-page (3-6 pages typical)

ESTIMATES / QUOTES:
- Similar to invoice but labeled "ESTIMATE" or "QUOTE"
- "Valid Until" date prominent
- Acceptance line: "I accept this estimate: _______________"
- ONE PAGE.

PURCHASE ORDERS:
- "PURCHASE ORDER" prominent header
- PO Number large, right-aligned
- Vendor and Ship To side by side
- Line items full grid table
- ONE PAGE.
=== THINGS TO NEVER DO ===
- Never use font-size > 14pt for anything
- Never use padding > 6px in table cells
- Never use margin > 0.5in on the page wrapper
- Never use <ul> or <li> in formal documents — use • characters
- Never use CSS Grid or Flexbox for table data — use actual <table> elements
- Never add placeholder text the user didn't ask for
- Never generate content wider than 7.6 inches
- Never wrap your response in markdown code fences (no backticks)
- Never add any explanation text before or after the HTML
- Never include "Generated by DraftMyForms" watermarks`;

const EDIT_SYSTEM_PROMPT = `You are an expert document editor. You receive existing HTML and the user's requested change. You modify ONLY what was specifically asked.

CRITICAL RULES:
1. Return ONLY the complete modified HTML document. No markdown, no explanation, no backticks.
2. Preserve ALL existing content, formatting, styles, and structure EXCEPT what the user specifically asks to change.
3. SAME PAGE COUNT: If the original is 1 page, your edit MUST also be 1 page. Do NOT expand content.
4. SAME FONT SIZES: Do not increase any font sizes unless specifically asked.
5. SAME SPACING: Do not add padding, margins, line breaks, or blank paragraphs.
6. SAME STYLE: Match the existing color scheme, font family, border style exactly.
7. If adding elements (like divider lines), use compact styling: <hr style="border: none; border-top: 0.5px solid #ccc; margin: 3px 0;">
8. Do NOT remove any data or sections unless asked.
9. Only change what was explicitly requested — nothing else.

WHEN THE USER SAYS "add lines" or "add dividers":
- Add thin horizontal rules between sections
- Do NOT increase spacing, font sizes, or add blank space around them

WHEN THE USER SAYS "make it look more professional":
- Add navy section headers (#1B3A5C background, white bold text)
- Add table borders where missing
- Right-align all currency columns
- Do NOT increase font sizes or add extra spacing

ALWAYS include print CSS:
<style>
  @page { size: letter; margin: 0; }
  @media print { * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>`;
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, docType, plan, userId, currentContent, mode, templateStyle, fileData, fileName } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'AI service not configured' });

  // --- CREDIT CHECK ---
  let creditsUsed = 0;
  let creditLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  let creditsRemaining = creditLimit;
  let supabaseAdmin = null;
  let userEmail = '';

  if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('ai_credits_used, ai_credits_reset_at, ai_credits_limit, plan, plan_override, email')
        .eq('id', userId)
        .single();

      if (profile) {
        userEmail = profile.email || '';
        const effectivePlan = (profile.plan_override || profile.plan || 'free').toLowerCase();
        creditLimit = profile.ai_credits_limit || PLAN_LIMITS[effectivePlan] || PLAN_LIMITS.free;

        const resetAt = new Date(profile.ai_credits_reset_at || 0);
        const now = new Date();
        const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());

        if (monthsSinceReset >= 1) {
          await supabaseAdmin.from('profiles').update({
            ai_credits_used: 0,
            ai_credits_reset_at: now.toISOString()
          }).eq('id', userId);
          creditsUsed = 0;
        } else {
          creditsUsed = profile.ai_credits_used || 0;
        }

        creditsRemaining = creditLimit - creditsUsed;

        if (effectivePlan !== 'enterprise' && effectivePlan !== 'business' && creditsUsed >= creditLimit) {
          return res.status(429).json({
            error: 'AI credit limit reached',
            creditsUsed, creditLimit,
            creditsRemaining: 0,
            plan: effectivePlan,
            resetDate: getNextResetDate(profile.ai_credits_reset_at)
          });
        }
      }
    } catch (creditErr) {
      console.error('Credit check error (non-blocking):', creditErr.message);
    }
  }
  // --- AI GENERATION ---
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Select system prompt based on mode
  let systemPrompt = (mode === 'edit' && currentContent) ? EDIT_SYSTEM_PROMPT : CREATE_SYSTEM_PROMPT;
  const documentType = docType || null;

  // --- TASK 5: STYLE PREFERENCE INJECTION FOR CREATE MODE ---
  if (mode !== 'edit' && documentType && userId && supabaseAdmin) {
    try {
      const { data: styleData } = await supabaseAdmin
        .from('document_styles')
        .select('style_fingerprint')
        .eq('user_id', userId)
        .eq('document_type', documentType)
        .single();

      if (styleData && styleData.style_fingerprint) {
        const fp = styleData.style_fingerprint;
        systemPrompt += '\n\nUSER PREFERRED STYLE FOR ' + documentType.toUpperCase() + ':\n';
        systemPrompt += '- Primary color: ' + (fp.primary_color || '#1B3A5C') + '\n';
        systemPrompt += '- Font: ' + (fp.font_family || 'Arial') + '\n';
        systemPrompt += '- Header style: ' + (fp.header_style || 'navy_bar') + '\n';
        systemPrompt += '- Table borders: ' + (fp.table_style || 'full_grid') + '\n';
        systemPrompt += '- Body text size: ' + (fp.body_font_size || '8pt') + '\n';
        systemPrompt += '- Spacing: ' + (fp.section_spacing || 'compact') + '\n';
        if (fp.company_name) systemPrompt += '- Company name: ' + fp.company_name + '\n';
        if (fp.company_address) systemPrompt += '- Company address: ' + fp.company_address + '\n';
        if (fp.company_phone) systemPrompt += '- Company phone: ' + fp.company_phone + '\n';
        systemPrompt += 'Use these preferences unless the user explicitly requests a different style.';
      }
    } catch (styleErr) { /* no stored style yet, use defaults */ }
  }

  // --- TASK 7: GOLDEN SAMPLE FEW-SHOT EXAMPLES ---
  if (mode !== 'edit' && documentType && supabaseAdmin) {
    try {
      const { data: samples } = await supabaseAdmin
        .from('golden_samples')
        .select('prompt, html')
        .eq('document_type', documentType)
        .eq('active', true)
        .gte('quality_score', 8)
        .order('quality_score', { ascending: false })
        .limit(1);

      if (samples && samples.length > 0) {
        systemPrompt += '\n\nREFERENCE EXAMPLE (match this quality level):\n';
        systemPrompt += 'Prompt: "' + samples[0].prompt + '"\n';
        systemPrompt += samples[0].html.substring(0, 2000) + '\n...\n';
      }
    } catch (sampleErr) { /* no golden samples yet */ }
  }

  // Build user message
  let userMessage = '';
  if (mode === 'edit' && currentContent) {
    console.log('[ai-generate] EDIT mode | Content length:', currentContent.length);
    userMessage = 'Here is the current HTML document:\n\n' + currentContent + '\n\nMake this change: ' + prompt + '\n\nReturn the complete modified HTML.';
  } else {
    console.log('[ai-generate] CREATE mode | Type:', documentType);
    userMessage = documentType
      ? 'Create a professional ' + documentType + '. ' + prompt
      : prompt;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    // Clean AI response
    const html = cleanAIResponse(message.content[0].text);

    // --- LOG USAGE & INCREMENT CREDITS ---
    if (supabaseAdmin && userId) {
      try {
        await supabaseAdmin.from('profiles').update({
          ai_credits_used: creditsUsed + 1
        }).eq('id', userId);

        await supabaseAdmin.from('ai_usage').insert({
          user_id: userId,
          prompt_text: prompt.substring(0, 500),
          doc_type: docType || 'general',
          mode: mode || 'create',
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens
        });

        creditsRemaining = creditLimit - (creditsUsed + 1);

        // Log document to history
        try {
          await supabaseAdmin.from('document_history').insert({
            user_id: userId,
            document_id: null,
            action: mode || 'create',
            document_type: documentType,
            prompt: prompt.substring(0, 2000),
            html_before: mode === 'edit' ? (currentContent || '').substring(0, 50000) : null,
            html_after: html.substring(0, 50000)
          });
        } catch (histErr) { /* non-blocking */ }

        // Log active day for trial eligibility
        try {
          const today = new Date().toISOString().split('T')[0];
          const { data: prof } = await supabaseAdmin.from('profiles').select('active_days_log, plan').eq('id', userId).single();
          if (prof && prof.plan === 'free') {
            const days = prof.active_days_log || [];
            if (!days.includes(today)) {
              const newDays = [...days, today];
              await supabaseAdmin.from('profiles').update({
                active_days_log: newDays,
                active_days_count: newDays.length,
                trial_eligible: newDays.length < 3
              }).eq('id', userId);
            }
          }
        } catch (actErr) { /* non-blocking */ }

        // Fire-and-forget style extraction for edits
        if (mode === 'edit' && process.env.VERCEL_URL) {
          const siteUrl = 'https://' + process.env.VERCEL_URL;
          fetch(siteUrl + '/api/extract-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, html, documentType })
          }).catch(() => {});

          // Fire-and-forget email notifications
          if (userEmail && process.env.VERCEL_URL) {
            const emailUrl = 'https://' + process.env.VERCEL_URL + '/api/send-email';
            // Document ready notification
            fetch(emailUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userId,
                email: userEmail,
                type: 'document_ready',
                data: { docType: docType || 'Document' }
              })
            }).catch(() => {});
            // Credits low warning (2 or fewer remaining)
            if (creditsRemaining <= 2 && creditsRemaining >= 0) {
              fetch(emailUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: userId,
                  email: userEmail,
                  type: 'credits_low',
                  data: { creditsRemaining: creditsRemaining, planName: plan || 'Free' }
                })
              }).catch(() => {});
            }
          }
        }

      } catch (logErr) {
        console.error('Credit logging error (non-blocking):', logErr.message);
      }
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({
      html: html,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens
      },
      credits: {
        used: creditsUsed + 1,
        limit: creditLimit,
        remaining: Math.max(0, creditsRemaining)
      }
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({ error: 'AI generation failed: ' + (error.message || 'Unknown error') });
  }
};

function getNextResetDate(resetAt) {
  const d = new Date(resetAt || Date.now());
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
