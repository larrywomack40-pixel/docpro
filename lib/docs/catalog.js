// Document catalog and plan gating for the DraftMyForms document engine.
// Slugs are permanent. They appear in storage paths and in the
// generated_documents.slug column. Do not rename without a migration.

const CATALOG = {
    'pay-stub': {
    slug: 'pay-stub',
          title: 'Pay Stub',
          category: 'financial',
          category_label: 'Financial',
          icon: '\u{1F4B5}',
          plan: 'free',
          renderer: 'financial',
          fields: [
      { name: 'employer_name', label: 'Employer Name', type: 'text', required: true },
      { name: 'employer_address', label: 'Employer Address', type: 'textarea' },
{ name: 'employee_name', label: 'Employee Name', type: 'text', required: true },
  { name: 'employee_address', label: 'Employee Address', type: 'textarea' },
{ name: 'employee_id', label: 'Employee ID', type: 'text' },
{ name: 'pay_period_start', label: 'Pay Period Start', type: 'date', required: true },
  { name: 'pay_period_end', label: 'Pay Period End', type: 'date', required: true },
  { name: 'pay_date', label: 'Pay Date', type: 'date', required: true },
  { name: 'hours_worked', label: 'Hours Worked', type: 'number' },
{ name: 'hourly_rate', label: 'Hourly Rate', type: 'number' },
{ name: 'gross_pay', label: 'Gross Pay (this period)', type: 'number', required: true },
  { name: 'federal_tax', label: 'Federal Income Tax', type: 'number' },
{ name: 'state_tax', label: 'State Income Tax', type: 'number' },
{ name: 'social_security', label: 'Social Security', type: 'number' },
{ name: 'medicare', label: 'Medicare', type: 'number' },
{ name: 'other_deductions', label: 'Other Deductions', type: 'number' },
{ name: 'ytd_gross', label: 'YTD Gross', type: 'number' },
{ name: 'ytd_federal_tax', label: 'YTD Federal Tax', type: 'number' },
{ name: 'ytd_state_tax', label: 'YTD State Tax', type: 'number' },
{ name: 'ytd_social_security', label: 'YTD Social Security', type: 'number' },
{ name: 'ytd_medicare', label: 'YTD Medicare', type: 'number' },
{ name: 'ytd_deductions', label: 'YTD Other Deductions', type: 'number' }
    ]
},

  'invoice': {
    slug: 'invoice',
          title: 'Invoice',
    category: 'financial',
          category_label: 'Financial',
          icon: '\u{1F4C4}',
          plan: 'free',
          renderer: 'financial',
    fields: [
{ name: 'business_name', label: 'Your Business Name', type: 'text', required: true },
  { name: 'business_address', label: 'Your Business Address', type: 'textarea' },
{ name: 'business_email', label: 'Your Email', type: 'text' },
{ name: 'business_phone', label: 'Your Phone', type: 'text' },
{ name: 'client_name', label: 'Client Name', type: 'text', required: true },
{ name: 'client_address', label: 'Client Address', type: 'textarea' },
{ name: 'invoice_number', label: 'Invoice Number', type: 'text', required: true },
{ name: 'invoice_date', label: 'Invoice Date', type: 'date', required: true },
  { name: 'due_date', label: 'Due Date', type: 'date' },
{ name: 'line_items', label: 'Line Items (one per line: description | qty | unit price)', type: 'textarea', required: true },
  { name: 'tax_rate', label: 'Tax Rate %', type: 'number' },
{ name: 'notes', label: 'Notes', type: 'textarea' }
    ]
},

  'quote': {
    slug: 'quote',
    title: 'Quote',
    category: 'financial',
    category_label: 'Financial',
    icon: '\u{1F4DD}',
    plan: 'free',
    renderer: 'financial',
    fields: [
{ name: 'business_name', label: 'Your Business Name', type: 'text', required: true },
{ name: 'business_address', label: 'Your Business Address', type: 'textarea' },
{ name: 'business_email', label: 'Your Email', type: 'text' },
{ name: 'business_phone', label: 'Your Phone', type: 'text' },
{ name: 'client_name', label: 'Client Name', type: 'text', required: true },
{ name: 'client_address', label: 'Client Address', type: 'textarea' },
{ name: 'quote_number', label: 'Quote Number', type: 'text', required: true },
{ name: 'quote_date', label: 'Quote Date', type: 'date', required: true },
{ name: 'valid_until', label: 'Valid Until', type: 'date' },
{ name: 'line_items', label: 'Line Items (one per line: description | qty | unit price)', type: 'textarea', required: true },
  { name: 'tax_rate', label: 'Tax Rate %', type: 'number' },
{ name: 'terms', label: 'Terms and Conditions', type: 'textarea' }
    ]
  },

  'ramp-quote': {
    slug: 'ramp-quote',
          title: 'Ramp Quote',
          category: 'financial',
          category_label: 'Financial',
          icon: '\u267F\uFE0F',
          plan: 'free',
          renderer: 'financial',
          business_from_env: true,
          fields: [
      { name: 'client_name', label: 'Client Name', type: 'text', required: true },
      { name: 'client_address', label: 'Site Address', type: 'textarea', required: true },
      { name: 'client_email', label: 'Client Email', type: 'text' },
{ name: 'client_phone', label: 'Client Phone', type: 'text' },
{ name: 'quote_number', label: 'Quote Number', type: 'text', required: true },
  { name: 'quote_date', label: 'Quote Date', type: 'date', required: true },
  { name: 'valid_until', label: 'Valid Until', type: 'date' },
{ name: 'ramp_length_ft', label: 'Ramp Length (ft)', type: 'number' },
{ name: 'ramp_material', label: 'Material', type: 'select', options: ['Aluminum', 'Wood', 'Steel', 'Composite'] },
{ name: 'rise_height_in', label: 'Rise Height (in)', type: 'number' },
{ name: 'line_items', label: 'Line Items (one per line: description | qty | unit price)', type: 'textarea', required: true },
  { name: 'tax_rate', label: 'Tax Rate %', type: 'number' },
{ name: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },

  'nda': {
    slug: 'nda',
          title: 'Non-Disclosure Agreement',
          category: 'legal',
          category_label: 'Legal',
          icon: '\u{1F510}',
          plan: 'pro',
          renderer: 'legal',
          fields: [
      { name: 'disclosing_party', label: 'Disclosing Party (full legal name)', type: 'text', required: true },
      { name: 'disclosing_address', label: 'Disclosing Party Address', type: 'textarea' },
{ name: 'receiving_party', label: 'Receiving Party (full legal name)', type: 'text', required: true },
  { name: 'receiving_address', label: 'Receiving Party Address', type: 'textarea' },
{ name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
  { name: 'purpose', label: 'Purpose of Disclosure', type: 'textarea', required: true },
  { name: 'term_years', label: 'Confidentiality Term (years)', type: 'number' },
{ name: 'governing_state', label: 'Governing State', type: 'text' },
{ name: 'mutual', label: 'Mutual NDA', type: 'select', options: ['Yes', 'No'] }
    ]
  },

  'contractor-agreement': {
    slug: 'contractor-agreement',
          title: 'Independent Contractor Agreement',
          category: 'legal',
          category_label: 'Legal',
          icon: '\u{1F4DC}',
          plan: 'pro',
          renderer: 'legal',
          fields: [
      { name: 'client_name', label: 'Client (full legal name)', type: 'text', required: true },
      { name: 'client_address', label: 'Client Address', type: 'textarea' },
{ name: 'contractor_name', label: 'Contractor (full legal name)', type: 'text', required: true },
  { name: 'contractor_address', label: 'Contractor Address', type: 'textarea' },
{ name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
  { name: 'services', label: 'Description of Services', type: 'textarea', required: true },
  { name: 'compensation', label: 'Compensation', type: 'textarea', required: true },
  { name: 'term', label: 'Term of Agreement', type: 'text' },
{ name: 'governing_state', label: 'Governing State', type: 'text' }
    ]
  },

  'bill-of-sale': {
    slug: 'bill-of-sale',
          title: 'Bill of Sale',
          category: 'legal',
          category_label: 'Legal',
          icon: '\u{1F4DD}',
          plan: 'pro',
          renderer: 'legal',
          fields: [
      { name: 'seller_name', label: 'Seller (full legal name)', type: 'text', required: true },
      { name: 'seller_address', label: 'Seller Address', type: 'textarea' },
{ name: 'buyer_name', label: 'Buyer (full legal name)', type: 'text', required: true },
  { name: 'buyer_address', label: 'Buyer Address', type: 'textarea' },
{ name: 'sale_date', label: 'Date of Sale', type: 'date', required: true },
  { name: 'item_description', label: 'Item Description', type: 'textarea', required: true },
  { name: 'sale_price', label: 'Sale Price (USD)', type: 'number', required: true },
  { name: 'payment_method', label: 'Payment Method', type: 'text' },
{ name: 'as_is', label: 'Sold As-Is', type: 'select', options: ['Yes', 'No'] },
{ name: 'governing_state', label: 'Governing State', type: 'text' }
    ]
  },

  'eviction-notice': {
    slug: 'eviction-notice',
          title: 'Eviction Notice',
          category: 'legal',
          category_label: 'Legal',
          icon: '\u{1F4E2}',
          plan: 'pro',
          renderer: 'legal',
          fields: [
      { name: 'landlord_name', label: 'Landlord Name', type: 'text', required: true },
      { name: 'landlord_address', label: 'Landlord Address', type: 'textarea' },
{ name: 'tenant_name', label: 'Tenant Name', type: 'text', required: true },
  { name: 'property_address', label: 'Property Address', type: 'textarea', required: true },
  { name: 'notice_date', label: 'Notice Date', type: 'date', required: true },
  { name: 'reason', label: 'Reason for Notice', type: 'textarea', required: true },
  { name: 'cure_days', label: 'Days to Cure or Vacate', type: 'number', required: true },
  { name: 'amount_due', label: 'Amount Due (if any)', type: 'number' },
{ name: 'governing_state', label: 'State', type: 'text' }
    ]
  },

  'home-mod-assessment': {
    slug: 'home-mod-assessment',
          title: 'Home Modification Assessment',
          category: 'assessment',
          category_label: 'Assessment',
          icon: '\u{1F3E0}',
          plan: 'pro',
          renderer: 'assessment',
          business_from_env: true,
          fields: [
      { name: 'client_name', label: 'Client Name', type: 'text', required: true },
      { name: 'client_address', label: 'Property Address', type: 'textarea', required: true },
      { name: 'client_phone', label: 'Client Phone', type: 'text' },
{ name: 'assessment_date', label: 'Assessment Date', type: 'date', required: true },
  { name: 'assessor_name', label: 'Assessor Name', type: 'text' },
{ name: 'entry_grab_bars', label: 'Entry: Grab bars needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'entry_ramp', label: 'Entry: Ramp needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'bath_grab_bars', label: 'Bathroom: Grab bars needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'bath_walk_in_shower', label: 'Bathroom: Walk-in shower needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'bath_raised_toilet', label: 'Bathroom: Raised toilet needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'door_widening', label: 'Doorway widening needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'lighting_upgrade', label: 'Lighting upgrade needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'flooring_change', label: 'Flooring change needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'stair_lift', label: 'Stair lift needed', type: 'select', options: ['Yes', 'No', 'N/A'] },
{ name: 'notes', label: 'Additional Observations', type: 'textarea' },
{ name: 'recommendations', label: 'Recommended Modifications Summary', type: 'textarea', required: true }
    ]
  },

  'advance-directive': {
    slug: 'advance-directive',
          title: 'Advance Healthcare Directive',
          category: 'estate',
          category_label: 'Estate',
          icon: '\u{1FA7A}',
          plan: 'business',
          renderer: 'estate',
          fields: [
      { name: 'declarant_name', label: 'Declarant (full legal name)', type: 'text', required: true },
      { name: 'declarant_address', label: 'Declarant Address', type: 'textarea' },
{ name: 'declarant_dob', label: 'Date of Birth', type: 'date' },
{ name: 'agent_name', label: 'Healthcare Agent (full legal name)', type: 'text', required: true },
  { name: 'agent_phone', label: 'Agent Phone', type: 'text' },
{ name: 'agent_address', label: 'Agent Address', type: 'textarea' },
{ name: 'alternate_agent_name', label: 'Alternate Agent', type: 'text' },
{ name: 'alternate_agent_phone', label: 'Alternate Agent Phone', type: 'text' },
{ name: 'life_sustaining_preference', label: 'Life-Sustaining Treatment Preference', type: 'select', options: ['Prolong life by all means', 'Withhold or withdraw if no reasonable chance of recovery', 'Other (see notes)'] },
{ name: 'artificial_nutrition', label: 'Artificial Nutrition Preference', type: 'select', options: ['Provide', 'Withhold', 'Other (see notes)'] },
{ name: 'pain_relief', label: 'Pain Relief Preference', type: 'select', options: ['Provide even if it hastens death', 'Provide only if it does not hasten death'] },
{ name: 'other_instructions', label: 'Other Instructions', type: 'textarea' },
{ name: 'governing_state', label: 'Governing State', type: 'text', required: true }
    ]
  },

  'power-of-attorney': {
    slug: 'power-of-attorney',
          title: 'Power of Attorney',
          category: 'estate',
          category_label: 'Estate',
          icon: '\u2696\uFE0F',
          plan: 'business',
          renderer: 'estate',
          fields: [
      { name: 'principal_name', label: 'Principal (full legal name)', type: 'text', required: true },
      { name: 'principal_address', label: 'Principal Address', type: 'textarea' },
{ name: 'agent_name', label: 'Agent / Attorney-in-Fact (full legal name)', type: 'text', required: true },
  { name: 'agent_address', label: 'Agent Address', type: 'textarea' },
{ name: 'alternate_agent_name', label: 'Alternate Agent', type: 'text' },
{ name: 'powers_scope', label: 'Scope of Powers', type: 'select', options: ['General (broad authority)', 'Limited (specific acts only)', 'Financial only', 'Medical only'] },
{ name: 'specific_powers', label: 'Specific Powers Granted', type: 'textarea', required: true },
  { name: 'effective_when', label: 'When Effective', type: 'select', options: ['Immediately upon signing', 'Upon principal incapacity (springing)'] },
{ name: 'durable', label: 'Durable (continues if principal incapacitated)', type: 'select', options: ['Yes', 'No'] },
{ name: 'termination_date', label: 'Termination Date (if any)', type: 'date' },
{ name: 'governing_state', label: 'Governing State', type: 'text', required: true }
    ]
  }
};

const PLAN_TIER = { free: 0, pro: 1, business: 2 };

function planAllows(userPlan, slug) {
    const entry = CATALOG[slug];
  if (!entry) return false;
  const userTier = PLAN_TIER[(userPlan || 'free').toLowerCase()] ?? 0;
  const docTier = PLAN_TIER[entry.plan] ?? 0;
  return userTier >= docTier;
}

function getCatalogList() {
    return Object.values(CATALOG).map(d => ({
          slug: d.slug,
          title: d.title,
          category: d.category,
          category_label: d.category_label,
          icon: d.icon,
          plan: d.plan,
          fields: d.fields
      }));
}

module.exports = { CATALOG, PLAN_TIER, planAllows, getCatalogList };
