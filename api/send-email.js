const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FROM_EMAIL = 'DraftMyForms <support@draftmyforms.com>';
const REPLY_TO = 'support@draftmyforms.com';

// Cooldowns in minutes per email type
const COOLDOWNS = {
  welcome: 999999,
  document_ready: 1,
  credits_low: 1440,
  payment_receipt: 5,
  subscription_cancelled: 999999,
  trial_ending: 1440
};

// ═══════════════ BRANDED EMAIL WRAPPER ═══════════════
function emailWrapper(content, footerText) {
  return '<!DOCTYPE html>'
    + '<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>DraftMyForms</title></head>'
    + '<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:Helvetica Neue,Arial,sans-serif;">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F5F5F5;">'
    + '<tr><td align="center" style="padding:32px 16px;">'
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">'
    // Header
    + '<tr><td style="background:linear-gradient(135deg,#1B3A5C 0%,#2C5F8A 100%);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">'
    + '<span style="color:#D97706;font-size:22px;">&#10022;</span>'
    + '<span style="color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.5px;vertical-align:middle;margin-left:6px;">DraftMyForms</span>'
    + '</td></tr>'
    // Body
    + '<tr><td style="background-color:#FFFFFF;padding:36px 32px;">'
    + content
    + '</td></tr>'
    // Footer
    + '<tr><td style="background-color:#FAFAFA;padding:24px 32px;border-radius:0 0 12px 12px;border-top:1px solid #EEEEEE;">'
    + (footerText ? '<p style="font-size:13px;color:#888;line-height:1.5;margin:0 0 12px;">' + footerText + '</p>' : '')
    + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="text-align:center;">'
    + '<p style="font-size:12px;color:#AAAAAA;margin:0 0 4px;">DraftMyForms.com &mdash; Professional documents in seconds</p>'
    + '<p style="font-size:11px;color:#CCCCCC;margin:0;">Questions? Reply to this email or contact '
    + '<a href="mailto:support@draftmyforms.com" style="color:#1B3A5C;text-decoration:none;">support@draftmyforms.com</a></p>'
    + '</td></tr></table></td></tr>'
    + '</table></td></tr></table></body></html>';
}

function emailButton(text, url, color) {
  var bg = color || '#1B3A5C';
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;"><tr>'
    + '<td style="border-radius:8px;background-color:' + bg + ';">'
    + '<a href="' + url + '" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">'
    + text + '</a></td></tr></table>';
}

function emailInfoRow(label, value) {
  return '<tr><td style="padding:10px 0;font-size:14px;color:#888;font-weight:600;border-bottom:1px solid #F0F0F0;">'
    + label + '</td><td style="padding:10px 0;font-size:14px;color:#333;text-align:right;border-bottom:1px solid #F0F0F0;">'
    + value + '</td></tr>';
}

