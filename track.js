/*
 * DraftMyForms behavioral analytics tracker.
 * Lightweight, dependency-free. Fires lifecycle events to /api/log-activity
 * (type=event) so we can understand the signup -> activation -> churn journey.
 *
 * Usage:
 *   DMFTrack.event('editor_opened', { template: 'invoice' });
 *   DMFTrack.event('document_generated', { type: 'nda' });
 *
 * The endpoint resolves the logged-in user from the Supabase bearer token
 * automatically, so events tie to accounts when the user is signed in.
 */
(function () {
  var ENDPOINT = '/api/log-activity';
  var SESSION_KEY = 'dmf_session_id';

  function getSessionId() {
    try {
      var sid = localStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = 'dmf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(SESSION_KEY, sid);
      }
      return sid;
    } catch (e) { return 'no_storage'; }
  }

  // Best-effort read of the Supabase access token from localStorage so the
  // server can resolve user_id. Token never leaves the first-party origin.
  function getAccessToken() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('-auth-token') !== -1) {
          var raw = localStorage.getItem(k);
          if (!raw) continue;
          var parsed = JSON.parse(raw);
          if (parsed && parsed.access_token) return parsed.access_token;
          if (parsed && parsed.currentSession && parsed.currentSession.access_token) {
            return parsed.currentSession.access_token;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  function send(eventName, metadata) {
    if (!eventName) return;
    var payload = {
      type: 'event',
      event_name: String(eventName),
      page: location.pathname + location.search,
      session_id: getSessionId(),
      metadata: metadata && typeof metadata === 'object' ? metadata : {}
    };
    var headers = { 'Content-Type': 'application/json' };
    var token = getAccessToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    try {
      // Prefer fetch with keepalive so events survive page unloads.
      fetch(ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) {
      // Fallback: sendBeacon (no auth header, anonymous event)
      try {
        navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      } catch (e2) {}
    }
  }

  // De-dupe identical events within a short window (avoids double-fires).
  var recent = {};
  function track(eventName, metadata) {
    var key = eventName + '|' + JSON.stringify(metadata || {});
    var now = Date.now();
    if (recent[key] && now - recent[key] < 1500) return;
    recent[key] = now;
    send(eventName, metadata);
  }

  // Auto-fire a heartbeat so last_active is fresh on every page load.
  function init() {
    track('page_view', { path: location.pathname });
  }

  window.DMFTrack = {
    event: track,
    sessionId: getSessionId
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
