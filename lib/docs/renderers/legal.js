// Legal document renderer: nda, contractor-agreement, bill-of-sale, eviction-notice.
// UNCERTAIN: eviction notice state-specific cure period requirements vary.
// UNCERTAIN: NDA mutual vs unilateral clause wording may need attorney review.
// All signature/witness/notary blocks are left as blank lines for wet signatures.

const {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addSignatureLine, addBlankLine, formatDate, formatMoney, streamToBuffer,
  FONT_REGULAR, FONT_BOLD, PAGE_MARGIN, TEXT_PRIMARY, TEXT_SECONDARY, LINE_COLOR
} = require('../utils');

const DISCLAIMER = 'For informational purposes only. Not legal advice. Consult a licensed attorney before use.';

// Numbered clause: bold "N. Title" heading followed by a body paragraph.
function addClause(doc, n, title, body) {
  doc.moveDown(0.3);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text(n + '. ' + title);
  if (body) {
    doc.moveDown(0.15).font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(body, { align: 'left' });
  }
}

function moneyOrBlank(v) {
  const n = parseFloat(v);
  return isNaN(n) ? '$________________' : formatMoney(n);
}

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

async function renderPromissoryNote(fields) {
  const doc = createDoc();
  const secured = (fields.secured || '').toLowerCase().includes('secured by');
  const state = fields.governing_state || '________________';
  addHeader(doc, 'Promissory Note', formatDate(fields.note_date));
  addTwoCol(doc,
    { label: 'Lender', value: (fields.lender_name || '') + (fields.lender_address ? '\n' + fields.lender_address : '') },
    { label: 'Borrower', value: (fields.borrower_name || '') + (fields.borrower_address ? '\n' + fields.borrower_address : '') }
  );
  doc.moveDown(0.3);
  const rate = fields.interest_rate ? parseFloat(fields.interest_rate) : 0;
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(
    'FOR VALUE RECEIVED, ' + (fields.borrower_name || 'the Borrower') + ' ("Borrower") promises to pay to the order of ' +
    (fields.lender_name || 'the Lender') + ' ("Lender") the principal sum of ' + moneyOrBlank(fields.principal_amount) +
    (rate ? ', together with interest on the unpaid principal balance at the rate of ' + rate + '% per annum.' : ', without interest.')
  );
  let n = 1;
  let repayBody;
  const rt = (fields.repayment_type || '').toLowerCase();
  if (rt.includes('installment')) {
    repayBody = 'Borrower shall repay this Note in ' + (fields.payment_frequency ? fields.payment_frequency.toLowerCase() : 'monthly') +
      ' installments of ' + moneyOrBlank(fields.payment_amount) + ' each, beginning on the first payment date and continuing until the full balance of principal and interest is paid' +
      (fields.maturity_date ? ', with all remaining amounts due in full on ' + formatDate(fields.maturity_date) + '.' : '.');
  } else if (rt.includes('demand')) {
    repayBody = 'This Note is payable on demand. The entire unpaid balance of principal and accrued interest shall be due and payable upon written demand by the Lender.';
  } else {
    repayBody = 'The entire principal balance and all accrued interest shall be due and payable in a single lump sum on ' +
      (fields.maturity_date ? formatDate(fields.maturity_date) : 'the maturity date') + '.';
  }
  addClause(doc, n++, 'Repayment', repayBody);
  if (fields.late_fee) addClause(doc, n++, 'Late Charges', fields.late_fee);
  addClause(doc, n++, 'Prepayment', 'Borrower may prepay this Note in whole or in part at any time without penalty. Any partial prepayment shall be applied first to accrued interest and then to principal.');
  addClause(doc, n++, 'Default and Acceleration', 'If any payment is not made when due, or if Borrower otherwise defaults under this Note, the Lender may declare the entire unpaid balance of principal and accrued interest immediately due and payable without notice. Borrower shall be responsible for reasonable costs of collection, including attorney fees permitted by law.');
  if (secured) {
    addClause(doc, n++, 'Security', 'This Note is secured by the following collateral: ' + (fields.collateral || '________________') + '. Upon default, Lender may exercise all remedies available to a secured party under applicable law.');
  } else {
    addClause(doc, n++, 'Unsecured', 'This Note is unsecured.');
  }
  addClause(doc, n++, 'Governing Law', 'This Note shall be governed by and construed in accordance with the laws of the State of ' + state + '. Interest and charges shall not exceed the maximum rate permitted by applicable law.');
  doc.moveDown(0.8);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('BORROWER SIGNATURE');
  doc.moveDown(0.3);
  addSignatureLine(doc, 'Signature of Borrower: ' + (fields.borrower_name || ''));
  addBlankLine(doc, 'Printed Name');
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER + ' Interest rates are subject to state usury limits.');
  return streamToBuffer(doc);
}

