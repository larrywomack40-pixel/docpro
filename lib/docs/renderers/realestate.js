// Real estate / rental document renderer:
// residential-lease, month-to-month-rental, rental-application, lease-termination.
// UNCERTAIN: Security deposit caps, return deadlines, notice periods, and required
// disclosures (e.g. lead paint for pre-1978 housing) vary significantly by state.
// All signature blocks are left as blank lines for wet signatures.

const {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addSignatureLine, addBlankLine, formatDate, formatMoney, streamToBuffer,
  FONT_REGULAR, FONT_BOLD, PAGE_MARGIN, TEXT_PRIMARY, TEXT_SECONDARY, LINE_COLOR
} = require('../utils');

const DISCLAIMER = 'For informational purposes only. Not legal advice. Landlord-tenant law varies by state and locality. Consult a licensed attorney before use.';

function addClause(doc, n, title, body) {
  doc.moveDown(0.3);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text(n + '. ' + title);
  if (body) doc.moveDown(0.15).font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(body);
}

function moneyOrBlank(v) {
  const n = parseFloat(v);
  return isNaN(n) ? '$________________' : formatMoney(n);
}

function petsClause(policy) {
  const p = (policy || '').toLowerCase();
  if (p.includes('no pets')) return 'No pets are permitted on the premises without the prior written consent of the Landlord.';
  if (p.includes('deposit')) return 'Pets are permitted subject to any additional pet deposit and the terms agreed by the parties. Tenant is responsible for any damage caused by a pet.';
  if (p.includes('allowed')) return 'Pets are permitted. Tenant remains responsible for any damage caused by a pet.';
  return 'Pet policy as agreed by the parties.';
}

