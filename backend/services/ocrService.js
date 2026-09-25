// /**
//  * OCR SERVICE
//  * -----------------------------------------------------------------------
//  * Extracts raw text from an uploaded receipt/invoice/document regardless
//  * of file format:
//  *   - Images (jpg/png/webp/bmp)  -> Tesseract.js OCR engine
//  *   - PDF                        -> pdf-parse (falls back to Tesseract
//  *                                    OCR of rasterized pages for scanned/
//  *                                    image-only PDFs is noted as a v2
//  *                                    enhancement; text-layer PDFs work now)
//  *   - Word (.docx)               -> mammoth
//  *   - Excel (.xlsx/.xls/.csv)    -> xlsx (sheetjs), converted to text
//  * -----------------------------------------------------------------------
//  */
// const fs = require('fs');
// const path = require('path');
// const pdfParse = require('pdf-parse');
// const mammoth = require('mammoth');
// const XLSX = require('xlsx');
// const tesseractCli = require('node-tesseract-ocr');

// const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff'];

// /**
//  * Image OCR uses the system `tesseract` CLI (via node-tesseract-ocr) rather
//  * than the tesseract.js WASM build. Reasons:
//  *  1. No first-run network download of language training data (tesseract.js
//  *     fetches ~15MB traineddata files from a CDN on first use, which fails
//  *     in locked-down/offline enterprise networks).
//  *  2. The native binary is faster and more accurate for receipt-style
//  *     documents (mixed fonts, thermal-printer receipts, screenshots).
//  * Requires `tesseract-ocr` to be installed on the host/container
//  * (see backend/Dockerfile / README "System Requirements").
//  */
// async function extractFromImage(filePath, onProgress) {
//   if (onProgress) onProgress(10);
//   try {
//     const text = await tesseractCli.recognize(filePath, {
//       lang: 'eng',
//       oem: 1,
//       psm: 3
//     });
//     if (onProgress) onProgress(100);
//     // node-tesseract-ocr doesn't expose a numeric confidence score directly,
//     // so we derive a proxy confidence from text yield / structure.
//     const nonEmptyLines = text.split('\n').filter(l => l.trim().length > 0).length;
//     const confidence = Math.min(0.98, 0.6 + Math.min(nonEmptyLines, 20) * 0.018);
//     return {
//       text,
//       confidence: Math.round(confidence * 100) / 100,
//       engine: 'Tesseract OCR 5.x (native, LSTM neural network)'
//     };
//   } catch (err) {
//     throw new Error(`OCR engine failed to process the image: ${err.message}`);
//   }
// }

// async function extractFromPDF(filePath) {
//   const buffer = fs.readFileSync(filePath);
//   const data = await pdfParse(buffer);
//   const hasText = data.text && data.text.trim().length > 20;
//   return {
//     text: data.text || '',
//     confidence: hasText ? 0.95 : 0.4,
//     engine: hasText ? 'PDF text-layer extraction' : 'PDF (image-based, low text confidence)',
//     pages: data.numpages
//   };
// }

// async function extractFromDocx(filePath) {
//   const result = await mammoth.extractRawText({ path: filePath });
//   return { text: result.value, confidence: 0.98, engine: 'DOCX structured text extraction' };
// }

// async function extractFromSpreadsheet(filePath) {
//   const workbook = XLSX.readFile(filePath);
//   let text = '';
//   workbook.SheetNames.forEach((sheetName) => {
//     const sheet = workbook.Sheets[sheetName];
//     const csv = XLSX.utils.sheet_to_csv(sheet);
//     text += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
//   });
//   return { text, confidence: 0.97, engine: 'Spreadsheet (XLSX/CSV) structured extraction' };
// }

// async function extractText(filePath, mimeType, onProgress) {
//   const ext = path.extname(filePath).toLowerCase();

