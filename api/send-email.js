const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FROM_EMAIL = 'DraftMyForms <support@draftmyforms.com>';
const REPLY_TO = 'support@draftmyforms.com';
const ADMIN_EMAIL = 'larrywomack40@gmail.com';
const SITE_URL = 'https://www.draftmyforms.com';

// Cooldowns in minutes per email type
const COOLDOWNS = {
  welcome: 999999,
  email_verification: 999999,
  document_ready: 1,
  credits_low: 1440,
  payment_receipt: 5,
  subscription_cancelled: 999999,
  trial_ending: 1440,
  admin_notification: 5,
  referral_invite: 60,
  referral_converted: 999999,
  new_signup_admin: 5,
  ai_usage_admin: 60,
  email_lead: 5,
    payment_failed: 60,
      document_shared: 5
};

// ═══════════════ BRANDED EMAIL WRAPPER ═══════════════
function emailWrapper(content, footerText) {
  return '<!DOCTYPE html>' +
    '<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>DraftMyForms</title></head>' +
    '<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:Helvetica Neue,Arial,sans-serif;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F5F5F5;">' +
    '<tr><td align="center" style="padding:32px 16px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">' +
    // Header
    '<tr><td style="background:linear-gradient(135deg,#1B3A5C 0%,#2C5F8A 100%);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">' +
    '<span style="color:#D97706;font-size:22px;">&#10022;</span>' +
    '<span style="color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.5px;vertical-align:middle;margin-left:6px;">DraftMyForms</span>' +
    '</td></tr>' +
    // Body
    '<tr><td style="background-color:#FFFFFF;padding:36px 32px;">' +
    content +
    '</td></tr>' +
    // Footer
    '<tr><td style="background-color:#FAFAFA;padding:24px 32px;border-radius:0 0 12px 12px;border-top:1px solid #EEEEEE;">' +
    (footerText ? '<p style="font-size:13px;color:#888;line-height:1.5;margin:0 0 12px;">' + footerText + '</p>' : '') +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="text-align:center;">' +
    '<p style="font-size:12px;color:#AAAAAA;margin:0 0 4px;">DraftMyForms.com &mdash; Professional documents in seconds</p>' +
    '<p style="font-size:11px;color:#CCCCCC;margin:0;">Questions? Reply to this email or contact ' +
    '<a href="mailto:support@draftmyforms.com" style="color:#1B3A5C;text-decoration:none;">support@draftmyforms.com</a></p>' +
    '</td></tr></table></td></tr>' +
    '</table></td></tr></table></body></html>';
}

function emailButton(text, url, color) {
  var bg = color || '#1B3A5C';
  return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;"><tr>' +
    '<td style="border-radius:8px;background-color:' + bg + ';">' +
    '<a href="' + url + '" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">' +
    text + '</a></td></tr></table>';
}

function emailInfoRow(label, value) {
  return '<tr><td style="padding:10px 0;font-size:14px;color:#888;font-weight:600;border-bottom:1px solid #F0F0F0;">' +
    label + '</td><td style="padding:10px 0;font-size:14px;color:#333;text-align:right;border-bottom:1px solid #F0F0F0;">' +
    value + '</td></tr>';
}

function adminWrapper(subject, bodyHtml) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>' + subject + '</title></head>' +
    '<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f4;">' +
    '<tr><td align="center" style="padding:24px 16px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">' +
    '<tr><td style="background:#1B3A5C;padding:20px 24px;border-radius:10px 10px 0 0;text-align:center;">' +
    '<span style="color:#D97706;font-size:18px;font-weight:700;">&#9733; DraftMyForms Admin</span>' +
    '</td></tr>' +
    '<tr><td style="background:#fff;padding:28px 24px;">' +
    '<h2 style="color:#1B3A5C;margin:0 0 16px;font-size:18px;">' + subject + '</h2>' +
    '<div style="color:#444;font-size:14px;line-height:1.7;">' + bodyHtml + '</div>' +
    '<div style="margin-top:24px;text-align:center;">' +
    '<a href="' + SITE_URL + '/admin.html" style="display:inline-block;background:#D97706;color:#fff;padding:11px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Admin Dashboard</a>' +
    '</div></td></tr>' +
    '<tr><td style="background:#FAFAFA;padding:14px 24px;border-radius:0 0 10px 10px;text-align:center;font-size:11px;color:#AAA;">' +
    'DraftMyForms.com &mdash; Admin Notifications &mdash; <a href="mailto:support@draftmyforms.com" style="color:#1B3A5C;">support@draftmyforms.com</a>' +
    '</td></tr></table></td></tr></table></body></html>';
}

