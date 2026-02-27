const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers['authorization'];
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get documents from the past 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: docs, error } = await supabase
      .from('document_history')
      .select('id, action, document_type, prompt, html_after')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !docs || docs.length === 0) {
      return res.status(200).json({ message: 'No documents to evaluate', count: 0 });
    }

    let totalScore = 0;
    let evaluated = 0;
    let goldenCreated = 0;
    const issuesSummary = {};
    let totalCost = 0;

    for (const doc of docs) {
      if (!doc.html_after || doc.html_after.length < 100) continue;

      try {
        const evalResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 500,
            system: 'You evaluate HTML document quality for a professional document generation platform. Score 1-10. Return ONLY valid JSON: {"score": N, "issues": ["issue1", "issue2"], "suggestions": "text"}. Issues to check: font_too_large, page_overflow, missing_borders, poor_alignment, excess_whitespace, inconsistent_style, missing_print_css, generic_styling. Score 10=publication-quality, 8-9=good, 6-7=acceptable, 4-5=below standard, 1-3=unusable.',
            messages: [{
              role: 'user',
              content: 'Evaluate this ' + (doc.document_type || 'document') + ' (prompt: "' + (doc.prompt || '').substring(0, 200) + '"):\n\n' + doc.html_after.substring(0, 3000)
            }]
          })
        });

        const evalData = await evalResponse.json();
        totalCost += 0.005; // rough estimate per eval call
        const evalText = evalData.content[0].text.replace(/```json|```/g, '').trim();
        const evaluation = JSON.parse(evalText);

        // Store evaluation
        await supabase.from('training_evaluations').insert({
          document_history_id: doc.id,
          quality_score: evaluation.score,
          issues: evaluation.issues || [],
          suggestions: evaluation.suggestions || ''
        });

        totalScore += evaluation.score;
        evaluated++;

        // Track issues
        if (evaluation.issues) {
          evaluation.issues.forEach(issue => {
            issuesSummary[issue] = (issuesSummary[issue] || 0) + 1;
          });
        }

        // Save high-quality docs as golden samples
        if (evaluation.score >= 9 && doc.prompt && doc.document_type) {
          await supabase.from('golden_samples').insert({
            document_type: doc.document_type,
            prompt: doc.prompt,
            html: doc.html_after.substring(0, 50000),
            quality_score: evaluation.score,
            tags: evaluation.issues && evaluation.issues.length === 0 ? ['flawless'] : []
          });
          goldenCreated++;
        }
      } catch (evalErr) {
        console.error('Eval error for doc', doc.id, ':', evalErr.message);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const avgScore = evaluated > 0 ? Math.round((totalScore / evaluated) * 10) / 10 : 0;

    // Log the training run
    await supabase.from('training_runs').insert({
      run_date: new Date().toISOString().split('T')[0],
      documents_processed: evaluated,
      avg_quality_score: avgScore,
      issues_found: issuesSummary,
      golden_samples_created: goldenCreated,
      api_cost: totalCost,
      duration_seconds: duration
    });

    return res.status(200).json({
      success: true,
      documents_processed: evaluated,
      avg_quality_score: avgScore,
      golden_samples_created: goldenCreated,
      issues: issuesSummary,
      duration_seconds: duration
    });

  } catch (err) {
    console.error('Nightly training error:', err);
    return res.status(500).json({ error: err.message });
  }
};
