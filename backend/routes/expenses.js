const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function findApprovalChain(amount, category) {
  const chains = db.get('approvalChains').filter({ active: true }).value();
  // Prefer an exact category-specific chain, else fall back to amount-range ANY chain
  const specific = chains.find(c => c.category === category && amount >= c.minAmount && amount < c.maxAmount);
  if (specific) return specific;
  return chains.find(c => c.category === 'ANY' && amount >= c.minAmount && amount < c.maxAmount);
}

function nextClaimNumber() {
  const count = db.get('expenses').size().value();
  const year = new Date().getFullYear();
  return `RB-${year}-${String(10000 + count + 1)}`;
}

function serializeExpense(exp) {
  return exp;
}

// --- CREATE: submit a new reimbursement claim ---
router.post('/', authenticate, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  const {
    category, merchant, description, amount, currency = 'INR', taxAmount, expenseDate,
    invoiceNumber, receiptFile, ocrExtraction
  } = req.body;

  if (!category || !merchant || !amount || !expenseDate) {
    return res.status(400).json({ error: 'category, merchant, amount, and expenseDate are required.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero.' });
  }

  const chain = findApprovalChain(Number(amount), category);
  if (!chain) {
    return res.status(500).json({ error: 'No approval chain configured for this amount/category. Contact admin.' });
  }

  const manager = user.managerId ? db.get('users').find({ id: user.managerId }).value() : null;
  const financeManager = user.financeManagerId ? db.get('users').find({ id: user.financeManagerId }).value() : null;

  const expense = {
    id: uuid(),
    claimNumber: nextClaimNumber(),
    employeeId: user.id,
    employeeName: user.name,
    employeeCode: user.employeeCode,
    department: user.department,
    category,
    merchant,
    description: description || `${merchant} - ${category} expense`,
    amount: Number(amount),
    currency,
    taxAmount: taxAmount ? Number(taxAmount) : null,
    totalAmount: Number(amount),
    expenseDate,
    submittedAt: new Date().toISOString(),
    invoiceNumber: invoiceNumber || null,
    status: `pending_l1`,
    receiptFile: receiptFile || null,
    ocrExtraction: ocrExtraction || null,
    approverChain: chain.steps.map(s => s.approverRole),
    approvalChainName: chain.name,
    currentLevel: 1,
    approvalHistory: [],
    managerId: manager ? manager.id : null,
    financeManagerId: financeManager ? financeManager.id : null,
    reimbursedAt: null,
    paymentReference: null
  };

  db.get('expenses').push(expense).write();

  db.get('auditLog').push({
    id: uuid(), action: 'EXPENSE_SUBMITTED', userId: user.id, expenseId: expense.id, timestamp: new Date().toISOString()
  }).write();

  res.status(201).json({ expense });
});

