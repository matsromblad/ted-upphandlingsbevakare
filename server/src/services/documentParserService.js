import { createRequire } from 'module';
import * as xlsx from 'xlsx';
import path from 'path';
import zlib from 'zlib';

const require = createRequire(import.meta.url);
const AdmZip = require('adm-zip');
const pdfParseModule = require('pdf-parse');
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
  if (/(?:^|[_-\s])af[_-\s.]|administrativ|föreskrift|foreskrift|anbudsinbjudan|förutsättning|afb|afc|afd|afe|aff|afg|inbjudan/i.test(lower)) {
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
 * Fallback to extract text from raw PDF streams & FlateDecode blocks
 */
function fallbackExtractPdfStreams(buffer) {
  const textChunks = [];
  const rawStr = buffer.toString('binary');
  
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(rawStr)) !== null) {
    const streamData = Buffer.from(match[1], 'binary');
    let decompressed = null;
    try {
      decompressed = zlib.inflateSync(streamData);
    } catch (e) {
      try {
        decompressed = zlib.inflateRawSync(streamData);
      } catch (e2) {
        decompressed = streamData;
      }
    }

    if (decompressed) {
      const decStr = decompressed.toString('latin1');
      const tjMatches = decStr.match(/\((?:[^()\\]|\\.)*\)\s*Tj/g) || [];
      for (const m of tjMatches) {
        const unescaped = m.replace(/^[\s(]+|[)\s*Tj]+$/g, '').replace(/\\([()\\])/g, '$1');
        if (unescaped.trim().length > 1) textChunks.push(unescaped);
      }
      const arrayTjMatches = decStr.match(/\[([\s\S]*?)\]\s*TJ/g) || [];
      for (const m of arrayTjMatches) {
        const innerMatches = m.match(/\((?:[^()\\]|\\.)*\)/g) || [];
        const combined = innerMatches.map(s => s.slice(1, -1).replace(/\\([()\\])/g, '$1')).join('');
        if (combined.trim().length > 1) textChunks.push(combined);
      }
    }
  }
  return textChunks.join(' ');
}

/**
 * Robust extraction of text from PDF buffers supporting modern PDFParse v2, legacy v1, and fallback stream parsing
 */
async function extractTextFromPdf(buffer, fileName = '') {
  // Strategy 1: Modern PDFParse v2 class
  try {
    const PDFClass = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;
    if (PDFClass) {
      const parser = new PDFClass({ data: buffer });
      const result = await parser.getText();
      if (typeof parser.destroy === 'function') {
        try { await parser.destroy(); } catch (_) {}
      }
      const text = cleanExtractedText(result?.text || '');
      if (text && text.trim().length > 15) {
        return text;
      }
    }
  } catch (err1) {
    console.warn(`[DocumentParser] PDFParse v2 attempt failed for ${fileName}:`, err1.message);
  }

  // Strategy 2: Legacy pdf-parse function invocation
  try {
    if (typeof pdfParseModule === 'function') {
      const data = await pdfParseModule(buffer);
      const text = cleanExtractedText(data?.text || '');
      if (text && text.trim().length > 15) {
        return text;
      }
    }
  } catch (err2) {
    console.warn(`[DocumentParser] Legacy pdfParse attempt failed for ${fileName}:`, err2.message);
  }

  // Strategy 3: Direct PDF stream text decompression & extraction
  try {
    const streamText = fallbackExtractPdfStreams(buffer);
    if (streamText && streamText.trim().length > 15) {
      return cleanExtractedText(streamText);
    }
  } catch (err3) {
    console.warn(`[DocumentParser] Stream fallback failed for ${fileName}:`, err3.message);
  }

  // Strategy 4: Raw text sweep for PDF literals
  try {
    const rawText = buffer.toString('utf-8');
    const strings = rawText.match(/\((?:[^()\\]|\\.)*\)/g) || [];
    const collected = strings
      .map(s => s.slice(1, -1).replace(/\\([()\\])/g, '$1'))
      .filter(s => s.length > 2 && /[a-zA-ZåäöÅÄÖ0-9]/.test(s))
      .join(' ');
    if (collected.length > 25) {
      return cleanExtractedText(collected);
    }
  } catch (_) {}

  return `[Dokument: ${fileName} - Innehåller inga läsbara textlager eller är en inskannad bild-PDF]`;
}

/**
 * Extract text from older Word .doc (binary OLE format)
 */
function extractTextFromLegacyDoc(buffer) {
  const chunks = [];
  const rawUtf16 = buffer.toString('utf16le');
  const utf16Matches = rawUtf16.match(/[\x20-\x7E\xA0-\xFF\u0100-\u017F]{4,}/g) || [];
  for (const m of utf16Matches) {
    if (m.length > 5 && /[a-zA-ZåäöÅÄÖ]/.test(m)) {
      chunks.push(m);
    }
  }
  if (chunks.length > 0) {
    return cleanExtractedText(chunks.join(' '));
  }
  return '';
}

/**
 * Clean RTF text
 */
function cleanRtf(rawRtf = '') {
  return rawRtf
    .replace(/\{\*?\\[^{}]+;?\}|[{}]|\\\n?[A-Za-z0-9]+ ?|\\'([0-9a-fA-F]{2})/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract plain text from an individual file buffer
 */
export async function extractTextFromFile(buffer, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  
  try {
    // 1. PDF Files
    if (ext === '.pdf') {
      return await extractTextFromPdf(buffer, fileName);
    }

    // 2. Modern Word (.docx)
    if (ext === '.docx') {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return cleanExtractedText(result.value || '');
      } catch (docxErr) {
        return extractTextFromLegacyDoc(buffer);
      }
    }

    // 3. Legacy Word (.doc)
    if (ext === '.doc') {
      const docText = extractTextFromLegacyDoc(buffer);
      if (docText) return docText;
      try {
        const result = await mammoth.extractRawText({ buffer });
        return cleanExtractedText(result.value || '');
      } catch (_) {
        return '';
      }
    }

    // 4. Excel & Spreadsheets
    if (['.xlsx', '.xls', '.xlsm', '.csv', '.ods'].includes(ext)) {
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

    // 5. RTF Files
    if (ext === '.rtf') {
      const raw = buffer.toString('utf-8');
      return cleanExtractedText(cleanRtf(raw));
    }

    // 6. Text, Markdown, JSON, XML, HTML
    if (['.txt', '.md', '.json', '.xml', '.html', '.htm'].includes(ext)) {
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
      try {
        const zip = new AdmZip(file.buffer);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
          if (entry.isDirectory) continue;
          
          const entryName = entry.entryName;
          const baseName = path.basename(entryName);
          
          if (baseName.startsWith('.') || baseName.startsWith('~$') || entryName.includes('__MACOSX')) {
            continue;
          }

          const entryExt = path.extname(baseName).toLowerCase();
          const supportedExts = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.xlsm', '.csv', '.ods', '.txt', '.md', '.rtf', '.xml'];
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

  const totalDocs = parsedDocuments.length;
  const MAX_TOTAL_CHARS = 220000;

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
