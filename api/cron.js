// api/cron.js
// Merged handler for /api/cron/* routes (nightly-training + weekly-report)
// Consolidates two cron functions into one to stay within Vercel Hobby 12-function limit.
// Route by URL path:
//   GET/POST /api/cron/nightly-training  -> nightly training run
//   GET/POST /api/cron/weekly-report     -> weekly summary report

const { createClient } = require('@supabase/supabase-js');

function checkAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  return authHeader === 'Bearer ' + process.env.CRON_SECRET;
}

// ── Nightly training handler ──────────────────────────────────────────────────
async function handleNightlyTraining(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const startTime = Date.now();

  try {
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
            messages: [{ role: 'user', content: 'Evaluate this ' + (doc.document_type || 'document') + ' (prompt: "' + (doc.prompt || '').substring(0, 200) + '"):\n\n' + doc.html_after.substring(0, 3000) }]
          })
        });
        const evalData = await evalResponse.json();
        totalCost += 0.005;
        const evalText = evalData.content[0].text.replace(/```json|```/g, '').trim();
        const evaluation = JSON.parse(evalText);

        await supabase.from('training_evaluations').insert({
          document_history_id: doc.id,
          quality_score: evaluation.score,
          issues: evaluation.issues || [],
          suggestions: evaluation.suggestions || ''
        });

        totalScore += evaluation.score;
        evaluated++;
        if (evaluation.issues) {
          evaluation.issues.forEach(issue => { issuesSummary[issue] = (issuesSummary[issue] || 0) + 1; });
        }
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
}

// ── Weekly report handler ─────────────────────────────────────────────────────
async function handleWeeklyReport(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: runs } = await supabase
      .from('training_runs')
      .select('*')
      .gte('created_at', weekAgo);

    let totalDocs = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let totalGolden = 0;
    let totalCost = 0;
    const allIssues = {};

    if (runs && runs.length > 0) {
      runs.forEach(run => {
        totalDocs += run.documents_processed || 0;
        if (run.avg_quality_score > 0) { totalScore += run.avg_quality_score * run.documents_processed; scoreCount += run.documents_processed; }
        totalGolden += run.golden_samples_created || 0;
        totalCost += parseFloat(run.api_cost || 0);
        if (run.issues_found) {
          Object.entries(run.issues_found).forEach(([issue, count]) => { allIssues[issue] = (allIssues[issue] || 0) + count; });
        }
      });
    }

    const avgScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0;
    const topIssues = Object.entries(allIssues).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([issue, count]) => issue + ': ' + count).join(', ');
    console.log('Weekly report: docs=' + totalDocs + ' avgScore=' + avgScore + ' topIssues=' + topIssues);

    return res.status(200).json({
      success: true,
      report: {
        week_ending: new Date().toISOString(),
        documents_processed: totalDocs,
        avg_quality_score: avgScore,
        golden_samples_created: totalGolden,
        training_cost: totalCost,
        top_issues: allIssues,
        quality_warning: avgScore < 7
      }
    });
  } catch (err) {
    console.error('Weekly report error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (!checkAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  const urlPath = (req.url || '').split('?')[0].replace(/\/+$/, '');

  if (urlPath.endsWith('nightly-training')) return handleNightlyTraining(req, res);
  if (urlPath.endsWith('weekly-report')) return handleWeeklyReport(req, res);
  return res.status(404).json({ error: 'Unknown cron route' });
};
