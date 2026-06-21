/*
 * DraftMyForms behavioral analytics tracker (auto-instrumenting).
 * Dependency-free. Fires lifecycle events to /api/log-activity (type=event)
 * so we can understand the signup -> activation -> churn journey.
 *
 * Just include on any page:  <script src="/track.js"></script>
 * It auto-detects the page and wires the relevant funnel events. You can
 * also fire events manually:  DMFTrack.event('document_generated', {type:'nda'});
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
      fetch(ENDPOINT, { method: 'POST', headers: headers, body: JSON.stringify(payload), keepalive: true }).catch(function () {});
    } catch (e) {
      try { navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], { type: 'application/json' })); } catch (e2) {}
    }
  }

  var recent = {};
  function track(eventName, metadata) {
    var key = eventName + '|' + JSON.stringify(metadata || {});
    var now = Date.now();
    if (recent[key] && now - recent[key] < 1500) return;
    recent[key] = now;
    send(eventName, metadata);
  }

  // ---- Auto-instrumentation -------------------------------------------------
  function textOf(el) {
    return ((el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || el.id || '') + '').toLowerCase();
  }

  // Map a clicked control's text to a funnel event name.
  function classify(t) {
    if (!t) return null;
    if (/\bgenerate\b|\bcreate document\b|\bai (write|generate|draft)\b|generate with ai/.test(t)) return 'document_generated';
    if (/\bdownload\b|\bexport\b|\bpdf\b|\bdocx\b/.test(t)) return 'document_downloaded';
    if (/\bsave\b/.test(t)) return 'document_saved';
    if (/\bprint\b/.test(t)) return 'document_printed';
    if (/\bsign\b|signature/.test(t)) return 'document_signed';
    if (/\bshare\b/.test(t)) return 'document_shared';
    if (/\bupgrade\b|\bsubscribe\b|\bgo pro\b|\bget pro\b|\bbusiness plan\b|\bpricing\b/.test(t)) return 'upgrade_clicked';
    if (/\btemplate\b|\buse this\b/.test(t)) return 'template_selected';
    if (/\bsign up\b|create account|get started|register/.test(t)) return 'signup_clicked';
    if (/\bsign in\b|\blog ?in\b/.test(t)) return 'login_clicked';
    return null;
  }

  function onClick(e) {
    var el = e.target;
    for (var hops = 0; el && hops < 4; hops++) {
      if (el.tagName && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button' || el.tagName === 'INPUT')) {
        var name = classify(textOf(el));
        if (name) { track(name, { label: (el.innerText || el.value || '').trim().slice(0, 60) }); return; }
      }
      el = el.parentElement;
    }
  }

  function pageEvent() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('editor') !== -1) return 'editor_opened';
    if (p.indexOf('dashboard') !== -1) return 'dashboard_viewed';
    if (p.indexOf('templates') !== -1) return 'templates_browsed';
    if (p.indexOf('index') !== -1 || p === '/' || p === '') return 'landing_viewed';
    return 'page_view';
  }

  function init() {
    track(pageEvent(), { path: location.pathname });
    document.addEventListener('click', onClick, true);
    // Mark activation milestone the first time auth token appears on editor.
    try {
      if (getAccessToken() && location.pathname.toLowerCase().indexOf('editor') !== -1) {
        track('authenticated_editor_session', {});
      }
    } catch (e) {}
  }

  window.DMFTrack = { event: track, sessionId: getSessionId };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
