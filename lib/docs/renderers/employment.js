// Employment document renderer: offer-letter, employment-verification.
// UNCERTAIN: At-will language and required new-hire disclosures vary by state.
// Signature/acceptance blocks are left as blank lines for wet signatures.

const {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addSignatureLine, addBlankLine, formatDate, streamToBuffer,
  FONT_REGULAR, FONT_BOLD, PAGE_MARGIN, TEXT_PRIMARY, TEXT_SECONDARY, LINE_COLOR
} = require('../utils');

const DISCLAIMER = 'For informational purposes only. Not legal advice. Employment law varies by state. Consult a licensed attorney or HR professional before use.';

function letterhead(doc, name, address) {
  doc.font(FONT_BOLD).fontSize(12).fillColor(TEXT_PRIMARY).text(name || '');
  if (address) doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_SECONDARY).text(address);
  doc.moveDown(0.4);
}

async function renderOfferLetter(fields) {
  const doc = createDoc();
  const type = (fields.employment_type || 'full-time').toLowerCase();
  const payBasis = (fields.pay_frequency || '').toLowerCase();
  addHeader(doc, 'Employment Offer Letter', formatDate(fields.letter_date));
  letterhead(doc, fields.company_name, fields.company_address);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('Date: ' + (formatDate(fields.letter_date) || '____________'));
  doc.moveDown(0.3);
  doc.text(fields.candidate_name || '');
  if (fields.candidate_address) doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_SECONDARY).text(fields.candidate_address);
  doc.moveDown(0.4);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('Dear ' + (fields.candidate_name || 'Candidate') + ',');
  doc.moveDown(0.4);
  let body = 'On behalf of ' + (fields.company_name || 'the Company') + ', I am pleased to offer you the position of ' +
    (fields.position_title || '________________') + ', a ' + type + ' position' +
    (fields.reporting_to ? ', reporting to ' + fields.reporting_to : '') + '. ' +
    'Your anticipated start date is ' + (formatDate(fields.start_date) || '____________') + '.';
  doc.text(body);
  doc.moveDown(0.3);
  doc.text('Your compensation will be ' + (fields.salary || '________________') +
    (payBasis ? ', paid on a ' + payBasis + ' basis' : '') + ', subject to applicable withholdings and deductions.');
  if (fields.benefits) { doc.moveDown(0.3); doc.text('Benefits: ' + fields.benefits); }
  if (fields.contingencies) { doc.moveDown(0.3); doc.text('This offer is contingent upon: ' + fields.contingencies + '.'); }
  doc.moveDown(0.3);
  doc.text('Unless otherwise required by a written agreement, your employment with ' + (fields.company_name || 'the Company') +
    ' is "at will," meaning that either you or the Company may terminate the employment relationship at any time, with or without cause or notice, to the extent permitted by the law of the State of ' +
    (fields.at_will_state || '________________') + '.');
  doc.moveDown(0.3);
  doc.text('To accept this offer, please sign and return this letter' +
    (fields.response_deadline ? ' by ' + formatDate(fields.response_deadline) : '') + '. We look forward to welcoming you to the team.');
  doc.moveDown(0.8);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('Sincerely,');
  doc.moveDown(1.2);
  addSignatureLine(doc, 'Authorized Representative, ' + (fields.company_name || ''));
  addBlankLine(doc, 'Printed Name / Title');
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('ACCEPTANCE OF OFFER');
  doc.moveDown(0.3);
  addSignatureLine(doc, 'Signature of ' + (fields.candidate_name || 'Candidate'));
  addBlankLine(doc, 'Date');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function renderEmploymentVerification(fields) {
  const doc = createDoc();
  const isCurrent = (fields.employment_status || 'current').toLowerCase().includes('current');
  const includeSalary = (fields.include_salary || '').toLowerCase() === 'yes';
  addHeader(doc, 'Employment Verification Letter', formatDate(fields.letter_date));
  letterhead(doc, fields.company_name, fields.company_address);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('Date: ' + (formatDate(fields.letter_date) || '____________'));
  doc.moveDown(0.3);
  doc.text(fields.addressed_to ? 'To: ' + fields.addressed_to : 'To Whom It May Concern:');
  doc.moveDown(0.4);
  let body = 'This letter confirms that ' + (fields.employee_name || '________________') + ' ' +
    (isCurrent ? 'is currently employed' : 'was employed') + ' by ' + (fields.company_name || 'our company') +
    (fields.job_title ? ' as ' + fields.job_title : '') + '. ';
  if (fields.start_date) {
    body += (isCurrent ? 'Their employment began on ' + formatDate(fields.start_date) + ' and is ongoing.' :
      'Their employment ran from ' + formatDate(fields.start_date) + (fields.end_date ? ' to ' + formatDate(fields.end_date) : '') + '.');
  }
  doc.text(body);
  if (includeSalary && fields.annual_salary) {
    doc.moveDown(0.3);
    doc.text('Their ' + (isCurrent ? 'current' : 'most recent') + ' compensation ' + (isCurrent ? 'is' : 'was') + ' ' + fields.annual_salary + '.');
  }
  doc.moveDown(0.3);
  doc.text('Please contact us using the information below if you require any further verification.');
  doc.moveDown(0.3);
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_SECONDARY).text('This verification is provided at the employee\'s request and is limited to the facts stated above.');
  doc.moveDown(1);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('Sincerely,');
  doc.moveDown(1.2);
  addSignatureLine(doc, fields.hr_contact || 'Authorized Representative');
  if (fields.company_name) addBlankLine(doc, fields.company_name);
  if (fields.hr_phone) {
    doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_SECONDARY).text('Phone: ' + fields.hr_phone, PAGE_MARGIN);
    doc.moveDown(0.4);
  }
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function render(slug, fields) {
  switch (slug) {
    case 'offer-letter': return renderOfferLetter(fields);
    case 'employment-verification': return renderEmploymentVerification(fields);
    default: throw new Error('Unknown employment slug: ' + slug);
  }
}

module.exports = { render };