async function renderLoanAgreement(fields) {
  const doc = createDoc();
  const state = fields.governing_state || '________________';
  addHeader(doc, 'Loan Agreement', 'Dated ' + formatDate(fields.agreement_date));
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(
    'This Loan Agreement ("Agreement") is entered into as of ' + (formatDate(fields.agreement_date) || 'the date below') +
    ' between ' + (fields.lender_name || 'the Lender') + ' ("Lender") and ' + (fields.borrower_name || 'the Borrower') + ' ("Borrower").'
  );
  addTwoCol(doc,
    { label: 'Lender', value: (fields.lender_name || '') + (fields.lender_address ? '\n' + fields.lender_address : '') },
    { label: 'Borrower', value: (fields.borrower_name || '') + (fields.borrower_address ? '\n' + fields.borrower_address : '') }
  );
  let n = 1;
  const rate = fields.interest_rate ? parseFloat(fields.interest_rate) : 0;
  addClause(doc, n++, 'Loan Amount', 'Lender agrees to loan Borrower the principal sum of ' + moneyOrBlank(fields.loan_amount) + ' (the "Loan").');
  addClause(doc, n++, 'Interest', rate ? 'The Loan shall bear interest at a rate of ' + rate + '% per annum on the unpaid principal balance.' : 'The Loan shall be made without interest.');
  addClause(doc, n++, 'Repayment', fields.repayment_terms || 'Borrower shall repay the Loan according to the schedule agreed by the parties.' +
    (fields.first_payment_date ? ' Payments begin on ' + formatDate(fields.first_payment_date) + '.' : '') +
    (fields.final_payment_date ? ' The Loan shall be paid in full no later than ' + formatDate(fields.final_payment_date) + '.' : ''));
  if (fields.late_fee) addClause(doc, n++, 'Late Charges', fields.late_fee);
  if (fields.collateral) addClause(doc, n++, 'Collateral', 'The Loan is secured by: ' + fields.collateral + '.');
  addClause(doc, n++, 'Events of Default', (fields.default_terms ? fields.default_terms + ' ' : '') +
    'Upon default, Lender may declare the entire outstanding balance immediately due and payable and pursue all remedies available under law, including recovery of reasonable collection costs and attorney fees permitted by law.');
  addClause(doc, n++, 'Governing Law', 'This Agreement shall be governed by the laws of the State of ' + state + '.');
  addClause(doc, n++, 'Entire Agreement', 'This Agreement constitutes the entire agreement between the parties regarding the Loan and supersedes all prior discussions. It may be amended only in writing signed by both parties.');
  doc.moveDown(0.8);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.3);
  addSignatureLine(doc, 'Signature of Lender: ' + (fields.lender_name || ''));
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Borrower: ' + (fields.borrower_name || ''));
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER + ' Interest rates are subject to state usury limits.');
  return streamToBuffer(doc);
}

