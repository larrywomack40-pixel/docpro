/**
 * Template Preview System for DraftMyForms
 * Generates unique HTML previews for each template card
 * Replaces generic gold icons with visual mini-previews
 */

(function() {
  'use strict';

  // ============================================
  // CSS INJECTION
  // ============================================
  const previewCSS = document.createElement('style');
  previewCSS.textContent = `
    .template-card .preview {
      position: relative;
      overflow: hidden;
      background: #fff;
      border: 1px solid #e8ddd4;
      border-radius: 6px;
      height: 160px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .preview-inner {
      width: 400px;
      min-height: 500px;
      transform: scale(0.38);
      transform-origin: top center;
      pointer-events: none;
      font-family: 'DM Sans', sans-serif;
      padding: 20px;
      background: #fff;
    }
    .template-card.locked .preview::after {
      content: '\\1F512 Pro';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: 700;
      color: #a67a28;
      z-index: 2;
    }
    .template-card.locked {
      cursor: pointer;
      opacity: 0.85;
    }
    .template-card.locked:hover {
      opacity: 1;
    }
    /* Upgrade modal */
    .upgrade-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .upgrade-modal-box {
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .upgrade-modal-box h3 {
      margin: 0 0 8px;
      font-size: 1.4rem;
      color: #2d2926;
    }
    .upgrade-modal-box p {
      color: #666;
      margin: 0 0 20px;
      font-size: 0.95rem;
    }
    .upgrade-modal-box .upgrade-btn {
      display: inline-block;
      background: linear-gradient(135deg, #c99532, #a67a28);
      color: #fff;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 700;
      text-decoration: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      margin-bottom: 10px;
    }
    .upgrade-modal-box .upgrade-btn:hover {
      transform: scale(1.03);
    }
    .upgrade-modal-box .cancel-link {
      display: block;
      color: #999;
      cursor: pointer;
      font-size: 0.85rem;
      margin-top: 8px;
    }
  `;
  document.head.appendChild(previewCSS);

  // ============================================
  // HELPER: Simple hash from string
  // ============================================
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // ============================================
  // HELPER: Derive color from template properties
  // ============================================
  function deriveColor(template) {
    const n = (template.name + ' ' + template.style).toLowerCase();
    if (n.includes('gold') || n.includes('executive') || n.includes('premium')) return '#c99532';
    if (n.includes('blue') || n.includes('ocean') || n.includes('corporate') || n.includes('professional')) return '#2c5aa0';
    if (n.includes('green') || n.includes('eco') || n.includes('nature') || n.includes('fresh')) return '#2d8a4e';
    if (n.includes('red') || n.includes('bold') || n.includes('power') || n.includes('dynamic')) return '#c0392b';
    if (n.includes('purple') || n.includes('creative') || n.includes('royal')) return '#7b2d8e';
    if (n.includes('dark') || n.includes('midnight') || n.includes('noir') || n.includes('charcoal')) return '#2c3e50';
    if (n.includes('orange') || n.includes('warm') || n.includes('autumn') || n.includes('sunset')) return '#d35400';
    if (n.includes('teal') || n.includes('aqua') || n.includes('marine') || n.includes('coastal')) return '#16a085';
    if (n.includes('pink') || n.includes('rose') || n.includes('blush') || n.includes('soft')) return '#e84393';
    if (n.includes('minimal') || n.includes('clean') || n.includes('simple') || n.includes('light')) return '#555';
    if (n.includes('modern') || n.includes('sleek') || n.includes('stripe')) return '#e67e22';
    if (n.includes('classic') || n.includes('vintage') || n.includes('retro') || n.includes('traditional')) return '#8b6914';
    const colors = ['#c99532','#2c5aa0','#2d8a4e','#7b2d8e','#d35400','#16a085','#c0392b','#34495e'];
    return colors[hashStr(template.name) % colors.length];
        }

  // ============================================
  // GENERATE PREVIEW HTML
  // ============================================
  function generatePreview(template, category) {
    const color = deriveColor(template);
    const h = hashStr(template.name);
    const cat = category.toLowerCase();

    // --- INVOICE LAYOUTS ---
    if (cat === 'invoices') {
      const layout = h % 4;
      if (layout === 0) {
        return '<div style="background:' + color + ';color:#fff;padding:10px 15px;border-radius:4px 4px 0 0;margin:-20px -20px 15px;font-weight:700;font-size:14px">INVOICE</div>' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:12px"><div><div style="font-size:9px;color:#999">From</div><div style="font-size:11px;font-weight:600">' + template.name + '</div></div><div style="text-align:right"><div style="font-size:9px;color:#999">Invoice #</div><div style="font-size:11px">INV-001</div></div></div>' +
          '<table style="width:100%;font-size:9px;border-collapse:collapse"><tr style="background:#f5f5f5"><th style="text-align:left;padding:6px;border-bottom:2px solid ' + color + '">Item</th><th style="padding:6px;border-bottom:2px solid ' + color + '">Qty</th><th style="padding:6px;border-bottom:2px solid ' + color + '">Price</th></tr><tr><td style="padding:6px;border-bottom:1px solid #eee">Service A</td><td style="padding:6px;text-align:center;border-bottom:1px solid #eee">1</td><td style="padding:6px;text-align:center;border-bottom:1px solid #eee">$500</td></tr><tr><td style="padding:6px;border-bottom:1px solid #eee">Service B</td><td style="padding:6px;text-align:center;border-bottom:1px solid #eee">2</td><td style="padding:6px;text-align:center;border-bottom:1px solid #eee">$300</td></tr></table>' +
          '<div style="text-align:right;margin-top:10px;font-weight:700;font-size:12px;color:' + color + '">Total: $1,100</div>';
      }
      if (layout === 1) {
        return '<div style="text-align:center;margin-bottom:15px"><div style="font-size:16px;font-weight:700;letter-spacing:2px;color:' + color + '">INVOICE</div><div style="width:40px;height:2px;background:' + color + ';margin:6px auto"></div></div>' +
          '<div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:15px"><div><span style="color:#999">Date:</span> Jan 1, 2026</div><div><span style="color:#999">Due:</span> Jan 31, 2026</div></div>' +
          '<div style="border-top:1px solid #eee;padding-top:8px;font-size:9px"><div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0"><span>Consulting</span><span>$750</span></div><div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0"><span>Design Work</span><span>$450</span></div></div>' +
          '<div style="text-align:right;margin-top:8px;font-size:11px;font-weight:600">Total: $1,200</div>';
      }
      if (layout === 2) {
        return '<div style="display:flex"><div style="width:4px;background:' + color + ';margin:-20px 15px -20px -20px"></div><div style="flex:1"><div style="font-size:14px;font-weight:700;margin-bottom:4px">INVOICE</div><div style="font-size:8px;color:#999;margin-bottom:12px">' + template.name + ' Template</div>' +
          '<div style="background:#f9f9f9;border-radius:6px;padding:8px;font-size:9px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#999">Bill To:</span><span>Client Name</span></div><div style="display:flex;justify-content:space-between"><span style="color:#999">Amount:</span><span style="font-weight:700;color:' + color + '">$2,500</span></div></div>' +
          '<div style="font-size:8px;color:#999;border-top:1px dashed #ddd;padding-top:6px">Payment due within 30 days</div></div></div>';
      }
      return '<div style="text-align:center;padding:15px 0;border-bottom:2px solid ' + color + ';margin-bottom:12px"><div style="font-size:18px;font-weight:800;color:' + color + '">INVOICE</div><div style="font-size:8px;color:#999;margin-top:2px">' + template.name + '</div></div>' +
        '<div style="font-size:9px"><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Project Setup</span><span>$400</span></div><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Development</span><span>$1,600</span></div><div style="display:flex;justify-content:space-between;padding:5px 0"><span>Testing</span><span>$350</span></div></div>' +
        '<div style="margin-top:8px;padding-top:8px;border-top:2px solid ' + color + ';text-align:right;font-weight:700;font-size:12px;color:' + color + '">$2,350</div>';
    }

    // --- RESUME LAYOUTS ---
    if (cat === 'resumes') {
      const layout = h % 3;
      if (layout === 0) {
        return '<div style="text-align:center;margin-bottom:10px"><div style="font-size:14px;font-weight:700">John Doe</div><div style="font-size:8px;color:' + color + '">Software Engineer</div><div style="font-size:7px;color:#999;margin-top:2px">john@email.com | (555) 123-4567</div></div>' +
          '<div style="font-size:8px;font-weight:700;color:' + color + ';border-bottom:1px solid ' + color + ';padding-bottom:2px;margin-bottom:4px;margin-top:10px">EXPERIENCE</div>' +
          '<div style="font-size:8px;margin-bottom:6px"><div style="font-weight:600">Senior Developer - Tech Corp</div><div style="color:#999;font-size:7px">2022 - Present</div><div style="color:#666;font-size:7px;margin-top:1px">Led team of 5 engineers on cloud platform</div></div>' +
          '<div style="font-size:8px;font-weight:700;color:' + color + ';border-bottom:1px solid ' + color + ';padding-bottom:2px;margin-bottom:4px;margin-top:8px">EDUCATION</div>' +
          '<div style="font-size:8px"><div style="font-weight:600">BS Computer Science</div><div style="color:#999;font-size:7px">State University, 2020</div></div>';
      }
      if (layout === 1) {
        return '<div style="display:flex;gap:12px"><div style="width:35%;border-right:2px solid ' + color + ';padding-right:10px"><div style="width:35px;height:35px;background:' + color + ';border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700">JD</div>' +
          '<div style="font-size:7px;font-weight:700;color:' + color + ';margin-bottom:4px">SKILLS</div><div style="font-size:7px;color:#666;line-height:1.6">JavaScript<br>Python<br>React<br>Node.js<br>SQL</div>' +
          '<div style="font-size:7px;font-weight:700;color:' + color + ';margin:8px 0 4px">CONTACT</div><div style="font-size:6px;color:#666;line-height:1.6">john@email.com<br>(555) 123-4567<br>San Francisco, CA</div></div>' +
          '<div style="flex:1"><div style="font-size:13px;font-weight:700">John Doe</div><div style="font-size:8px;color:' + color + ';margin-bottom:8px">Software Engineer</div>' +
          '<div style="font-size:7px;font-weight:700;color:' + color + ';margin-bottom:3px">EXPERIENCE</div><div style="font-size:7px;margin-bottom:4px"><strong>Tech Corp</strong> - Senior Dev<br><span style="color:#999">2022 - Present</span></div>' +
          '<div style="font-size:7px"><strong>StartupCo</strong> - Developer<br><span style="color:#999">2020 - 2022</span></div></div></div>';
      }
      return '<div style="background:' + color + ';color:#fff;padding:12px 15px;margin:-20px -20px 12px;border-radius:4px 4px 0 0"><div style="font-size:16px;font-weight:800">JOHN DOE</div><div style="font-size:8px;opacity:0.9;letter-spacing:1px">SOFTWARE ENGINEER</div></div>' +
        '<div style="font-size:7px;font-weight:700;color:' + color + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Experience</div>' +
        '<div style="font-size:8px;margin-bottom:4px;padding-left:8px;border-left:2px solid ' + color + '"><strong>Senior Developer</strong> at Tech Corp<br><span style="color:#999;font-size:7px">2022 - Present</span></div>' +
        '<div style="font-size:7px;font-weight:700;color:' + color + ';text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">Skills</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:3px"><span style="background:' + color + '22;color:' + color + ';padding:2px 6px;border-radius:3px;font-size:7px">JavaScript</span><span style="background:' + color + '22;color:' + color + ';padding:2px 6px;border-radius:3px;font-size:7px">React</span><span style="background:' + color + '22;color:' + color + ';padding:2px 6px;border-radius:3px;font-size:7px">Python</span></div>';
    }

    // --- CONTRACT LAYOUTS ---
    if (cat === 'contracts') {
      const layout = h % 3;
      if (layout === 0) {
        return '<div style="text-align:center;margin-bottom:12px"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px">Service Agreement</div><div style="width:60px;height:2px;background:' + color + ';margin:6px auto"></div><div style="font-size:7px;color:#999">' + template.name + '</div></div>' +
          '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:8px"><strong>1. Scope of Work</strong><br>The Service Provider agrees to deliver professional services as outlined in Exhibit A attached hereto...</div>' +
          '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:10px"><strong>2. Compensation</strong><br>Client agrees to pay the amount of $____ for services rendered per the schedule in Section 4...</div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:8px;border-top:1px solid #ddd"><div style="text-align:center;font-size:7px"><div style="border-top:1px solid #333;padding-top:3px;width:80px">Client Signature</div></div><div style="text-align:center;font-size:7px"><div style="border-top:1px solid #333;padding-top:3px;width:80px">Provider Signature</div></div></div>';
      }
      if (layout === 1) {
        return '<div style="background:' + color + ';color:#fff;padding:10px 15px;margin:-20px -20px 12px;font-size:13px;font-weight:700">CONTRACT</div>' +
          '<div style="font-size:7px;color:#999;margin-bottom:8px">Effective Date: January 1, 2026</div>' +
          '<div style="font-size:8px;margin-bottom:6px;padding:6px;background:#f9f9f9;border-left:3px solid ' + color + '"><strong>PARTIES:</strong> This agreement is between Party A ("Client") and Party B ("Contractor").</div>' +
          '<div style="font-size:8px;color:#444;line-height:1.5"><strong>ARTICLE I - SERVICES</strong><br>Contractor shall provide the following services in accordance with the terms set forth herein...</div>';
      }
      return '<div style="font-size:9px;font-weight:700;color:' + color + ';margin-bottom:2px">ARTICLE I</div><div style="font-size:11px;font-weight:700;margin-bottom:8px">General Terms & Conditions</div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:8px"><strong>Section 1.1</strong> - This Agreement ("Agreement") is entered into as of the date last signed below between the parties identified herein...</div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6"><strong>Section 1.2</strong> - The term of this Agreement shall commence on the Effective Date and continue for a period of twelve (12) months...</div>' +
        '<div style="margin-top:10px;padding-top:6px;border-top:1px solid #eee;font-size:7px;color:#999;text-align:center">Page 1 of 5 | ' + template.name + '</div>';
    }

    // --- LETTER LAYOUTS ---
    if (cat === 'letters') {
      const layout = h % 3;
      if (layout === 0) {
        return '<div style="text-align:right;font-size:8px;color:#666;margin-bottom:12px">January 1, 2026</div>' +
          '<div style="font-size:8px;margin-bottom:10px">Dear Hiring Manager,</div>' +
          '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:8px">I am writing to express my interest in the position advertised. With over five years of experience in the field, I am confident in my ability to contribute...</div>' +
          '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:10px">My background includes extensive work with cross-functional teams, project management, and strategic planning initiatives that have driven measurable results...</div>' +
          '<div style="font-size:8px">Sincerely,<br><span style="color:' + color + ';font-weight:600;margin-top:4px;display:inline-block">Jane Smith</span></div>';
      }
      if (layout === 1) {
        return '<div style="border-bottom:2px solid ' + color + ';padding-bottom:8px;margin-bottom:10px"><div style="font-size:13px;font-weight:700;color:' + color + '">Jane Smith</div><div style="font-size:7px;color:#999">123 Main St | City, ST 12345 | jane@email.com</div></div>' +
          '<div style="font-size:8px;color:#666;margin-bottom:8px">January 1, 2026</div>' +
          '<div style="font-size:8px;line-height:1.6;color:#444">Dear Sir/Madam,<br><br>I am pleased to submit this letter regarding the open position. I believe my qualifications and experience make me an ideal candidate for this role...</div>';
      }
      return '<div style="background:' + color + ';color:#fff;padding:8px 12px;margin:-20px -20px 12px"><div style="font-size:11px;font-weight:700">FORMAL LETTER</div><div style="font-size:7px;opacity:0.8">' + template.name + '</div></div>' +
        '<div style="font-size:8px;margin-bottom:6px;color:#666">To Whom It May Concern,</div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6">This letter serves as formal notification regarding the matter discussed. Please review the enclosed documents and respond at your earliest convenience...</div>';
    }

    // --- NDA LAYOUTS ---
    if (cat === 'ndas') {
      const layout = h % 2;
      if (layout === 0) {
        return '<div style="text-align:center;margin-bottom:10px"><div style="font-size:12px;font-weight:800;letter-spacing:1px">NON-DISCLOSURE</div><div style="font-size:10px;font-weight:700;color:' + color + '">AGREEMENT</div><div style="width:50px;height:2px;background:' + color + ';margin:6px auto"></div></div>' +
          '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:6px">This Non-Disclosure Agreement is entered into between the Disclosing Party and Receiving Party as identified below...</div>' +
          '<div style="font-size:8px;color:#444;line-height:1.6"><strong>Confidential Information</strong> shall mean any proprietary data, trade secrets, technical specifications, or business information disclosed...</div>';
      }
      return '<div style="border:2px solid ' + color + ';padding:8px;margin-bottom:10px;text-align:center"><div style="font-size:11px;font-weight:700">CONFIDENTIALITY AGREEMENT</div><div style="font-size:7px;color:#999">' + template.name + '</div></div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6"><strong>WHEREAS,</strong> the parties wish to explore a potential business relationship and in connection therewith may disclose confidential information...</div>';
    }

    // --- PROPOSAL LAYOUTS ---
    if (cat === 'proposals') {
      const layout = h % 2;
      if (layout === 0) {
        return '<div style="background:linear-gradient(135deg,' + color + ',' + color + 'cc);color:#fff;padding:15px;margin:-20px -20px 12px;text-align:center"><div style="font-size:14px;font-weight:800">PROJECT PROPOSAL</div><div style="font-size:8px;opacity:0.9;margin-top:2px">' + template.name + '</div></div>' +
          '<div style="font-size:8px;font-weight:700;color:' + color + ';margin-bottom:4px">EXECUTIVE SUMMARY</div>' +
          '<div style="font-size:8px;color:#444;line-height:1.5;margin-bottom:8px">We propose a comprehensive solution designed to address your key business challenges and drive measurable growth across all departments...</div>' +
          '<div style="display:flex;gap:8px"><div style="flex:1;background:#f9f9f9;padding:6px;border-radius:4px;text-align:center"><div style="font-size:14px;font-weight:700;color:' + color + '">$15K</div><div style="font-size:6px;color:#999">Budget</div></div><div style="flex:1;background:#f9f9f9;padding:6px;border-radius:4px;text-align:center"><div style="font-size:14px;font-weight:700;color:' + color + '">8 Wks</div><div style="font-size:6px;color:#999">Timeline</div></div></div>';
      }
      return '<div style="font-size:16px;font-weight:800;margin-bottom:2px">Business Proposal</div><div style="font-size:8px;color:' + color + ';margin-bottom:12px">' + template.name + '</div>' +
        '<div style="font-size:8px;padding:6px;border-left:3px solid ' + color + ';background:#f9f9f9;margin-bottom:8px"><strong>Objective:</strong> Deliver a tailored solution that increases operational efficiency by 40% within the first quarter.</div>' +
        '<div style="font-size:8px;color:#444;line-height:1.5"><strong>Approach:</strong> Our three-phase methodology ensures seamless implementation with minimal disruption to existing workflows...</div>';
    }

    // --- REPORT LAYOUTS ---
    if (cat === 'reports') {
      const layout = h % 2;
      if (layout === 0) {
        return '<div style="font-size:14px;font-weight:800;margin-bottom:2px">Annual Report</div><div style="font-size:8px;color:' + color + ';margin-bottom:12px">' + template.name + '</div>' +
          '<div style="display:flex;gap:6px;margin-bottom:10px"><div style="flex:1;background:' + color + '15;padding:6px;border-radius:4px;text-align:center"><div style="font-size:12px;font-weight:700;color:' + color + '">$2.4M</div><div style="font-size:6px;color:#999">Revenue</div></div><div style="flex:1;background:' + color + '15;padding:6px;border-radius:4px;text-align:center"><div style="font-size:12px;font-weight:700;color:' + color + '">+18%</div><div style="font-size:6px;color:#999">Growth</div></div><div style="flex:1;background:' + color + '15;padding:6px;border-radius:4px;text-align:center"><div style="font-size:12px;font-weight:700;color:' + color + '">142</div><div style="font-size:6px;color:#999">Clients</div></div></div>' +
          '<div style="font-size:8px;color:#444;line-height:1.5">This report provides a comprehensive overview of organizational performance metrics for the fiscal year ending December 2025...</div>';
      }
      return '<div style="background:' + color + ';color:#fff;padding:10px 12px;margin:-20px -20px 12px"><div style="font-size:12px;font-weight:700">QUARTERLY REPORT</div><div style="font-size:7px;opacity:0.8">Q4 2025 | ' + template.name + '</div></div>' +
        '<div style="font-size:8px;font-weight:600;color:' + color + ';margin-bottom:4px">KEY FINDINGS</div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:6px">1. Revenue exceeded targets by 12% across all segments<br>2. Customer satisfaction improved to 94%<br>3. Operational costs reduced by $180K</div>' +
        '<div style="height:30px;background:linear-gradient(90deg,' + color + '33,' + color + '11);border-radius:4px;display:flex;align-items:center;padding:0 8px;font-size:7px;color:' + color + '">Chart: Revenue Trend &#x2191;</div>';
    }

    // --- FORMS LAYOUTS ---
    if (cat === 'forms') {
      return '<div style="font-size:12px;font-weight:700;margin-bottom:2px;color:' + color + '">' + template.name + '</div><div style="font-size:7px;color:#999;margin-bottom:10px">Please fill out all required fields</div>' +
        '<div style="margin-bottom:6px"><div style="font-size:7px;color:#666;margin-bottom:2px">Full Name *</div><div style="border:1px solid #ddd;border-radius:3px;padding:4px 6px;font-size:8px;color:#ccc">Enter your name</div></div>' +
        '<div style="margin-bottom:6px"><div style="font-size:7px;color:#666;margin-bottom:2px">Email Address *</div><div style="border:1px solid #ddd;border-radius:3px;padding:4px 6px;font-size:8px;color:#ccc">you@email.com</div></div>' +
        '<div style="margin-bottom:6px"><div style="font-size:7px;color:#666;margin-bottom:2px">Message</div><div style="border:1px solid #ddd;border-radius:3px;padding:4px 6px;height:25px;font-size:8px;color:#ccc">Your message here...</div></div>' +
        '<div style="background:' + color + ';color:#fff;text-align:center;padding:5px;border-radius:3px;font-size:8px;font-weight:600;margin-top:8px">Submit</div>';
    }

    // --- GENERIC FALLBACK (Agreements, Pay Stubs, Receipts, etc) ---
    const gLayout = h % 3;
    if (gLayout === 0) {
      return '<div style="text-align:center;padding:12px 0;border-bottom:2px solid ' + color + ';margin-bottom:10px"><div style="font-size:13px;font-weight:800;text-transform:uppercase">' + category.replace(/s$/, '') + '</div><div style="font-size:7px;color:' + color + '">' + template.name + '</div></div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:6px">This document sets forth the terms and conditions applicable to the parties involved as described herein...</div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6">All provisions of this document shall be binding upon execution by authorized representatives of each party...</div>';
    }
    if (gLayout === 1) {
      return '<div style="background:' + color + ';color:#fff;padding:10px 12px;margin:-20px -20px 12px;font-size:12px;font-weight:700">' + category.replace(/s$/, '').toUpperCase() + '</div>' +
        '<div style="font-size:8px;color:#999;margin-bottom:8px">' + template.name + ' | Date: Jan 1, 2026</div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6;margin-bottom:6px;padding:6px;background:#f9f9f9;border-radius:4px">Section 1: This section outlines the primary terms and conditions governing the relationship between the involved parties...</div>' +
        '<div style="font-size:8px;color:#444;line-height:1.6">Section 2: Additional provisions and amendments may be appended as necessary with mutual written consent...</div>';
    }
    return '<div style="display:flex"><div style="width:4px;background:' + color + ';margin:-20px 12px -20px -20px"></div><div style="flex:1"><div style="font-size:13px;font-weight:700;margin-bottom:2px">' + category.replace(/s$/, '') + '</div><div style="font-size:7px;color:' + color + ';margin-bottom:10px">' + template.name + '</div>' +
      '<div style="font-size:8px;color:#444;line-height:1.6">This document serves as a formal record of the agreement between the undersigned parties. Terms outlined herein are effective upon signature.</div></div></div>';
  }

  // ============================================
  // UPGRADE MODAL
  // ============================================
  window.showTemplateUpgradePrompt = function(templateName) {
    const existing = document.querySelector('.upgrade-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'upgrade-modal-overlay';
    overlay.innerHTML = '<div class="upgrade-modal-box">' +
      '<h3>\u2728 Pro Template</h3>' +
      '<p><strong>' + templateName + '</strong> is available on the Pro plan. Upgrade to unlock all premium templates and features.</p>' +
      '<button class="upgrade-btn" onclick="window.location.href=\'pricing.html\'">Upgrade to Pro — $12/mo</button>' +
      '<span class="cancel-link" onclick="this.closest(\'.upgrade-modal-overlay\').remove()">Maybe later</span>' +
      '</div>';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  };

  // ============================================
  // OVERRIDE renderTemplateGrid
  // ============================================
  const _origRenderTemplateGrid = window.renderTemplateGrid;

  window.renderTemplateGrid = function(category) {
    const grid = document.getElementById('templateGrid');
    if (!grid) return;
    if (!window.TEMPLATES || !TEMPLATES[category]) {
      if (_origRenderTemplateGrid) return _origRenderTemplateGrid(category);
      return;
    }

    const templates = TEMPLATES[category];
    // Determine user plan (default to 'free')
    let userPlan = 'free';
    try {
      if (window.sbClient) {
        window.sbClient.auth.getUser().then(function(res) {
          if (res.data && res.data.user) {
            window.sbClient.from('profiles').select('plan').eq('id', res.data.user.id).single().then(function(p) {
              if (p.data && p.data.plan) {
                window.__userPlan = p.data.plan;
              }
            });
          }
        });
      }
    } catch(e) {}
    userPlan = window.__userPlan || 'free';

    let html = '';
    templates.forEach(function(t, i) {
      const isPro = t.tier === 'pro';
      const isLocked = isPro && (userPlan === 'free');
      const previewHTML = generatePreview(t, category);
      const lockedClass = isLocked ? ' locked' : '';

      html += '<div class="template-card' + lockedClass + '" ';
      if (isLocked) {
        html += 'onclick="showTemplateUpgradePrompt(\'' + t.name.replace(/'/g, "\\'") + '\')"';
      } else {
        html += 'onclick="loadTemplate(\'' + category + '\', ' + i + ')"';
      }
      html += '>';
      html += '<div class="preview"><div class="preview-inner">' + previewHTML + '</div></div>';
      html += '<div class="info"><h4>' + t.name + '</h4>';
      html += '<span class="' + (isPro ? 'pro' : 'free') + '">' + (isPro ? 'Pro' : 'Free') + '</span>';
      html += '</div></div>';
    });

    grid.innerHTML = html;
  };

  // ============================================
  // OVERRIDE filterTemplates for search
  // ============================================
  window.filterTemplates = function(query) {
    const grid = document.getElementById('templateGrid');
    if (!grid) return;
    const q = query.toLowerCase().trim();
    const cards = grid.querySelectorAll('.template-card');
    cards.forEach(function(card) {
      const name = card.querySelector('h4');
      if (!name) return;
      const text = name.textContent.toLowerCase();
      card.style.display = (q === '' || text.includes(q)) ? '' : 'none';
    });
  };

  // ============================================
  // AUTO-INIT: Re-render when template modal opens
  // ============================================
  const origOpenTemplates = window.openTemplates;
  window.openTemplates = function() {
    if (origOpenTemplates) origOpenTemplates();
    // Re-render active tab
    setTimeout(function() {
      const activeTab = document.querySelector('.template-tab.active');
      if (activeTab) {
        const category = activeTab.textContent.replace(/\s*\(\d+\)/, '');
        renderTemplateGrid(category);
      }
    }, 100);
  };

  console.log('[DraftMyForms] Template preview system loaded');
})();
