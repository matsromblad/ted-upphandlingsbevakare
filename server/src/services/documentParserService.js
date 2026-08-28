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
  
  if (/pris|ersätt|ersatt|timpris|kalkyl|kostnad|budget|arvode|taxa|mängd|mangd|svarsbilaga.*pris|bilaga.*pris|prisblankett/i.test(lower)) {
    return 'Prisbilaga & Ersättningsmodell';
  }
  if (/krav|spec|teknisk|uppdragsbeskrivning|funktionsbeskrivning|projekteringsanvisning|omfattning|leveransbeskrivning|arbetsbeskrivning|bilaga.*krav|bilaga.*spec/i.test(lower)) {
    return 'Kravspecifikation & Uppdragsbeskrivning';
  }
  if (/(?:^|[_\-\s])af[_\-\s.]|administrativ|föreskrift|foreskrift|anbudsinbjudan|förutsättning|afb|afc|afd|afe|aff|afg|inbjudan/i.test(lower)) {
    return 'Administrativa Föreskrifter (AF)';
  }
  if (/avtal|kontrakt|abk|ab04|abt06|villkor|ramavtalsmall|avtalsutkast|kontraktsmall/i.test(lower)) {
    return 'Avtalsmall & Kontraktsvillkor';
  }
  if (/cv|referens|kompetens|nyckelperson|resurs|personalförteckning/i.test(lower)) {
    return 'CV & Referensmall';
  }
  if (/espd|sanningsförsäkran|uteslutning|kvalificering|krav_på_leverantör/i.test(lower)) {
    return 'Kvalificering & ESPD';
  }
  if (/fråga|svar|fragor|f&s|q&a|komplettering|förtydligande/i.test(lower)) {
    return 'Frågor & Svar / Förtydliganden';
  }
  return 'Övrigt förfrågningsunderlag';
}

/**
 * Clean text extracted from files (remove control chars, excessive whitespace, null bytes)
 */
function cleanExtractedText(raw = '') {
  if (!raw) return '';
  return raw
    .replace(/\0/g, '') // remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove ASCII control characters
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n') // collapse multiple blank lines
    .replace(/[ \t]{3,}/g, '  ') // collapse multiple horizontal spaces
    .trim();
}

/**
 * Extract plain text from an individual file buffer
 */
export async function extractTextFromFile(buffer, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      return cleanExtractedText(data.text || '');
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      return cleanExtractedText(result.value || '');
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
      return cleanExtractedText(sheetTexts.join('\n\n'));
    }

    if (['.txt', '.rtf', '.md', '.json', '.xml', '.html', '.htm'].includes(ext)) {
      const raw = buffer.toString('utf-8');
      if (ext === '.html' || ext === '.htm') {
        const cleanedHtml = raw.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        return cleanExtractedText(cleanedHtml);
      }
      return cleanExtractedText(raw);
    }

    return '';
  } catch (err) {
    console.warn(`[DocumentParser] Error parsing ${fileName}:`, err.message);
    return `[Dokument: ${fileName} - Kunde inte läsa innehållet: ${err.message}]`;
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

  // Sort documents with Kravspecifikation & Prisbilaga FIRST so essential requirements are never starved
  const categoryPriority = {
    'Kravspecifikation & Uppdragsbeskrivning': 1,
    'Prisbilaga & Ersättningsmodell': 2,
    'Administrativa Föreskrifter (AF)': 3,
    'Avtalsmall & Kontraktsvillkor': 4,
    'CV & Referensmall': 5,
    'Kvalificering & ESPD': 6,
    'Frågor & Svar / Förtydliganden': 7,
    'Övrigt förfrågningsunderlag': 8
  };

  parsedDocuments.sort((a, b) => {
    const pA = categoryPriority[a.category] || 99;
    const pB = categoryPriority[b.category] || 99;
    if (pA !== pB) return pA - pB;
    return a.name.localeCompare(b.name, 'sv');
  });

  // Calculate dynamic per-document character budgets so ALL documents are included
  const totalDocs = parsedDocuments.length;
  const MAX_TOTAL_CHARS = 220000; // ~55,000 tokens (well within MiniMax-M3 128k context)

  // Max characters allocated per document based on its category
  const getDocCharLimit = (category, totalCount) => {
    if (totalCount <= 3) {
      if (category.startsWith('Krav') || category.startsWith('Pris')) return 70000;
      if (category.startsWith('Admin')) return 60000;
      return 40000;
    }
    if (totalCount <= 8) {
      if (category.startsWith('Krav') || category.startsWith('Pris')) return 40000;
      if (category.startsWith('Admin')) return 30000;
      return 20000;
    }
    // For 9+ documents (e.g. 18 documents), ensure every document gets a generous quota
    if (category.startsWith('Krav') || category.startsWith('Pris')) return 25000;
    if (category.startsWith('Admin') || category.startsWith('Avtal')) return 18000;
    if (category.startsWith('CV') || category.startsWith('Kvalificering')) return 12000;
    return 8000;
  };

  let combinedCorpus = '';
  let currentChars = 0;

  for (const doc of parsedDocuments) {
    const docLimit = getDocCharLimit(doc.category, totalDocs);
    const docHeader = `\n\n======================================================================\nDOKUMENT: ${doc.name} [Kategori: ${doc.category}]\n======================================================================\n`;
    
    let docContent = doc.text;
    if (docContent.length > docLimit) {
      // Keep beginning (70%) and end (30%) of long documents as key terms are often at start and end
      const part1 = docContent.slice(0, Math.floor(docLimit * 0.7));
      const part2 = docContent.slice(docContent.length - Math.floor(docLimit * 0.3));
      docContent = `${part1}\n\n[... Utdrag förkortat: ${doc.name} innehåller ytterligare ${doc.charCount - docLimit} tecken ...]\n\n${part2}`;
    }

    const availableSpace = MAX_TOTAL_CHARS - currentChars;
    if (availableSpace < 300) {
      break;
    }

    if (docContent.length > availableSpace) {
      docContent = docContent.slice(0, availableSpace) + '\n[...Text i dokumentet avgränsades för att hålla kontexten optimal...]';
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
