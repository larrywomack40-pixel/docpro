/**
 * DraftMyForms — Document Engine Widget
 * Connects to MAXKS engine at 159.203.135.154:8000
 * Drop this script into the DraftMyForms dashboard HTML
 */

const MAXKS_ENGINE = 'http://159.203.135.154:8000';

// ─── PLAN ACCESS MAP ───────────────────────────────────────────────────────────
const PLAN_DOCS = {
  free:     ['pay-stub', 'invoice', 'quote', 'ramp-quote'],
  pro:      ['pay-stub', 'invoice', 'quote', 'ramp-quote',
             'nda', 'contractor-agreement', 'bill-of-sale',
             'eviction-notice', 'home-mod-assessment'],
  business: ['pay-stub', 'invoice', 'quote', 'ramp-quote',
             'nda', 'contractor-agreement', 'bill-of-sale',
             'eviction-notice', 'home-mod-assessment',
             'advance-directive', 'power-of-attorney'],
};

// ─── MAIN ENGINE UI ────────────────────────────────────────────────────────────
async function initDocEngine(containerId, supabaseClient) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Get current user session
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    container.innerHTML = '<p style="color:#888">Please sign in to access the Document Engine.</p>';
    return;
  }

  const jwt = session.access_token;
  const userPlan = window.__dmf_user_plan || 'free';

  // Fetch catalog from MAXKS
  let catalog = [];
  try {
    const r = await fetch(`${MAXKS_ENGINE}/api/docs/catalog`);
    const d = await r.json();
    catalog = d.documents || [];
  } catch(e) {
    container.innerHTML = '<p style="color:#f44">Document engine offline. Please try again later.</p>';
    return;
  }

  // Filter by plan
  const allowed = PLAN_DOCS[userPlan] || PLAN_DOCS.free;
  const available = catalog.filter(doc => allowed.includes(doc.id));
  const locked    = catalog.filter(doc => !allowed.includes(doc.id));

  // Render UI
  container.innerHTML = `
    <div style="font-family:system-ui,sans-serif">
      <h3 style="font-size:16px;font-weight:700;margin:0 0 12px">
        📄 Document Engine
        <span style="font-size:11px;background:#e8f0fe;color:#2563eb;
                     padding:2px 8px;border-radius:10px;margin-left:8px;
                     font-weight:500">${userPlan.toUpperCase()}</span>
      </h3>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        ${available.map(doc => `
          <div onclick="dmfSelectDoc('${doc.id}', this)"
               data-doc-id="${doc.id}"
               style="border:1px solid #e0e0e0;border-radius:6px;padding:10px;
                      cursor:pointer;transition:all 0.15s;background:#fff"
               onmouseover="this.style.borderColor='#2563eb';this.style.background='#f0f5ff'"
               onmouseout="if(!this.classList.contains('selected')){this.style.borderColor='#e0e0e0';this.style.background='#fff'}">
            <div style="font-size:12px;font-weight:600;color:#1a1a1a">${doc.icon} ${doc.label}</div>
            <div style="font-size:10px;color:#888;margin-top:2px">${doc.description.slice(0,50)}...</div>
          </div>
        `).join('')}
        ${locked.map(doc => `
          <div style="border:1px solid #e0e0e0;border-radius:6px;padding:10px;
                      opacity:0.5;background:#fafafa;cursor:not-allowed"
               title="Requires ${doc.id in ['advance-directive','power-of-attorney'] ? 'Business' : 'Pro'} plan">
            <div style="font-size:12px;font-weight:600;color:#888">${doc.icon} ${doc.label} 🔒</div>
            <div style="font-size:10px;color:#aaa;margin-top:2px">Upgrade to unlock</div>
          </div>
        `).join('')}
      </div>

      <div id="dmf-engine-form" style="display:none;border:1px solid #e0e0e0;
           border-radius:6px;padding:16px;background:#fafafa">
        <div id="dmf-form-title" style="font-size:14px;font-weight:700;margin-bottom:12px"></div>
        <div id="dmf-form-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"></div>
        <div style="margin-top:14px;display:flex;gap:10px;align-items:center">
          <button onclick="dmfGenerate('${jwt}')"
                  style="background:#2563eb;color:#fff;border:none;padding:10px 20px;
                         border-radius:6px;font-weight:600;cursor:pointer;font-size:13px">
            ⚡ Generate PDF
          </button>
          <span id="dmf-gen-status" style="font-size:12px;color:#888"></span>
        </div>
      </div>

      <div id="dmf-history" style="margin-top:16px">
        <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:8px">
          Recent Documents
          <button onclick="dmfLoadHistory('${jwt}')"
                  style="margin-left:8px;background:none;border:1px solid #ddd;
                         padding:2px 8px;border-radius:4px;cursor:pointer;font-size:11px">
            ⟳ Refresh
          </button>
        </div>
        <div id="dmf-history-list" style="font-size:12px;color:#888">
          <span onclick="dmfLoadHistory('${jwt}')" style="cursor:pointer;color:#2563eb">
            Load document history
          </span>
        </div>
      </div>
    </div>
  `;

  // Store catalog for later use
  window.__dmf_catalog = catalog;
  window.__dmf_jwt = jwt;
}

