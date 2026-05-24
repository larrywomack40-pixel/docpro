// Shared PDF rendering utilities for DraftMyForms document engine.

const PDFDocument = require('pdfkit');

const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const PAGE_MARGIN = 50;
const LINE_COLOR = '#cccccc';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6b7280';
const ACCENT = '#2563eb';

function createDoc() {
  return new PDFDocument({ margin: PAGE_MARGIN, size: 'LETTER' });
}

function addHeader(doc, title, subtitle) {
  doc.font(FONT_BOLD).fontSize(20).fillColor(ACCENT).text(title, { align: 'left' });
  if (subtitle) {
    doc.moveDown(0.2).font(FONT_REGULAR).fontSize(10).fillColor(TEXT_SECONDARY).text(subtitle);
  }
  doc.moveDown(0.5)
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(1).stroke();
  doc.moveDown(0.5);
}

function addFooter(doc, footerText) {
  const bottom = doc.page.height - PAGE_MARGIN + 10;
  doc.font(FONT_REGULAR).fontSize(8).fillColor(TEXT_SECONDARY)
    .text(footerText || 'For informational purposes only. Not legal advice.', PAGE_MARGIN, bottom, {
      align: 'center',
      width: doc.page.width - PAGE_MARGIN * 2
    });
}

function addSection(doc, label, value) {
  if (!value || String(value).trim() === '') return;
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text(label.toUpperCase());
  doc.moveDown(0.1).font(FONT_REGULAR).fontSize(11).fillColor(TEXT_PRIMARY).text(String(value));
  doc.moveDown(0.6);
}

function addTwoCol(doc, left, right) {
  const colWidth = (doc.page.width - PAGE_MARGIN * 2) / 2 - 10;
  const startY = doc.y;
  if (left.label && left.value) {
    doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text(left.label.toUpperCase(), PAGE_MARGIN, startY, { width: colWidth });
    doc.font(FONT_REGULAR).fontSize(11).fillColor(TEXT_PRIMARY).text(String(left.value || ''), PAGE_MARGIN, doc.y, { width: colWidth });
  }
  const rightX = PAGE_MARGIN + colWidth + 20;
  if (right.label && right.value) {
    doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY).text(right.label.toUpperCase(), rightX, startY, { width: colWidth });
    doc.font(FONT_REGULAR).fontSize(11).fillColor(TEXT_PRIMARY).text(String(right.value || ''), rightX, doc.y, { width: colWidth });
  }
  doc.moveDown(0.8);
}

function addSignatureLine(doc, label) {
  doc.moveDown(1.5);
  doc.moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_MARGIN + 220, doc.y)
    .strokeColor(TEXT_PRIMARY).lineWidth(0.5).stroke();
  doc.moveDown(0.2).font(FONT_REGULAR).fontSize(9).fillColor(TEXT_SECONDARY).text(label || 'Signature', PAGE_MARGIN);
  doc.moveDown(1);
}

function addBlankLine(doc, label) {
  doc.moveDown(1.2);
  doc.moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
  if (label) {
    doc.moveDown(0.2).font(FONT_REGULAR).fontSize(9).fillColor(TEXT_SECONDARY).text(label, PAGE_MARGIN);
  }
  doc.moveDown(0.8);
}

function parseLineItems(raw) {
  if (!raw) return [];
  return raw.split('\n').map(line => {
    const parts = line.split('|').map(s => s.trim());
    const description = parts[0] || '';
    const qty = parseFloat(parts[1]) || 1;
    const unitPrice = parseFloat(parts[2]) || 0;
    return { description, qty, unitPrice, total: qty * unitPrice };
  }).filter(it => it.description);
}

function addLineItemsTable(doc, items, taxRate) {
  const tableLeft = PAGE_MARGIN;
  const colWidths = [260, 60, 90, 90];
  const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT_SECONDARY);
  let x = tableLeft;
  headers.forEach((h, i) => {
    doc.text(h.toUpperCase(), x, doc.y, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
    x += colWidths[i];
  });
  doc.moveDown(0.3)
    .moveTo(tableLeft, doc.y).lineTo(tableLeft + tableWidth, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
  doc.moveDown(0.3);

  let subtotal = 0;
  items.forEach(it => {
    x = tableLeft;
    doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY);
    const rowY = doc.y;
    doc.text(it.description, x, rowY, { width: colWidths[0] });
    x += colWidths[0];
    doc.text(String(it.qty), x, rowY, { width: colWidths[1], align: 'right' });
    x += colWidths[1];
    doc.text(formatMoney(it.unitPrice), x, rowY, { width: colWidths[2], align: 'right' });
    x += colWidths[2];
    doc.text(formatMoney(it.total), x, rowY, { width: colWidths[3], align: 'right' });
    subtotal += it.total;
    doc.moveDown(0.6);
  });

  doc.moveDown(0.2)
    .moveTo(tableLeft, doc.y).lineTo(tableLeft + tableWidth, doc.y)
    .strokeColor(LINE_COLOR).lineWidth(0.5).stroke();
  doc.moveDown(0.4);

  const summaryX = tableLeft + colWidths[0] + colWidths[1];
  const summaryWidth = colWidths[2] + colWidths[3];
  const tax = taxRate ? subtotal * (parseFloat(taxRate) / 100) : 0;
  const total = subtotal + tax;

  doc.font(FONT_REGULAR).fontSize(10).fillColor(TEXT_PRIMARY);
  doc.text('Subtotal', summaryX, doc.y, { width: colWidths[2], align: 'right' });
  doc.text(formatMoney(subtotal), summaryX + colWidths[2], doc.y - doc.currentLineHeight(), { width: colWidths[3], align: 'right' });
  doc.moveDown(0.4);

  if (tax) {
    doc.text('Tax (' + taxRate + '%)', summaryX, doc.y, { width: colWidths[2], align: 'right' });
    doc.text(formatMoney(tax), summaryX + colWidths[2], doc.y - doc.currentLineHeight(), { width: colWidths[3], align: 'right' });
    doc.moveDown(0.4);
  }

  doc.font(FONT_BOLD).fontSize(11).fillColor(TEXT_PRIMARY);
  doc.text('Total', summaryX, doc.y, { width: colWidths[2], align: 'right' });
  doc.text(formatMoney(total), summaryX + colWidths[2], doc.y - doc.currentLineHeight(), { width: colWidths[3], align: 'right' });
  doc.moveDown(1);

  return { subtotal, tax, total };
}

function formatMoney(n) {
  const num = parseFloat(n) || 0;
  return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(d) {
  if (!d) return '';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

module.exports = {
  createDoc, addHeader, addFooter, addSection, addTwoCol,
  addSignatureLine, addBlankLine, parseLineItems, addLineItemsTable,
  formatMoney, formatDate, streamToBuffer,
  FONT_REGULAR, FONT_BOLD, PAGE_MARGIN, TEXT_PRIMARY, TEXT_SECONDARY, ACCENT, LINE_COLOR
};