// --- LIST: role-scoped list with filters ---
router.get('/', authenticate, (req, res) => {
  const { status, category, department, from, to, employeeId, page = 1, limit = 20, search } = req.query;
  let expenses = db.get('expenses').value();

  // Role-based visibility scoping
  if (req.user.role === 'employee') {
    expenses = expenses.filter(e => e.employeeId === req.user.id);
  } else if (req.user.role === 'manager') {
    // Managers see their team's claims (claims where they are the assigned manager) + their own
    expenses = expenses.filter(e => e.managerId === req.user.id || e.employeeId === req.user.id);
  } else if (req.user.role === 'finance_manager') {
    expenses = expenses.filter(e => e.financeManagerId === req.user.id || e.employeeId === req.user.id || ['pending_l2', 'pending_l3', 'approved', 'reimbursed'].includes(e.status));
  }
  // admin sees everything

  if (status) expenses = expenses.filter(e => e.status === status);
  if (category) expenses = expenses.filter(e => e.category === category);
  if (department) expenses = expenses.filter(e => e.department === department);
  if (employeeId) expenses = expenses.filter(e => e.employeeId === employeeId);
  if (from) expenses = expenses.filter(e => e.expenseDate >= from);
  if (to) expenses = expenses.filter(e => e.expenseDate <= to);
  if (search) {
    const s = search.toLowerCase();
    expenses = expenses.filter(e =>
      e.merchant.toLowerCase().includes(s) ||
      e.claimNumber.toLowerCase().includes(s) ||
      e.employeeName.toLowerCase().includes(s) ||
      (e.description || '').toLowerCase().includes(s)
    );
  }

  expenses = [...expenses].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const total = expenses.length;
  const p = Math.max(1, parseInt(page));
  const l = Math.max(1, Math.min(100, parseInt(limit)));
  const paged = expenses.slice((p - 1) * l, p * l);

  res.json({ expenses: paged, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
});

// --- Queue: items awaiting the current user's approval ---
router.get('/queue/pending', authenticate, authorize('manager', 'finance_manager', 'admin'), (req, res) => {
  let expenses = db.get('expenses').value();
  const roleLevel = { manager: 1, finance_manager: 2, admin: 3 };
  const myLevel = roleLevel[req.user.role];

  expenses = expenses.filter(e => {
    if (!e.status.startsWith('pending_l')) return false;
    const expLevel = parseInt(e.status.slice(-1));
    if (expLevel !== myLevel) return false;
    if (req.user.role === 'manager') return e.managerId === req.user.id;
    if (req.user.role === 'finance_manager') return e.financeManagerId === req.user.id;
    return true; // admin final sign-off queue
  });

  expenses = [...expenses].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  res.json({ expenses, count: expenses.length });
});

// --- GET single ---
router.get('/:id', authenticate, (req, res) => {
  const expense = db.get('expenses').find({ id: req.params.id }).value();
  if (!expense) return res.status(404).json({ error: 'Expense not found.' });

  const canView = req.user.role === 'admin' ||
    expense.employeeId === req.user.id ||
    expense.managerId === req.user.id ||
    expense.financeManagerId === req.user.id;
  if (!canView) return res.status(403).json({ error: 'You do not have permission to view this claim.' });

  res.json({ expense });
});

// --- APPROVE / REJECT ---
router.post('/:id/decision', authenticate, authorize('manager', 'finance_manager', 'admin'), (req, res) => {
  const { action, comment } = req.body; // action: 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approved" or "rejected".' });
  }

  const expense = db.get('expenses').find({ id: req.params.id }).value();
  if (!expense) return res.status(404).json({ error: 'Expense not found.' });
  if (!expense.status.startsWith('pending_l')) {
    return res.status(400).json({ error: `This claim is already in "${expense.status}" state and cannot be re-decisioned.` });
  }

  const currentLevel = parseInt(expense.status.slice(-1));
  const roleLevel = { manager: 1, finance_manager: 2, admin: 3 };
  const myLevel = roleLevel[req.user.role];

  if (myLevel !== currentLevel) {
    return res.status(403).json({ error: `This claim is awaiting level ${currentLevel} approval; you are a level ${myLevel} approver.` });
  }
  const expectedApproverId = currentLevel === 1 ? expense.managerId : currentLevel === 2 ? expense.financeManagerId : null;
  if (expectedApproverId && expectedApproverId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You are not the assigned approver for this claim.' });
  }

  const historyEntry = {
    level: currentLevel,
    approverId: req.user.id,
    approverName: req.user.name,
    role: req.user.role,
    action,
    comment: comment || '',
    timestamp: new Date().toISOString()
  };

  let newStatus;
  if (action === 'rejected') {
    newStatus = 'rejected';
  } else {
    const totalSteps = expense.approverChain.length;
    if (currentLevel >= totalSteps) {
      newStatus = 'approved';
    } else {
      newStatus = `pending_l${currentLevel + 1}`;
    }
  }

  db.get('expenses').find({ id: req.params.id }).assign({
    status: newStatus,
    currentLevel: newStatus === 'approved' ? 99 : (newStatus === 'rejected' ? 0 : currentLevel + 1),
    approvalHistory: [...expense.approvalHistory, historyEntry]
  }).write();

  db.get('auditLog').push({
    id: uuid(), action: `EXPENSE_${action.toUpperCase()}`, userId: req.user.id, expenseId: expense.id, timestamp: new Date().toISOString()
  }).write();

  const updated = db.get('expenses').find({ id: req.params.id }).value();
  res.json({ expense: updated });
});

// --- MARK AS REIMBURSED (finance / admin, final payment step) ---
router.post('/:id/reimburse', authenticate, authorize('finance_manager', 'admin'), (req, res) => {
  const expense = db.get('expenses').find({ id: req.params.id }).value();
  if (!expense) return res.status(404).json({ error: 'Expense not found.' });
  if (expense.status !== 'approved') {
    return res.status(400).json({ error: 'Only fully approved claims can be marked as reimbursed.' });
  }

  const paymentReference = `PAY${Math.floor(Math.random() * 900000) + 100000}`;
  db.get('expenses').find({ id: req.params.id }).assign({
    status: 'reimbursed',
    reimbursedAt: new Date().toISOString(),
    paymentReference
  }).write();

  db.get('auditLog').push({
    id: uuid(), action: 'EXPENSE_REIMBURSED', userId: req.user.id, expenseId: expense.id, timestamp: new Date().toISOString()
  }).write();

  const updated = db.get('expenses').find({ id: req.params.id }).value();
  res.json({ expense: updated });
});

module.exports = router;
