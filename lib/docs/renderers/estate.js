// Estate document renderer: advance-directive, power-of-attorney.
// UNCERTAIN: State-specific statutory form language varies significantly.
// UNCERTAIN: Notary acknowledgment wording differs by state.
// All signature/witness/notary blocks are left as blank lines for wet signatures.
// Renderer inserts select option values verbatim into document body.

const {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addSignatureLine, addBlankLine, formatDate, streamToBuffer,
  FONT_REGULAR, FONT_BOLD, PAGE_MARGIN, TEXT_PRIMARY, TEXT_SECONDARY
} = require('../utils');

const DISCLAIMER = 'For informational purposes only. Not legal advice. Estate documents must comply with state law. Consult a licensed attorney before execution.';

async function renderAdvanceDirective(fields) {
  const doc = createDoc();
  addHeader(doc, 'Advance Healthcare Directive', 'Also known as a Living Will');
  addSection(doc, 'Declarant', fields.declarant_name);
  if (fields.declarant_address) addSection(doc, 'Declarant Address', fields.declarant_address);
  if (fields.declarant_dob) addSection(doc, 'Date of Birth', formatDate(fields.declarant_dob));
  addSection(doc, 'Governing State', fields.governing_state);
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('HEALTHCARE AGENT');
  doc.moveDown(0.3);
  addTwoCol(doc,
    { label: 'Agent Name', value: fields.agent_name },
    { label: 'Agent Phone', value: fields.agent_phone }
  );
  if (fields.agent_address) addSection(doc, 'Agent Address', fields.agent_address);
  if (fields.alternate_agent_name) {
    addTwoCol(doc,
      { label: 'Alternate Agent', value: fields.alternate_agent_name },
      { label: 'Alternate Agent Phone', value: fields.alternate_agent_phone }
    );
  }
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('HEALTHCARE WISHES');
  doc.moveDown(0.3);
  if (fields.life_sustaining_preference) {
    addSection(doc, 'Life-Sustaining Treatment', fields.life_sustaining_preference);
  }
  if (fields.artificial_nutrition) {
    addSection(doc, 'Artificial Nutrition and Hydration', fields.artificial_nutrition);
  }
  if (fields.pain_relief) {
    addSection(doc, 'Pain Relief', fields.pain_relief);
  }
  if (fields.other_instructions) {
    addSection(doc, 'Other Instructions', fields.other_instructions);
  }
  doc.moveDown(0.5);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
    .text('I, ' + (fields.declarant_name || '________________') + ', being of sound mind, willfully and voluntarily make this Advance Healthcare Directive. I intend this document to be followed if I am unable to make my own healthcare decisions.');
  doc.moveDown(1);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('DECLARANT SIGNATURE');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Signature of Declarant: ' + (fields.declarant_name || ''));
  addBlankLine(doc, 'Printed Name');
  addBlankLine(doc, 'Date');
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('WITNESSES (Two disinterested witnesses required in most states)');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Witness 1 Signature');
  addBlankLine(doc, 'Witness 1 Printed Name');
  addBlankLine(doc, 'Witness 1 Address');
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Witness 2 Signature');
  addBlankLine(doc, 'Witness 2 Printed Name');
  addBlankLine(doc, 'Witness 2 Address');
  addBlankLine(doc, 'Date');
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('NOTARY ACKNOWLEDGMENT');
  doc.moveDown(0.5);
  addBlankLine(doc, 'State of:');
  addBlankLine(doc, 'County of:');
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_PRIMARY)
    .text('Subscribed and sworn to (or affirmed) before me on this _____ day of _________________, 20___, by ________________________________.', PAGE_MARGIN);
  doc.moveDown(0.8);
  addSignatureLine(doc, 'Notary Public Signature');
  addBlankLine(doc, 'Commission Expires');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function renderPowerOfAttorney(fields) {
  const doc = createDoc();
  const isSpringing = (fields.effective_when || '').toLowerCase().includes('springing') || (fields.effective_when || '').toLowerCase().includes('incapacity');
  const isDurable = (fields.durable || '').toLowerCase() === 'yes';
  addHeader(doc, 'Power of Attorney', isDurable ? 'Durable Power of Attorney' : 'Power of Attorney');
  addSection(doc, 'Governing State', fields.governing_state);
  doc.moveDown(0.3);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('PRINCIPAL');
  doc.moveDown(0.3);
  addTwoCol(doc,
    { label: 'Principal Name', value: fields.principal_name },
    { label: 'Address', value: fields.principal_address }
  );
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('AGENT (ATTORNEY-IN-FACT)');
  doc.moveDown(0.3);
  addTwoCol(doc,
    { label: 'Agent Name', value: fields.agent_name },
    { label: 'Agent Address', value: fields.agent_address }
  );
  if (fields.alternate_agent_name) {
    addSection(doc, 'Alternate Agent', fields.alternate_agent_name);
  }
  doc.moveDown(0.3);
  if (fields.powers_scope) addSection(doc, 'Scope of Powers', fields.powers_scope);
  addSection(doc, 'Specific Powers Granted', fields.specific_powers);
  doc.moveDown(0.5);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
    .text('This Power of Attorney shall become effective ' + (isSpringing ? 'upon the incapacity of the Principal as determined by a licensed physician.' : 'immediately upon signing.'));
  if (isDurable) {
    doc.moveDown(0.4).font(FONT_REGULAR).fontSize(10)
      .text('This is a DURABLE Power of Attorney and shall not be affected by the subsequent disability or incapacity of the Principal.');
  }
  if (fields.termination_date) {
    doc.moveDown(0.4).font(FONT_REGULAR).fontSize(10)
      .text('This Power of Attorney terminates on ' + formatDate(fields.termination_date) + '.');
  }
  doc.moveDown(1);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('PRINCIPAL SIGNATURE');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Signature of Principal: ' + (fields.principal_name || ''));
  addBlankLine(doc, 'Printed Name');
  addBlankLine(doc, 'Date');
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('WITNESSES');
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Witness 1 Signature');
  addBlankLine(doc, 'Witness 1 Printed Name');
  addBlankLine(doc, 'Date');
  addSignatureLine(doc, 'Witness 2 Signature');
  addBlankLine(doc, 'Witness 2 Printed Name');
  addBlankLine(doc, 'Date');
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('NOTARY ACKNOWLEDGMENT');
  doc.moveDown(0.5);
  addBlankLine(doc, 'State of:');
  addBlankLine(doc, 'County of:');
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_PRIMARY)
    .text('Subscribed and sworn to (or affirmed) before me on this _____ day of _________________, 20___, by ________________________________.', PAGE_MARGIN);
  doc.moveDown(0.8);
  addSignatureLine(doc, 'Notary Public Signature');
  addBlankLine(doc, 'Commission Expires');
  addFooter(doc, DISCLAIMER);
  return streamToBuffer(doc);
}

async function render(slug, fields) {
  switch (slug) {
    case 'advance-directive': return renderAdvanceDirective(fields);
    case 'power-of-attorney': return renderPowerOfAttorney(fields);
    default: throw new Error('Unknown estate slug: ' + slug);
  }
}

module.exports = { render };
