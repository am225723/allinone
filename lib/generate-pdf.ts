import jsPDF from 'jspdf';

interface PDFOptions {
  patientName: string;
  mrn: string;
  dob: string;
  dateOfService: string;
  templateName: string;
  providerName?: string;
  sections: { heading: string; content: string }[];
  footerAddress?: string;
  footerFax?: string;
  footerPhone?: string;
  footerEmail?: string;
}

export function generateNotePDF(options: PDFOptions): jsPDF {
  const {
    patientName,
    mrn,
    dob,
    dateOfService,
    templateName,
    providerName = 'Douglas Zelisko, M.D.',
    sections,
    footerAddress = '45 S Main St, Suite 111, West Hartford, CT 06107',
    footerFax = '860.318.2085',
    footerPhone = '860.615.3629',
    footerEmail = 'support@drzelisko.com',
  } = options;

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 50;
  const marginRight = 50;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const footerY = pageHeight - 50;
  let y = 50;

  function addFooter() {
    doc.setDrawColor(200, 200, 200);
    doc.line(marginLeft, footerY - 10, pageWidth - marginRight, footerY - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    const footerText = `${footerAddress}     F: ${footerFax}     P: ${footerPhone}     ${footerEmail}`;
    doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
  }

  function checkPage(needed: number) {
    if (y + needed > footerY - 20) {
      addFooter();
      doc.addPage();
      y = 50;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(templateName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(1);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 25;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Patient Name:', marginLeft, y);
  doc.setFont('helvetica', 'normal');
  doc.text(patientName, marginLeft + 85, y);

  doc.setFont('helvetica', 'bold');
  doc.text('MRN:', pageWidth / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(mrn, pageWidth / 2 + 35, y);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Birth:', marginLeft, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dob, marginLeft + 85, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Service:', pageWidth / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateOfService, pageWidth / 2 + 95, y);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.text('Provider:', marginLeft, y);
  doc.setFont('helvetica', 'normal');
  doc.text(providerName, marginLeft + 85, y);
  y += 25;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 20;

  for (const section of sections) {
    checkPage(40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 60, 120);
    doc.text(section.heading, marginLeft, y);
    y += 5;
    doc.setDrawColor(30, 60, 120);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, marginLeft + doc.getTextWidth(section.heading), y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    const lines = doc.splitTextToSize(section.content, contentWidth);
    for (const line of lines) {
      checkPage(14);

      if (line.startsWith('**') && line.endsWith('**')) {
        doc.setFont('helvetica', 'bold');
        doc.text(line.replace(/\*\*/g, ''), marginLeft, y);
        doc.setFont('helvetica', 'normal');
      } else if (line.match(/^\*\*.*?\*\*:/)) {
        const match = line.match(/^\*\*(.*?)\*\*:(.*)/);
        if (match) {
          doc.setFont('helvetica', 'bold');
          doc.text(`${match[1]}:`, marginLeft, y);
          const boldWidth = doc.getTextWidth(`${match[1]}: `);
          doc.setFont('helvetica', 'normal');
          doc.text(match[2].trim(), marginLeft + boldWidth, y);
        } else {
          doc.text(line, marginLeft, y);
        }
      } else if (line.match(/^\d+\.\s/)) {
        doc.text(line, marginLeft + 10, y);
      } else if (line.startsWith('- ')) {
        doc.text(`\u2022 ${line.slice(2)}`, marginLeft + 10, y);
      } else {
        doc.text(line, marginLeft, y);
      }
      y += 14;
    }

    y += 10;
  }

  addFooter();

  return doc;
}

export function parseSectionsFromNote(noteText: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = [];
  const lines = noteText.split('\n');
  let currentHeading = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
      }
      currentHeading = line.replace('## ', '');
      currentContent = [];
    } else if (currentHeading) {
      currentContent.push(line);
    }
  }

  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
  }

  return sections;
}
