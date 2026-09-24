const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function sanitize(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

router.get('/', authenticate, authorize('admin', 'finance_manager', 'manager'), (req, res) => {
  let users = db.get('users').value();
  if (req.user.role === 'manager') {
    users = users.filter(u => u.managerId === req.user.id || u.id === req.user.id);
  }
  const { role, department, search } = req.query;
  if (role) users = users.filter(u => u.role === role);
  if (department) users = users.filter(u => u.department === department);
  if (search) {
    const s = search.toLowerCase();
    users = users.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.employeeCode.toLowerCase().includes(s));
  }
  res.json({ users: users.map(sanitize) });
});

router.get('/team', authenticate, authorize('manager'), (req, res) => {
  const team = db.get('users').filter({ managerId: req.user.id }).value();
  res.json({ team: team.map(sanitize) });
});

router.get('/departments', authenticate, (req, res) => {
  const users = db.get('users').value();
  const departments = [...new Set(users.map(u => u.department))].sort();
  res.json({ departments });
});

module.exports = router;
