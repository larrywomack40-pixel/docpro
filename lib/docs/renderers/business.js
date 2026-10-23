// Business document renderer: business-proposal, resume.
// Proposal follows the financial documents' layout (parties, sections,
// optional pricing table) and closes with a client acceptance block.
// Resume is a clean single-document layout: header block, then sections
// only where the user supplied content.

const {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addLineItemsTable, parseLineItems, addSignatureLine, addBlankLine,
  formatDate, streamToBuffer,
  FONT_REGULAR, FONT_BOLD, PAGE_MARGIN,
  TEXT_PRIMARY, TEXT_SECONDARY, ACCENT, LINE_COLOR
} = require('../utils');

async function renderProposal(fields) {
  const doc = createDoc();
  addHeader(doc, 'Business Proposal', fields.proposal_title || '');
  addTwoCol(doc,
    { label: 'From', value: (fields.business_name || '') + (fields.business_address ? '\n' + fields.business_address : '') },
    { label: 'Prepared For', value: (fields.client_name || '') + (fields.client_address ? '\n' + fields.client_address : '') }
  );
  addTwoCol(doc,
    { label: 'Proposal Date', value: formatDate(fields.proposal_date) },
    { label: 'Valid Until', value: formatDate(fields.valid_until) }
  );
  if (fields.prepared_by) addSection(doc, 'Prepared By', fields.prepared_by);
  if (fields.business_email || fields.business_phone) {
    addTwoCol(doc,
      { label: 'Email', value: fields.business_email },
      { label: 'Phone', value: fields.business_phone }
    );
  }
  addSection(doc, 'Executive Summary', fields.executive_summary);
  addSection(doc, 'Scope of Work', fields.scope_of_work);
  if (fields.timeline) addSection(doc, 'Timeline', fields.timeline);
  if (fields.line_items && String(fields.line_items).trim() !== '') {
    doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('PRICING');
    doc.moveDown(0.3);
    addLineItemsTable(doc, parseLineItems(fields.line_items), fields.tax_rate);
  }
  if (fields.terms) addSection(doc, 'Terms and Conditions', fields.terms);
  if (fields.next_steps) addSection(doc, 'Next Steps', fields.next_steps);
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('ACCEPTANCE');
  doc.moveDown(0.3);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
    .text('By signing below, the Client accepts this proposal and its terms.');
  addSignatureLine(doc, 'Signature of Client: ' + (fields.client_name || ''));
  addBlankLine(doc, 'Printed Name / Title');
  addBlankLine(doc, 'Date');
  addFooter(doc, 'DraftMyForms | For informational purposes only.');
  return streamToBuffer(doc);
}

function resumeSection(doc, label, value) {
  if (!value || String(value).trim() === '') return;
  doc.font(FONT_BOLD).fontSize(11).fillColor(ACCENT).text(label.toUpperCase());
  doc.moveDown(0.15)
    .moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
  doc.moveDown(0.3);
  doc.font(FONT_REGULAR).fontSize(10.5).fillColor(TEXT_PRIMARY).text(String(value));
  doc.moveDown(0.8);
}

async function renderResume(fields) {
  const doc = createDoc();
  doc.font(FONT_BOLD).fontSize(22).fillColor(TEXT_PRIMARY).text(fields.full_name || 'Resume');
  if (fields.professional_title) {
    doc.moveDown(0.1).font(FONT_REGULAR).fontSize(12).fillColor(ACCENT).text(fields.professional_title);
  }
  const contact = [fields.email, fields.phone, fields.location, fields.website]
    .filter(function (v) { return v && String(v).trim() !== ''; }).join('  |  ');
  if (contact) {
    doc.moveDown(0.2).font(FONT_REGULAR).fontSize(9.5).fillColor(TEXT_SECONDARY).text(contact);
  }
  doc.moveDown(0.5)
    .moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(1).stroke();
  doc.moveDown(0.6);
  resumeSection(doc, 'Professional Summary', fields.summary);
  resumeSection(doc, 'Work Experience', fields.experience);
  resumeSection(doc, 'Education', fields.education);
  resumeSection(doc, 'Skills', fields.skills);
  resumeSection(doc, 'Certifications', fields.certifications);
  addFooter(doc, 'DraftMyForms | Resume generated with DraftMyForms.');
  return streamToBuffer(doc);
}

async function render(slug, fields) {
  switch (slug) {
    case 'business-proposal': return renderProposal(fields);
    case 'resume': return renderResume(fields);
    default: throw new Error('Unknown business slug: ' + slug);
  }
}

module.exports = { render };
