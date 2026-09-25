// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const { v4: uuid } = require('uuid');
// const { authenticate } = require('../middleware/auth');
// const { extractText } = require('../services/ocrService');
// const { runExtractionPipeline } = require('../services/extractionEngine');

// const router = express.Router();

// const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//   filename: (req, file, cb) => cb(null, `${Date.now()}-${uuid()}${path.extname(file.originalname)}`)
// });

// const ALLOWED_TYPES = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.pdf', '.docx', '.xlsx', '.xls', '.csv'];

// const upload = multer({
//   storage,
//   limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
//   fileFilter: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     if (!ALLOWED_TYPES.includes(ext)) {
//       return cb(new Error(`Unsupported file type "${ext}". Allowed: ${ALLOWED_TYPES.join(', ')}`));
//     }
//     cb(null, true);
//   }
// });

// /**
//  * POST /api/ocr/extract
//  * Accepts a single file (receipt / invoice / screenshot / PDF / Word / Excel),
//  * runs OCR + the AI field-extraction pipeline, and returns:
//  *  - raw extracted text
//  *  - a full step-by-step reasoning trail
//  *  - structured fields ready to prefill the reimbursement form
//  */
// router.post('/extract', authenticate, (req, res) => {
//   upload.single('file')(req, res, async (err) => {
//     if (err) return res.status(400).json({ error: err.message });
//     if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

//     const filePath = req.file.path;
//     const startTime = Date.now();

//     try {
//       const ocrResult = await extractText(filePath, req.file.mimetype);

//       if (!ocrResult.text || ocrResult.text.trim().length === 0) {
//         return res.status(422).json({
//           error: 'No readable text could be extracted from this document. Please try a clearer scan or enter details manually.',
//           ocrEngine: ocrResult.engine
//         });
//       }

//       const extraction = runExtractionPipeline({ text: ocrResult.text, ocrMeta: ocrResult });
//       const processingTimeMs = Date.now() - startTime;

//       res.json({
//         success: true,
//         file: {
//           originalName: req.file.originalname,
//           storedName: req.file.filename,
//           size: req.file.size,
//           mimeType: req.file.mimetype,
//           url: `/uploads/${req.file.filename}`
//         },
//         ocrEngine: ocrResult.engine,
//         processingTimeMs,
//         ...extraction
//       });
//     } catch (e) {
//       console.error('OCR extraction failed:', e);
//       res.status(500).json({ error: `Extraction failed: ${e.message}` });
//     }
//   });
// });

// module.exports = router;















































const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const { authenticate } = require('../middleware/auth');
const { extractText } = require('../services/ocrService');
const { runExtractionPipeline } = require('../services/extractionEngine');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    cb(
      null,
      `${Date.now()}-${uuid()}${path.extname(file.originalname)}`
    );
  }
});

const ALLOWED_TYPES = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.bmp',
  '.pdf',
  '.docx',
  '.xlsx',
  '.xls',
  '.csv'
];

const upload = multer({
  storage,

  limits: {
    fileSize: 15 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_TYPES.includes(ext)) {
      return cb(
        new Error(
          `Unsupported file type "${ext}". Allowed: ${ALLOWED_TYPES.join(', ')}`
        )
      );
    }

    cb(null, true);
  }
});

/**
 * POST /api/ocr/extract
 */
router.post('/extract', authenticate, (req, res) => {

  upload.single('file')(req, res, async (err) => {

    // -----------------------------------------------
    // Multer error
    // -----------------------------------------------

    if (err) {
      console.error('❌ Upload error:', err);

      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    // -----------------------------------------------
    // No file
    // -----------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded.'
      });
    }

    const filePath = req.file.path;
    const startTime = Date.now();

    console.log('');
    console.log('========================================');
    console.log('📄 Extraction request');
    console.log('File:', filePath);
    console.log('Extension:', path.extname(req.file.originalname));
    console.log('MIME type:', req.file.mimetype);
    console.log('Size:', req.file.size);
    console.log('========================================');

    try {

      // ---------------------------------------------
      // STEP 1: OCR
      // ---------------------------------------------

      const ocrResult = await extractText(
        filePath,
        req.file.mimetype
      );

      console.log(
        `✅ OCR completed successfully. Extracted ${ocrResult.text?.length || 0} characters.`
      );

      // ---------------------------------------------
      // Check OCR result
      // ---------------------------------------------

      if (!ocrResult.text || !ocrResult.text.trim()) {

        console.warn('⚠️ OCR returned empty text.');

        return res.status(422).json({
          success: false,
          error:
            'No readable text could be extracted from this document. Please try a clearer scan or enter details manually.',
          ocrEngine: ocrResult.engine
        });
      }

      // ---------------------------------------------
      // STEP 2: Structured extraction
      // ---------------------------------------------

      let extraction;

      try {

        console.log('🔄 Running structured extraction pipeline...');

        extraction = runExtractionPipeline({
          text: ocrResult.text,
          ocrMeta: ocrResult
        });

        console.log('✅ Structured extraction completed.');

      } catch (pipelineError) {

        // IMPORTANT:
        // OCR worked, so don't throw away the OCR result
        console.error(
          '⚠️ Structured extraction pipeline failed:',
          pipelineError
        );

        extraction = {
          steps: [],
          overallConfidence: ocrResult.confidence || 0,
          extractedFields: {
            merchant: null,
            amount: null,
            currency: 'INR',
            expenseDate: null,
            invoiceNumber: null,
            taxAmount: null,
            suggestedCategory: null,
            paymentMethod: null
          },
          rawText: ocrResult.text,

          extractionWarning:
            'OCR completed successfully, but structured field extraction failed. Please review the extracted text manually.'
        };
      }

      // ---------------------------------------------
      // STEP 3: Final response
      // ---------------------------------------------

      const processingTimeMs = Date.now() - startTime;

      console.log(
        `✅ Extraction request completed in ${processingTimeMs} ms`
      );

      return res.status(200).json({

        success: true,

        file: {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          size: req.file.size,
          mimeType: req.file.mimetype,
          url: `/uploads/${req.file.filename}`
        },

        ocrEngine: ocrResult.engine,

        processingTimeMs,

        ...extraction
      });

    } catch (e) {

      console.error('');
      console.error('========================================');
      console.error('❌ OCR EXTRACTION FAILED');
      console.error('Message:', e.message);
      console.error('Stack:', e.stack);
      console.error('========================================');

      return res.status(500).json({
        success: false,
        error: `Extraction failed: ${e.message}`
      });

    }
  });
});

module.exports = router;