async function renderResidentialLease(fields) {
  const doc = createDoc();
  const state = fields.governing_state || '________________';
  addHeader(doc, 'Residential Lease Agreement', formatDate(fields.lease_start));
  addTwoCol(doc,
    { label: 'Landlord', value: (fields.landlord_name || '') + (fields.landlord_address ? '\n' + fields.landlord_address : '') },
    { label: 'Tenant', value: fields.tenant_name }
  );
  addSection(doc, 'Rental Property', fields.property_address);
  let n = 1;
  addClause(doc, n++, 'Premises', 'The Landlord leases to the Tenant the residential premises located at ' + (fields.property_address ? fields.property_address.replace(/\n/g, ', ') : '________________') + ' (the "Premises").');
  addClause(doc, n++, 'Term', 'This Lease begins on ' + (formatDate(fields.lease_start) || '____________') + ' and ends on ' + (formatDate(fields.lease_end) || '____________') + ', unless terminated earlier as provided by law or this Lease.');
  addClause(doc, n++, 'Rent', 'Tenant shall pay rent of ' + moneyOrBlank(fields.monthly_rent) + ' per month, due ' + (fields.rent_due_day || 'on the 1st day of each month') + '.' +
    ((fields.grace_period_days || fields.late_fee) ? ' Rent not received within ' + (fields.grace_period_days || '____') + ' day(s) of the due date is subject to a late fee of ' + moneyOrBlank(fields.late_fee) + '.' : ''));
  addClause(doc, n++, 'Security Deposit', (parseFloat(fields.security_deposit) > 0
    ? 'Tenant shall pay a security deposit of ' + moneyOrBlank(fields.security_deposit) + '. '
    : 'Tenant shall pay a security deposit in the amount agreed by the parties. ') +
    'The deposit will be returned, less any lawful deductions for unpaid rent or damage beyond normal wear and tear, within the time required by the law of the State of ' + state + ', together with any required itemized statement.');
  if (fields.occupants) addClause(doc, n++, 'Occupants', 'The Premises shall be occupied only by the following persons: ' + fields.occupants + '.');
  addClause(doc, n++, 'Utilities', fields.utilities_tenant ? 'Tenant is responsible for the following utilities and services: ' + fields.utilities_tenant + '. All others are the responsibility of the Landlord.' : 'Responsibility for utilities shall be as agreed by the parties.');
  addClause(doc, n++, 'Pets', petsClause(fields.pets_policy));
  addClause(doc, n++, 'Use and Maintenance', 'Tenant shall keep the Premises clean and in good condition, shall not make alterations without the Landlord\'s written consent, and shall use the Premises only as a private residence in compliance with applicable law.');
  if ((fields.lead_paint_disclosure || '').toLowerCase() === 'yes') {
    addClause(doc, n++, 'Lead-Based Paint Disclosure', 'The Premises were built before 1978 and may contain lead-based paint. As required by federal law, the Landlord has provided the Tenant with the pamphlet "Protect Your Family From Lead in Your Home" and any known information concerning lead-based paint hazards on the Premises.');
  }
  addClause(doc, n++, 'Governing Law', 'This Lease shall be governed by the laws of the State of ' + state + ' and any applicable local ordinances.');
  doc.moveDown(0.8);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.3);
  addSignatureLine(doc, 'Signature of Landlord: ' + (fields.landlord_name || ''));
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Tenant: ' + (fields.tenant_name || ''));
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function renderMonthToMonth(fields) {
  const doc = createDoc();
  const state = fields.governing_state || '________________';
  const notice = fields.notice_days || '30';
  addHeader(doc, 'Month-to-Month Rental Agreement', formatDate(fields.start_date));
  addTwoCol(doc,
    { label: 'Landlord', value: (fields.landlord_name || '') + (fields.landlord_address ? '\n' + fields.landlord_address : '') },
    { label: 'Tenant', value: fields.tenant_name }
  );
  addSection(doc, 'Rental Property', fields.property_address);
  let n = 1;
  addClause(doc, n++, 'Premises and Term', 'The Landlord rents to the Tenant the premises located at ' + (fields.property_address ? fields.property_address.replace(/\n/g, ', ') : '________________') + ' on a month-to-month basis beginning ' + (formatDate(fields.start_date) || '____________') + '. The tenancy continues each month until terminated as provided below.');
  addClause(doc, n++, 'Rent', 'Tenant shall pay rent of ' + moneyOrBlank(fields.monthly_rent) + ' per month, due ' + (fields.rent_due_day || 'on the 1st day of each month') + '.');
  addClause(doc, n++, 'Security Deposit', parseFloat(fields.security_deposit) > 0 ? 'Tenant shall pay a security deposit of ' + moneyOrBlank(fields.security_deposit) + ', refundable per the law of the State of ' + state + ' less any lawful deductions.' : 'Any security deposit shall be as agreed by the parties and refundable per state law.');
  addClause(doc, n++, 'Termination', 'Either party may terminate this tenancy by giving at least ' + notice + ' days\' written notice to the other party, or such longer period as required by the law of the State of ' + state + '.');
  addClause(doc, n++, 'Utilities', fields.utilities_tenant ? 'Tenant is responsible for the following utilities: ' + fields.utilities_tenant + '.' : 'Responsibility for utilities shall be as agreed by the parties.');
  addClause(doc, n++, 'Pets', petsClause(fields.pets_policy));
  addClause(doc, n++, 'Governing Law', 'This Agreement shall be governed by the laws of the State of ' + state + '.');
  doc.moveDown(0.8);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.3);
  addSignatureLine(doc, 'Signature of Landlord: ' + (fields.landlord_name || ''));
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Tenant: ' + (fields.tenant_name || ''));
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function renderRentalApplication(fields) {
  const doc = createDoc();
  addHeader(doc, 'Rental Application', formatDate(fields.desired_move_in));
  addSection(doc, 'Property Applied For', fields.property_address);
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('APPLICANT');
  doc.moveDown(0.2);
  addTwoCol(doc,
    { label: 'Full Name', value: fields.applicant_name },
    { label: 'Date of Birth', value: formatDate(fields.applicant_dob) }
  );
  addTwoCol(doc,
    { label: 'Phone', value: fields.applicant_phone },
    { label: 'Email', value: fields.applicant_email }
  );
  addTwoCol(doc,
    { label: 'SSN (last 4)', value: fields.ssn_last4 },
    { label: 'Desired Move-In', value: formatDate(fields.desired_move_in) }
  );
  addSection(doc, 'Current Address', fields.current_address);
  addSection(doc, 'Current Landlord (name & phone)', fields.current_landlord);
  doc.moveDown(0.2);
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('EMPLOYMENT & INCOME');
  doc.moveDown(0.2);
  addTwoCol(doc,
    { label: 'Employer', value: fields.employer_name },
    { label: 'Employer Phone', value: fields.employer_phone }
  );
  addTwoCol(doc,
    { label: 'Job Title', value: fields.job_title },
    { label: 'Length of Employment', value: fields.employment_length }
  );
  addTwoCol(doc,
    { label: 'Gross Monthly Income', value: fields.monthly_income ? moneyOrBlank(fields.monthly_income) : '' },
    { label: 'Additional Income', value: fields.additional_income }
  );
  doc.moveDown(0.2);
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('ADDITIONAL INFORMATION');
  doc.moveDown(0.2);
  if (fields.references) addSection(doc, 'References', fields.references);
  addTwoCol(doc,
    { label: 'Vehicle', value: fields.vehicle },
    { label: 'Pets', value: fields.pets }
  );
  if (fields.ever_evicted) addSection(doc, 'Ever been evicted?', fields.ever_evicted);
  doc.moveDown(0.4);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('AUTHORIZATION & CONSENT');
  doc.moveDown(0.2);
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_PRIMARY).text(
    'I certify that the information provided in this application is true and complete to the best of my knowledge. ' +
    'I authorize the landlord or its agent to verify this information and, in accordance with the Fair Credit Reporting Act, ' +
    'to obtain a consumer report, credit check, and background and rental-history check for the purpose of evaluating this application. ' +
    'I understand that false information may result in denial of this application or termination of any tenancy.'
  );
  doc.moveDown(0.8);
  addSignatureLine(doc, 'Signature of Applicant: ' + (fields.applicant_name || ''));
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER + ' Do not ask applicants about protected characteristics; apply screening consistently under Fair Housing law.');
  return streamToBuffer(doc);
}

