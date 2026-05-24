// Assessment document renderer: home-mod-assessment.
// Renders Yes/No/N/A select values as checkbox rows in the PDF.
// Business info (assessor company, address, phone) pulled from businessInfo object.

const {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addBlankLine, formatDate, streamToBuffer,
  FONT_REGULAR, FONT_BOLD, PAGE_MARGIN, TEXT_PRIMARY, TEXT_SECONDARY, LINE_COLOR, ACCENT
} = require('../utils');

const DISCLAIMER = 'For informational purposes only. This assessment does not constitute a professional engineering or occupational therapy evaluation.';

function renderCheckRow(doc, label, value) {
  const rowY = doc.y;
  const boxSize = 10;
  const textX = PAGE_MARGIN + boxSize + 8;
  const valueX = doc.page.width - PAGE_MARGIN - 60;

  doc.rect(PAGE_MARGIN, rowY, boxSize, boxSize).strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
  if (value && value.toLowerCase() === 'yes') {
    doc.moveTo(PAGE_MARGIN + 2, rowY + 5).lineTo(PAGE_MARGIN + 5, rowY + 8).lineTo(PAGE_MARGIN + boxSize - 1, rowY + 2)
      .strokeColor(ACCENT).lineWidth(1.5).stroke();
  }

  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
    .text(label, textX, rowY, { width: valueX - textX - 10 });

  const displayVal = value || '';
  const valColor = displayVal.toLowerCase() === 'yes' ? ACCENT : (displayVal.toLowerCase() === 'no' ? '#b91c1c' : TEXT_SECONDARY);
  doc.font(FONT_BOLD).fontSize(10).fillColor(valColor)
    .text(displayVal, valueX, rowY, { width: 60, align: 'right' });

  doc.moveDown(0.6);
}

async function renderHomeModAssessment(fields, businessInfo) {
  const doc = createDoc();
  const biz = businessInfo || {};
  addHeader(doc, 'Home Modification Assessment', formatDate(fields.assessment_date));

  addTwoCol(doc,
    { label: 'Client', value: fields.client_name + (fields.client_address ? '\n' + fields.client_address : '') },
    { label: 'Assessor / Company', value: (fields.assessor_name || biz.name || '') + (biz.address ? '\n' + biz.address : '') }
  );
  addTwoCol(doc,
    { label: 'Client Phone', value: fields.client_phone },
    { label: 'Company Phone', value: biz.phone || '' }
  );
  addSection(doc, 'Assessment Date', formatDate(fields.assessment_date));

  doc.moveDown(0.5)
    .moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(0.5).stroke().moveDown(0.5);

  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('ENTRY AND ACCESS');
  doc.moveDown(0.3);
  renderCheckRow(doc, 'Grab bars needed at entry', fields.entry_grab_bars);
  renderCheckRow(doc, 'Ramp needed at entry', fields.entry_ramp);

  doc.moveDown(0.3);
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('BATHROOM');
  doc.moveDown(0.3);
  renderCheckRow(doc, 'Grab bars needed in bathroom', fields.bath_grab_bars);
  renderCheckRow(doc, 'Walk-in shower needed', fields.bath_walk_in_shower);
  renderCheckRow(doc, 'Raised toilet needed', fields.bath_raised_toilet);

  doc.moveDown(0.3);
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('GENERAL MODIFICATIONS');
  doc.moveDown(0.3);
  renderCheckRow(doc, 'Doorway widening needed', fields.door_widening);
  renderCheckRow(doc, 'Lighting upgrade needed', fields.lighting_upgrade);
  renderCheckRow(doc, 'Flooring change needed', fields.flooring_change);
  renderCheckRow(doc, 'Stair lift needed', fields.stair_lift);

  doc.moveDown(0.5)
    .moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(0.5).stroke().moveDown(0.5);

  if (fields.notes) addSection(doc, 'Additional Observations', fields.notes);
  addSection(doc, 'Recommended Modifications Summary', fields.recommendations);

  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SIGNATURES');
  doc.moveDown(0.5);
  addBlankLine(doc, 'Assessor Signature');
  addBlankLine(doc, 'Assessor Printed Name');
  addBlankLine(doc, 'Date');
  addBlankLine(doc, 'Client / Guardian Signature');
  addBlankLine(doc, 'Date');

  addFooter(doc, (biz.name || 'WMK Speciality Services LLC') + (biz.phone ? ' | ' + biz.phone : '') + ' | ' + DISCLAIMER);
  return streamToBuffer(doc);
}

async function render(slug, fields, businessInfo) {
  switch (slug) {
    case 'home-mod-assessment': return renderHomeModAssessment(fields, businessInfo);
    default: throw new Error('Unknown assessment slug: ' + slug);
  }
}

module.exports = { render };
