// Request headers carrying the signed-in user's Supabase token. The API trusts only this token,
// never a userId or email in the request body.
async function dmfAuthHeaders() {
  var h = { 'Content-Type': 'application/json' };
  try {
    var c = window.sbClient || (typeof sb !== 'undefined' && sb && sb.auth ? sb : null) || window.supabaseClient;
    if (c) {
      var s = (await c.auth.getSession()).data.session;
      if (s && s.access_token) h.Authorization = 'Bearer ' + s.access_token;
    }
  } catch (e) {}
  return h;
}

// Redeem a guest access token once per page load (both editor auth guards share the result).
// Resolves to { data, error } like the old select().single(); data.used_count is the count before this visit.
function dmfRedeemToken(client, token) {
  if (window.__dmfTokenPromise) return window.__dmfTokenPromise;
  window.__dmfTokenPromise = client.rpc('redeem_access_token', { p_token: token }).then(function (r) {
    if (!r.error) {
      var row = r.data && r.data[0];
      if (!row) return { data: null, error: { message: 'Invalid or used token' } };
      row.used_count = (row.used_count || 1) - 1;
      return { data: row, error: null };
    }
    // Database function not installed yet (supabase/security-fixes.sql): old direct lookup.
    return client.from('temp_access_tokens').select('*').eq('token', token).eq('is_active', true)
      .gt('expires_at', new Date().toISOString()).single().then(function (s) {
        var td = s.data;
        if (td && !s.error && td.used_count < td.max_uses) {
          return client.from('temp_access_tokens').update({ used_count: td.used_count + 1 }).eq('id', td.id)
            .then(function () { return s; }, function () { return s; });
        }
        return s;
      });
  });
  return window.__dmfTokenPromise;
}
