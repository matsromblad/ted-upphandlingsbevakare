import { createRequire } from 'module';
import * as xlsx from 'xlsx';
import path from 'path';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Categorize document type based on filename keywords
 */
export function categorizeDocument(fileName = '') {
  const lower = fileName.toLowerCase();
  if (/pris|svarsbilaga|ersätt|ersatt|timpris|kalkyl|kostnad|budget/i.test(lower)) {
    return 'Prisbilaga & Ersättningsmodell';
  }
  if (/(?:^|[_\-\s])af[_\-\s.]|administrativ|föreskrift|foreskrift|anbudsinbjudan|förutsättning/i.test(lower)) {
    return 'Administrativa Föreskrifter (AF)';
  }
  if (/krav|spec|teknisk|uppdragsbeskrivning|funktionsbeskrivning|projekteringsanvisning/i.test(lower)) {
    return 'Kravspecifikation & Uppdragsbeskrivning';
  }
  if (/avtal|kontrakt|abk|ab04|abt06|villkor/i.test(lower)) {
    return 'Avtalsmall & Kontraktsvillkor';
  }
  if (/cv|referens|kompetens|nyckelperson/i.test(lower)) {
    return 'CV & Referensmall';
  }
  if (/espd|sanningsförsäkran|uteslutning|kvalificering/i.test(lower)) {
    return 'Kvalificering & ESPD';
  }
  if (/fråga|svar|fragor|f&s|q&a|komplettering/i.test(lower)) {
    return 'Frågor & Svar / Förtydliganden';
  }
  return 'Övrigt förfrågningsunderlag';
}

/**
 * Extract plain text from an individual file buffer
 */
export async function extractTextFromFile(buffer, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      return data.text ? data.text.trim() : '';
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ? result.value.trim() : '';
    }

    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetTexts = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
          const csvText = xlsx.utils.sheet_to_csv(sheet);
          if (csvText && csvText.trim()) {
            sheetTexts.push(`--- Flik: ${sheetName} ---\n${csvText.trim()}`);
          }
        }
      }
      return sheetTexts.join('\n\n');
    }

    if (['.txt', '.rtf', '.md', '.json', '.xml', '.html', '.htm'].includes(ext)) {
      const raw = buffer.toString('utf-8');
      if (ext === '.html' || ext === '.htm') {
        return raw.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      }
      return raw.trim();
    }

    return '';
  } catch (err) {
    console.warn(`[DocumentParser] Error parsing ${fileName}:`, err.message);
    return `[Kunde inte läsa innehållet i ${fileName}: ${err.message}]`;
  }
}

/**
 * Unpacks and parses uploaded files (supports single files and ZIP archives)
 * @param {Array<{ originalname: string, buffer: Buffer, size: number }>} files
 */
export async function parseUploadedProcurementFiles(files = []) {
  const parsedDocuments = [];

  for (const file of files) {
    const fileName = file.originalname || 'upphandlingsdokument';
    const ext = path.extname(fileName).toLowerCase();

    if (ext === '.zip') {
      // Process ZIP archive
      try {
        const zip = new AdmZip(file.buffer);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
          if (entry.isDirectory) continue;
          
          const entryName = entry.entryName;
          const baseName = path.basename(entryName);
          
          // Skip system hidden/temp files
          if (baseName.startsWith('.') || baseName.startsWith('~$') || entryName.includes('__MACOSX')) {
            continue;
          }

          const entryExt = path.extname(baseName).toLowerCase();
          const supportedExts = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt', '.md', '.rtf', '.xml'];
          if (!supportedExts.includes(entryExt)) {
            continue;
          }

          const entryBuffer = entry.getData();
          const text = await extractTextFromFile(entryBuffer, baseName);
          
          if (text && text.trim().length > 0) {
            parsedDocuments.push({
              name: baseName,
              path: entryName,
              size: entry.header.size,
              category: categorizeDocument(baseName),
              text: text.trim(),
              charCount: text.length
            });
          }
        }
      } catch (zipErr) {
        console.error('[DocumentParser] Failed to extract ZIP archive:', zipErr);
      }
    } else {
      // Process individual file
      const text = await extractTextFromFile(file.buffer, fileName);
      if (text && text.trim().length > 0) {
        parsedDocuments.push({
          name: fileName,
          path: fileName,
          size: file.size || file.buffer.length,
          category: categorizeDocument(fileName),
          text: text.trim(),
          charCount: text.length
        });
      }
    }
  }

  // Sort documents by category priority (AF -> Krav -> Pris -> Avtal -> Övrigt)
  const categoryOrder = [
    'Administrativa Föreskrifter (AF)',
    'Kravspecifikation & Uppdragsbeskrivning',
    'Prisbilaga & Ersättningsmodell',
    'Avtalsmall & Kontraktsvillkor',
    'Kvalificering & ESPD',
    'CV & Referensmall',
    'Frågor & Svar / Förtydliganden',
    'Övrigt förfrågningsunderlag'
  ];

  parsedDocuments.sort((a, b) => {
    const idxA = categoryOrder.indexOf(a.category);
    const idxB = categoryOrder.indexOf(b.category);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  // Assemble full context string for AI analysis with size guard
  let combinedCorpus = '';
  const MAX_TOTAL_CHARS = 180000; // ~45,000 tokens (safe and rich for MiniMax)
  let currentChars = 0;

  for (const doc of parsedDocuments) {
    const docHeader = `\n\n======================================================================\nDOKUMENT: ${doc.name} [Kategori: ${doc.category}]\n======================================================================\n`;
    
    const availableSpace = MAX_TOTAL_CHARS - currentChars;
    if (availableSpace <= 500) {
      combinedCorpus += `\n[Fler dokument finns i underlaget men utelämnades för att hålla kontexten optimal]`;
      break;
    }

    let docContent = doc.text;
    if (docContent.length > availableSpace) {
      docContent = docContent.slice(0, availableSpace) + '\n[...Text i dokumentet förkortades för att rymmas...]';
    }

    combinedCorpus += docHeader + docContent;
    currentChars += docHeader.length + docContent.length;
  }

  return {
    documentCount: parsedDocuments.length,
    documents: parsedDocuments.map(d => ({
      name: d.name,
      category: d.category,
      size: d.size,
      charCount: d.charCount,
      preview: d.text.slice(0, 200).replace(/\s+/g, ' ') + '...'
    })),
    combinedCorpus
  };
}
