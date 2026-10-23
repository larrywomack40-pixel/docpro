// Legal document renderer: nda, contractor-agreement, bill-of-sale, eviction-notice.
// UNCERTAIN: eviction notice state-specific cure period requirements vary.
// UNCERTAIN: NDA mutual vs unilateral clause wording may need attorney review.
// All signature/witness/notary blocks are left as blank lines for wet signatures.

const {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addSignatureLine, addBlankLine, formatDate, streamToBuffer,
  FONT_REGULAR, FONT_BOLD, PAGE_MARGIN, TEXT_PRIMARY, TEXT_SECONDARY, LINE_COLOR
} = require('../utils');

const DISCLAIMER = 'For informational purposes only. Not legal advice. Consult a licensed attorney before use.';

async function renderNda(fields) {
  const doc = createDoc();
  const isMutual = (fields.mutual || '').toLowerCase() === 'yes';
  addHeader(doc, 'Non-Disclosure Agreement', isMutual ? 'Mutual Non-Disclosure Agreement' : 'One-Way Non-Disclosure Agreement');
  addSection(doc, 'Effective Date', formatDate(fields.effective_date));
  addTwoCol(doc,
    { label: 'Disclosing Party', value: fields.disclosing_party + (fields.disclosing_address ? '\n' + fields.disclosing_address : '') },
    { label: 'Receiving Party', value: fields.receiving_party + (fields.receiving_address ? '\n' + fields.receiving_address : '') }
  );
  addSection(doc, 'Purpose of Disclosure', fields.purpose);
  if (fields.term_years) addSection(doc, 'Confidentiality Term', fields.term_years + ' year(s)');
  if (fields.governing_state) addSection(doc, 'Governing State', fields.governing_state);
  doc.moveDown(0.5);
  if (isMutual) {
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
      .text('Each party agrees to hold the other party Confidential Information in strict confidence, to use it solely for the Purpose stated above, and not to disclose it to any third party without the prior written consent of the disclosing party. This obligation is mutual and binding on both parties equally.');
  } else {
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
      .text('The Receiving Party agrees to hold the Disclosing Party Confidential Information in strict confidence, to use it solely for the Purpose stated above, and not to disclose it to any third party without the prior written consent of the Disclosing Party.');
  }
  doc.moveDown(1);
  addSection(doc, 'Governing Law', 'This Agreement shall be governed by the laws of the State of ' + (fields.governing_state || '________________') + '.');
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Signature of Disclosing Party: ' + (fields.disclosing_party || ''));
  addBlankLine(doc, 'Printed Name / Title');
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Receiving Party: ' + (fields.receiving_party || ''));
  addBlankLine(doc, 'Printed Name / Title');
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function renderContractorAgreement(fields) {
  const doc = createDoc();
  addHeader(doc, 'Independent Contractor Agreement', 'Effective ' + formatDate(fields.effective_date));
  addTwoCol(doc,
    { label: 'Client', value: fields.client_name + (fields.client_address ? '\n' + fields.client_address : '') },
    { label: 'Contractor', value: fields.contractor_name + (fields.contractor_address ? '\n' + fields.contractor_address : '') }
  );
  addSection(doc, 'Effective Date', formatDate(fields.effective_date));
  addSection(doc, 'Description of Services', fields.services);
  addSection(doc, 'Compensation', fields.compensation);
  if (fields.term) addSection(doc, 'Term of Agreement', fields.term);
  if (fields.governing_state) addSection(doc, 'Governing State', fields.governing_state);
  doc.moveDown(0.5);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
    .text('The Contractor is an independent contractor and not an employee of the Client. The Contractor is responsible for all taxes on compensation received under this Agreement.');
  doc.moveDown(1);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Signature of Client: ' + (fields.client_name || ''));
  addBlankLine(doc, 'Printed Name / Title');
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Contractor: ' + (fields.contractor_name || ''));
  addBlankLine(doc, 'Printed Name / Title');
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function renderBillOfSale(fields) {
  const doc = createDoc();
  addHeader(doc, 'Bill of Sale', formatDate(fields.sale_date));
  addTwoCol(doc,
    { label: 'Seller', value: fields.seller_name + (fields.seller_address ? '\n' + fields.seller_address : '') },
    { label: 'Buyer', value: fields.buyer_name + (fields.buyer_address ? '\n' + fields.buyer_address : '') }
  );
  addSection(doc, 'Date of Sale', formatDate(fields.sale_date));
  addSection(doc, 'Item Description', fields.item_description);
  addSection(doc, 'Sale Price', '$' + (parseFloat(fields.sale_price) || 0).toFixed(2));
  if (fields.payment_method) addSection(doc, 'Payment Method', fields.payment_method);
  const asIs = (fields.as_is || '').toLowerCase() === 'yes';
  addSection(doc, 'Sold As-Is', asIs ? 'Yes. Sold as-is with no warranties expressed or implied.' : 'No. See any attached warranty documentation.');
  if (fields.governing_state) addSection(doc, 'Governing State', fields.governing_state);
  doc.moveDown(0.5);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
    .text('The Seller hereby sells, transfers, and conveys all right, title, and interest in the above-described property to the Buyer for the consideration stated above.');
  doc.moveDown(1);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Signature of Seller: ' + (fields.seller_name || ''));
  addBlankLine(doc, 'Printed Name');
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Buyer: ' + (fields.buyer_name || ''));
  addBlankLine(doc, 'Printed Name');
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function renderEvictionNotice(fields) {
  const doc = createDoc();
  addHeader(doc, 'Eviction Notice', 'Notice to Cure or Vacate');
  addTwoCol(doc,
    { label: 'Landlord', value: fields.landlord_name + (fields.landlord_address ? '\n' + fields.landlord_address : '') },
    { label: 'Tenant', value: fields.tenant_name }
  );
  addSection(doc, 'Property Address', fields.property_address);
  addSection(doc, 'Notice Date', formatDate(fields.notice_date));
  addSection(doc, 'Reason for Notice', fields.reason);
  if (fields.amount_due && parseFloat(fields.amount_due) > 0) {
    addSection(doc, 'Amount Due', '$' + parseFloat(fields.amount_due).toFixed(2));
  }
  addSection(doc, 'Days to Cure or Vacate', fields.cure_days ? String(fields.cure_days) + ' days' : '');
  if (fields.governing_state) addSection(doc, 'State', fields.governing_state);
  doc.moveDown(0.5);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
    .text('You are hereby notified that you must cure the above violation or vacate the premises within ' + (fields.cure_days || '___') + ' days of the date of this notice. Failure to cure or vacate may result in formal eviction proceedings filed in accordance with the laws of the State of ' + (fields.governing_state || '________________') + '.');
  doc.moveDown(1);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('LANDLORD SIGNATURE');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Signature of Landlord / Agent: ' + (fields.landlord_name || ''));
  addBlankLine(doc, 'Printed Name / Title');
  addBlankLine(doc, 'Date Served');
  addFooter(doc, DISCLAIMER + ' State-specific cure periods vary. Verify requirements for ' + (fields.governing_state || 'your state') + '.');
  return streamToBuffer(doc);
}

async function renderLeaseAgreement(fields) {
  const doc = createDoc();
  addHeader(doc, 'Residential Lease Agreement', 'Template lease. Standard clauses below are template text; review and edit before use.');
  addTwoCol(doc,
    { label: 'Landlord', value: fields.landlord_name + (fields.landlord_address ? '\n' + fields.landlord_address : '') },
    { label: 'Tenant', value: fields.tenant_name + (fields.tenant_address ? '\n' + fields.tenant_address : '') }
  );
  addSection(doc, 'Property Address', fields.property_address);
  addTwoCol(doc,
    { label: 'Lease Start', value: formatDate(fields.lease_start) },
    { label: 'Lease End', value: formatDate(fields.lease_end) }
  );
  addTwoCol(doc,
    { label: 'Monthly Rent', value: fields.monthly_rent ? '$' + (parseFloat(fields.monthly_rent) || 0).toFixed(2) : '' },
    { label: 'Security Deposit', value: fields.security_deposit ? '$' + (parseFloat(fields.security_deposit) || 0).toFixed(2) : '' }
  );
  if (fields.rent_due_day) addSection(doc, 'Rent Due', fields.rent_due_day);
  if (fields.late_fee) addSection(doc, 'Late Fee', fields.late_fee);
  if (fields.occupants) addSection(doc, 'Additional Occupants', fields.occupants);
  if (fields.pets) {
    addSection(doc, 'Pets', fields.pets + (fields.pet_deposit ? '. Pet deposit: $' + (parseFloat(fields.pet_deposit) || 0).toFixed(2) + '.' : ''));
  }
  if (fields.utilities) addSection(doc, 'Utilities', fields.utilities);
  if (fields.additional_terms) addSection(doc, 'Additional Terms', fields.additional_terms);
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('STANDARD CLAUSES (TEMPLATE TEXT)');
  doc.moveDown(0.3);
  const clauses = [
    'Use of Premises. The Tenant shall use the property for residential purposes only and shall not use it for any unlawful purpose.',
    'Maintenance. The Tenant shall keep the premises clean and in good condition and shall promptly notify the Landlord of any needed repairs. The Tenant is responsible for damage caused by the Tenant, occupants, or guests beyond normal wear and tear.',
    'Entry by Landlord. The Landlord may enter the premises at reasonable times with reasonable notice to inspect, make repairs, or show the property, except in an emergency, where no notice is required.',
    'Default. If the Tenant fails to pay rent when due or breaches any term of this lease, the Landlord may pursue all remedies available under the laws of the State of ' + (fields.governing_state || '________________') + ', including termination of this lease after any notice required by law.',
    'Entire Agreement. This lease is the entire agreement between the Landlord and the Tenant for the property. Any change must be in writing and signed by both parties.'
  ];
  clauses.forEach(function (c) {
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(c);
    doc.moveDown(0.4);
  });
  if (fields.governing_state) addSection(doc, 'Governing Law', 'This lease shall be governed by the laws of the State of ' + fields.governing_state + '.');
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Signature of Landlord: ' + (fields.landlord_name || ''));
  addBlankLine(doc, 'Printed Name');
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Tenant: ' + (fields.tenant_name || ''));
  addBlankLine(doc, 'Printed Name');
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER + ' State requirements for residential leases, deposits, and notices vary. Verify requirements for ' + (fields.governing_state || 'your state') + '.');
  return streamToBuffer(doc);
}

async function render(slug, fields) {
  switch (slug) {
    case 'nda': return renderNda(fields);
    case 'contractor-agreement': return renderContractorAgreement(fields);
    case 'bill-of-sale': return renderBillOfSale(fields);
    case 'eviction-notice': return renderEvictionNotice(fields);
    case 'lease-agreement': return renderLeaseAgreement(fields);
    default: throw new Error('Unknown legal slug: ' + slug);
  }
}

module.exports = { render };
