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
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${uuid()}${path.extname(file.originalname)}`)
});

const ALLOWED_TYPES = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.pdf', '.docx', '.xlsx', '.xls', '.csv'];

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      return cb(new Error(`Unsupported file type "${ext}". Allowed: ${ALLOWED_TYPES.join(', ')}`));
    }
    cb(null, true);
  }
});

/**
 * POST /api/ocr/extract
 * Accepts a single file (receipt / invoice / screenshot / PDF / Word / Excel),
 * runs OCR + the AI field-extraction pipeline, and returns:
 *  - raw extracted text
 *  - a full step-by-step reasoning trail
 *  - structured fields ready to prefill the reimbursement form
 */
router.post('/extract', authenticate, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const filePath = req.file.path;
    const startTime = Date.now();

    try {
      const ocrResult = await extractText(filePath, req.file.mimetype);

      if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        return res.status(422).json({
          error: 'No readable text could be extracted from this document. Please try a clearer scan or enter details manually.',
          ocrEngine: ocrResult.engine
        });
      }

      const extraction = runExtractionPipeline({ text: ocrResult.text, ocrMeta: ocrResult });
      const processingTimeMs = Date.now() - startTime;

      res.json({
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
      console.error('OCR extraction failed:', e);
      res.status(500).json({ error: `Extraction failed: ${e.message}` });
    }
  });
});

module.exports = router;
