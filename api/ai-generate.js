const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt, docType, plan, userId } = req.body;

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'AI service not configured' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are a professional document generator for DraftMyForms.com. Generate clean, professional HTML documents.

    RULES:
    - Output ONLY the HTML content for the document body (no <html>, <head>, <body> tags)
    - Use clean inline styles for formatting
    - Use professional fonts: Georgia for headings, system-ui for body
    - Use colors: #c99532 (gold) for accents, #2d2926 for text, #8a7f76 for muted
    - Include proper structure: headers, sections, tables where appropriate
    - For invoices: include company info, line items table, totals
    - For contracts: include parties, terms, signature lines
    - For letters: include sender, recipient, date, body, signature
    - For resumes: include contact info, summary, experience, education, skills
    - Make the document look ready to print/PDF
    - Do NOT include any JavaScript
    - Do NOT include any placeholder text like [Your Name] - use realistic sample data if specific data not provided
    - Keep within 4000 tokens maximum`;

    const userMessage = docType
      ? `Generate a professional ${docType} document. User request: ${prompt}`
          : `Generate a professional document. User request: ${prompt}`;

    try {
          const message = await client.messages.create({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 4000,
                  messages: [
                    { role: 'user', content: userMessage }
                          ],
                  system: systemPrompt
          });

      const html = message.content[0].text;

      return res.status(200).json({
              html: html,
              usage: {
                        input_tokens: message.usage.input_tokens,
                        output_tokens: message.usage.output_tokens
              }
      });
    } catch (error) {
          console.error('AI generation error:', error);
          return res.status(500).json({ error: 'Failed to generate document. Please try again.' });
    }
};
