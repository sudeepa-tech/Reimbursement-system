const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.get('users').find({ email: String(email).toLowerCase() }).value();
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account has been deactivated.' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

  db.get('auditLog').push({
    id: require('uuid').v4(),
    action: 'LOGIN',
    userId: user.id,
    timestamp: new Date().toISOString()
  }).write();

  const { passwordHash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Quick-access list of demo accounts for the login screen (no secrets beyond the shared demo password)
router.get('/demo-accounts', (req, res) => {
  const users = db.get('users').value();
  const pick = (role, n = 1) => users.filter(u => u.role === role).slice(0, n).map(u => ({ name: u.name, email: u.email, role: u.role, department: u.department }));
  res.json({
    accounts: [...pick('admin'), ...pick('finance_manager', 1), ...pick('manager', 1), ...pick('employee', 1)],
    password: 'Password123!'
  });
});

module.exports = router;