async function renderDemandLetter(fields) {
  const doc = createDoc();
  addHeader(doc, 'Demand Letter', formatDate(fields.letter_date));
  if (fields.sender_name || fields.sender_address) {
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(fields.sender_name || '');
    if (fields.sender_address) doc.font(FONT_REGULAR).fontSize(10).text(fields.sender_address);
    doc.moveDown(0.6);
  }
  if (fields.recipient_name || fields.recipient_address) {
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_SECONDARY).text('TO:');
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(fields.recipient_name || '');
    if (fields.recipient_address) doc.font(FONT_REGULAR).fontSize(10).text(fields.recipient_address);
    doc.moveDown(0.6);
  }
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('RE: Formal Demand' + (fields.amount_owed ? ' for Payment of ' + moneyOrBlank(fields.amount_owed) : ''));
  doc.moveDown(0.5);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('Dear ' + (fields.recipient_name || 'Sir or Madam') + ',');
  doc.moveDown(0.4);
  let body = 'This letter is a formal demand regarding the following matter: ' + (fields.reason || '________________') + '.';
  if (fields.original_date) body += ' This obligation arose on or about ' + formatDate(fields.original_date) + '.';
  if (fields.amount_owed) body += ' As of the date of this letter, the amount of ' + moneyOrBlank(fields.amount_owed) + ' remains due and owing.';
  doc.text(body);
  doc.moveDown(0.4);
  let demand = 'Demand is hereby made that you ' + (fields.amount_owed ? 'pay the full amount owed' : 'resolve this matter') +
    (fields.deadline_date ? ' on or before ' + formatDate(fields.deadline_date) + '.' : ' within a reasonable time, and no later than fourteen (14) days from the date of this letter.');
  doc.text(demand);
  doc.moveDown(0.4);
  doc.text(fields.consequences
    ? 'If this matter is not resolved by the deadline stated above, ' + fields.consequences
    : 'If this matter is not resolved by the deadline stated above, I may pursue all remedies available under the law, which may include filing a civil claim to recover the amount owed plus any interest, costs, and fees permitted by law.');
  doc.moveDown(0.4);
  doc.text('This letter is sent in a good-faith effort to resolve this matter without further action. Please govern yourself accordingly.');
  doc.moveDown(1);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('Sincerely,');
  doc.moveDown(1.5);
  addSignatureLine(doc, fields.sender_name || 'Signature');
  addBlankLine(doc, 'Printed Name');
  addFooter(doc, DISCLAIMER + (fields.governing_state ? ' Rules and deadlines vary in ' + fields.governing_state + '.' : ''));
  return streamToBuffer(doc);
}

