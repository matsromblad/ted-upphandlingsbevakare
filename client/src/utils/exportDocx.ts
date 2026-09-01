import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
  ShadingType
} from 'docx';
import { Notice, AIAnalysis } from '../types';

export const exportAnalysisToDocx = async (notice: Notice, analysis: AIAnalysis) => {
  // Helper for section headings
  const createSectionHeader = (title: string, icon = '■') => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 120 },
      children: [
        new TextRun({
          text: `${icon}  ${title}`,
          bold: true,
          size: 24, // 12pt
          color: '1E3A8A', // Deep blue
          font: 'Calibri'
        })
      ]
    });
  };

  // Helper for bullet list item
  const createBulletItem = (text: string, prefix = '• ') => {
    return new Paragraph({
      spacing: { before: 60, after: 60 },
      indent: { left: 360 },
      children: [
        new TextRun({
          text: `${prefix}${text}`,
          size: 20, // 10pt
          font: 'Calibri',
          color: '1E293B'
        })
      ]
    });
  };

  // Helper for standard paragraph
  const createParagraph = (text: string, italic = false) => {
    return new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({
          text,
          size: 20, // 10pt
          font: 'Calibri',
          italics: italic,
          color: '1E293B'
        })
      ]
    });
  };

  // Helper for metadata table cell
  const createCell = (label: string, value: string, isHeader = false) => {
    return new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      shading: isHeader ? { fill: 'F1F5F9', type: ShadingType.CLEAR } : undefined,
      margins: { top: 100, bottom: 100, left: 150, right: 150 },
      children: [
        new Paragraph({
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: label ? `${label}: ` : '',
              bold: true,
              size: 19,
              font: 'Calibri',
              color: '475569'
            }),
            new TextRun({
              text: value || '-',
              bold: isHeader,
              size: 19,
              font: 'Calibri',
              color: '0F172A'
            })
          ]
        })
      ]
    });
  };

  // Metadata Table
  const metadataRows: TableRow[] = [
    new TableRow({
      children: [
        createCell('Upphandlande myndighet', notice.buyer || '-'),
        createCell('TED Publikationsnummer', notice.publicationNumber || '-')
      ]
    }),
    new TableRow({
      children: [
        createCell('Ort / Land', `${notice.city || 'Ej angiven'}, ${notice.country || 'Sverige'}`),
        createCell('Formtyp', notice.formType || 'Konkurrensutsatt')
      ]
    }),
    new TableRow({
      children: [
        createCell('Publiceringsdatum', notice.publicationDate || '-'),
        createCell('Sista anbudsdag (Deadline)', notice.deadline || 'Ej angiven')
      ]
    }),
    new TableRow({
      children: [
        createCell('Uppskattat värde / Takbelopp', notice.estimatedValueFormatted || notice.estimatedValue || 'Ej specificerat'),
        createCell('Upphandlingssystem / Portal', notice.portalName || notice.links?.portalName || 'TED Europa')
      ]
    })
  ];

  const metadataTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metadataRows
  });

  const children: (Paragraph | Table)[] = [
    // Header title
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: 'ANBUDSANALYS & KRAVPROFIL',
          bold: true,
          size: 32, // 16pt
          color: '0F172A',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: notice.title || 'Upphandlingsanalys',
          bold: true,
          size: 24, // 12pt
          color: '2563EB',
          font: 'Calibri'
        })
      ]
    }),

    // Matchning & verifieringsstatus banner
    new Paragraph({
      spacing: { before: 100, after: 200 },
      children: [
        new TextRun({
          text: `Matchningsbetyg (Fit Score): ${analysis.fitScore}%`,
          bold: true,
          size: 22,
          color: analysis.fitScore >= 70 ? '15803D' : 'B45309',
          font: 'Calibri'
        }),
        new TextRun({
          text: analysis.isDocumentGrounded
            ? '  |  Verifierad mot fullständigt förfrågningsunderlag (handlingar/ZIP)'
            : '  |  Baserad på officiellt TED-sammandrag',
          size: 19,
          italics: true,
          color: '64748B',
          font: 'Calibri'
        })
      ]
    }),

    metadataTable,

    // Sektion: Sammanfattning
    createSectionHeader('Sammanfattning av upphandlingen'),
    createParagraph(analysis.summary || 'Ingen sammanfattning tillgänglig.'),

    // Sektion: Avtals- och projektfakta
    createSectionHeader('Projekt- & Avtalsfakta'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Förväntad omsättning / Takbelopp', analysis.estimatedValueOrBudget || notice.estimatedValueFormatted || 'Enligt underlag'),
            createCell('Arbetets början och slut / Avtalstid', analysis.projectDuration || 'Enligt förfrågningsunderlag')
          ]
        }),
        new TableRow({
          children: [
            createCell('Standardiserade avtalsvillkor', analysis.standardContractTerms || 'Standardavtal (t.ex. ABK 09)'),
            createCell('Antal granskade handlingar', analysis.documentSources ? `${analysis.documentSources.length} st` : 'Ej tillämpligt')
          ]
        })
      ]
    })
  ];

  // Granskade handlingar
  if (analysis.documentSources && analysis.documentSources.length > 0) {
    children.push(createSectionHeader('Granskade handlingar & bilagor'));
    analysis.documentSources.forEach(doc => {
      children.push(createBulletItem(doc, '📄 '));
    });
  }

  // Eftersökta roller & krav
  if (analysis.requestedRoles && analysis.requestedRoles.length > 0) {
    children.push(createSectionHeader('Eftersökta roller & Kompetenskrav'));
    analysis.requestedRoles.forEach((item, idx) => {
      const isObj = typeof item === 'object' && item !== null;
      const roleName = isObj ? (item as any).role : `Roll ${idx + 1}`;
      const reqs = isObj ? (item as any).requirements : String(item);

      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: `👤 ${roleName}`,
              bold: true,
              size: 21,
              font: 'Calibri',
              color: '1E3A8A'
            })
          ]
        }),
        new Paragraph({
          spacing: { before: 0, after: 100 },
          indent: { left: 360 },
          children: [
            new TextRun({
              text: reqs,
              size: 19,
              font: 'Calibri',
              color: '334155'
            })
          ]
        })
      );
    });
  }

  // Handlingar som ska lämnas in
  if (analysis.requiredSubmissionDocuments && analysis.requiredSubmissionDocuments.length > 0) {
    children.push(createSectionHeader('Handlingar & Bilagor som ska lämnas in'));
    analysis.requiredSubmissionDocuments.forEach(doc => {
      children.push(createBulletItem(doc, '☑ '));
    });
  }

  // Viktiga krav
  if (analysis.keyRequirements && analysis.keyRequirements.length > 0) {
    children.push(createSectionHeader('Viktiga krav & Kvalificeringskriterier'));
    analysis.keyRequirements.forEach(req => {
      children.push(createBulletItem(req));
    });
  }

  // Möjligheter & Styrkor
  if (analysis.opportunities && analysis.opportunities.length > 0) {
    children.push(createSectionHeader('Möjligheter & Strategiska fördelar'));
    analysis.opportunities.forEach(opp => {
      children.push(createBulletItem(opp, '✓ '));
    });
  }

  // Risker & Utmaningar
  if (analysis.risksAndChallenges && analysis.risksAndChallenges.length > 0) {
    children.push(createSectionHeader('Risker & Utmaningar att beakta'));
    analysis.risksAndChallenges.forEach(risk => {
      children.push(createBulletItem(risk, '⚠ '));
    });
  }

  // Anbudsstrategi
  if (analysis.recommendedBidStrategy) {
    children.push(
      createSectionHeader('Rekommenderad Anbudsstrategi'),
      createParagraph(analysis.recommendedBidStrategy)
    );
  }

  // Frågor till upphandlaren
  if (analysis.clarificationQuestions && analysis.clarificationQuestions.length > 0) {
    children.push(createSectionHeader('Förslag på frågor att ställa under anbudstiden'));
    analysis.clarificationQuestions.forEach((q, idx) => {
      children.push(createBulletItem(q, `${idx + 1}. `));
    });
  }

  // Länkar & Referenser
  children.push(
    createSectionHeader('Länkar & Källor'),
    createParagraph(`Officiell TED-kungörelse: ${notice.links?.tedHtml || 'Se TED Europa'}`),
    createParagraph(`Anbudsinlämning / Portal: ${notice.links?.submission || notice.links?.documents || 'Ej angiven'}`)
  );

  // Bygg Word-dokumentet
  const doc = new Document({
    title: `Anbudsanalys - ${notice.title}`,
    description: 'AI-anbudsanalys genererad av TED Upphandlingsbevakare',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children
      }
    ]
  });

  // Generera Blob och starta nedladdning
  const blob = await Packer.toBlob(doc);
  const cleanTitle = (notice.title || 'Anbud')
    .replace(/[\\/*?:"<>|]/g, '')
    .slice(0, 40)
    .trim();
  const filename = `Anbudsanalys_${notice.publicationNumber || 'TED'}_${cleanTitle}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