//   if (IMAGE_EXT.includes(ext) || (mimeType && mimeType.startsWith('image/'))) {
//     return extractFromImage(filePath, onProgress);
//   }
//   if (ext === '.pdf' || mimeType === 'application/pdf') {
//     return extractFromPDF(filePath);
//   }
//   if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//     return extractFromDocx(filePath);
//   }
//   if (['.xlsx', '.xls', '.csv'].includes(ext)) {
//     return extractFromSpreadsheet(filePath);
//   }
//   // Fallback: try reading as plain text
//   try {
//     const text = fs.readFileSync(filePath, 'utf-8');
//     return { text, confidence: 0.5, engine: 'Plain-text fallback reader' };
//   } catch (e) {
//     throw new Error(`Unsupported file type: ${ext}. Supported: images, PDF, DOCX, XLSX, CSV.`);
//   }
// }

// module.exports = { extractText };

























































































/**
 * OCR SERVICE
 * -----------------------------------------------------------------------
 * Extracts raw text from uploaded receipts/invoices/documents:
 *
 *   - Images (jpg/png/webp/bmp/gif/tiff)
 *       -> Tesseract OCR
 *
 *   - PDF
 *       -> pdf-parse
 *
 *   - Word (.docx)
 *       -> mammoth
 *
 *   - Excel (.xlsx/.xls/.csv)
 *       -> xlsx
 *
 * Tesseract configuration:
 *
 *   Windows:
 *       Automatically detects:
 *       C:\Program Files\Tesseract-OCR\tesseract.exe
 *       C:\Program Files (x86)\Tesseract-OCR\tesseract.exe
 *
 *       You can also set:
 *       TESSERACT_PATH
 *
 *   Linux / Render:
 *       Uses:
 *       tesseract
 *
 * IMPORTANT:
 *   node-tesseract-ocr is only a Node.js wrapper.
 *   The actual Tesseract executable must exist on the machine/container.
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const tesseractCli = require('node-tesseract-ocr');


// -----------------------------------------------------------------------
// SUPPORTED IMAGE EXTENSIONS
// -----------------------------------------------------------------------

const IMAGE_EXT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.bmp',
  '.gif',
  '.tiff'
];


// -----------------------------------------------------------------------
// TESSERACT CONFIGURATION
// -----------------------------------------------------------------------

/**
 * Find the Tesseract executable.
 *
 * Windows:
 *   1. TESSERACT_PATH environment variable
 *   2. C:\Program Files\Tesseract-OCR\tesseract.exe
 *   3. C:\Program Files (x86)\Tesseract-OCR\tesseract.exe
 *
 * Linux / Render:
 *   Uses "tesseract" from PATH.
 */
function getTesseractBinary() {
  // ---------------------------------------------------------------
  // WINDOWS
  // ---------------------------------------------------------------

  if (process.platform === 'win32') {
    const windowsCandidates = [
      process.env.TESSERACT_PATH,

      'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',

      'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe'
    ].filter(Boolean);

    for (const candidate of windowsCandidates) {
      if (fs.existsSync(candidate)) {
        console.log(`✅ Tesseract OCR found: ${candidate}`);

        /*
         * node-tesseract-ocr builds a shell command internally.
         *
         * Because "Program Files" contains a space, the executable
         * path must be wrapped in quotes.
         */
        return `"${candidate}"`;
      }
    }

    throw new Error(
      [
        'Tesseract OCR executable was not found on Windows.',
        '',
        'Expected location:',
        'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
        '',
        'Please install Tesseract OCR or set the TESSERACT_PATH',
        'environment variable.'
      ].join('\n')
    );
  }

  // ---------------------------------------------------------------
  // LINUX / RENDER / OTHER UNIX SYSTEMS
  // ---------------------------------------------------------------

  console.log('✅ Using Tesseract OCR command: tesseract');

  return 'tesseract';
}


// Resolve Tesseract once when the backend starts.
let TESSERACT_BINARY;

try {
  TESSERACT_BINARY = getTesseractBinary();
} catch (error) {
  console.error('❌ Tesseract OCR configuration error:');
  console.error(error.message);

  /*
   * Don't crash the entire backend here.
   *
   * PDF, DOCX, XLSX and CSV extraction can still work.
   * Image OCR will return a clear error when requested.
   */
  TESSERACT_BINARY = null;
}