async function renderServiceAgreement(fields) {
  const doc = createDoc();
  const state = fields.governing_state || '________________';
  addHeader(doc, 'Service Agreement', 'Effective ' + formatDate(fields.effective_date));
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(
    'This Service Agreement ("Agreement") is entered into as of ' + (formatDate(fields.effective_date) || 'the effective date below') +
    ' between ' + (fields.provider_name || 'the Provider') + ' ("Provider") and ' + (fields.client_name || 'the Client') + ' ("Client").'
  );
  addTwoCol(doc,
    { label: 'Provider', value: (fields.provider_name || '') + (fields.provider_address ? '\n' + fields.provider_address : '') },
    { label: 'Client', value: (fields.client_name || '') + (fields.client_address ? '\n' + fields.client_address : '') }
  );
  let n = 1;
  addClause(doc, n++, 'Services', fields.services || 'Provider shall perform the services described by the parties.');
  addClause(doc, n++, 'Fees and Payment', fields.fees || 'Client shall pay Provider the fees agreed by the parties.');
  if (fields.term) addClause(doc, n++, 'Term', 'This Agreement shall remain in effect for the following term: ' + fields.term + '.');
  addClause(doc, n++, 'Termination', fields.termination || 'Either party may terminate this Agreement upon written notice to the other party. Client shall pay for all services performed through the effective date of termination.');
  addClause(doc, n++, 'Independent Contractor', 'Provider is an independent contractor and not an employee of Client. Provider is responsible for all taxes on amounts received under this Agreement.');
  addClause(doc, n++, 'Governing Law', 'This Agreement shall be governed by the laws of the State of ' + state + '.');
  addClause(doc, n++, 'Entire Agreement', 'This Agreement is the entire agreement between the parties and may be amended only in writing signed by both parties.');
  doc.moveDown(0.8);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.3);
  addSignatureLine(doc, 'Signature of Provider: ' + (fields.provider_name || ''));
  addBlankLine(doc, 'Printed Name / Title');
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Client: ' + (fields.client_name || ''));
  addBlankLine(doc, 'Printed Name / Title');
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function renderVehicleBillOfSale(fields) {
  const doc = createDoc();
  addHeader(doc, 'Vehicle Bill of Sale', formatDate(fields.sale_date));
  addTwoCol(doc,
    { label: 'Seller', value: fields.seller_name + (fields.seller_address ? '\n' + fields.seller_address : '') },
    { label: 'Buyer', value: fields.buyer_name + (fields.buyer_address ? '\n' + fields.buyer_address : '') }
  );
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('VEHICLE');
  doc.moveDown(0.2);
  const vehLine = [fields.vehicle_year, fields.vehicle_make, fields.vehicle_model].filter(Boolean).join(' ');
  addTwoCol(doc,
    { label: 'Year / Make / Model', value: vehLine },
    { label: 'Color', value: fields.vehicle_color }
  );
  addTwoCol(doc,
    { label: 'VIN', value: fields.vehicle_vin },
    { label: 'Odometer (miles)', value: fields.odometer }
  );
  addSection(doc, 'Sale Price', moneyOrBlank(fields.sale_price));
  if (fields.payment_method) addSection(doc, 'Payment Method', fields.payment_method);
  const asIs = (fields.as_is || '').toLowerCase() === 'yes';
  addSection(doc, 'Condition', asIs
    ? 'The vehicle is sold AS-IS, with no warranties expressed or implied. The Buyer accepts the vehicle in its present condition.'
    : 'See any attached warranty documentation.');
  doc.moveDown(0.3);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(
    'The Seller hereby sells and transfers ownership of the above-described vehicle to the Buyer for the consideration stated above. The Seller certifies that the Seller is the lawful owner of the vehicle and that it is free of all liens and encumbrances except as disclosed.'
  );
  doc.moveDown(0.4);
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('ODOMETER DISCLOSURE');
  doc.moveDown(0.15);
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_PRIMARY).text(
    'Federal and state law require the Seller to state the mileage upon transfer. The Seller certifies that the odometer reading of ' +
    (fields.odometer ? fields.odometer + ' miles' : '____________ miles') + ' reflects the actual mileage of the vehicle to the best of the Seller\'s knowledge, unless otherwise noted.'
  );
  doc.moveDown(0.6);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.3);
  addSignatureLine(doc, 'Signature of Seller: ' + (fields.seller_name || ''));
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Signature of Buyer: ' + (fields.buyer_name || ''));
  addBlankLine(doc, 'Date');
  doc.moveDown(0.4);
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('NOTARY ACKNOWLEDGMENT (if required by your state)');
  doc.moveDown(0.3);
  addBlankLine(doc, 'State of / County of');
  addBlankLine(doc, 'Notary Public Signature / Commission Expires');
  addFooter(doc, DISCLAIMER + ' Title transfer and notary requirements vary by state' + (fields.governing_state ? ' (' + fields.governing_state + ')' : '') + '.');
  return streamToBuffer(doc);
}

async function render(slug, fields) {
  switch (slug) {
    case 'nda': return renderNda(fields);
    case 'contractor-agreement': return renderContractorAgreement(fields);
    case 'bill-of-sale': return renderBillOfSale(fields);
    case 'eviction-notice': return renderEvictionNotice(fields);
    case 'promissory-note': return renderPromissoryNote(fields);
    case 'loan-agreement': return renderLoanAgreement(fields);
    case 'demand-letter': return renderDemandLetter(fields);
    case 'service-agreement': return renderServiceAgreement(fields);
    case 'vehicle-bill-of-sale': return renderVehicleBillOfSale(fields);
    default: throw new Error('Unknown legal slug: ' + slug);
  }
}

module.exports = { render };
