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


        // Professional document-type-specific content
            var dt = docType.toLowerCase();
                if (dt === 'invoice') {
                      html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;"><div><strong>Bill To:</strong><br>[Client Name]<br>[Client Address]<br>[City, State ZIP]</div><div style="text-align:right;"><strong>Invoice #:</strong> INV-001<br><strong>Date:</strong> ' + new Date().toLocaleDateString() + '<br><strong>Due:</strong> Net 30</div></div>';
                            html += '<table style="width:100%;border-collapse:collapse;margin:20px 0;"><tr style="background:' + pc + ';color:#fff;"><th style="padding:8px 12px;text-align:left;border:1px solid ' + pc + ';">Description</th><th style="padding:8px;text-align:center;border:1px solid ' + pc + ';">Qty</th><th style="padding:8px;text-align:right;border:1px solid ' + pc + ';">Rate</th><th style="padding:8px;text-align:right;border:1px solid ' + pc + ';">Amount</th></tr>';
                                  html += '<tr><td style="padding:8px 12px;border:1px solid #ddd;">[Service/Product Description]</td><td style="padding:8px;text-align:center;border:1px solid #ddd;">1</td><td style="padding:8px;text-align:right;border:1px solid #ddd;">$0.00</td><td style="padding:8px;text-align:right;border:1px solid #ddd;">$0.00</td></tr>';
                                        html += '<tr><td style="padding:8px 12px;border:1px solid #ddd;">[Additional Line Item]</td><td style="padding:8px;text-align:center;border:1px solid #ddd;">1</td><td style="padding:8px;text-align:right;border:1px solid #ddd;">$0.00</td><td style="padding:8px;text-align:right;border:1px solid #ddd;">$0.00</td></tr>';
                                              html += '</table>';
                                                    html += '<div style="text-align:right;margin-top:10px;"><div>Subtotal: $0.00</div><div>Tax (0%): $0.00</div><div style="font-weight:bold;font-size:18px;color:' + pc + ';margin-top:5px;border-top:2px solid ' + pc + ';padding-top:5px;">Total: $0.00</div></div>';
                                                          html += '<div style="margin-top:30px;padding-top:15px;border-top:1px solid #ddd;font-size:12px;color:#666;">Payment Terms: Net 30 | Make checks payable to [Your Company]</div>';
                                                              } else if (dt === 'estimate' || dt === 'receipt') {
                                                                    html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;"><div><strong>Prepared For:</strong><br>[Client Name]<br>[Client Company]</div><div style="text-align:right;"><strong>' + docType + ' #:</strong> EST-001<br><strong>Date:</strong> ' + new Date().toLocaleDateString() + '<br><strong>Valid Until:</strong> 30 Days</div></div>';
                                                                          html += '<table style="width:100%;border-collapse:collapse;margin:20px 0;"><tr style="background:' + pc + ';color:#fff;"><th style="padding:8px 12px;text-align:left;border:1px solid ' + pc + ';">Item</th><th style="padding:8px;text-align:center;border:1px solid ' + pc + ';">Qty</th><th style="padding:8px;text-align:right;border:1px solid ' + pc + ';">Unit Price</th><th style="padding:8px;text-align:right;border:1px solid ' + pc + ';">Total</th></tr>';
                                                                                html += '<tr><td style="padding:8px 12px;border:1px solid #ddd;">[Service/Product]</td><td style="padding:8px;text-align:center;border:1px solid #ddd;">1</td><td style="padding:8px;text-align:right;border:1px solid #ddd;">$0.00</td><td style="padding:8px;text-align:right;border:1px solid #ddd;">$0.00</td></tr></table>';
                                                                                      html += '<div style="text-align:right;font-weight:bold;font-size:18px;color:' + pc + ';">Estimated Total: $0.00</div>';
                                                                                            html += '<div style="margin-top:30px;border-top:1px solid #ddd;padding-top:15px;"><strong>Acceptance:</strong><br><br>Signature: ________________________________ Date: ______________</div>';
                                                                                                } else if (dt === 'contract' || dt === 'nda') {
                                                                                                      html += '<div style="text-align:center;margin-bottom:30px;"><h2 style="margin:0;color:' + pc + ';">' + (dt === 'nda' ? 'NON-DISCLOSURE AGREEMENT' : 'SERVICE AGREEMENT') + '</h2><p style="color:#666;margin:5px 0;">Effective Date: ' + new Date().toLocaleDateString() + '</p></div>';
                                                                                                            html += '<p>This Agreement is entered into by and between:</p>';
                                                                                                                  html += '<p><strong>Party A (Disclosing Party):</strong> [Company/Individual Name], with a principal address at [Address].</p>';
                                                                                                                        html += '<p><strong>Party B (Receiving Party):</strong> [Company/Individual Name], with a principal address at [Address].</p>';
                                                                                                                              html += '<h3 style="color:' + pc + ';">1. Purpose</h3><p>The parties wish to explore a potential business relationship. In connection with this opportunity, each party may disclose confidential information to the other.</p>';
                                                                                                                                    html += '<h3 style="color:' + pc + ';">2. Definition of Confidential Information</h3><p>Confidential Information means any data or information, oral or written, disclosed by either party that is designated as confidential or that reasonably should be understood to be confidential.</p>';
                                                                                                                                          html += '<h3 style="color:' + pc + ';">3. Obligations</h3><p>The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; (b) not disclose the Confidential Information to any third parties; (c) use the Confidential Information solely for the Purpose described herein.</p>';
                                                                                                                                                html += '<h3 style="color:' + pc + ';">4. Term</h3><p>This Agreement shall remain in effect for a period of [Duration] from the Effective Date.</p>';
                                                                                                                                                      html += '<div style="display:flex;justify-content:space-between;margin-top:40px;"><div style="width:45%;"><p>________________________________</p><p>[Party A Name]<br>Title: ______________<br>Date: ______________</p></div><div style="width:45%;"><p>________________________________</p><p>[Party B Name]<br>Title: ______________<br>Date: ______________</p></div></div>';
                                                                                                                                                          } else if (dt === 'resume') {
                                                                                                                                                                html += '<div style="text-align:center;border-bottom:2px solid ' + pc + ';padding-bottom:15px;margin-bottom:20px;"><h1 style="margin:0;color:' + pc + ';font-size:24px;">[Your Full Name]</h1><p style="color:#666;margin:5px 0;">[Job Title] | [City, State] | [Phone] | [Email] | [LinkedIn]</p></div>';
                                                                                                                                                                      html += '<h3 style="color:' + pc + ';border-bottom:1px solid ' + pc + ';padding-bottom:3px;">Professional Summary</h3><p>[Brief 2-3 sentence summary of your experience, skills, and career objectives.]</p>';
                                                                                                                                                                            html += '<h3 style="color:' + pc + ';border-bottom:1px solid ' + pc + ';padding-bottom:3px;">Experience</h3>';
                                                                                                                                                                                  html += '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;"><strong>[Job Title]</strong><span>[Start Date] - [End Date]</span></div><div style="color:#666;">[Company Name] | [City, State]</div><ul style="margin:5px 0;padding-left:20px;"><li>[Key accomplishment or responsibility]</li><li>[Key accomplishment or responsibility]</li></ul></div>';
                                                                                                                                                                                        html += '<h3 style="color:' + pc + ';border-bottom:1px solid ' + pc + ';padding-bottom:3px;">Education</h3><div><strong>[Degree]</strong> | [University Name] | [Graduation Year]</div>';
                                                                                                                                                                                              html += '<h3 style="color:' + pc + ';border-bottom:1px solid ' + pc + ';padding-bottom:3px;">Skills</h3><p>[Skill 1] | [Skill 2] | [Skill 3] | [Skill 4] | [Skill 5]</p>';
                                                                                                                                                                                                  } else if (dt === 'letter') {
                                                                                                                                                                                                        html += '<div style="margin-bottom:20px;">[Your Name]<br>[Your Address]<br>[City, State ZIP]<br>[Email] | [Phone]</div>';
                                                                                                                                                                                                              html += '<div style="margin-bottom:20px;">' + new Date().toLocaleDateString() + '</div>';
                                                                                                                                                                                                                    html += '<div style="margin-bottom:20px;">[Recipient Name]<br>[Recipient Title]<br>[Company Name]<br>[Address]</div>';
                                                                                                                                                                                                                          html += '<p>Dear [Recipient Name],</p>';
                                                                                                                                                                                                                                html += '<p>[Opening paragraph: State the purpose of your letter clearly and concisely.]</p>';
                                                                                                                                                                                                                                      html += '<p>[Body paragraph: Provide supporting details, context, or evidence for your main point.]</p>';
                                                                                                                                                                                                                                            html += '<p>[Closing paragraph: Summarize your request or next steps, and express appreciation.]</p>';
                                                                                                                                                                                                                                                  html += '<div style="margin-top:30px;">Sincerely,<br><br><br>[Your Full Name]<br>[Your Title]</div>';
                                                                                                                                                                                                                                                      } else if (dt === 'proposal') {
                                                                                                                                                                                                                                                            html += '<div style="text-align:center;background:' + pc + ';color:#fff;padding:30px;margin:-40px -40px 30px;"><h1 style="margin:0;">[Project Title]</h1><p style="margin:5px 0;opacity:0.9;">Prepared for [Client Name] | ' + new Date().toLocaleDateString() + '</p></div>';
                                                                                                                                                                                                                                                                  html += '<h2 style="color:' + pc + ';">Executive Summary</h2><p>[Brief overview of the proposed project, its objectives, and expected outcomes.]</p>';
                                                                                                                                                                                                                                                                        html += '<h2 style="color:' + pc + ';">Scope of Work</h2><p>[Detailed description of deliverables, milestones, and project phases.]</p>';
                                                                                                                                                                                                                                                                              html += '<h2 style="color:' + pc + ';">Pricing</h2>';
                                                                                                                                                                                                                                                                                    html += '<table style="width:100%;border-collapse:collapse;"><tr style="background:' + pc + ';color:#fff;"><th style="padding:8px;text-align:left;">Phase</th><th style="padding:8px;text-align:left;">Deliverable</th><th style="padding:8px;text-align:right;">Cost</th></tr>';
                                                                                                                                                                                                                                                                                          html += '<tr><td style="padding:8px;border-bottom:1px solid #ddd;">Phase 1</td><td style="padding:8px;border-bottom:1px solid #ddd;">[Deliverable]</td><td style="padding:8px;text-align:right;border-bottom:1px solid #ddd;">$0.00</td></tr></table>';
                                                                                                                                                                                                                                                                                                html += '<h2 style="color:' + pc + ';">Timeline</h2><p>[Estimated project duration and key milestones.]</p>';
                                                                                                                                                                                                                                                                                                    } else if (dt === 'pay_stub' || dt === 'pay stub') {
                                                                                                                                                                                                                                                                                                          html += '<div style="background:' + pc + ';color:#fff;padding:10px 15px;margin:-40px -40px 20px;"><strong>[Company Name]</strong> | Pay Period: [Start] - [End]</div>';
                                                                                                                                                                                                                                                                                                                html += '<div style="display:flex;justify-content:space-between;margin-bottom:15px;"><div><strong>Employee:</strong> [Name]<br>ID: [Employee ID]<br>Department: [Dept]</div><div style="text-align:right;"><strong>Pay Date:</strong> [Date]<br><strong>Pay Method:</strong> Direct Deposit</div></div>';
                                                                                                                                                                                                                                                                                                                      html += '<table style="width:100%;border-collapse:collapse;margin:10px 0;"><tr style="background:' + pc + ';color:#fff;"><th style="padding:6px;text-align:left;">Earnings</th><th style="padding:6px;text-align:right;">Hours</th><th style="padding:6px;text-align:right;">Rate</th><th style="padding:6px;text-align:right;">Current</th><th style="padding:6px;text-align:right;">YTD</th></tr>';
                                                                                                                                                                                                                                                                                                                            html += '<tr><td style="padding:6px;border:1px solid #ddd;">Regular</td><td style="padding:6px;text-align:right;border:1px solid #ddd;">80.00</td><td style="padding:6px;text-align:right;border:1px solid #ddd;">$0.00</td><td style="padding:6px;text-align:right;border:1px solid #ddd;">$0.00</td><td style="padding:6px;text-align:right;border:1px solid #ddd;">$0.00</td></tr></table>';
                                                                                                                                                                                                                                                                                                                                  html += '<div style="display:flex;justify-content:space-between;margin-top:15px;padding:10px;background:#f5f5f5;border-radius:4px;"><div><strong>Gross Pay:</strong> $0.00</div><div><strong>Deductions:</strong> $0.00</div><div style="color:' + pc + ';font-weight:bold;font-size:16px;"><strong>Net Pay:</strong> $0.00</div></div>';
                                                                                                                                                                                                                                                                                                                                      } else if (dt === 'purchase_order' || dt === 'purchase order') {
                                                                                                                                                                                                                                                                                                                                            html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;"><div><strong>Vendor:</strong><br>[Vendor Name]<br>[Vendor Address]</div><div style="text-align:right;"><strong>PO #:</strong> PO-001<br><strong>Date:</strong> ' + new Date().toLocaleDateString() + '<br><strong>Ship To:</strong> [Address]</div></div>';
                                                                                                                                                                                                                                                                                                                                                  html += '<table style="width:100%;border-collapse:collapse;"><tr style="background:' + pc + ';color:#fff;"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;text-align:center;">Qty</th><th style="padding:8px;text-align:right;">Unit Price</th><th style="padding:8px;text-align:right;">Total</th></tr>';
                                                                                                                                                                                                                                                                                                                                                        html += '<tr><td style="padding:8px;border:1px solid #ddd;">[Item Description]</td><td style="padding:8px;text-align:center;border:1px solid #ddd;">1</td><td style="padding:8px;text-align:right;border:1px solid #ddd;">$0.00</td><td style="padding:8px;text-align:right;border:1px solid #ddd;">$0.00</td></tr></table>';
                                                                                                                                                                                                                                                                                                                                                              html += '<div style="text-align:right;margin-top:10px;font-weight:bold;color:' + pc + ';font-size:16px;">Total: $0.00</div>';
                                                                                                                                                                                                                                                                                                                                                                    html += '<div style="margin-top:30px;"><strong>Authorized By:</strong> ________________________________ Date: ______________</div>';
                                                                                                                                                                                                                                                                                                                                                                        } else if (dt === 'report') {
                                                                                                                                                                                                                                                                                                                                                                              html += '<h2 style="color:' + pc + ';">1. Executive Summary</h2><p>[Brief overview of the report findings and key recommendations.]</p>';
                                                                                                                                                                                                                                                                                                                                                                                    html += '<h2 style="color:' + pc + ';">2. Background</h2><p>[Context and background information relevant to the report.]</p>';
                                                                                                                                                                                                                                                                                                                                                                                          html += '<h2 style="color:' + pc + ';">3. Findings</h2><p>[Detailed analysis and data presentation.]</p>';
                                                                                                                                                                                                                                                                                                                                                                                                html += '<h2 style="color:' + pc + ';">4. Recommendations</h2><p>[Actionable recommendations based on the findings.]</p>';
                                                                                                                                                                                                                                                                                                                                                                                                      html += '<h2 style="color:' + pc + ';">5. Conclusion</h2><p>[Summary of key points and next steps.]</p>';
                                                                                                                                                                                                                                                                                                                                                                                                          } else if (dt === 'form') {
                                                                                                                                                                                                                                                                                                                                                                                                                html += '<div style="margin-bottom:15px;"><label style="display:block;font-weight:bold;margin-bottom:4px;color:' + pc + ';">Full Name *</label><div style="border:1px solid #ccc;padding:8px;border-radius:4px;color:#999;">[Enter full name]</div></div>';
                                                                                                                                                                                                                                                                                                                                                                                                                      html += '<div style="margin-bottom:15px;"><label style="display:block;font-weight:bold;margin-bottom:4px;color:' + pc + ';">Email Address *</label><div style="border:1px solid #ccc;padding:8px;border-radius:4px;color:#999;">[email@example.com]</div></div>';
                                                                                                                                                                                                                                                                                                                                                                                                                            html += '<div style="margin-bottom:15px;"><label style="display:block;font-weight:bold;margin-bottom:4px;color:' + pc + ';">Phone Number</label><div style="border:1px solid #ccc;padding:8px;border-radius:4px;color:#999;">[(555) 000-0000]</div></div>';
                                                                                                                                                                                                                                                                                                                                                                                                                                  html += '<div style="margin-bottom:15px;"><label style="display:block;font-weight:bold;margin-bottom:4px;color:' + pc + ';">Message / Details *</label><div style="border:1px solid #ccc;padding:8px;border-radius:4px;min-height:80px;color:#999;">[Enter details here]</div></div>';
                                                                                                                                                                                                                                                                                                                                                                                                                                        html += '<div style="margin-top:20px;"><strong>Signature:</strong> ________________________________ <strong>Date:</strong> ______________</div>';
                                                                                                                                                                                                                                                                                                                                                                                                                                            } else {
                                                                                                                                                                                                                                                                                                                                                                                                                                                  html += '<div style="color:#333;"><p>[Begin editing your ' + docType.toLowerCase() + ' document here. Use the AI assistant for help generating professional content.]</p></div>';
                                                                                                                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                                                                                                                          html += '</div>';
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
