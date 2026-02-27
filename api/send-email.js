const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FROM_EMAIL = 'DraftMyForms <support@draftmyforms.com>';

// Cooldowns in minutes per email type
const COOLDOWNS = {
  welcome: 999999,
  document_ready: 1,
  credits_low: 1440,
  payment_receipt: 5
};

// Email templates
function getEmailHTML(type, data) {
  const firstName = (data.userName || data.email || 'there').split(' ')[0].split('@')[0];
  const header = function(title, bg) {
    return '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">' +
      '<div style="background:' + (bg || '#1B3A5C') + ';padding:24px 32px;text-align:center">' +
      '<h1 style="color:#fff;margin:0;font-size:20px">' + title + '</h1></div>';
  };
  const footer = '<div style="background:#f5f5f5;padding:16px;text-align:center">' +
    '<p style="font-size:12px;color:#999;margin:0">DraftMyForms.com</p></div></div>';
  const btn = function(text, url, bg) {
    return '<div style="text-align:center;margin:32px 0"><a href="' + url + '" ' +
      'style="background:' + (bg || '#1B3A5C') + ';color:#fff;padding:14px 32px;' +
      'border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">' + text + '</a></div>';
  };

  if (type === 'welcome') {
    return header('Welcome to DraftMyForms') +
      '<div style="padding:32px"><p style="font-size:16px;color:#333">Hey ' + firstName + ',</p>' +
      '<p style="font-size:15px;color:#555;line-height:1.6">Your account is set up. Start generating professional documents — pay stubs, invoices, resumes, contracts, and more.</p>' +
      btn('Go to Dashboard', 'https://draftmyforms.com/dashboard.html') +
      '<p style="font-size:14px;color:#888">Questions? Just reply to this email.</p></div>' + footer;
  }
  if (type === 'document_ready') {
    return header('Your ' + (data.docType || 'Document') + ' is Ready') +
      '<div style="padding:32px"><p style="font-size:15px;color:#555;line-height:1.6">' +
      'Hey ' + firstName + ', your <strong>' + (data.docType || 'document') + '</strong> has been generated and is ready.</p>' +
      btn('View Document', 'https://draftmyforms.com/dashboard.html') +
      '<p style="font-size:13px;color:#999">Available in your dashboard anytime.</p></div>' + footer;
  }
  if (type === 'credits_low') {
    return header('Credits Running Low', '#D97706') +
      '<div style="padding:32px"><p style="font-size:15px;color:#555;line-height:1.6">' +
      'Hey ' + firstName + ', you have <strong>' + data.creditsRemaining + ' credit' + (data.creditsRemaining !== 1 ? 's' : '') + '</strong> remaining on your ' + (data.planName || 'Free') + ' plan.</p>' +
      '<p style="font-size:15px;color:#555">Upgrade to keep generating documents without interruption.</p>' +
      btn('Upgrade Plan', 'https://draftmyforms.com/pricing.html', '#D97706') + '</div>' + footer;
  }
  if (type === 'payment_receipt') {
    return header('Payment Confirmed') +
      '<div style="padding:32px"><p style="font-size:15px;color:#555">Hey ' + firstName + ', your payment went through.</p>' +
      '<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:24px 0">' +
      '<table style="width:100%;font-size:14px;color:#555">' +
      '<tr><td style="padding:8px 0;font-weight:600">Plan</td><td style="text-align:right">' + (data.planName || 'Pro') + '</td></tr>' +
      '<tr><td style="padding:8px 0;font-weight:600">Amount</td><td style="text-align:right">$' + (data.amount || '9.99') + '</td></tr>' +
      '</table></div>' +
      '<p style="font-size:14px;color:#888">Your credits have been refreshed. Happy drafting!</p></div>' + footer;
  }
  return '';
}

// Throttle check
async function canSendEmail(userId, emailType) {
  const cooldown = COOLDOWNS[emailType] || 60;
  const { data } = await supabase.from('email_log').select('sent_at')
    .eq('user_id', userId).eq('email_type', emailType)
    .order('sent_at', { ascending: false }).limit(1).single();
  if (!data) return true;
  var diff = (new Date() - new Date(data.sent_at)) / (1000 * 60);
  return diff >= cooldown;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, email, type, data } = req.body;
    if (!userId || !email || !type) return res.status(400).json({ error: 'Missing userId, email, or type' });

    // Check throttle
    const allowed = await canSendEmail(userId, type);
    if (!allowed) return res.status(200).json({ skipped: true, reason: 'cooldown' });

    // Build email
    const html = getEmailHTML(type, { ...data, email });
    if (!html) return res.status(400).json({ error: 'Unknown email type' });

    const subjects = {
      welcome: 'Welcome to DraftMyForms!',
      document_ready: 'Your ' + (data && data.docType || 'Document') + ' is Ready',
      credits_low: 'You have ' + (data && data.creditsRemaining || 0) + ' credit(s) left',
      payment_receipt: 'Payment Confirmed - ' + (data && data.planName || 'Pro') + ' Plan'
    };

    const { data: emailResult, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: subjects[type] || 'DraftMyForms Notification',
      html: html
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Email send failed' });
    }

    // Log the email
    await supabase.from('email_log').insert({
      user_id: userId,
      email_type: type,
      resend_id: emailResult && emailResult.id || null
    });

    return res.status(200).json({ success: true, id: emailResult && emailResult.id });
  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: err.message });
  }
};
