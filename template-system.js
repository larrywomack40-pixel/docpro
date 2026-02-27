/**
 * DraftMyForms Template System v2
 * Fetches templates from Supabase via /api/templates-list
 * Provides pagination, search, industry filter, tier access control
 */
(function() {
  'use strict';

  // ── CONFIG (prices from config, never hardcoded in components) ──
  const PLAN_CONFIG = {
    free:     { label: 'Free',     price: 0,     rank: 0 },
    pro:      { label: 'Pro',      price: 9.99,  rank: 1 },
    business: { label: 'Business', price: 24.99, rank: 2 }
  };

  const ADMIN_EMAILS = ['larrywomack40@gmail.com'];
  const PAGE_SIZE = 30;

  // ── STATE ──
  let currentPage = 1;
  let currentIndustry = 'all';
  let currentDocType = 'all';
  let currentSearch = '';
  let totalTemplates = 0;
  let hasMore = false;
  let isLoading = false;
  let allLoadedTemplates = [];
  let userPlan = 'free';
  let userEmail = '';
  let planLoaded = false;

  // ── TIER ACCESS ──
  function getUserPlan() {
    return window.__dmfUserPlan || userPlan || 'free';
  }

  function isAdmin() {
    const email = window.__dmfUserEmail || userEmail || '';
    return ADMIN_EMAILS.includes(email);
  }

  function canAccess(templateTier) {
    if (isAdmin()) return true;
    const plan = getUserPlan();
    const userRank = (PLAN_CONFIG[plan] ?? PLAN_CONFIG.free).rank;
    const templateRank = (PLAN_CONFIG[templateTier] ?? PLAN_CONFIG.free).rank;
    return userRank >= templateRank;
  }

  function getRequiredPlanLabel(templateTier) {
    return (PLAN_CONFIG[templateTier] || PLAN_CONFIG.pro).label;
  }

  function getRequiredPlanPrice(templateTier) {
    return (PLAN_CONFIG[templateTier] || PLAN_CONFIG.pro).price;
  }

  // ── INDUSTRIES for filter dropdown ──
  const INDUSTRIES = [
    { id: 'all', label: 'All Industries' },
    { id: 'general', label: 'General' },
    { id: 'blank', label: 'Blank' },
    { id: 'consulting', label: 'Consulting' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'legal', label: 'Legal' },
    { id: 'marketing-agency', label: 'Marketing Agency' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'financial-advisory', label: 'Financial Advisory' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'medical-practice', label: 'Medical Practice' },
    { id: 'dental', label: 'Dental' },
    { id: 'pharmacy', label: 'Pharmacy' },
    { id: 'mental-health', label: 'Mental Health' },
    { id: 'veterinary', label: 'Veterinary' },
    { id: 'home-health', label: 'Home Health' },
    { id: 'software', label: 'Software' },
    { id: 'saas', label: 'SaaS' },
    { id: 'it-services', label: 'IT Services' },
    { id: 'cybersecurity', label: 'Cybersecurity' },
    { id: 'web-development', label: 'Web Development' },
    { id: 'construction', label: 'Construction' },
    { id: 'plumbing', label: 'Plumbing' },
    { id: 'electrical', label: 'Electrical' },
    { id: 'hvac', label: 'HVAC' },
    { id: 'landscaping', label: 'Landscaping' },
    { id: 'cleaning', label: 'Cleaning' },
    { id: 'auto-repair', label: 'Auto Repair' },
    { id: 'handyman', label: 'Handyman' },
    { id: 'photography', label: 'Photography' },
    { id: 'graphic-design', label: 'Graphic Design' },
    { id: 'video-production', label: 'Video Production' },
    { id: 'interior-design', label: 'Interior Design' },
    { id: 'event-planning', label: 'Event Planning' },
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'retail', label: 'Retail' },
    { id: 'ecommerce', label: 'E-Commerce' },
    { id: 'catering', label: 'Catering' },
    { id: 'real-estate', label: 'Real Estate' },
    { id: 'property-management', label: 'Property Management' },
    { id: 'education', label: 'Education' },
    { id: 'nonprofit', label: 'Nonprofit' },
    { id: 'church', label: 'Church' },
    { id: 'fitness', label: 'Fitness' }
  ];

  const DOC_TYPES = [
    { id: 'all', label: 'All Types' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'estimate', label: 'Estimate' },
    { id: 'receipt', label: 'Receipt' },
    { id: 'letter', label: 'Letter' },
    { id: 'resume', label: 'Resume' },
    { id: 'form', label: 'Form' },
    { id: 'report', label: 'Report' },
    { id: 'contract', label: 'Contract' },
    { id: 'nda', label: 'NDA' },
    { id: 'proposal', label: 'Proposal' },
    { id: 'purchase_order', label: 'Purchase Order' },
    { id: 'pay_stub', label: 'Pay Stub' }
  ];

  // ── API CALL ──
  async function fetchTemplates(page, options) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE)
    });
    if (options.industry && options.industry !== 'all') params.set('industry', options.industry);
    if (options.document_type && options.document_type !== 'all') params.set('document_type', options.document_type);
    if (options.search) params.set('search', options.search);

    const resp = await fetch('/api/templates-list?' + params.toString());
    if (!resp.ok) throw new Error('Failed to fetch templates');
    return resp.json();
  }

  // ── RENDER TEMPLATE CARD ──
  function renderTemplateCard(t) {
    const accessible = canAccess(t.tier);
    const tierBadge = t.tier === 'pro'
      ? '<span style="background:#C99532;color:#fff;font-size:10px;padding:2px 6px;border-radius:3px;font-weight:600;">PRO</span>'
      : t.tier === 'business'
        ? '<span style="background:#6200EA;color:#fff;font-size:10px;padding:2px 6px;border-radius:3px;font-weight:600;">BUSINESS</span>'
        : '';

    const lockIcon = !accessible
      ? '<div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-lock" style="color:#fff;font-size:11px;"></i></div>'
      : '';

    const pc = t.primary_color || '#C99532';
    const sc = t.secondary_color || '#FFFFFF';
    const ac = t.accent_color || '#E0E0E0';

    return '<div class="tmpl-card" data-id="' + t.id + '" data-tier="' + t.tier + '" data-slug="' + (t.slug||'') + '" '
      + 'style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;cursor:pointer;position:relative;transition:box-shadow .2s;background:#fff;" '
      + 'onmouseenter="this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.12)\'" '
      + 'onmouseleave="this.style.boxShadow=\'none\'">'
      + lockIcon
      + '<div style="height:100px;background:linear-gradient(135deg,' + pc + ',' + sc + ');display:flex;align-items:center;justify-content:center;position:relative;">'
      + '<div style="background:' + sc + ';border-radius:4px;padding:6px 12px;border-left:3px solid ' + ac + ';">'
      + '<div style="font-size:9px;font-weight:700;color:' + pc + ';font-family:' + (t.heading_font||'Inter') + ';">' + (t.document_type||'').toUpperCase() + '</div>'
      + '<div style="font-size:7px;color:#999;margin-top:2px;">' + (t.style_name||'') + '</div>'
      + '</div></div>'
      + '<div style="padding:8px 10px;">'
      + '<div style="font-size:11px;font-weight:600;color:#1B3A5C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + t.name + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">'
      + '<span style="font-size:9px;color:#888;">' + (t.industry||'general') + '</span>'
      + tierBadge
      + '</div></div></div>';
  }

  // ── RENDER THE TEMPLATE PANEL ──
  function renderTemplatePanel() {
    const panel = document.getElementById('dmf-template-panel');
    if (!panel) return;

    // Wait for plan data before rendering
    if (!planLoaded && !isAdmin()) {
      panel.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Loading templates...</div>';
      setTimeout(renderTemplatePanel, 200);
      return;
    }

    let html = '<div style="padding:12px;">';
    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<h3 style="margin:0;font-size:16px;color:#1B3A5C;">Templates</h3>';
    html += '<button onclick="window.dmfTemplates.close()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#888;">&times;</button>';
    html += '</div>';

    // Search
    html += '<input type="text" id="dmf-tmpl-search" placeholder="Search templates..." '
      + 'style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box;" '
      + 'value="' + currentSearch + '" oninput="window.dmfTemplates.onSearch(this.value)">';

    // Document type filter
    html += '<select id="dmf-tmpl-doctype" style="width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:12px;margin-bottom:6px;background:#fff;" '
      + 'onchange="window.dmfTemplates.onDocType(this.value)">';
    DOC_TYPES.forEach(function(d) {
      html += '<option value="' + d.id + '"' + (d.id === currentDocType ? ' selected' : '') + '>' + d.label + '</option>';
    });
    html += '</select>';

    // Industry filter
    html += '<select id="dmf-tmpl-industry" style="width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:12px;margin-bottom:12px;background:#fff;" '
      + 'onchange="window.dmfTemplates.onIndustry(this.value)">';
    INDUSTRIES.forEach(function(ind) {
      html += '<option value="' + ind.id + '"' + (ind.id === currentIndustry ? ' selected' : '') + '>' + ind.label + '</option>';
    });
    html += '</select>';

    // Template count
    html += '<div style="font-size:11px;color:#888;margin-bottom:8px;">' + totalTemplates + ' templates found</div>';

    // Grid
    html += '<div id="dmf-tmpl-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:calc(100vh - 320px);overflow-y:auto;padding-right:4px;">';
    allLoadedTemplates.forEach(function(t) {
      html += renderTemplateCard(t);
    });
    html += '</div>';

    // Load more
    if (hasMore) {
      html += '<button id="dmf-tmpl-loadmore" onclick="window.dmfTemplates.loadMore()" '
        + 'style="width:100%;padding:10px;margin-top:10px;background:#1B3A5C;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">'
        + (isLoading ? 'Loading...' : 'Load More Templates') + '</button>';
    }

    html += '</div>';
    panel.innerHTML = html;

    // Attach click handlers to cards
    panel.querySelectorAll('.tmpl-card').forEach(function(card) {
      card.addEventListener('click', function() {
        const id = parseInt(card.dataset.id);
        const tier = card.dataset.tier;
        if (!canAccess(tier)) {
          showUpgradeModal(tier);
          return;
        }
        const template = allLoadedTemplates.find(function(t) { return t.id === id; });
        if (template) applyTemplate(template);
      });
    });
  }

  // ── SHOW UPGRADE/LOCK MODAL ──
  function showUpgradeModal(requiredTier) {
    const label = getRequiredPlanLabel(requiredTier);
    const price = getRequiredPlanPrice(requiredTier);

    // Remove existing modal
    let existing = document.getElementById('dmf-upgrade-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'dmf-upgrade-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';

    const badgeColor = requiredTier === 'business' ? '#6200EA' : '#C99532';

    modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">'
      + '<div style="width:60px;height:60px;background:' + badgeColor + ';border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">'
      + '<i class="fas fa-lock" style="color:#fff;font-size:24px;"></i></div>'
      + '<h3 style="margin:0 0 8px;color:#1B3A5C;font-size:20px;">' + label + ' Template</h3>'
      + '<p style="color:#666;margin:0 0 20px;font-size:14px;">This template requires a ' + label + ' plan. Upgrade to unlock all ' + label + ' templates and features.</p>'
      + '<div style="font-size:28px;font-weight:700;color:' + badgeColor + ';margin-bottom:20px;">$' + price.toFixed(2) + '<span style="font-size:14px;color:#888;font-weight:400;">/mo</span></div>'
      + '<button onclick="window.dmfTemplates.upgrade(\'' + requiredTier + '\')" style="width:100%;padding:12px;background:' + badgeColor + ';color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px;">Upgrade to ' + label + '</button>'
      + '<button onclick="document.getElementById(\'dmf-upgrade-modal\').remove()" style="width:100%;padding:10px;background:none;border:1px solid #ddd;border-radius:8px;color:#666;cursor:pointer;font-size:13px;">Maybe Later</button>'
      + '</div>';

    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });
  }

  // ── APPLY TEMPLATE ──
  function applyTemplate(template) {
    const canvas = document.getElementById('docCanvas');
    if (!canvas) return;

    const pc = template.primary_color || '#C99532';
    const sc = template.secondary_color || '#FFFFFF';
    const ac = template.accent_color || '#E0E0E0';
    const hf = template.heading_font || 'Playfair Display';
    const bf = template.body_font || 'DM Sans';
    const docType = (template.document_type || 'document').toUpperCase();
    const industry = template.industry || 'general';
    const indLabel = industry === 'blank' ? '' : industry.replace(/-/g, ' ').replace(/\b\w/g, function(l){return l.toUpperCase();});

    let html = '<div style="font-family:\'' + bf + '\',sans-serif;padding:40px;max-width:800px;margin:0 auto;">';
    html += '<div style="border-bottom:3px solid ' + pc + ';padding-bottom:20px;margin-bottom:30px;">';
    html += '<h1 style="font-family:\'' + hf + '\',serif;color:' + pc + ';font-size:28px;margin:0;">' + docType + '</h1>';
    if (indLabel) {
      html += '<p style="color:#666;margin:5px 0 0;font-size:14px;">' + indLabel + '</p>';
    }
    html += '<p style="color:' + ac + ';font-size:12px;margin:5px 0 0;">' + template.style_name + ' Style</p>';
    html += '</div>';

    // Template body placeholder
    html += '<div style="color:#333;">';
    html += '<p style="color:#888;font-style:italic;">Start editing this ' + docType.toLowerCase() + ' template. Use the AI assistant for help.</p>';
    html += '</div></div>';

    canvas.innerHTML = html;
    if (typeof window.updatePreview === 'function') window.updatePreview();
    if (typeof window.autoSave === 'function') window.autoSave();

    // Close template panel
    close();
    if (typeof window.showToast === 'function') window.showToast('Template applied!', 'success');
  }

  // ── LOAD TEMPLATES ──
  async function loadTemplates(reset) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
      currentPage = 1;
      allLoadedTemplates = [];
    }

    try {
      const data = await fetchTemplates(currentPage, {
        industry: currentIndustry,
        document_type: currentDocType,
        search: currentSearch
      });

      if (reset) {
        allLoadedTemplates = data.templates;
      } else {
        allLoadedTemplates = allLoadedTemplates.concat(data.templates);
      }

      totalTemplates = data.pagination.total;
      hasMore = data.pagination.hasMore;
      currentPage = data.pagination.page;
    } catch (err) {
      console.error('Failed to load templates:', err);
    }

    isLoading = false;
    renderTemplatePanel();
  }

  // ── PUBLIC API ──
  let searchTimeout;

  window.dmfTemplates = {
    open: function() {
      let panel = document.getElementById('dmf-template-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'dmf-template-panel';
        panel.style.cssText = 'position:fixed;top:0;left:0;width:320px;height:100vh;background:#fff;box-shadow:4px 0 20px rgba(0,0,0,0.15);z-index:9000;overflow-y:auto;transition:transform .3s;';
        document.body.appendChild(panel);
      }
      panel.style.display = 'block';
      panel.style.transform = 'translateX(0)';

      // Wait for plan to be loaded
      const checkPlan = function() {
        if (window.__dmfUserPlan !== undefined) {
          userPlan = window.__dmfUserPlan;
          planLoaded = true;
        }
        if (window.__dmfUserEmail !== undefined) {
          userEmail = window.__dmfUserEmail;
        }
        // Admin always has plan loaded
        if (isAdmin()) planLoaded = true;
      };
      checkPlan();

      if (!planLoaded) {
        // Poll for plan data
        const interval = setInterval(function() {
          checkPlan();
          if (planLoaded) {
            clearInterval(interval);
            loadTemplates(true);
          }
        }, 200);
        // Timeout after 3 seconds - assume free
        setTimeout(function() {
          if (!planLoaded) {
            planLoaded = true;
            clearInterval(interval);
            loadTemplates(true);
          }
        }, 3000);
      } else {
        loadTemplates(true);
      }
    },

    close: function() {
      const panel = document.getElementById('dmf-template-panel');
      if (panel) {
        panel.style.transform = 'translateX(-100%)';
        setTimeout(function() { panel.style.display = 'none'; }, 300);
      }
    },

    onSearch: function(val) {
      clearTimeout(searchTimeout);
      currentSearch = val;
      searchTimeout = setTimeout(function() { loadTemplates(true); }, 400);
    },

    onIndustry: function(val) {
      currentIndustry = val;
      loadTemplates(true);
    },

    onDocType: function(val) {
      currentDocType = val;
      loadTemplates(true);
    },

    loadMore: function() {
      currentPage++;
      loadTemplates(false);
    },

    upgrade: function(tier) {
      // Remove modal
      const modal = document.getElementById('dmf-upgrade-modal');
      if (modal) modal.remove();
      // Trigger checkout
      if (typeof window.editorCheckout === 'function') {
        window.editorCheckout(tier);
      } else if (typeof window.openEditorUpgrade === 'function') {
        window.openEditorUpgrade();
      }
    }
  };

  // ── OVERRIDE existing openTemplates function ──
  window.openTemplates = function() {
    window.dmfTemplates.open();
  };
  window.closeTemplates = function() {
    window.dmfTemplates.close();
  };

})();
