import PDFDocument from 'pdfkit';
import { COMPANY } from '../config/company.js';

const BLUE = '#1d4ed8';
const GREY = '#555555';

const inr = (value) => `INR ${Number(value).toLocaleString('en-IN')}`;

function formatDate(value) {
  const date = typeof value === 'string' && value.length === 10
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function amountRow(doc, label, value) {
  const y = doc.y;

  doc.text(label, 60, y);
  doc.text(value, 60, y, { width: 475, align: 'right' });
  doc.moveDown(0.4);
}

export function buildOfferLetter(offer, signatory) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const candidate = `${offer.firstName} ${offer.lastName}`;
    const gross = offer.basicSalary + offer.allowances;

    doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(18).text(COMPANY.name);

    doc
      .fillColor(GREY)
      .font('Helvetica')
      .fontSize(9)
      .text([COMPANY.address, COMPANY.email, COMPANY.phone].filter(Boolean).join('  |  '));

    doc.moveDown(0.6);
    doc.strokeColor(BLUE).lineWidth(1.5).moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(1.5);

    doc.fillColor('#000000').fontSize(10.5);
    doc.text(`Ref: ${offer.id}`);
    doc.text(`Date: ${formatDate(offer.createdAt)}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text(candidate);
    doc.font('Helvetica').text(offer.email);
    if (offer.phone) doc.text(offer.phone);
    doc.moveDown();

    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('OFFER OF EMPLOYMENT', { align: 'center' });
    doc.moveDown();

    doc.font('Helvetica').fontSize(10.5);
    doc.text(`Dear ${offer.firstName},`);
    doc.moveDown(0.6);

    doc.text(
      `We are pleased to offer you the position of ${offer.designationName} in the ${offer.departmentName} department at ${COMPANY.name}. Your date of joining will be ${formatDate(offer.joiningDate)}${offer.location ? `, and your place of work will be ${offer.location}` : ''}.`,
      { align: 'justify' }
    );

    const managers = [
      offer.teamLeaderName && `${offer.teamLeaderName} (Team Leader)`,
      offer.processManagerName && `${offer.processManagerName} (Process Manager)`,
    ].filter(Boolean);

    if (managers.length) {
      doc.moveDown(0.6);
      doc.text(`You will report to ${managers.join(' and ')}.`);
    }

    doc.moveDown();
    doc.font('Helvetica-Bold').text('Compensation (monthly)');
    doc.moveDown(0.4);
    doc.font('Helvetica');

    amountRow(doc, 'Basic salary', inr(offer.basicSalary));
    amountRow(doc, 'Allowances', inr(offer.allowances));

    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.moveDown(0.4);

    doc.font('Helvetica-Bold');
    amountRow(doc, 'Gross monthly salary', inr(gross));
    amountRow(doc, 'Gross annual salary', inr(gross * 12));
    doc.font('Helvetica');
    doc.moveDown(0.6);

    doc.text(
      `This offer is subject to submission and verification of your documents. Your employment will be governed by the policies of ${COMPANY.name}, which will be shared with you at joining.`,
      { align: 'justify' }
    );
    doc.moveDown(0.6);

    doc.text('Please sign below and return a copy as your acceptance of this offer.');
    doc.moveDown(0.6);
    doc.text('We look forward to welcoming you to the team.');
    doc.moveDown(1.5);

    doc.text('Sincerely,');
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text(signatory);
    doc.font('Helvetica').text(`Human Resources, ${COMPANY.name}`);
    doc.moveDown(2);

    doc.strokeColor('#cccccc').lineWidth(0.5).moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(0.8);

    doc.text(`I, ${candidate}, accept the above offer of employment.`);
    doc.moveDown(2);
    doc.text('Signature: ______________________          Date: ______________');

    doc.end();
  });
}