// -----------------------------------------------------------------------
// IMAGE OCR
// -----------------------------------------------------------------------

// async function extractFromImage(filePath, onProgress) {
//   if (onProgress) {
//     onProgress(10);
//   }

//   // Check whether Tesseract was found.
//   if (!TESSERACT_BINARY) {
//     throw new Error(
//       [
//         'Tesseract OCR is not available on this server.',
//         '',
//         'For Windows, install Tesseract OCR at:',
//         'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
//         '',
//         'For Render/Linux, make sure the Docker image installs:',
//         'tesseract-ocr',
//         'tesseract-ocr-eng'
//       ].join('\n')
//     );
//   }

//   // Check that uploaded image actually exists.
//   if (!fs.existsSync(filePath)) {
//     throw new Error(`Uploaded image was not found: ${filePath}`);
//   }

//   try {
//     console.log(`🔍 OCR processing image: ${filePath}`);
//     console.log(`🔧 Tesseract binary: ${TESSERACT_BINARY}`);

//     const text = await tesseractCli.recognize(filePath, {
//       binary: TESSERACT_BINARY,
//       lang: 'eng',
//       oem: 1,
//       psm: 3
//     });

//     if (onProgress) {
//       onProgress(100);
//     }

//     // -------------------------------------------------------------
//     // Calculate a simple proxy confidence.
//     // node-tesseract-ocr doesn't directly expose confidence here.
//     // -------------------------------------------------------------

//     const nonEmptyLines = text
//       .split('\n')
//       .filter(line => line.trim().length > 0)
//       .length;

//     // const confidence = Math.min(
//     //   0.98,
//     //   0.6 + Math.min(nonEmptyLines, 20) * 0.018
//     // );

//     const confidence = Math.min(
//   0.98,
//   0.6 + Math.min(nonEmptyLines, 20) * 0.018
// );

// console.log('📊 OCR confidence:', confidence);
// console.log('📝 OCR text preview:', text.substring(0, 300));

//     console.log(
//       `✅ OCR completed successfully. Extracted ${text.length} characters.`
//     );

//     return {
//       text,
//       confidence: Math.round(confidence * 100) / 100,
//       engine: 'Tesseract OCR 5.x (native, LSTM neural network)'
//     };

//   } catch (err) {
//     console.error('❌ Tesseract OCR failed:');
//     console.error(err);

//     throw new Error(
//       `OCR engine failed to process the image: ${err.message}`
//     );
//   }
// }








async function extractFromImage(filePath, onProgress) {
  if (onProgress) onProgress(10);

  if (!TESSERACT_BINARY) {
    throw new Error('Tesseract OCR is not available on this server.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Uploaded image was not found: ${filePath}`);
  }

  console.log('========================================');
  console.log('🖼️ IMAGE OCR START');
  console.log(`📁 File: ${filePath}`);
  console.log(`🔧 Binary: ${TESSERACT_BINARY}`);
  console.log(`📦 File exists: ${fs.existsSync(filePath)}`);
  console.log(`📏 File size: ${fs.statSync(filePath).size}`);
  console.log('========================================');

  try {
    console.log('🚀 Starting Tesseract recognize()...');

    const text = await tesseractCli.recognize(filePath, {
      binary: TESSERACT_BINARY,
      lang: 'eng',
      oem: 1,
      psm: 3
    });

    console.log('✅ Tesseract recognize() returned successfully.');
    console.log(`📝 Extracted characters: ${text ? text.length : 0}`);

    if (onProgress) onProgress(100);

    if (!text || text.trim().length === 0) {
      throw new Error('Tesseract completed but extracted no text.');
    }

    const nonEmptyLines = text
      .split('\n')
      .filter(line => line.trim().length > 0).length;

    const confidence = Math.min(
      0.98,
      0.6 + Math.min(nonEmptyLines, 20) * 0.018
    );

    console.log('✅ IMAGE OCR COMPLETE');

    return {
      text,
      confidence: Math.round(confidence * 100) / 100,
      engine: 'Tesseract OCR 5.x (native, LSTM neural network)'
    };

  } catch (err) {
    console.error('========================================');
    console.error('❌ TESSERACT OCR FAILED');
    console.error('Message:', err?.message);
    console.error('Name:', err?.name);
    console.error('Code:', err?.code);
    console.error('Stack:', err?.stack);
    console.error('========================================');

    throw new Error(
      `OCR engine failed to process the image: ${err?.message || err}`
    );
  }
}

// -----------------------------------------------------------------------
// PDF EXTRACTION
// -----------------------------------------------------------------------

async function extractFromPDF(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);

    const data = await pdfParse(buffer);

    const hasText =
      data.text &&
      data.text.trim().length > 20;

    return {
      text: data.text || '',

      confidence: hasText
        ? 0.95
        : 0.4,

      engine: hasText
        ? 'PDF text-layer extraction'
        : 'PDF (image-based, low text confidence)',

      pages: data.numpages
    };

  } catch (err) {
    throw new Error(
      `PDF extraction failed: ${err.message}`
    );
  }
}


