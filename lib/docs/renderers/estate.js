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

async function renderLastWill(fields) {
  const doc = createDoc();
  const name = fields.testator_name || '________________';
  const state = fields.domicile_state || '________________';
  const hasMinors = (fields.has_minor_children || '').toLowerCase() === 'yes';
  const selfProving = (fields.self_proving || '').toLowerCase() !== 'no';
  addHeader(doc, 'Last Will and Testament', 'of ' + name);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(
    'I, ' + name + (fields.testator_address ? ', residing at ' + fields.testator_address.replace(/\n/g, ', ') : '') +
    ', a resident of the State of ' + state + ', being of sound mind and memory and not acting under duress or undue influence, ' +
    'do hereby make, publish, and declare this to be my Last Will and Testament, and I revoke all wills and codicils previously made by me.'
  );
  let n = 1;
  function article(title, body) {
    doc.moveDown(0.4);
    doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('ARTICLE ' + toRoman(n++) + ' — ' + title);
    if (body) doc.moveDown(0.15).font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(body);
  }
  article('Debts and Expenses', 'I direct that my just debts, funeral expenses, and the expenses of administering my estate be paid as soon as practicable after my death.');
  article('Appointment of Executor', 'I nominate and appoint ' + (fields.executor_name || '________________') +
    ' as Executor (Personal Representative) of this Will. ' +
    (fields.alternate_executor ? 'If this person is unable or unwilling to serve, I appoint ' + fields.alternate_executor + ' as alternate Executor. ' : '') +
    'I direct that my Executor be permitted to serve without bond to the extent allowed by law.');
  if (hasMinors) {
    article('Guardian for Minor Children', 'If at my death I have minor children, I nominate ' + (fields.guardian_name || '________________') +
      ' as guardian of the person and property of my minor children. If this person is unable or unwilling to serve, I ask the court to appoint a suitable guardian.');
  }
  const bequests = (fields.specific_bequests || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (bequests.length) {
    article('Specific Gifts', 'I make the following specific gifts:');
    bequests.forEach(b => {
      doc.moveDown(0.1).font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text('• ' + b, { indent: 12 });
    });
  }
  article('Residuary Estate', 'I give, devise, and bequeath all the rest, residue, and remainder of my estate, of whatever kind and wherever located, to ' +
    (fields.residuary_beneficiary || '________________') + '. If any beneficiary named above does not survive me, that beneficiary\'s share shall pass to their surviving descendants, or if none, to my other residuary beneficiaries in equal shares.');
  article('Powers of Executor', 'My Executor shall have all powers granted by the laws of the State of ' + state +
    ', including the power to sell, manage, and distribute estate property, pay debts and taxes, and settle claims, without court order except where required by law.');
  doc.moveDown(0.6);
  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY).text(
    'IN WITNESS WHEREOF, I have signed this Will on the date written below, consisting of this and the preceding pages, and declare it to be my Last Will and Testament.'
  );
  doc.moveDown(0.8);
  addSignatureLine(doc, 'Signature of Testator: ' + (fields.testator_name || ''));
  addBlankLine(doc, 'Date');
  doc.moveDown(0.4);
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('ATTESTATION OF WITNESSES');
  doc.moveDown(0.2);
  doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_PRIMARY).text(
    'The foregoing instrument was signed, published, and declared by the Testator as the Testator\'s Last Will and Testament in our presence, and we, at the Testator\'s request and in the Testator\'s presence and in the presence of each other, have signed as witnesses. We believe the Testator to be of sound mind and under no constraint. (Most states require at least two witnesses who are not beneficiaries.)'
  );
  doc.moveDown(0.5);
  addSignatureLine(doc, 'Witness 1 Signature');
  addBlankLine(doc, 'Printed Name / Address');
  addSignatureLine(doc, 'Witness 2 Signature');
  addBlankLine(doc, 'Printed Name / Address');
  if (selfProving) {
    doc.moveDown(0.6);
    doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT_PRIMARY).text('SELF-PROVING AFFIDAVIT');
    doc.moveDown(0.2);
    addBlankLine(doc, 'State of:');
    addBlankLine(doc, 'County of:');
    doc.font(FONT_REGULAR).fontSize(9).fillColor(TEXT_PRIMARY).text(
      'Before me, the undersigned authority, on this day personally appeared the Testator and the witnesses, known to me to be the persons whose names are subscribed above, who each declared under oath that the Testator executed this instrument as the Testator\'s Last Will and that each witness signed in the presence of the Testator and of each other.'
    );
    doc.moveDown(0.8);
    addSignatureLine(doc, 'Notary Public Signature');
    addBlankLine(doc, 'Commission Expires');
  }
  addFooter(doc, DISCLAIMER + ' Will execution and witness requirements differ by state (' + state + '); confirm before signing.');
  return streamToBuffer(doc);
}

function toRoman(num) {
  const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) { while (num >= v) { out += s; num -= v; } }
  return out || 'I';
}

async function render(slug, fields) {
  switch (slug) {
    case 'advance-directive': return renderAdvanceDirective(fields);
    case 'power-of-attorney': return renderPowerOfAttorney(fields);
    case 'last-will': return renderLastWill(fields);
    default: throw new Error('Unknown estate slug: ' + slug);
  }
}

module.exports = { render };
