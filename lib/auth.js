const { createClient } = require('@supabase/supabase-js');

const ADMIN_EMAILS = ['larrywomack40@gmail.com'];
let admin = null;

// Service-role client. Server-side only.
function adminClient() {
  if (!admin) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase is not configured');
    admin = createClient(url, key);
  }
  return admin;
}

// The signed-in Supabase user from "Authorization: Bearer <access token>", or null.
// Never trust a userId or email sent in the request body.
async function getUser(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return null;
  try {
    const { data, error } = await adminClient().auth.getUser(m[1].trim());
    return error || !data || !data.user ? null : data.user;
  } catch (e) {
    console.error('getUser error:', e.message);
    return null;
  }
}

async function getAdmin(req) {
  const user = await getUser(req);
  return user && ADMIN_EMAILS.includes((user.email || '').toLowerCase()) ? user : null;
}

module.exports = { adminClient, getUser, getAdmin, ADMIN_EMAILS };
