/**
 * Seed script - populates the database with realistic sample data:
 *  - 1 Admin, 5 Finance Managers, 10 Managers, 34 Employees (50 users total)
 *  - 9 expense categories with default approval routing
 *  - Configurable multi-level approval chains
 *  - 50 sample reimbursement claims across various states
 *
 * Run with: npm run seed
 */
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../db/database');

const PASSWORD_HASH = bcrypt.hashSync('Password123!', 8);

const departments = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Operations', 'Customer Success', 'Legal', 'IT', 'Product'];

const firstNames = ['Aarav','Vihaan','Aditya','Ishaan','Kabir','Arjun','Rohan','Sai','Dhruv','Karan','Priya','Ananya','Diya','Saanvi','Myra','Neha','Kavya','Riya','Tara','Meera','James','Olivia','Liam','Emma','Noah','Ava','Ethan','Sophia','Mason','Isabella'];
const lastNames = ['Sharma','Verma','Patel','Gupta','Iyer','Nair','Reddy','Singh','Mehta','Kapoor','Chopra','Malhotra','Rao','Pillai','Joshi','Khan','D\'Souza','Fernandes','Bose','Chatterjee'];

let empCounter = 1000;
function makeUser(role, department, managerId, financeManagerId) {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  const id = uuid();
  empCounter++;
  const employeeCode = `EMP${empCounter}`;
  return {
    id,
    employeeCode,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${empCounter}@reimbursepro.com`,
    passwordHash: PASSWORD_HASH,
    role, // employee | manager | finance_manager | admin
    department,
    managerId: managerId || null,
    financeManagerId: financeManagerId || null,
    avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 65%, 55%)`,
    status: 'active',
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 86400000).toISOString()
  };
}

