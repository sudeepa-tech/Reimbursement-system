const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function scopeExpenses(expenses, user) {
  if (user.role === 'employee') return expenses.filter(e => e.employeeId === user.id);
  if (user.role === 'manager') return expenses.filter(e => e.managerId === user.id || e.employeeId === user.id);
  if (user.role === 'finance_manager') return expenses; // finance sees org-wide financials
  return expenses; // admin
}

router.get('/summary', authenticate, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  const all = scopeExpenses(db.get('expenses').value(), user);

  const totalClaims = all.length;
  const totalAmount = all.reduce((s, e) => s + e.totalAmount, 0);
  const pending = all.filter(e => e.status.startsWith('pending_l'));
  const approved = all.filter(e => e.status === 'approved');
  const rejected = all.filter(e => e.status === 'rejected');
  const reimbursed = all.filter(e => e.status === 'reimbursed');

  const pendingAmount = pending.reduce((s, e) => s + e.totalAmount, 0);
  const reimbursedAmount = reimbursed.reduce((s, e) => s + e.totalAmount, 0);

  // By category
  const byCategory = {};
  all.forEach(e => {
    byCategory[e.category] = byCategory[e.category] || { category: e.category, count: 0, amount: 0 };
    byCategory[e.category].count += 1;
    byCategory[e.category].amount += e.totalAmount;
  });

  // By department
  const byDepartment = {};
  all.forEach(e => {
    byDepartment[e.department] = byDepartment[e.department] || { department: e.department, count: 0, amount: 0 };
    byDepartment[e.department].count += 1;
    byDepartment[e.department].amount += e.totalAmount;
  });

  // By status
  const statuses = ['pending_l1', 'pending_l2', 'pending_l3', 'approved', 'rejected', 'reimbursed'];
  const byStatus = statuses.map(s => ({ status: s, count: all.filter(e => e.status === s).length }));

  // Monthly trend (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const monthExpenses = all.filter(e => e.expenseDate.startsWith(monthKey));
    monthlyTrend.push({
      month: monthLabel,
      count: monthExpenses.length,
      amount: monthExpenses.reduce((s, e) => s + e.totalAmount, 0)
    });
  }

  // Top spenders (top 5 employees by amount)
  const byEmployee = {};
  all.forEach(e => {
    byEmployee[e.employeeId] = byEmployee[e.employeeId] || { employeeName: e.employeeName, count: 0, amount: 0 };
    byEmployee[e.employeeId].count += 1;
    byEmployee[e.employeeId].amount += e.totalAmount;
  });
  const topSpenders = Object.values(byEmployee).sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Average approval time (submitted -> fully approved) in hours
  const approvedWithHistory = all.filter(e => ['approved', 'reimbursed'].includes(e.status) && e.approvalHistory.length > 0);
  let avgApprovalHours = 0;
  if (approvedWithHistory.length) {
    const totalHours = approvedWithHistory.reduce((sum, e) => {
      const last = e.approvalHistory[e.approvalHistory.length - 1];
      const hours = (new Date(last.timestamp) - new Date(e.submittedAt)) / 3600000;
      return sum + hours;
    }, 0);
    avgApprovalHours = Math.round((totalHours / approvedWithHistory.length) * 10) / 10;
  }

  // Average OCR confidence across claims that used AI extraction
  const withOcr = all.filter(e => e.ocrExtraction && e.ocrExtraction.confidence);
  const avgOcrConfidence = withOcr.length
    ? Math.round((withOcr.reduce((s, e) => s + e.ocrExtraction.confidence, 0) / withOcr.length) * 100)
    : null;

  res.json({
    totals: {
      totalClaims,
      totalAmount,
      pendingCount: pending.length,
      pendingAmount,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      reimbursedCount: reimbursed.length,
      reimbursedAmount,
      avgApprovalHours,
      avgOcrConfidence
    },
    byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
    byDepartment: Object.values(byDepartment).sort((a, b) => b.amount - a.amount),
    byStatus,
    monthlyTrend,
    topSpenders
  });
});

router.get('/recent-activity', authenticate, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  let all = scopeExpenses(db.get('expenses').value(), user);
  all = [...all].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 10);
  res.json({ activity: all });
});

module.exports = router;
