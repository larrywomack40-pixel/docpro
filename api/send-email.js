const { sendEmail } = require('../lib/email');
const { getAdmin } = require('../lib/auth');

// Only the admin panel may send email through HTTP. Server code calls lib/email directly.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const { userId, email, type, data } = req.body || {};
  if (!email || !type) return res.status(400).json({ error: 'Missing email or type' });
  const result = await sendEmail({ userId, email, type, data });
  if (result.error) return res.status(result.error.startsWith('Unknown') || result.error.startsWith('Missing') ? 400 : 500).json(result);
  return res.status(200).json(result);
};
