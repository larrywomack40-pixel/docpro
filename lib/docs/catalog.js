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
  },

  'receipt': {
    slug: 'receipt',
    title: 'Receipt',
    category: 'financial',
    category_label: 'Financial',
    icon: '\u{1F9FE}',
    plan: 'free',
    renderer: 'financial',
    fields: [
      { name: 'business_name', label: 'Business Name', type: 'text', required: true },
      { name: 'business_address', label: 'Business Address', type: 'textarea' },
      { name: 'business_phone', label: 'Business Phone', type: 'text' },
      { name: 'customer_name', label: 'Customer Name', type: 'text' },
      { name: 'receipt_number', label: 'Receipt Number', type: 'text', required: true },
      { name: 'receipt_date', label: 'Receipt Date', type: 'date', required: true },
      { name: 'line_items', label: 'Items (one per line: description | qty | unit price)', type: 'textarea', required: true },
      { name: 'tax_rate', label: 'Tax Rate %', type: 'number' },
      { name: 'amount_paid', label: 'Amount Paid (USD)', type: 'number' },
      { name: 'payment_method', label: 'Payment Method', type: 'select', options: ['Cash', 'Credit Card', 'Debit Card', 'Check', 'Bank Transfer', 'Other'] },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },

  'purchase-order': {
    slug: 'purchase-order',
    title: 'Purchase Order',
    category: 'financial',
    category_label: 'Financial',
    icon: '\u{1F4E6}',
    plan: 'free',
    renderer: 'financial',
    fields: [
      { name: 'buyer_name', label: 'Buyer / Company Name', type: 'text', required: true },
      { name: 'buyer_address', label: 'Buyer Address', type: 'textarea' },
      { name: 'vendor_name', label: 'Vendor Name', type: 'text', required: true },
      { name: 'vendor_address', label: 'Vendor Address', type: 'textarea' },
      { name: 'po_number', label: 'PO Number', type: 'text', required: true },
      { name: 'po_date', label: 'Order Date', type: 'date', required: true },
      { name: 'ship_to', label: 'Ship To Address', type: 'textarea' },
      { name: 'delivery_date', label: 'Requested Delivery Date', type: 'date' },
      { name: 'line_items', label: 'Line Items (one per line: description | qty | unit price)', type: 'textarea', required: true },
      { name: 'tax_rate', label: 'Tax Rate %', type: 'number' },
      { name: 'shipping_terms', label: 'Shipping Terms', type: 'text' },
      { name: 'payment_terms', label: 'Payment Terms (e.g., Net 30)', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },

  'credit-memo': {
    slug: 'credit-memo',
    title: 'Credit Memo',
    category: 'financial',
    category_label: 'Financial',
    icon: '\u{1F4B3}',
    plan: 'free',
    renderer: 'financial',
    fields: [
      { name: 'business_name', label: 'Your Business Name', type: 'text', required: true },
      { name: 'business_address', label: 'Your Business Address', type: 'textarea' },
      { name: 'client_name', label: 'Client Name', type: 'text', required: true },
      { name: 'client_address', label: 'Client Address', type: 'textarea' },
      { name: 'memo_number', label: 'Credit Memo Number', type: 'text', required: true },
      { name: 'memo_date', label: 'Date', type: 'date', required: true },
      { name: 'original_invoice', label: 'Original Invoice Number', type: 'text' },
      { name: 'line_items', label: 'Credited Items (one per line: description | qty | unit price)', type: 'textarea', required: true },
      { name: 'tax_rate', label: 'Tax Rate %', type: 'number' },
      { name: 'reason', label: 'Reason for Credit', type: 'textarea' }
    ]
  },

  'residential-lease': {
    slug: 'residential-lease',
    title: 'Residential Lease Agreement',
    category: 'real-estate',
    category_label: 'Real Estate',
    icon: '\u{1F3E1}',
    plan: 'pro',
    renderer: 'realestate',
    fields: [
      { name: 'landlord_name', label: 'Landlord Name', type: 'text', required: true },
      { name: 'landlord_address', label: 'Landlord Address', type: 'textarea' },
      { name: 'tenant_name', label: 'Tenant Name(s)', type: 'text', required: true },
      { name: 'property_address', label: 'Rental Property Address', type: 'textarea', required: true },
      { name: 'lease_start', label: 'Lease Start Date', type: 'date', required: true },
      { name: 'lease_end', label: 'Lease End Date', type: 'date', required: true },
      { name: 'monthly_rent', label: 'Monthly Rent (USD)', type: 'number', required: true },
      { name: 'rent_due_day', label: 'Rent Due (e.g., 1st of each month)', type: 'text' },
      { name: 'grace_period_days', label: 'Late Fee Grace Period (days)', type: 'number' },
      { name: 'late_fee', label: 'Late Fee (USD)', type: 'number' },
      { name: 'security_deposit', label: 'Security Deposit (USD)', type: 'number' },
      { name: 'occupants', label: 'Authorized Occupants', type: 'textarea' },
      { name: 'utilities_tenant', label: 'Utilities Paid by Tenant', type: 'textarea' },
      { name: 'pets_policy', label: 'Pet Policy', type: 'select', options: ['No pets allowed', 'Pets allowed with deposit', 'Pets allowed'] },
      { name: 'lead_paint_disclosure', label: 'Property built before 1978 (lead paint disclosure)', type: 'select', options: ['No', 'Yes'] },
      { name: 'governing_state', label: 'State', type: 'text' }
    ]
  },

  'month-to-month-rental': {
    slug: 'month-to-month-rental',
    title: 'Month-to-Month Rental Agreement',
    category: 'real-estate',
    category_label: 'Real Estate',
    icon: '\u{1F504}',
    plan: 'pro',
    renderer: 'realestate',
    fields: [
      { name: 'landlord_name', label: 'Landlord Name', type: 'text', required: true },
      { name: 'landlord_address', label: 'Landlord Address', type: 'textarea' },
      { name: 'tenant_name', label: 'Tenant Name(s)', type: 'text', required: true },
      { name: 'property_address', label: 'Rental Property Address', type: 'textarea', required: true },
      { name: 'start_date', label: 'Agreement Start Date', type: 'date', required: true },
      { name: 'monthly_rent', label: 'Monthly Rent (USD)', type: 'number', required: true },
      { name: 'rent_due_day', label: 'Rent Due (e.g., 1st of each month)', type: 'text' },
      { name: 'security_deposit', label: 'Security Deposit (USD)', type: 'number' },
      { name: 'notice_days', label: 'Notice to Terminate (days, e.g., 30)', type: 'number' },
      { name: 'utilities_tenant', label: 'Utilities Paid by Tenant', type: 'textarea' },
      { name: 'pets_policy', label: 'Pet Policy', type: 'select', options: ['No pets allowed', 'Pets allowed with deposit', 'Pets allowed'] },
      { name: 'governing_state', label: 'State', type: 'text' }
    ]
  },

  'rental-application': {
    slug: 'rental-application',
    title: 'Rental Application',
    category: 'real-estate',
    category_label: 'Real Estate',
    icon: '\u{1F4CB}',
    plan: 'pro',
    renderer: 'realestate',
    fields: [
      { name: 'property_address', label: 'Property Applying For', type: 'textarea', required: true },
      { name: 'applicant_name', label: 'Applicant Full Name', type: 'text', required: true },
      { name: 'applicant_dob', label: 'Date of Birth', type: 'date' },
      { name: 'applicant_phone', label: 'Phone', type: 'text' },
      { name: 'applicant_email', label: 'Email', type: 'text' },
      { name: 'ssn_last4', label: 'SSN (last 4 digits only)', type: 'text' },
      { name: 'current_address', label: 'Current Address', type: 'textarea' },
      { name: 'current_landlord', label: 'Current Landlord Name & Phone', type: 'text' },
      { name: 'monthly_income', label: 'Gross Monthly Income (USD)', type: 'number' },
      { name: 'employer_name', label: 'Employer', type: 'text' },
      { name: 'employer_phone', label: 'Employer Phone', type: 'text' },
      { name: 'job_title', label: 'Job Title', type: 'text' },
      { name: 'employment_length', label: 'Length of Employment', type: 'text' },
      { name: 'additional_income', label: 'Additional Income Sources', type: 'textarea' },
      { name: 'references', label: 'References (one per line: name, relationship, phone)', type: 'textarea' },
      { name: 'vehicle', label: 'Vehicle (make, model, plate)', type: 'text' },
      { name: 'pets', label: 'Pets', type: 'text' },
      { name: 'ever_evicted', label: 'Ever been evicted?', type: 'select', options: ['No', 'Yes'] },
      { name: 'desired_move_in', label: 'Desired Move-In Date', type: 'date' }
    ]
  },

  'lease-termination': {
    slug: 'lease-termination',
    title: 'Lease Termination Notice',
    category: 'real-estate',
    category_label: 'Real Estate',
    icon: '\u{1F4ED}',
    plan: 'pro',
    renderer: 'realestate',
    fields: [
      { name: 'sent_by', label: 'This notice is given by', type: 'select', options: ['Landlord', 'Tenant'] },
      { name: 'landlord_name', label: 'Landlord Name', type: 'text', required: true },
      { name: 'tenant_name', label: 'Tenant Name', type: 'text', required: true },
      { name: 'property_address', label: 'Rental Property Address', type: 'textarea', required: true },
      { name: 'lease_date', label: 'Original Lease Date', type: 'date' },
      { name: 'notice_date', label: 'Notice Date', type: 'date', required: true },
      { name: 'move_out_date', label: 'Move-Out / Termination Date', type: 'date', required: true },
      { name: 'reason', label: 'Reason for Termination', type: 'textarea' },
      { name: 'forwarding_address', label: 'Tenant Forwarding Address (for deposit return)', type: 'textarea' },
      { name: 'governing_state', label: 'State', type: 'text' }
    ]
  },

  'promissory-note': {
    slug: 'promissory-note',
    title: 'Promissory Note',
    category: 'legal',
    category_label: 'Legal',
    icon: '\u{1F4B0}',
    plan: 'pro',
    renderer: 'legal',
    fields: [
      { name: 'lender_name', label: 'Lender Name', type: 'text', required: true },
      { name: 'lender_address', label: 'Lender Address', type: 'textarea' },
      { name: 'borrower_name', label: 'Borrower Name', type: 'text', required: true },
      { name: 'borrower_address', label: 'Borrower Address', type: 'textarea' },
      { name: 'principal_amount', label: 'Principal Amount (USD)', type: 'number', required: true },
      { name: 'interest_rate', label: 'Annual Interest Rate %', type: 'number' },
      { name: 'note_date', label: 'Date of Note', type: 'date', required: true },
      { name: 'repayment_type', label: 'Repayment Type', type: 'select', options: ['Lump sum on maturity date', 'Monthly installments', 'On demand'] },
      { name: 'payment_amount', label: 'Installment Payment Amount (if applicable)', type: 'number' },
      { name: 'payment_frequency', label: 'Payment Frequency (if installments)', type: 'select', options: ['Monthly', 'Biweekly', 'Weekly', 'Quarterly'] },
      { name: 'maturity_date', label: 'Maturity / Due Date', type: 'date' },
      { name: 'late_fee', label: 'Late Fee Terms', type: 'text' },
      { name: 'secured', label: 'Security', type: 'select', options: ['Unsecured', 'Secured by collateral'] },
      { name: 'collateral', label: 'Collateral Description (if secured)', type: 'textarea' },
      { name: 'governing_state', label: 'Governing State', type: 'text' }
    ]
  },

  'loan-agreement': {
    slug: 'loan-agreement',
    title: 'Loan Agreement',
    category: 'legal',
    category_label: 'Legal',
    icon: '\u{1F3E6}',
    plan: 'pro',
    renderer: 'legal',
    fields: [
      { name: 'lender_name', label: 'Lender Name', type: 'text', required: true },
      { name: 'lender_address', label: 'Lender Address', type: 'textarea' },
      { name: 'borrower_name', label: 'Borrower Name', type: 'text', required: true },
      { name: 'borrower_address', label: 'Borrower Address', type: 'textarea' },
      { name: 'loan_amount', label: 'Loan Amount (USD)', type: 'number', required: true },
      { name: 'interest_rate', label: 'Annual Interest Rate %', type: 'number' },
      { name: 'agreement_date', label: 'Agreement Date', type: 'date', required: true },
      { name: 'repayment_terms', label: 'Repayment Terms', type: 'textarea', required: true },
      { name: 'first_payment_date', label: 'First Payment Date', type: 'date' },
      { name: 'final_payment_date', label: 'Final Payment / Maturity Date', type: 'date' },
      { name: 'late_fee', label: 'Late Fee Terms', type: 'text' },
      { name: 'collateral', label: 'Collateral / Security (if any)', type: 'textarea' },
      { name: 'default_terms', label: 'Events of Default', type: 'textarea' },
      { name: 'governing_state', label: 'Governing State', type: 'text' }
    ]
  },

  'demand-letter': {
    slug: 'demand-letter',
    title: 'Demand Letter',
    category: 'legal',
    category_label: 'Legal',
    icon: '✉️',
    plan: 'pro',
    renderer: 'legal',
    fields: [
      { name: 'sender_name', label: 'Your Name', type: 'text', required: true },
      { name: 'sender_address', label: 'Your Address', type: 'textarea' },
      { name: 'recipient_name', label: 'Recipient Name', type: 'text', required: true },
      { name: 'recipient_address', label: 'Recipient Address', type: 'textarea' },
      { name: 'letter_date', label: 'Date', type: 'date', required: true },
      { name: 'amount_owed', label: 'Amount Owed (USD)', type: 'number' },
      { name: 'reason', label: 'Description of Debt / Dispute', type: 'textarea', required: true },
      { name: 'original_date', label: 'Date Debt / Obligation Arose', type: 'date' },
      { name: 'deadline_date', label: 'Deadline to Respond or Pay', type: 'date' },
      { name: 'consequences', label: 'Consequences if Not Resolved', type: 'textarea' },
      { name: 'governing_state', label: 'Governing State', type: 'text' }
    ]
  },

  'service-agreement': {
    slug: 'service-agreement',
    title: 'Service Agreement',
    category: 'legal',
    category_label: 'Legal',
    icon: '\u{1F91D}',
    plan: 'pro',
    renderer: 'legal',
    fields: [
      { name: 'provider_name', label: 'Service Provider (full legal name)', type: 'text', required: true },
      { name: 'provider_address', label: 'Provider Address', type: 'textarea' },
      { name: 'client_name', label: 'Client (full legal name)', type: 'text', required: true },
      { name: 'client_address', label: 'Client Address', type: 'textarea' },
      { name: 'effective_date', label: 'Effective Date', type: 'date', required: true },
      { name: 'services', label: 'Description of Services', type: 'textarea', required: true },
      { name: 'fees', label: 'Fees and Payment Terms', type: 'textarea', required: true },
      { name: 'term', label: 'Term of Agreement', type: 'text' },
      { name: 'termination', label: 'Termination Terms', type: 'textarea' },
      { name: 'governing_state', label: 'Governing State', type: 'text' }
    ]
  },

  'vehicle-bill-of-sale': {
    slug: 'vehicle-bill-of-sale',
    title: 'Vehicle Bill of Sale',
    category: 'automotive',
    category_label: 'Automotive',
    icon: '\u{1F697}',
    plan: 'pro',
    renderer: 'legal',
    fields: [
      { name: 'seller_name', label: 'Seller (full legal name)', type: 'text', required: true },
      { name: 'seller_address', label: 'Seller Address', type: 'textarea' },
      { name: 'buyer_name', label: 'Buyer (full legal name)', type: 'text', required: true },
      { name: 'buyer_address', label: 'Buyer Address', type: 'textarea' },
      { name: 'sale_date', label: 'Date of Sale', type: 'date', required: true },
      { name: 'vehicle_year', label: 'Vehicle Year', type: 'text', required: true },
      { name: 'vehicle_make', label: 'Make', type: 'text', required: true },
      { name: 'vehicle_model', label: 'Model', type: 'text', required: true },
      { name: 'vehicle_vin', label: 'VIN', type: 'text', required: true },
      { name: 'vehicle_color', label: 'Color', type: 'text' },
      { name: 'odometer', label: 'Odometer Reading (miles)', type: 'number' },
      { name: 'sale_price', label: 'Sale Price (USD)', type: 'number', required: true },
      { name: 'payment_method', label: 'Payment Method', type: 'text' },
      { name: 'as_is', label: 'Sold As-Is', type: 'select', options: ['Yes', 'No'] },
      { name: 'governing_state', label: 'State', type: 'text' }
    ]
  },

  'offer-letter': {
    slug: 'offer-letter',
    title: 'Employment Offer Letter',
    category: 'employment',
    category_label: 'Employment',
    icon: '\u{1F4BC}',
    plan: 'pro',
    renderer: 'employment',
    fields: [
      { name: 'company_name', label: 'Company Name', type: 'text', required: true },
      { name: 'company_address', label: 'Company Address', type: 'textarea' },
      { name: 'candidate_name', label: 'Candidate Name', type: 'text', required: true },
      { name: 'candidate_address', label: 'Candidate Address', type: 'textarea' },
      { name: 'letter_date', label: 'Date', type: 'date', required: true },
      { name: 'position_title', label: 'Position Title', type: 'text', required: true },
      { name: 'employment_type', label: 'Employment Type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Temporary'] },
      { name: 'start_date', label: 'Start Date', type: 'date', required: true },
      { name: 'salary', label: 'Compensation (e.g., $65,000/year or $25/hour)', type: 'text', required: true },
      { name: 'pay_frequency', label: 'Pay Basis', type: 'select', options: ['Annual', 'Hourly', 'Monthly', 'Biweekly'] },
      { name: 'reporting_to', label: 'Reports To', type: 'text' },
      { name: 'benefits', label: 'Benefits Summary', type: 'textarea' },
      { name: 'contingencies', label: 'Contingencies (background check, I-9, etc.)', type: 'textarea' },
      { name: 'response_deadline', label: 'Please Respond By', type: 'date' },
      { name: 'at_will_state', label: 'State', type: 'text' }
    ]
  },

  'employment-verification': {
    slug: 'employment-verification',
    title: 'Employment Verification Letter',
    category: 'employment',
    category_label: 'Employment',
    icon: '\u{1F4C4}',
    plan: 'pro',
    renderer: 'employment',
    fields: [
      { name: 'company_name', label: 'Company Name', type: 'text', required: true },
      { name: 'company_address', label: 'Company Address', type: 'textarea' },
      { name: 'letter_date', label: 'Date', type: 'date', required: true },
      { name: 'employee_name', label: 'Employee Name', type: 'text', required: true },
      { name: 'job_title', label: 'Job Title', type: 'text' },
      { name: 'employment_status', label: 'Employment Status', type: 'select', options: ['Current employee', 'Former employee'] },
      { name: 'start_date', label: 'Employment Start Date', type: 'date' },
      { name: 'end_date', label: 'Employment End Date (if former)', type: 'date' },
      { name: 'include_salary', label: 'Include Salary in Letter', type: 'select', options: ['No', 'Yes'] },
      { name: 'annual_salary', label: 'Annual Salary (if included)', type: 'text' },
      { name: 'addressed_to', label: 'Letter Addressed To (requesting party)', type: 'text' },
      { name: 'hr_contact', label: 'HR Contact Name & Title', type: 'text' },
      { name: 'hr_phone', label: 'HR Phone', type: 'text' }
    ]
  },

  'last-will': {
    slug: 'last-will',
    title: 'Last Will and Testament',
    category: 'estate',
    category_label: 'Estate',
    icon: '\u{1F4DC}',
    plan: 'business',
    renderer: 'estate',
    fields: [
      { name: 'testator_name', label: 'Your Full Legal Name (Testator)', type: 'text', required: true },
      { name: 'testator_address', label: 'Your Address', type: 'textarea' },
      { name: 'domicile_state', label: 'State of Residence', type: 'text', required: true },
      { name: 'executor_name', label: 'Executor (Personal Representative)', type: 'text', required: true },
      { name: 'executor_address', label: 'Executor Address', type: 'textarea' },
      { name: 'alternate_executor', label: 'Alternate Executor', type: 'text' },
      { name: 'has_minor_children', label: 'Do you have minor children?', type: 'select', options: ['No', 'Yes'] },
      { name: 'guardian_name', label: 'Guardian for Minor Children', type: 'text' },
      { name: 'specific_bequests', label: 'Specific Gifts (one per line: item or amount — to — beneficiary)', type: 'textarea' },
      { name: 'residuary_beneficiary', label: 'Residuary Beneficiary(ies) — who inherits everything else', type: 'textarea', required: true },
      { name: 'self_proving', label: 'Include Self-Proving Affidavit (notarized)', type: 'select', options: ['Yes', 'No'] }
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