function seed() {
  console.log('Seeding ReimbursePro database...');

  db.get('users').remove(() => true).write();
  db.get('expenses').remove(() => true).write();
  db.get('approvalChains').remove(() => true).write();
  db.get('categories').remove(() => true).write();
  db.get('notifications').remove(() => true).write();
  db.get('auditLog').remove(() => true).write();

  // --- Admin ---
  const admin = {
    id: uuid(),
    employeeCode: 'EMP0001',
    name: 'System Administrator',
    email: 'admin@reimbursepro.com',
    passwordHash: PASSWORD_HASH,
    role: 'admin',
    department: 'IT',
    managerId: null,
    financeManagerId: null,
    avatarColor: 'hsl(220, 70%, 50%)',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  // --- Finance Managers (5) ---
  const financeManagers = departments.slice(0, 5).map(() => makeUser('finance_manager', 'Finance'));
  financeManagers[0].name = 'Kavita Sinha';
  financeManagers[0].email = 'kavita.sinha@reimbursepro.com';

  // --- Managers (10), one per department (some depts share) ---
  const managers = departments.map((dept) =>
    makeUser('manager', dept, null, financeManagers[Math.floor(Math.random() * financeManagers.length)].id)
  );

  // --- Employees (34) distributed across departments/managers ---
  const employees = [];
  for (let i = 0; i < 34; i++) {
    const mgr = managers[i % managers.length];
    employees.push(makeUser('employee', mgr.department, mgr.id, mgr.financeManagerId));
  }

  const allUsers = [admin, ...financeManagers, ...managers, ...employees];
  db.get('users').push(...allUsers).write();

  // --- Categories with default routing rules ---
  const categories = [
    { id: 'travel', name: 'Travel & Airfare', icon: 'Plane', autoApproveLimit: 0, requiresReceipt: true },
    { id: 'accommodation', name: 'Accommodation / Hotel', icon: 'BedDouble', autoApproveLimit: 0, requiresReceipt: true },
    { id: 'meals', name: 'Meals & Entertainment', icon: 'UtensilsCrossed', autoApproveLimit: 1500, requiresReceipt: true },
    { id: 'transport', name: 'Local Transport / Cabs', icon: 'Car', autoApproveLimit: 800, requiresReceipt: true },
    { id: 'office_supplies', name: 'Office Supplies', icon: 'Paperclip', autoApproveLimit: 1000, requiresReceipt: true },
    { id: 'software', name: 'Software & Subscriptions', icon: 'Monitor', autoApproveLimit: 0, requiresReceipt: true },
    { id: 'client_entertainment', name: 'Client Entertainment', icon: 'Users', autoApproveLimit: 0, requiresReceipt: true },
    { id: 'training', name: 'Training & Conferences', icon: 'GraduationCap', autoApproveLimit: 0, requiresReceipt: true },
    { id: 'misc', name: 'Miscellaneous', icon: 'Package', autoApproveLimit: 500, requiresReceipt: false }
  ];
  db.get('categories').push(...categories).write();

  // --- Configurable multi-level approval chains ---
  // A chain defines an ORDERED list of approver roles/steps that must approve,
  // driven by category + amount thresholds. Admin/Finance Manager can edit these
  // at runtime via /api/config/approval-chains.
  const approvalChains = [
    {
      id: uuid(), name: 'Standard Claim (< ₹25,000)', isDefault: true,
      minAmount: 0, maxAmount: 25000, category: 'ANY', active: true,
      steps: [
        { level: 1, approverRole: 'manager', label: 'Reporting Manager' }
      ]
    },
    {
      id: uuid(), name: 'Mid-Value Claim (₹25,000 - ₹100,000)', isDefault: false,
      minAmount: 25000, maxAmount: 100000, category: 'ANY', active: true,
      steps: [
        { level: 1, approverRole: 'manager', label: 'Reporting Manager' },
        { level: 2, approverRole: 'finance_manager', label: 'Finance Manager' }
      ]
    },
    {
      id: uuid(), name: 'High-Value Claim (> ₹100,000)', isDefault: false,
      minAmount: 100000, maxAmount: Number.MAX_SAFE_INTEGER, category: 'ANY', active: true,
      steps: [
        { level: 1, approverRole: 'manager', label: 'Reporting Manager' },
        { level: 2, approverRole: 'finance_manager', label: 'Finance Manager' },
        { level: 3, approverRole: 'admin', label: 'Finance Director (Final Sign-off)' }
      ]
    },
    {
      id: uuid(), name: 'Client Entertainment (special routing)', isDefault: false,
      minAmount: 0, maxAmount: Number.MAX_SAFE_INTEGER, category: 'client_entertainment', active: true,
      steps: [
        { level: 1, approverRole: 'manager', label: 'Reporting Manager' },
        { level: 2, approverRole: 'finance_manager', label: 'Finance Manager' }
      ]
    }
  ];
  db.get('approvalChains').push(...approvalChains).write();

  // --- 50 Sample Expense Claims ---
  const merchants = {
    travel: ['IndiGo Airlines', 'Air India', 'Vistara', 'MakeMyTrip', 'IRCTC', 'SpiceJet'],
    accommodation: ['Taj Hotels', 'Marriott', 'OYO Rooms', 'ITC Hotels', 'Radisson Blu', 'Lemon Tree Hotels'],
    meals: ['Starbucks', 'Swiggy', 'Zomato', 'The Coffee Bean', 'Domino\'s Pizza', 'Barbeque Nation'],
    transport: ['Uber', 'Ola Cabs', 'Rapido', 'Meru Cabs'],
    office_supplies: ['Amazon Business', 'Office Depot', 'Staples India', 'Reliance Digital'],
    software: ['Adobe Inc.', 'Microsoft 365', 'Zoom Video', 'Slack Technologies', 'Figma Inc.', 'AWS'],
    client_entertainment: ['The Leela Palace', 'Olive Bar & Kitchen', 'Toit Brewpub', 'Sly Granny'],
    training: ['Udemy', 'Coursera', 'O\'Reilly Media', 'TechConf 2026', 'PMI Institute'],
    misc: ['Local Vendor', 'Courier Services', 'Print Shop']
  };

  const statusPool = ['pending_l1', 'pending_l2', 'pending_l3', 'approved', 'rejected', 'reimbursed'];
  const expenses = [];

  for (let i = 0; i < 50; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const catKeys = Object.keys(merchants);
    const categoryId = catKeys[Math.floor(Math.random() * catKeys.length)];
    const merchantList = merchants[categoryId];
    const merchant = merchantList[Math.floor(Math.random() * merchantList.length)];

    let amount;
    switch (categoryId) {
      case 'travel': amount = Math.floor(3000 + Math.random() * 22000); break;
      case 'accommodation': amount = Math.floor(2500 + Math.random() * 18000); break;
      case 'training': amount = Math.floor(5000 + Math.random() * 95000); break;
      case 'client_entertainment': amount = Math.floor(2000 + Math.random() * 15000); break;
      default: amount = Math.floor(150 + Math.random() * 4000);
    }

    const daysAgo = Math.floor(Math.random() * 180);
    const submittedDate = new Date(Date.now() - daysAgo * 86400000);
    const expenseDate = new Date(submittedDate.getTime() - Math.floor(Math.random() * 5) * 86400000);

    // Weighted status distribution: more resolved than pending, realistic mix
    const weights = [0.1, 0.08, 0.03, 0.24, 0.1, 0.45]; // pending_l1,l2,l3,approved,rejected,reimbursed
    let r = Math.random(), status = 'reimbursed', acc = 0;
    for (let s = 0; s < statusPool.length; s++) {
      acc += weights[s];
      if (r <= acc) { status = statusPool[s]; break; }
    }

    const manager = managers.find(m => m.id === employee.managerId);
    const financeManager = financeManagers.find(f => f.id === manager.financeManagerId) || financeManagers[0];

    const approvalHistory = [];
    if (['pending_l2', 'pending_l3', 'approved', 'rejected', 'reimbursed'].includes(status)) {
      approvalHistory.push({
        level: 1, approverId: manager.id, approverName: manager.name, role: 'manager',
        action: (status === 'rejected' && Math.random() < 0.3) ? 'rejected' : 'approved',
        comment: 'Verified against travel policy. Receipt matches claimed amount.',
        timestamp: new Date(submittedDate.getTime() + 86400000 * (1 + Math.random() * 2)).toISOString()
      });
    }
    if (['pending_l3', 'approved', 'rejected', 'reimbursed'].includes(status) && approvalHistory[0]?.action === 'approved') {
      approvalHistory.push({
        level: 2, approverId: financeManager.id, approverName: financeManager.name, role: 'finance_manager',
        action: status === 'rejected' ? 'rejected' : 'approved',
        comment: 'Budget code validated. Within department allocation.',
        timestamp: new Date(submittedDate.getTime() + 86400000 * (2 + Math.random() * 2)).toISOString()
      });
    }

    const invoiceNum = `INV-${2026}${String(Math.floor(Math.random() * 900000) + 100000)}`;
    const taxAmount = Math.round(amount * 0.18 * 100) / 100;

    expenses.push({
      id: uuid(),
      claimNumber: `RB-2026-${String(10000 + i).slice(-5)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeeCode: employee.employeeCode,
      department: employee.department,
      category: categoryId,
      merchant,
      description: `${merchant} - ${categoryId.replace('_', ' ')} expense during business activity`,
      amount,
      currency: 'INR',
      taxAmount,
      totalAmount: amount,
      expenseDate: expenseDate.toISOString().split('T')[0],
      submittedAt: submittedDate.toISOString(),
      invoiceNumber: invoiceNum,
      status,
      receiptFile: {
        fileName: `receipt_${invoiceNum}.jpg`,
        fileType: ['image/jpeg', 'image/png', 'application/pdf'][Math.floor(Math.random() * 3)],
        fileSize: Math.floor(80000 + Math.random() * 900000)
      },
      ocrExtraction: {
        confidence: Math.round((0.82 + Math.random() * 0.17) * 100) / 100,
        extractedFields: {
          merchant, amount, date: expenseDate.toISOString().split('T')[0],
          invoiceNumber: invoiceNum, tax: taxAmount, currency: 'INR'
        },
        processedAt: submittedDate.toISOString()
      },
      approverChain: amount < 25000 ? ['manager'] : (amount < 100000 ? ['manager', 'finance_manager'] : ['manager', 'finance_manager', 'admin']),
      currentLevel: status.startsWith('pending_l') ? parseInt(status.slice(-1)) : (status === 'approved' || status === 'reimbursed' ? 99 : 0),
      approvalHistory,
      managerId: manager.id,
      financeManagerId: financeManager.id,
      reimbursedAt: status === 'reimbursed' ? new Date(submittedDate.getTime() + 86400000 * (5 + Math.random() * 5)).toISOString() : null,
      paymentReference: status === 'reimbursed' ? `PAY${Math.floor(Math.random() * 900000) + 100000}` : null
    });
  }

  db.get('expenses').push(...expenses).write();

  console.log(`✔ Seeded ${allUsers.length} users (1 admin, ${financeManagers.length} finance managers, ${managers.length} managers, ${employees.length} employees)`);
  console.log(`✔ Seeded ${categories.length} categories`);
  console.log(`✔ Seeded ${approvalChains.length} approval chains`);
  console.log(`✔ Seeded ${expenses.length} expense claims`);
  console.log('\n--- DEMO LOGIN CREDENTIALS (password for all: Password123!) ---');
  console.log(`Admin:            ${admin.email}`);
  console.log(`Finance Manager:  ${financeManagers[0].email}`);
  console.log(`Manager:          ${managers[0].email}`);
  console.log(`Employee:         ${employees[0].email}`);
  console.log('------------------------------------------------------------\n');
}

seed();
module.exports = seed;