let _dmfSelectedDoc = null;

function dmfSelectDoc(docId, el) {
  document.querySelectorAll('[data-doc-id]').forEach(e => {
    e.classList.remove('selected');
    e.style.borderColor = '#e0e0e0';
    e.style.background = '#fff';
  });
  el.classList.add('selected');
  el.style.borderColor = '#2563eb';
  el.style.background = '#f0f5ff';

  const doc = (window.__dmf_catalog || []).find(d => d.id === docId);
  if (!doc) return;
  _dmfSelectedDoc = doc;

  const formEl = document.getElementById('dmf-engine-form');
  const titleEl = document.getElementById('dmf-form-title');
  const fieldsEl = document.getElementById('dmf-form-fields');

  formEl.style.display = 'block';
  titleEl.textContent = `${doc.icon} ${doc.label}`;

  fieldsEl.innerHTML = doc.fields.map(field => {
    const req = field.required ? '<span style="color:#f44">*</span>' : '';
    let input = '';
    if (field.type === 'textarea') {
      input = `<textarea id="dmf-field-${field.name}"
                style="width:100%;border:1px solid #ddd;border-radius:4px;
                       padding:7px;font-size:12px;resize:vertical;
                       min-height:60px;box-sizing:border-box"
                placeholder="${field.label}"></textarea>`;
    } else if (field.type === 'select' && field.options) {
      input = `<select id="dmf-field-${field.name}"
                style="width:100%;border:1px solid #ddd;border-radius:4px;
                       padding:7px;font-size:12px;box-sizing:border-box">
                <option value="">-- Select --</option>
                ${field.options.map(o => `<option value="${o}">${o}</option>`).join('')}
               </select>`;
    } else {
      const t = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text';
      input = `<input type="${t}" id="dmf-field-${field.name}"
                placeholder="${field.label}"
                style="width:100%;border:1px solid #ddd;border-radius:4px;
                       padding:7px;font-size:12px;box-sizing:border-box">`;
    }
    const span = field.type === 'textarea' ? 'grid-column:1/-1' : '';
    return `<div style="${span}">
      <label style="font-size:11px;color:#555;display:block;margin-bottom:3px">
        ${field.label} ${req}
      </label>
      ${input}
    </div>`;
  }).join('');
}

async function dmfGenerate(jwt) {
  if (!_dmfSelectedDoc) return;
  const status = document.getElementById('dmf-gen-status');
  if (status) { status.textContent = 'Generating...'; status.style.color = '#f80'; }

  const fields = {};
  _dmfSelectedDoc.fields.forEach(f => {
    const el = document.getElementById('dmf-field-' + f.name);
    if (el) fields[f.name] = el.value;
  });

  try {
    const r = await fetch(`${MAXKS_ENGINE}/api/docs/generate-for-user`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({doc_id: _dmfSelectedDoc.id, fields, jwt_token: jwt})
    });
    const d = await r.json();

    if (d.status === 'ok') {
      if (status) { status.textContent = '✓ Ready!'; status.style.color = '#16a34a'; }
      // Auto-download
      const a = document.createElement('a');
      a.href = d.download_url;
      a.download = `${_dmfSelectedDoc.id}-${Date.now()}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Refresh history
      setTimeout(() => dmfLoadHistory(jwt), 1000);
    } else if (d.code === 'PLAN_REQUIRED') {
      if (status) {
        status.innerHTML = `🔒 Requires ${d.current_plan === 'free' ? 'Pro' : 'Business'} plan.
          <a href="${d.upgrade_url}" style="color:#2563eb">Upgrade →</a>`;
        status.style.color = '#f44';
      }
    } else {
      if (status) { status.textContent = 'Error: ' + (d.error || 'unknown'); status.style.color = '#f44'; }
    }
  } catch(e) {
    if (status) { status.textContent = 'Connection error'; status.style.color = '#f44'; }
  }
}

async function dmfLoadHistory(jwt) {
  const list = document.getElementById('dmf-history-list');
  if (!list) return;
  list.textContent = 'Loading...';

  try {
    const r = await fetch(`${MAXKS_ENGINE}/api/docs/user-history`, {
      headers: {'Authorization': `Bearer ${jwt}`}
    });
    const d = await r.json();
    const docs = (d.documents || []).slice(0, 8);

    if (!docs.length) {
      list.textContent = 'No documents generated yet.';
      return;
    }

    list.innerHTML = docs.map(doc => `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:6px 0;border-bottom:1px solid #f0f0f0">
        <div>
          <span style="font-weight:600;color:#1a1a1a">${doc.doc_label}</span>
          <span style="color:#aaa;margin-left:6px">${doc.created_at.slice(0,10)}</span>
        </div>
        <a href="${MAXKS_ENGINE}/api/docs/download/${doc.vault_id}"
           target="_blank"
           style="background:#2563eb;color:#fff;padding:3px 10px;
                  border-radius:4px;font-size:11px;text-decoration:none;
                  font-weight:600">
          ⬇ PDF
        </a>
      </div>
    `).join('');
  } catch(e) {
    list.textContent = 'Error loading history.';
  }
}