async function renderLeaseTermination(fields) {
  const doc = createDoc();
  const byLandlord = (fields.sent_by || 'Landlord').toLowerCase() !== 'tenant';
  const state = fields.governing_state || '________________';
  addHeader(doc, 'Lease Termination Notice', formatDate(fields.notice_date));
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('Date: ' + (formatDate(fields.notice_date) || '____________'));
  doc.moveDown(0.4);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_SECONDARY).text('TO:');
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(byLandlord ? (fields.tenant_name || 'Tenant') : (fields.landlord_name || 'Landlord'));
  doc.moveDown(0.5);
  addSection(doc, 'Rental Property', fields.property_address);
  doc.moveDown(0.2);
  let body = 'This letter serves as formal notice that the ' + (byLandlord ? 'Landlord' : 'Tenant') +
    ' is terminating the lease for the property identified above' +
    (fields.lease_date ? ', originally dated ' + formatDate(fields.lease_date) : '') + '. ' +
    'The tenancy will end, and the Tenant shall vacate and surrender possession of the premises, on or before ' +
    (formatDate(fields.move_out_date) || '____________') + '.';
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(body);
  if (fields.reason) { doc.moveDown(0.3); doc.text('Reason for termination: ' + fields.reason + '.'); }
  doc.moveDown(0.3);
  doc.text('The Tenant is responsible for rent and obligations under the lease through the termination date, and should leave the premises clean and return all keys. ' +
    'The security deposit, less any lawful deductions, will be returned within the time required by the law of the State of ' + state + '.');
  if (fields.forwarding_address) { doc.moveDown(0.3); doc.text('Tenant forwarding address for deposit return: ' + fields.forwarding_address.replace(/\n/g, ', ') + '.'); }
  doc.moveDown(0.3);
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_SECONDARY).text('The required notice period and permitted reasons for termination vary by state and locality. This notice should be delivered in a manner permitted by applicable law.');
  doc.moveDown(1);
  addSignatureLine(doc, 'Signature of ' + (byLandlord ? 'Landlord / Agent' : 'Tenant') + ': ' + (byLandlord ? (fields.landlord_name || '') : (fields.tenant_name || '')));
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function render(slug, fields) {
  switch (slug) {
    case 'residential-lease': return renderResidentialLease(fields);
    case 'month-to-month-rental': return renderMonthToMonth(fields);
    case 'rental-application': return renderRentalApplication(fields);
    case 'lease-termination': return renderLeaseTermination(fields);
    default: throw new Error('Unknown real-estate slug: ' + slug);
  }
}

module.exports = { render };