// ═══════════════ EMAIL TEMPLATES ═══════════════
function getEmailHTML(type, data) {
  var firstName = (data.userName || data.email || 'there').split(' ')[0].split('@')[0];

  // ── Welcome ──
  if (type === 'welcome') {
    var content = '<h1 style="font-size:22px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">Welcome aboard, ' + firstName + '! 🎉</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Your DraftMyForms account is ready. Start creating professional invoices, contracts, resumes, pay stubs, and more in seconds with AI.</p>' +
      '<div style="background:#F0F7FF;border-left:4px solid #1B3A5C;border-radius:4px;padding:16px 20px;margin:20px 0;">' +
      '<p style="font-size:14px;color:#333;margin:0 0 8px;font-weight:600;">🚀 Get started in 3 easy steps:</p>' +
      '<p style="font-size:14px;color:#555;line-height:2;margin:0;">' +
      '1️⃣ Browse 36,000+ templates<br>' +
      '2️⃣ Fill in your details or let AI do it<br>' +
      '3️⃣ Download as PDF, Word, or HTML</p></div>' +
      emailButton('Go to My Dashboard', SITE_URL + '/dashboard.html') +
      '<p style="font-size:13px;color:#AAA;text-align:center;margin:-12px 0 0;">Questions? Just reply to this email — we're here to help.</p>';
    return emailWrapper(content, 'You received this because you signed up for DraftMyForms.');
  }

  // ── Email Verification ──
  if (type === 'email_verification') {
    var verifyUrl = data.verifyUrl || (SITE_URL + '/dashboard.html');
    var content = '<h1 style="font-size:22px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">Verify your email address</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hi ' + firstName + ', thanks for signing up for DraftMyForms! Click the button below to verify your email address and activate your account.</p>' +
      '<div style="background:#FFF8E1;border:1px solid #F59E0B;border-radius:8px;padding:16px 20px;margin:20px 0;text-align:center;">' +
      '<p style="font-size:13px;color:#92400E;margin:0;font-weight:500;">⏰ This verification link expires in 24 hours</p>' +
      '</div>' +
      emailButton('Verify My Email Address', verifyUrl, '#22C55E') +
      '<p style="font-size:13px;color:#888;text-align:center;margin:0;">If you did not create a DraftMyForms account, you can safely ignore this email.</p>' +
      '<p style="font-size:12px;color:#AAA;text-align:center;margin:12px 0 0;">Or copy this link: <a href="' + verifyUrl + '" style="color:#1B3A5C;word-break:break-all;">' + verifyUrl + '</a></p>';
    return emailWrapper(content, 'This verification was requested for your DraftMyForms account.');
  }

  // ── Document Ready ──
  if (type === 'document_ready') {
    var docType = (data.docType || 'Document');
    var content = '<h1 style="font-size:20px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">Your ' + docType + ' is ready ✅</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', your <strong>' + docType + '</strong> has been generated and is ready to view, edit, or download.</p>' +
      emailButton('View Document', SITE_URL + '/dashboard.html') +
      '<p style="font-size:13px;color:#AAA;text-align:center;margin:0;">Your document is saved in your dashboard and available anytime.</p>';
    return emailWrapper(content);
  }

  // ── Credits Low ──
  if (type === 'credits_low') {
    var remaining = data.creditsRemaining || 0;
    var planName = data.planName || 'Free';
    var content = '<h1 style="font-size:20px;color:#D97706;margin:0 0 8px;font-weight:700;">⚠️ Credits running low</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', you have <strong style="color:#D97706;">' + remaining + ' credit' + (remaining !== 1 ? 's' : '') + '</strong> remaining on your ' + planName + ' plan.</p>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:0;">Upgrade to keep generating documents without interruption.</p>' +
      emailButton('Upgrade Plan', SITE_URL + '/settings.html', '#D97706');
    return emailWrapper(content, 'Your credits refresh at the start of each billing cycle.');
  }

  // ── Payment Receipt ──
  if (type === 'payment_receipt') {
    var planName = data.planName || 'Pro';
    var amount = data.amount || '9.99';
    var content = '<h1 style="font-size:20px;color:#22C55E;margin:0 0 8px;font-weight:700;">💳 Payment confirmed</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', your payment was successful. Here's your receipt:</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F8F9FA;border-radius:8px;padding:4px 20px;margin:24px 0;">' +
      emailInfoRow('Plan', planName) +
      emailInfoRow('Amount', '$' + amount) +
      emailInfoRow('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })) +
      emailInfoRow('Status', '<span style="color:#22C55E;font-weight:600;">Active</span>') +
      '</table>' +
      '<p style="font-size:14px;color:#888;line-height:1.5;">Your credits have been refreshed. Happy drafting!</p>' +
      emailButton('Go to Dashboard', SITE_URL + '/dashboard.html');
    return emailWrapper(content, 'This is your payment receipt. Save it for your records.');
  }

  // ── Subscription Cancelled ──
  if (type === 'subscription_cancelled') {
    var content = '<h1 style="font-size:20px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">Subscription Cancelled</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', your subscription has been cancelled. You can still access DraftMyForms on the free plan.</p>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;">If this was a mistake, you can resubscribe anytime — your documents are still safe.</p>' +
      emailButton('Resubscribe', SITE_URL + '/settings.html');
    return emailWrapper(content, 'Your documents remain accessible on the free plan.');
  }

  // ── Trial Ending ──
  if (type === 'trial_ending') {
    var daysLeft = data.daysLeft || 3;
    var content = '<h1 style="font-size:20px;color:#D97706;margin:0 0 8px;font-weight:700;">⏳ Trial Ending Soon</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', your free trial ends in <strong style="color:#D97706;">' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + '</strong>.</p>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;">Subscribe now to keep your Pro features and avoid any interruption.</p>' +
      emailButton('Subscribe Now', SITE_URL + '/settings.html', '#D97706');
    return emailWrapper(content, 'Your trial features will be downgraded when the trial expires.');
  }

  // ── Referral Invite ──
  if (type === 'referral_invite') {
    var referrerName = data.referrerName || 'A friend';
    var referralUrl = data.referralUrl || SITE_URL;
    var content = '<h1 style="font-size:22px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">🎁 You've been invited!</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;"><strong>' + referrerName + '</strong> thinks you'd love DraftMyForms — the easiest way to create professional documents with AI in seconds.</p>' +
      '<div style="background:#F0F7FF;border-radius:8px;padding:20px;margin:20px 0;">' +
      '<p style="font-size:14px;color:#333;margin:0 0 10px;font-weight:600;">What you get for free:</p>' +
      '<p style="font-size:14px;color:#555;line-height:2;margin:0;">' +
      '✓ Access to 36,000+ professional templates<br>' +
      '✓ AI-powered document generation<br>' +
      '✓ PDF, Word & HTML export<br>' +
      '✓ Invoices, contracts, pay stubs & more</p></div>' +
      emailButton('Claim Your Free Account', referralUrl, '#22C55E') +
      '<p style="font-size:12px;color:#AAA;text-align:center;margin:0;">No credit card required.</p>';
    return emailWrapper(content, 'You received this invitation from a DraftMyForms user.');
  }

  // ── Referral Converted (notify referrer) ──
  if (type === 'referral_converted') {
    var refereeName = data.refereeName || 'Someone';
    var content = '<h1 style="font-size:20px;color:#22C55E;margin:0 0 8px;font-weight:700;">🎉 Your referral signed up!</h1>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Great news, ' + firstName + '! <strong>' + refereeName + '</strong> just joined DraftMyForms using your referral link.</p>' +
      '<p style="font-size:15px;color:#555;line-height:1.6;margin:0;">Keep sharing your link to earn more rewards. Every referral counts!</p>' +
      emailButton('View My Referrals', SITE_URL + '/dashboard.html');
    return emailWrapper(content, 'You earned this notification through the DraftMyForms referral program.');
  }

  // ── Admin: New Signup ──
  if (type === 'new_signup_admin') {
    var newEmail = data.newUserEmail || 'unknown';
    var refCode = data.referralCode || 'none';
    var body = '<p>👤 <strong>New user signed up</strong></p>' +
      '<table style="width:100%;border-collapse:collapse;margin:12px 0;">' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">Email</td><td style="padding:8px 0;font-weight:600;">' + newEmail + '</td></tr>' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">Time</td><td style="padding:8px 0;">' + new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' CT</td></tr>' +
      '<tr><td style="padding:8px 0;color:#888;font-size:13px;">Referral Code Used</td><td style="padding:8px 0;">' + refCode + '</td></tr>' +
      '</table>';
    return adminWrapper('👤 New Signup: ' + newEmail, body);
  }

  // ── Admin: AI Usage Alert ──
  if (type === 'ai_usage_admin') {
    var userEmail = data.userEmail || 'unknown';
    var docType = data.docType || 'document';
    var plan = data.plan || 'free';
    var body = '<p>🤖 <strong>AI document generated</strong></p>' +
      '<table style="width:100%;border-collapse:collapse;margin:12px 0;">' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">User</td><td style="padding:8px 0;font-weight:600;">' + userEmail + '</td></tr>' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">Document Type</td><td style="padding:8px 0;">' + docType + '</td></tr>' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">Plan</td><td style="padding:8px 0;text-transform:capitalize;">' + plan + '</td></tr>' +
      '<tr><td style="padding:8px 0;color:#888;font-size:13px;">Time</td><td style="padding:8px 0;">' + new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' CT</td></tr>' +
      '</table>';
    return adminWrapper('🤖 AI Usage: ' + userEmail, body);
  }

  // ── Admin: Email Lead ──
  if (type === 'email_lead') {
    var leadEmail = data.leadEmail || 'unknown';
    var leadName = data.leadName || 'Anonymous';
    var source = data.source || 'website';
    var message = data.message || '';
    var body = '<p>📧 <strong>New email lead captured</strong></p>' +
      '<table style="width:100%;border-collapse:collapse;margin:12px 0;">' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">Name</td><td style="padding:8px 0;font-weight:600;">' + leadName + '</td></tr>' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">Email</td><td style="padding:8px 0;"><a href="mailto:' + leadEmail + '" style="color:#1B3A5C;">' + leadEmail + '</a></td></tr>' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">Source</td><td style="padding:8px 0;">' + source + '</td></tr>' +
      '<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#888;font-size:13px;">Time</td><td style="padding:8px 0;">' + new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' CT</td></tr>' +
      (message ? '<tr><td style="padding:8px 0;color:#888;font-size:13px;">Message</td><td style="padding:8px 0;">' + message + '</td></tr>' : '') +
      '</table>';
    return adminWrapper('📧 New Lead: ' + leadEmail, body);
  }

  // ── Legacy admin_notification ──
  if (type === 'admin_notification') {
    var subject = (data && data.subject) || 'Notification from DraftMyForms';
    var message = (data && data.message) || '';
    return adminWrapper(subject, message.replace(/\n/g, '<br>'));
  }

    // ── Payment Failed ──
      if (type === 'payment_failed') {
          var attempt = data.attempt || 1;
              var content = '<h1 style="font-size:20px;color:#DC2626;margin:0 0 8px;font-weight:700;">Payment Failed</h1>' +
                    '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;">Hey ' + firstName + ', we were unable to process your payment. This was attempt <strong>' + attempt + '</strong>.</p>' +
                          '<p style="font-size:15px;color:#555;line-height:1.6;margin:0;">Please update your payment method to keep your subscription active and avoid losing access to premium features.</p>' +
                                emailButton('Update Payment Method', SITE_URL + '/settings.html', '#DC2626') +
                                      '<p style="font-size:13px;color:#AAA;text-align:center;margin:0;">If you believe this is an error, please contact support.</p>';
                                          return emailWrapper(content, 'Your subscription may be paused if payment is not resolved.');
                                            }

                                              // ── Document Shared ──
                                                if (type === 'document_shared') {
                                                    var senderName = data.senderName || 'Someone';
                                                        var docName = data.docName || 'a document';
                                                            var shareUrl = data.shareUrl || (SITE_URL + '/dashboard.html');
                                                                var content = '<h1 style="font-size:20px;color:#1A1A1A;margin:0 0 8px;font-weight:700;">A document was shared with you</h1>' +
                                                                      '<p style="font-size:15px;color:#555;line-height:1.6;margin:16px 0;"><strong>' + senderName + '</strong> shared <strong>' + docName + '</strong> with you on DraftMyForms.</p>' +
                                                                            emailButton('View Document', shareUrl) +
                                                                                  '<p style="font-size:13px;color:#AAA;text-align:center;margin:0;">You can view and download this document from your dashboard.</p>';
                                                                                      return emailWrapper(content, 'You received this because someone shared a document with you on DraftMyForms.');
                                                                                        }

  return '';
}

// ═══════════════ THROTTLE CHECK ═══════════════
async function canSendEmail(userId, emailType) {
  try {
    if (!userId) return true;
    var cooldown = COOLDOWNS[emailType] || 60;
    var { data, error } = await supabase.from('email_log').select('sent_at')
      .eq('user_id', userId).eq('email_type', emailType)
      .order('sent_at', { ascending: false }).limit(1);
    if (error) { console.error('email_log query error:', error.message); return true; }
    if (!data || data.length === 0) return true;
    var diff = (new Date() - new Date(data[0].sent_at)) / (1000 * 60);
    return diff >= cooldown;
  } catch (e) {
    console.error('canSendEmail error:', e.message);
    return true;
  }
}

// ═══════════════ INPUT SANITIZATION ═══════════════
function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=*/gi, '').trim().slice(0, 5000);
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
    if (!email || !type) return res.status(400).json({ error: 'Missing email or type' });

    // Sanitize inputs
    email = sanitizeEmail(email);
    if (!email) return res.status(400).json({ error: 'Invalid email' });
    type = sanitizeText(type);

    // Check throttle
    var allowed = await canSendEmail(userId, type);
    if (!allowed) return res.status(200).json({ skipped: true, reason: 'cooldown' });

    // Build email
    var html = getEmailHTML(type, { ...data, email });
    if (!html) return res.status(400).json({ error: 'Unknown email type: ' + type });

    var subjects = {
      welcome: 'Welcome to DraftMyForms! 🎉',
      email_verification: 'Verify your DraftMyForms email address',
      document_ready: 'Your ' + (data && data.docType || 'Document') + ' is Ready',
      credits_low: 'You have ' + (data && data.creditsRemaining || 0) + ' credit(s) left',
      payment_receipt: 'Payment Confirmed – ' + (data && data.planName || 'Pro') + ' Plan',
      subscription_cancelled: 'Your DraftMyForms Subscription Has Been Cancelled',
      trial_ending: 'Your Trial Ends in ' + (data && data.daysLeft || 3) + ' Days',
      referral_invite: (data && data.referrerName || 'Your friend') + ' invited you to DraftMyForms',
      referral_converted: '🎉 Your referral just signed up!',
      new_signup_admin: '👤 New Signup: ' + (data && data.newUserEmail || email),
      ai_usage_admin: '🤖 AI Usage Alert – DraftMyForms',
      email_lead: '📧 New Lead: ' + (data && data.leadEmail || email),
      admin_notification: (data && data.subject) || 'Notification from DraftMyForms',
            payment_failed: 'Action Required: Payment Failed',
                  document_shared: (data && data.senderName || 'Someone') + ' shared a document with you'
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

    // Log the email (non-blocking)
    try {
      await supabase.from('email_log').insert({
        user_id: userId,
        email_type: type,
        resend_id: emailResult && emailResult.id || null
      });
    } catch (logErr) {
      console.error('email_log insert error:', logErr.message);
    }

    return res.status(200).json({ success: true, id: emailResult && emailResult.id });
  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: err.message });
  }
};
