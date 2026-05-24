// Financial document renderer: pay-stub, invoice, quote, ramp-quote.
// All money values in USD. Line items parsed from pipe-delimited textarea input.

const {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addLineItemsTable, parseLineItems, formatMoney, formatDate,
  streamToBuffer, FONT_REGULAR, FONT_BOLD, PAGE_MARGIN,
  TEXT_PRIMARY, TEXT_SECONDARY, ACCENT, LINE_COLOR
} = require('../utils');

async function renderPayStub(fields) {
  const doc = createDoc();
  const gross = parseFloat(fields.gross_pay) || 0;
  const deductions = [
    parseFloat(fields.federal_tax) || 0,
    parseFloat(fields.state_tax) || 0,
    parseFloat(fields.social_security) || 0,
    parseFloat(fields.medicare) || 0,
    parseFloat(fields.other_deductions) || 0
  ];
  const totalDeductions = deductions.reduce((a, b) => a + b, 0);
  const net = gross - totalDeductions;

  addHeader(doc, 'Pay Stub', formatDate(fields.pay_date));

  addTwoCol(doc,
    { label: 'Employer', value: fields.employer_name },
    { label: 'Employee', value: fields.employee_name }
  );
  addTwoCol(doc,
    { label: 'Employer Address', value: fields.employer_address },
    { label: 'Employee Address', value: fields.employee_address }
  );
  addTwoCol(doc,
    { label: 'Employee ID', value: fields.employee_id },
    { label: 'Pay Date', value: formatDate(fields.pay_date) }
  );
  addTwoCol(doc,
    { label: 'Pay Period Start', value: formatDate(fields.pay_period_start) },
    { label: 'Pay Period End', value: formatDate(fields.pay_period_end) }
  );
  addTwoCol(doc,
    { label: 'Hours Worked', value: fields.hours_worked },
    { label: 'Hourly Rate', value: fields.hourly_rate ? formatMoney(fields.hourly_rate) : '' }
  );

  doc.moveDown(0.5)
    .moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(0.5).stroke().moveDown(0.5);

  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('EARNINGS', PAGE_MARGIN);
  doc.moveDown(0.2);
  const earningsX = doc.page.width - PAGE_MARGIN - 120;
  doc.font(FONT_REGULAR).fontSize(11).fillColor(TEXT_PRIMARY)
    .text('Gross Pay', PAGE_MARGIN)
    .text(formatMoney(gross), earningsX, doc.y - doc.currentLineHeight(), { width: 120, align: 'right' });
  doc.moveDown(0.6);

  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('DEDUCTIONS', PAGE_MARGIN);
  doc.moveDown(0.2);
  const deductionRows = [
    ['Federal Income Tax', fields.federal_tax],
    ['State Income Tax', fields.state_tax],
    ['Social Security', fields.social_security],
    ['Medicare', fields.medicare],
    ['Other Deductions', fields.other_deductions]
  ];
  deductionRows.forEach(([label, val]) => {
    if (!val || parseFloat(val) === 0) return;
    doc.font(FONT_REGULAR).fontSize(11).fillColor(TEXT_PRIMARY)
      .text(label, PAGE_MARGIN)
      .text(formatMoney(val), earningsX, doc.y - doc.currentLineHeight(), { width: 120, align: 'right' });
    doc.moveDown(0.4);
  });

  doc.moveDown(0.3)
    .moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(0.5).stroke().moveDown(0.4);

  doc.font(FONT_BOLD).fontSize(12).fillColor(TEXT_PRIMARY)
    .text('Net Pay', PAGE_MARGIN)
    .text(formatMoney(net), earningsX, doc.y - doc.currentLineHeight(), { width: 120, align: 'right' });
  doc.moveDown(1);

  const ytdFields = [
    ['ytd_gross', 'YTD Gross'],
    ['ytd_federal_tax', 'YTD Federal Tax'],
    ['ytd_state_tax', 'YTD State Tax'],
    ['ytd_social_security', 'YTD Social Security'],
    ['ytd_medicare', 'YTD Medicare'],
    ['ytd_deductions', 'YTD Other Deductions']
  ];
  const hasYtd = ytdFields.some(([k]) => fields[k] && parseFloat(fields[k]) > 0);
  if (hasYtd) {
    doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('YEAR-TO-DATE SUMMARY', PAGE_MARGIN);
    doc.moveDown(0.2);
    ytdFields.forEach(([key, label]) => {
      if (!fields[key] || parseFloat(fields[key]) === 0) return;
      doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY)
        .text(label, PAGE_MARGIN)
        .text(formatMoney(fields[key]), earningsX, doc.y - doc.currentLineHeight(), { width: 120, align: 'right' });
      doc.moveDown(0.4);
    });
  }

  addFooter(doc, 'DraftMyForms | For informational purposes only.');
  return streamToBuffer(doc);
}