// ═══════════════ EMAIL TEMPLATES ═══════════════
function getEmailHTML(type, data) {
  var firstName = (data.userName || data.email || 'there').split(' ')[0].split('@')[0];

  if (type === 'welcome') {
    var content = '<h1 style="font-size:22px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">Welcome aboard, ' + firstName + '!</h1>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Your DraftMyForms account is ready. Start creating professional invoices, contracts, resumes, pay stubs, and more in seconds with AI.</p>'
      + '<div style="background:#F8F9FA;border-radius:8px;padding:20px;margin:24px 0;">'
      + '<p style="font-size:14px;color:#333;margin:0 0 8px;font-weight:600;">Here\u2019s what you can do:</p>'
      + '<p style="font-size:14px;color:#555;line-height:1.8;margin:0;">'
      + '&#10003; Generate documents with AI in one click<br>'
      + '&#10003; Choose from thousands of professional templates<br>'
      + '&#10003; Export to PDF, Word, or HTML<br>'
      + '&#10003; Custom branding with your logo</p></div>'
      + emailButton('Go to Dashboard', 'https://draftmyforms.com/dashboard.html');
    return emailWrapper(content, 'You received this because you signed up for DraftMyForms.');
  }

  if (type === 'document_ready') {
    var docType = (data.docType || 'Document');
    var content = '<h1 style="font-size:20px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">Your ' + docType + ' is ready</h1>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', your <strong>' + docType + '</strong> has been generated and is ready to view, edit, or download.</p>'
      + emailButton('View Document', 'https://draftmyforms.com/dashboard.html')
      + '<p style="font-size:13px;color:#AAA;text-align:center;margin:0;">Your document is saved in your dashboard and available anytime.</p>';
    return emailWrapper(content);
  }

  if (type === 'credits_low') {
    var remaining = data.creditsRemaining || 0;
    var planName = data.planName || 'Free';
    var content = '<h1 style="font-size:20px;color:#D97706;margin:0 0 8px;font-weight:700;">Credits running low</h1>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', you have <strong style="color:#D97706;">' + remaining + ' credit' + (remaining !== 1 ? 's' : '') + '</strong> remaining on your ' + planName + ' plan.</p>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;margin:0;">Upgrade to keep generating documents without interruption.</p>'
      + emailButton('Upgrade Plan', 'https://draftmyforms.com/settings.html', '#D97706');
    return emailWrapper(content, 'Your credits refresh at the start of each billing cycle.');
  }

  if (type === 'payment_receipt') {
    var planName = data.planName || 'Pro';
    var amount = data.amount || '9.99';
    var content = '<h1 style="font-size:20px;color:#22C55E;margin:0 0 8px;font-weight:700;">Payment confirmed</h1>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', your payment was successful. Here\u2019s your receipt:</p>'
      + '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F8F9FA;border-radius:8px;padding:4px 20px;margin:24px 0;">'
      + emailInfoRow('Plan', planName)
      + emailInfoRow('Amount', '$' + amount)
      + emailInfoRow('Status', '<span style="color:#22C55E;font-weight:600;">Active</span>')
      + '</table>'
      + '<p style="font-size:14px;color:#888;line-height:1.5;">Your credits have been refreshed. Happy drafting!</p>'
      + emailButton('Go to Dashboard', 'https://draftmyforms.com/dashboard.html');
    return emailWrapper(content, 'This is your payment receipt. Save it for your records.');
  }


  if (type === 'subscription_cancelled') {
    var content = '<h1 style="font-size:20px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">Subscription Cancelled</h1>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', your subscription has been cancelled. You can still use DraftMyForms on the free plan.</p>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;">If this was a mistake, you can resubscribe anytime.</p>'
      + emailButton('Resubscribe', 'https://draftmyforms.com/settings.html');
    return emailWrapper(content, 'Your documents are still safe and accessible on the free plan.');
  }

  if (type === 'trial_ending') {
    var daysLeft = data.daysLeft || 3;
    var content = '<h1 style="font-size:20px;color:#D97706;margin:0 0 8px;font-weight:700;">Trial Ending Soon</h1>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', your free trial ends in <strong style="color:#D97706;">' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + '</strong>.</p>'
      + '<p style="font-size:15px;color:#555;line-height:1.6;">Subscribe now to keep your Pro features.</p>'
      + emailButton('Subscribe Now', 'https://draftmyforms.com/settings.html', '#D97706');
    return emailWrapper(content, 'Your trial features will be downgraded when the trial expires.');
  }

  return '';
}

// ═══════════════ THROTTLE CHECK ═══════════════
async function canSendEmail(userId, emailType) {
  try {
    var cooldown = COOLDOWNS[emailType] || 60;
    var { data, error } = await supabase.from('email_log').select('sent_at')
      .eq('user_id', userId).eq('email_type', emailType)
      .order('sent_at', { ascending: false }).limit(1);
    if (error) { console.error('email_log query error:', error.message); return true; }
    if (!data || data.length === 0) return true;
    var diff = (new Date() - new Date(data[0].sent_at)) / (1000 * 60);
    return diff >= cooldown;
  } catch (e) { console.error('canSendEmail error:', e.message); return true; }
}

// ═══════════════ INPUT SANITIZATION ═══════════════
function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\\w+=*/gi, '').trim().slice(0, 5000);
}

function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  var cleaned = email.trim().toLowerCase();
  var re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(cleaned) ? cleaned : '';
}

// ═══════════════ HANDLER ═══════════════
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    var { userId, email, type, data } = req.body;
    if (!userId || !email || !type) return res.status(400).json({ error: 'Missing userId, email, or type' });

    // Sanitize inputs
    email = sanitizeEmail(email);
    if (!email) return res.status(400).json({ error: 'Invalid email' });
    type = sanitizeText(type);

    // Check throttle
    var allowed = await canSendEmail(userId, type);
    if (!allowed) return res.status(200).json({ skipped: true, reason: 'cooldown' });

    // Build email
    var html = getEmailHTML(type, { ...data, email });
    if (!html) return res.status(400).json({ error: 'Unknown email type' });

    var subjects = {
      welcome: 'Welcome to DraftMyForms!',
      document_ready: 'Your ' + (data && data.docType || 'Document') + ' is Ready',
      credits_low: 'You have ' + (data && data.creditsRemaining || 0) + ' credit(s) left',
      payment_receipt: 'Payment Confirmed - ' + (data && data.planName || 'Pro') + ' Plan',
      subscription_cancelled: 'Your DraftMyForms Subscription Has Been Cancelled',
      trial_ending: 'Your Trial Ends in ' + (data && data.daysLeft || 3) + ' Days'
    };

    var { data: emailResult, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: subjects[type] || 'DraftMyForms Notification',
      html: html,
      reply_to: REPLY_TO
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Email send failed' });
    }

    // Log the email (non-blocking - don't fail if table missing)
    try {
      await supabase.from('email_log').insert({
        user_id: userId,
        email_type: type,
        resend_id: emailResult && emailResult.id || null
      });
    } catch (logErr) { console.error('email_log insert error:', logErr.message); }

    return res.status(200).json({ success: true, id: emailResult && emailResult.id });
  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: err.message });
  }
};