// -----------------------------------------------------------------------
// DOCX EXTRACTION
// -----------------------------------------------------------------------

async function extractFromDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({
      path: filePath
    });

    return {
      text: result.value,

      confidence: 0.98,

      engine: 'DOCX structured text extraction'
    };

  } catch (err) {
    throw new Error(
      `DOCX extraction failed: ${err.message}`
    );
  }
}


// -----------------------------------------------------------------------
// SPREADSHEET EXTRACTION
// -----------------------------------------------------------------------

async function extractFromSpreadsheet(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);

    let text = '';

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      const csv = XLSX.utils.sheet_to_csv(sheet);

      text +=
        `\n--- Sheet: ${sheetName} ---\n` +
        `${csv}\n`;
    });

    return {
      text,

      confidence: 0.97,

      engine:
        'Spreadsheet (XLSX/CSV) structured extraction'
    };

  } catch (err) {
    throw new Error(
      `Spreadsheet extraction failed: ${err.message}`
    );
  }
}


// -----------------------------------------------------------------------
// MAIN EXTRACTION FUNCTION
// -----------------------------------------------------------------------

async function extractText(filePath, mimeType, onProgress) {
  const ext = path
    .extname(filePath)
    .toLowerCase();

  console.log('----------------------------------------');
  console.log('📄 Extraction request');
  console.log(`File: ${filePath}`);
  console.log(`Extension: ${ext}`);
  console.log(`MIME type: ${mimeType || 'unknown'}`);
  console.log('----------------------------------------');


  // ---------------------------------------------------------------
  // IMAGE
  // ---------------------------------------------------------------

  if (
    IMAGE_EXT.includes(ext) ||
    (mimeType && mimeType.startsWith('image/'))
  ) {
    return extractFromImage(
      filePath,
      onProgress
    );
  }


  // ---------------------------------------------------------------
  // PDF
  // ---------------------------------------------------------------

  if (
    ext === '.pdf' ||
    mimeType === 'application/pdf'
  ) {
    return extractFromPDF(filePath);
  }


  // ---------------------------------------------------------------
  // DOCX
  // ---------------------------------------------------------------

  if (
    ext === '.docx' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractFromDocx(filePath);
  }


  // ---------------------------------------------------------------
  // XLSX / XLS / CSV
  // ---------------------------------------------------------------

  if (
    ['.xlsx', '.xls', '.csv'].includes(ext)
  ) {
    return extractFromSpreadsheet(filePath);
  }


  // ---------------------------------------------------------------
  // FALLBACK: PLAIN TEXT
  // ---------------------------------------------------------------

  try {
    const text = fs.readFileSync(
      filePath,
      'utf-8'
    );

    return {
      text,

      confidence: 0.5,

      engine:
        'Plain-text fallback reader'
    };

  } catch (e) {
    throw new Error(
      [
        `Unsupported file type: ${ext}.`,
        'Supported: images, PDF, DOCX, XLSX, CSV.'
      ].join(' ')
    );
  }
}


// -----------------------------------------------------------------------
// EXPORT
// -----------------------------------------------------------------------

module.exports = {
  extractText
};