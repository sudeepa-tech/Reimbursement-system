const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', authenticate, (req, res) => {
  res.json({ categories: db.get('categories').value() });
});

// --- Approval Chain Configuration (admin / finance_manager) ---
router.get('/approval-chains', authenticate, authorize('admin', 'finance_manager'), (req, res) => {
  res.json({ chains: db.get('approvalChains').value() });
});

router.post('/approval-chains', authenticate, authorize('admin', 'finance_manager'), (req, res) => {
  const { name, minAmount, maxAmount, category, steps } = req.body;
  if (!name || minAmount === undefined || !maxAmount || !Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'name, minAmount, maxAmount and at least one step are required.' });
  }
  const validRoles = ['manager', 'finance_manager', 'admin'];
  for (const s of steps) {
    if (!validRoles.includes(s.approverRole)) {
      return res.status(400).json({ error: `Invalid approverRole "${s.approverRole}". Must be one of ${validRoles.join(', ')}.` });
    }
  }
  const chain = {
    id: uuid(),
    name,
    minAmount: Number(minAmount),
    maxAmount: Number(maxAmount),
    category: category || 'ANY',
    active: true,
    isDefault: false,
    steps: steps.map((s, i) => ({ level: i + 1, approverRole: s.approverRole, label: s.label || s.approverRole }))
  };
  db.get('approvalChains').push(chain).write();
  res.status(201).json({ chain });
});

router.put('/approval-chains/:id', authenticate, authorize('admin', 'finance_manager'), (req, res) => {
  const chain = db.get('approvalChains').find({ id: req.params.id }).value();
  if (!chain) return res.status(404).json({ error: 'Approval chain not found.' });

  const { name, minAmount, maxAmount, category, steps, active } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (minAmount !== undefined) updates.minAmount = Number(minAmount);
  if (maxAmount !== undefined) updates.maxAmount = Number(maxAmount);
  if (category !== undefined) updates.category = category;
  if (active !== undefined) updates.active = active;
  if (steps !== undefined) updates.steps = steps.map((s, i) => ({ level: i + 1, approverRole: s.approverRole, label: s.label || s.approverRole }));

  db.get('approvalChains').find({ id: req.params.id }).assign(updates).write();
  res.json({ chain: db.get('approvalChains').find({ id: req.params.id }).value() });
});

router.delete('/approval-chains/:id', authenticate, authorize('admin'), (req, res) => {
  const chain = db.get('approvalChains').find({ id: req.params.id }).value();
  if (!chain) return res.status(404).json({ error: 'Approval chain not found.' });
  if (chain.isDefault) return res.status(400).json({ error: 'Cannot delete a default system chain. Deactivate it instead.' });
  db.get('approvalChains').remove({ id: req.params.id }).write();
  res.json({ success: true });
});

module.exports = router;