async function renderInvoice(fields) {
  const doc = createDoc();
  const items = parseLineItems(fields.line_items);
  addHeader(doc, 'Invoice', 'Invoice No. ' + (fields.invoice_number || ''));
  addTwoCol(doc,
    { label: 'From', value: (fields.business_name || '') + (fields.business_address ? '\n' + fields.business_address : '') },
    { label: 'Bill To', value: (fields.client_name || '') + (fields.client_address ? '\n' + fields.client_address : '') }
  );
  addTwoCol(doc,
    { label: 'Invoice Date', value: formatDate(fields.invoice_date) },
    { label: 'Due Date', value: formatDate(fields.due_date) }
  );
  if (fields.business_email || fields.business_phone) {
    addTwoCol(doc,
      { label: 'Email', value: fields.business_email },
      { label: 'Phone', value: fields.business_phone }
    );
  }
  doc.moveDown(0.5);
  addLineItemsTable(doc, items, fields.tax_rate);
  if (fields.notes) addSection(doc, 'Notes', fields.notes);
  addFooter(doc, 'DraftMyForms | Thank you for your business.');
  return streamToBuffer(doc);
}

async function renderQuote(fields) {
  const doc = createDoc();
  const items = parseLineItems(fields.line_items);
  addHeader(doc, 'Quote', 'Quote No. ' + (fields.quote_number || ''));
  addTwoCol(doc,
    { label: 'From', value: (fields.business_name || '') + (fields.business_address ? '\n' + fields.business_address : '') },
    { label: 'Prepared For', value: (fields.client_name || '') + (fields.client_address ? '\n' + fields.client_address : '') }
  );
  addTwoCol(doc,
    { label: 'Quote Date', value: formatDate(fields.quote_date) },
    { label: 'Valid Until', value: formatDate(fields.valid_until) }
  );
  if (fields.business_email || fields.business_phone) {
    addTwoCol(doc,
      { label: 'Email', value: fields.business_email },
      { label: 'Phone', value: fields.business_phone }
    );
  }
  doc.moveDown(0.5);
  addLineItemsTable(doc, items, fields.tax_rate);
  if (fields.terms) addSection(doc, 'Terms and Conditions', fields.terms);
  addFooter(doc, 'DraftMyForms | This quote is not a binding contract.');
  return streamToBuffer(doc);
}

async function renderRampQuote(fields, businessInfo) {
  const doc = createDoc();
  const items = parseLineItems(fields.line_items);
  const biz = businessInfo || {};
  addHeader(doc, 'Accessibility Ramp Quote', 'Quote No. ' + (fields.quote_number || ''));
  addTwoCol(doc,
    { label: 'From', value: (biz.name || 'WMK Speciality Services LLC') + (biz.address ? '\n' + biz.address : '') },
    { label: 'Site / Client', value: (fields.client_name || '') + (fields.client_address ? '\n' + fields.client_address : '') }
  );
  addTwoCol(doc,
    { label: 'Quote Date', value: formatDate(fields.quote_date) },
    { label: 'Valid Until', value: formatDate(fields.valid_until) }
  );
  addTwoCol(doc,
    { label: 'Client Phone', value: fields.client_phone },
    { label: 'Client Email', value: fields.client_email }
  );
  doc.moveDown(0.3);
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text('RAMP SPECIFICATIONS');
  doc.moveDown(0.2);
  addTwoCol(doc,
    { label: 'Ramp Length', value: fields.ramp_length_ft ? fields.ramp_length_ft + ' ft' : '' },
    { label: 'Rise Height', value: fields.rise_height_in ? fields.rise_height_in + ' in' : '' }
  );
  addSection(doc, 'Material', fields.ramp_material);
  doc.moveDown(0.3);
  addLineItemsTable(doc, items, fields.tax_rate);
  if (fields.notes) addSection(doc, 'Notes', fields.notes);
  addFooter(doc, (biz.name || 'WMK Speciality Services LLC') + (biz.phone ? ' | ' + biz.phone : '') + ' | For informational purposes only.');
  return streamToBuffer(doc);
}

async function render(slug, fields, businessInfo) {
  switch (slug) {
    case 'pay-stub': return renderPayStub(fields);
    case 'invoice': return renderInvoice(fields);
    case 'quote': return renderQuote(fields);
    case 'ramp-quote': return renderRampQuote(fields, businessInfo);
    default: throw new Error('Unknown financial slug: ' + slug);
  }
}

module.exports = { render };
