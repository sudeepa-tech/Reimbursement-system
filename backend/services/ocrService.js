/**
 * OCR SERVICE
 * -----------------------------------------------------------------------
 * Extracts raw text from an uploaded receipt/invoice/document regardless
 * of file format:
 *   - Images (jpg/png/webp/bmp)  -> Tesseract.js OCR engine
 *   - PDF                        -> pdf-parse (falls back to Tesseract
 *                                    OCR of rasterized pages for scanned/
 *                                    image-only PDFs is noted as a v2
 *                                    enhancement; text-layer PDFs work now)
 *   - Word (.docx)               -> mammoth
 *   - Excel (.xlsx/.xls/.csv)    -> xlsx (sheetjs), converted to text
 * -----------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const tesseractCli = require('node-tesseract-ocr');

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff'];

/**
 * Image OCR uses the system `tesseract` CLI (via node-tesseract-ocr) rather
 * than the tesseract.js WASM build. Reasons:
 *  1. No first-run network download of language training data (tesseract.js
 *     fetches ~15MB traineddata files from a CDN on first use, which fails
 *     in locked-down/offline enterprise networks).
 *  2. The native binary is faster and more accurate for receipt-style
 *     documents (mixed fonts, thermal-printer receipts, screenshots).
 * Requires `tesseract-ocr` to be installed on the host/container
 * (see backend/Dockerfile / README "System Requirements").
 */
async function extractFromImage(filePath, onProgress) {
  if (onProgress) onProgress(10);
  try {
    const text = await tesseractCli.recognize(filePath, {
      lang: 'eng',
      oem: 1,
      psm: 3
    });
    if (onProgress) onProgress(100);
    // node-tesseract-ocr doesn't expose a numeric confidence score directly,
    // so we derive a proxy confidence from text yield / structure.
    const nonEmptyLines = text.split('\n').filter(l => l.trim().length > 0).length;
    const confidence = Math.min(0.98, 0.6 + Math.min(nonEmptyLines, 20) * 0.018);
    return {
      text,
      confidence: Math.round(confidence * 100) / 100,
      engine: 'Tesseract OCR 5.x (native, LSTM neural network)'
    };
  } catch (err) {
    throw new Error(`OCR engine failed to process the image: ${err.message}`);
  }
}

async function extractFromPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const hasText = data.text && data.text.trim().length > 20;
  return {
    text: data.text || '',
    confidence: hasText ? 0.95 : 0.4,
    engine: hasText ? 'PDF text-layer extraction' : 'PDF (image-based, low text confidence)',
    pages: data.numpages
  };
}

async function extractFromDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return { text: result.value, confidence: 0.98, engine: 'DOCX structured text extraction' };
}

async function extractFromSpreadsheet(filePath) {
  const workbook = XLSX.readFile(filePath);
  let text = '';
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    text += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
  });
  return { text, confidence: 0.97, engine: 'Spreadsheet (XLSX/CSV) structured extraction' };
}

async function extractText(filePath, mimeType, onProgress) {
  const ext = path.extname(filePath).toLowerCase();

  if (IMAGE_EXT.includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
    return extractFromImage(filePath, onProgress);
  }
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return extractFromPDF(filePath);
  }
  if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractFromDocx(filePath);
  }
  if (['.xlsx', '.xls', '.csv'].includes(ext)) {
    return extractFromSpreadsheet(filePath);
  }
  // Fallback: try reading as plain text
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    return { text, confidence: 0.5, engine: 'Plain-text fallback reader' };
  } catch (e) {
    throw new Error(`Unsupported file type: ${ext}. Supported: images, PDF, DOCX, XLSX, CSV.`);
  }
}

module.exports = { extractText };
