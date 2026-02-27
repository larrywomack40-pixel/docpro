const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers['authorization'];
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get training runs from the past week
    const { data: runs } = await supabase
      .from('training_runs')
      .select('*')
      .gte('created_at', weekAgo);

    // Aggregate stats
    let totalDocs = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let totalGolden = 0;
    let totalCost = 0;
    const allIssues = {};

    if (runs && runs.length > 0) {
      runs.forEach(run => {
        totalDocs += run.documents_processed || 0;
        if (run.avg_quality_score > 0) {
          totalScore += run.avg_quality_score * run.documents_processed;
          scoreCount += run.documents_processed;
        }
        totalGolden += run.golden_samples_created || 0;
        totalCost += parseFloat(run.api_cost || 0);
        if (run.issues_found) {
          Object.entries(run.issues_found).forEach(([issue, count]) => {
            allIssues[issue] = (allIssues[issue] || 0) + count;
          });
        }
      });
    }

    const avgScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0;
    const topIssues = Object.entries(allIssues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, count]) => issue + ': ' + count)
      .join(', ');

    // Build report
    const qualityWarning = avgScore < 7 ? '\n\n⚠️ ACTION REQUIRED: Average quality score is below 7.0. Review the AI system prompt and recent evaluations.' : '';

    const report = [
      '📊 DraftMyForms Weekly AI Training Report',
      '═══════════════════════════════════',
      '',
      '📅 Week ending: ' + new Date().toLocaleDateString(),
      '📝 Documents processed: ' + totalDocs,
      '⭐ Average quality score: ' + avgScore + ' / 10',
      '🏆 Golden samples created: ' + totalGolden,
      '💰 Training cost: $' + totalCost.toFixed(4),
      '🔍 Top issues: ' + (topIssues || 'None'),
      qualityWarning
    ].filter(Boolean).join('\n');

    console.log(report);

    // Send email via simple fetch to a mail service
    // For now, log the report. Email integration can be added with Resend/SendGrid
    // The report is logged to Vercel function logs for monitoring

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
};
