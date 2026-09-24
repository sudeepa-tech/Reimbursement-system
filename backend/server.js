require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const ocrRoutes = require('./routes/ocr');
const configRoutes = require('./routes/config');
const employeeRoutes = require('./routes/employees');
const dashboardRoutes = require('./routes/dashboard');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Resilience: never let a single failed async task (e.g. a bad OCR file)
// take down the whole API process. Log and continue. ---
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection (process kept alive):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (process kept alive):', err);
});

// --- Security & performance middleware ---
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use('/api', apiLimiter);

// Serve uploaded receipt files (for preview in the frontend)
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// --- Auto-seed on first run if DB is empty ---
if (db.get('users').size().value() === 0) {
  console.log('No data found — running initial seed...');
  require('./data/seed')();
}

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/config', configRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ReimbursePro API', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ReimbursePro API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
