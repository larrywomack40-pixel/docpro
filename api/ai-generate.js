const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

// Credit limits per plan (generations per month)
const PLAN_LIMITS = {
  Free: 5,
  Starter: 50,
  Professional: 200,
  Enterprise: 999999
};

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
  let creditLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;
  let creditsRemaining = creditLimit;
  let supabaseAdmin = null;

  if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      // Get user profile for credit info
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('ai_credits_used, ai_credits_reset_at, ai_credits_limit, plan, plan_override')
        .eq('id', userId)
        .single();

      if (profile) {
        // Use actual plan from DB (not client-sent) for security
        const effectivePlan = profile.plan_override || profile.plan || 'Free';
        creditLimit = profile.ai_credits_limit || PLAN_LIMITS[effectivePlan] || PLAN_LIMITS.Free;

        // Check if credits need monthly reset
        const resetAt = new Date(profile.ai_credits_reset_at || 0);
        const now = new Date();
        const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());

        if (monthsSinceReset >= 1) {
          // Reset credits for new month
          await supabaseAdmin.from('profiles').update({
            ai_credits_used: 0,
            ai_credits_reset_at: now.toISOString()
          }).eq('id', userId);
          creditsUsed = 0;
        } else {
          creditsUsed = profile.ai_credits_used || 0;
        }

        creditsRemaining = creditLimit - creditsUsed;

        // Enforce limit (Enterprise = unlimited)
        if (effectivePlan !== 'Enterprise' && creditsUsed >= creditLimit) {
          return res.status(429).json({
            error: 'AI credit limit reached',
            creditsUsed: creditsUsed,
            creditLimit: creditLimit,
            creditsRemaining: 0,
            plan: effectivePlan,
            resetDate: getNextResetDate(profile.ai_credits_reset_at)
          });
        }
      }
    } catch (creditErr) {
      console.error('Credit check error (non-blocking):', creditErr.message);
      // Continue anyway - don't block AI if credit check fails
    }
  }

  // --- AI GENERATION ---
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let systemPrompt, userMessage;

  if (mode === 'edit' && currentContent) {
    // ═══════════════ EDIT MODE ═══════════════
    console.log('[ai-generate] EDIT mode | Content length:', currentContent.length);
    systemPrompt = 'You are a document editor for DraftMyForms.com. You modify existing HTML documents based on user requests.\n\nABSOLUTE RULES:\n1. Return ONLY the complete modified HTML. No explanations, no markdown code fences, no backticks.\n2. Preserve ALL existing content, styling, structure, inline styles, colors, fonts, images, and layout EXCEPT what the user specifically asks to change.\n3. Do NOT regenerate the document from scratch. Make ONLY the requested modification.\n4. If asked to change a color, change ONLY that color on the relevant elements.\n5. If asked to add something, add it while keeping everything else exactly the same.\n6. If asked to remove something, remove only that, keep everything else.\n7. Return the COMPLETE document HTML, not just the changed portion.\n8. Do NOT wrap the output in markdown code blocks or backticks.';

    userMessage = 'Here is the current document HTML that needs to be edited:\n\n<current_document>\n' + currentContent + '\n</current_document>\n\nUser requested change: "' + prompt + '"\n\nReturn the COMPLETE modified HTML with ONLY the requested change applied. Preserve everything else exactly as-is. Return raw HTML only.';
  } else {
    // ═══════════════ GENERATE MODE ═══════════════
    console.log('[ai-generate] CREATE mode');
    systemPrompt = `You are a professional document generator for DraftMyForms.com. You create premium, professional-grade HTML documents.

CRITICAL RULES:
- Output ONLY the HTML content for the document body (no <html>, <head>, <body> tags)
- Use clean inline styles for ALL formatting
- Every document must look PREMIUM and PROFESSIONAL - never generic or plain
- Use professional fonts: 'Playfair Display', Georgia, serif for headings; 'DM Sans', -apple-system, sans-serif for body
- Primary accent color: #c99532 (gold) for headers, borders, accents
- Text color: #2d2926 (dark brown), Muted: #8a7f76
- Background accents: #f9f4f3 (warm paper), #fffcf9 (card)
- Include proper spacing, padding, margins for a polished look
- Tables should have styled headers with gold (#c99532) background and white text
- Include realistic placeholder data when creating new documents
- Make every document print-ready and professional
- For creative documents (birthday, invitations, flyers): use CSS gradients, themed colors, decorative borders, emojis
- For business documents: use premium gold-accented style consistently
${templateStyle ? 'TEMPLATE STYLE: ' + templateStyle : ''}
${docType === 'logo' ? 'LOGO MODE: Create an elegant SVG logo. Output ONLY the SVG code. Use #c99532 gold as primary color.' : ''}`;

    userMessage = prompt;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
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

    // --- LOG USAGE & INCREMENT CREDITS ---
    if (supabaseAdmin && userId) {
      try {
        // Increment credits used
        await supabaseAdmin.from('profiles').update({
          ai_credits_used: creditsUsed + 1
        }).eq('id', userId);

        // Log to ai_usage table
        await supabaseAdmin.from('ai_usage').insert({
          user_id: userId,
          prompt_text: prompt.substring(0, 500),
          doc_type: docType || 'general',
          mode: mode || 'create',
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens
        });

        creditsRemaining = creditLimit - (creditsUsed + 1);
      } catch (logErr) {
        console.error('Credit logging error (non-blocking):', logErr.message);
      }
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({
      html: html.trim(),
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
