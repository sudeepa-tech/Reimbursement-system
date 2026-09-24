# ReimbursePro — Enterprise AI-Powered Reimbursement Management System

A complete, production-architected reimbursement management platform: employees upload a
receipt (image, PDF, Word, or Excel), an AI/OCR pipeline extracts every field with a full
explainable reasoning trail, and the claim is routed through a configurable multi-level
approval chain (Manager → Finance Manager → Director) before reimbursement. Built for
organizations of 5,000+ employees.

**Stack:** React 18 + Vite + Tailwind CSS (frontend) · Node.js + Express (backend) ·
Tesseract OCR + pdf-parse + mammoth + xlsx (AI extraction) · JWT auth · lowdb (JSON,
swappable for Postgres/Mongo in production).

---

## ✨ Features

- **Role-based access**: Employee, Manager, Finance Manager, Admin — each with a tailored dashboard and navigation
- **AI-powered data extraction** from images, screenshots, PDFs, receipts, Word (.docx) and Excel (.xlsx/.csv) files, with:
  - Real OCR (Tesseract) for scanned/photographed receipts
  - Real text-layer extraction for PDFs, Word and Excel documents
  - A transparent **10-step explainable reasoning trail** (merchant ID, amount detection, currency, date, invoice #, tax, category classification, payment method) — each step shows exactly what was matched and a confidence score, before the fields are mapped into the claim form
- **Configurable multi-level approval chains** — define rules by amount range and category (e.g. "under ₹25k → Manager only", "₹25k–100k → Manager + Finance", "over ₹100k → Manager + Finance + Director"), fully editable from the UI, no code changes needed
- **Full approval workflow**: submit → level-by-level approve/reject with comments → mark reimbursed with a payment reference, all logged in an audit-ready timeline
- **Enterprise dashboard**: KPIs, spend trend, category/department breakdowns, top claimants, average approval time, AI confidence metrics — role-scoped (employees see their own data, managers see their team, finance/admin see the whole org)
- **50 realistic seed records** across 50 employees, 9 expense categories, and every claim status, so the system is fully explorable out of the box
- Production hardening: JWT auth, bcrypt password hashing, rate limiting, helmet security headers, audit logging, and Docker deployment files

---

## 🚀 Quick Start (local development)

### Prerequisites
- Node.js 18+
- **Tesseract OCR** installed on your system (required for image receipt OCR):
  - macOS: `brew install tesseract`
  - Ubuntu/Debian: `sudo apt-get install tesseract-ocr`
  - Windows: [installer here](https://github.com/UB-Mannheim/tesseract/wiki)

  (PDF, Word and Excel extraction work without Tesseract — it's only needed for image files.)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET for anything beyond local dev
npm run seed               # populates db/db.json with 50 users + 50 sample claims
npm run dev                # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173, proxies /api to :5000
```

Open **http://localhost:5173** — you'll land on the login screen with clickable demo
accounts.

### Demo credentials
All seeded accounts share the password **`Password123!`**. The login screen surfaces
one-click demo logins for:
| Role | Example email |
|---|---|
| Admin | `admin@reimbursepro.com` |
| Finance Manager | (auto-generated, shown on login screen) |
| Manager | (auto-generated, shown on login screen) |
| Employee | (auto-generated, shown on login screen) |

---

## 🐳 Docker (production-style, one command)

```bash
docker compose up --build
```
- Frontend: http://localhost:8080
- Backend API: http://localhost:5000
- Data persists in named Docker volumes (`backend_db`, `backend_uploads`)

Set a real `JWT_SECRET` via an `.env` file at the repo root before deploying beyond a demo.

---

## 🏗️ Architecture

```
reimbursement-system/
├── backend/
│   ├── server.js               # Express app entry point
│   ├── db/database.js          # lowdb JSON store (swap for Postgres/Mongo for real scale)
│   ├── data/seed.js            # generates 50 users + 50 sample claims
│   ├── middleware/auth.js      # JWT auth + role-based authorization
│   ├── services/
│   │   ├── ocrService.js       # routes files to the right extractor (Tesseract/pdf-parse/mammoth/xlsx)
│   │   └── extractionEngine.js # the explainable AI field-extraction pipeline
│   └── routes/
│       ├── auth.js             # login, session
│       ├── expenses.js         # submit / list / approve / reject / reimburse
│       ├── ocr.js              # POST /api/ocr/extract — upload & AI-extract a receipt
│       ├── config.js           # admin: manage approval chains & categories
│       ├── employees.js        # team/user listings
│       └── dashboard.js        # analytics aggregation
│
└── frontend/
    └── src/
        ├── pages/               # Login, Dashboard, SubmitExpense, ExpenseList,
        │                        # ExpenseDetail, ApprovalQueue, ApprovalConfig, Team
        ├── components/          # Layout, StatCard, StatusBadge, CategoryChip,
        │                        # ExtractionStepTimeline (the AI step-by-step viewer)
        ├── context/AuthContext.jsx
        └── api/client.js        # Axios instance with JWT interceptor
```

### How the approval routing works
Each expense category + amount combination is matched against the **approval chains**
configured in `config.js` / the Approval Rules screen. A chain is an ordered list of
approver roles (`manager`, `finance_manager`, `admin`). When a claim is submitted, the
system finds the best-matching active chain and sets `approverChain` on the claim. As each
level approves, the claim's status advances (`pending_l1` → `pending_l2` → … → `approved` →
`reimbursed`); a rejection at any level ends the flow. Finance Managers and Admins can add,
edit, deactivate or delete chains at runtime with no deployment needed.

### How AI extraction works
1. A file is uploaded to `POST /api/ocr/extract`.
2. `ocrService.js` picks the right extractor based on file type:
   - Images → system Tesseract OCR (LSTM neural network engine)
   - PDFs → `pdf-parse` (text-layer extraction)
   - Word → `mammoth`
   - Excel/CSV → `xlsx` (SheetJS)
3. `extractionEngine.js` runs the raw text through a deterministic, explainable pipeline —
   regex + keyword-scoring heuristics for merchant, amount, currency, date, invoice number,
   tax, category (9-way keyword classifier) and payment method — logging **every step** with
   its own confidence score.
4. The frontend animates this step list in real time, then pre-fills an editable review form
   with the extracted fields before the employee submits the claim.

This is intentionally a transparent, rules-based extraction engine rather than an opaque
black box: every dollar amount that lands in a reimbursement field can be traced back to the
exact text the engine matched — which matters for financial audit trails. Swapping in a
hosted LLM (e.g. Claude) for the field-extraction step is a natural v2 upgrade — see
"Scaling to production" below.

---

## 📈 Scaling to production (5,000+ employees)

The codebase is intentionally structured so each of these is a contained swap, not a rewrite:

| Component | Demo | Production recommendation |
|---|---|---|
| Database | lowdb (JSON file) | PostgreSQL via Prisma/Sequelize, or MongoDB — only `backend/db/database.js` and query calls in `routes/*.js` need to change |
| File storage | Local `uploads/` folder | S3 / Azure Blob / GCS |
| OCR | Local Tesseract binary | Same (fine at scale — it's fast and free), or a cloud OCR/Document AI service for higher accuracy on messy scans |
| Field extraction | Rules/regex engine (this repo) | Optionally add an LLM call (e.g. Claude) as a second-pass validator/extractor for low-confidence fields, keeping the rules engine as a fast first pass and audit fallback |
| Auth | JWT + bcrypt (this repo) | Same, plus SSO/SAML/OIDC integration for enterprise IdPs |
| Deployment | `docker-compose up` | Kubernetes / ECS with horizontal scaling behind a load balancer; the backend is stateless aside from the DB/file layer, so it scales horizontally as-is |
| Notifications | (not implemented) | Add email/Slack notifications on status change via the existing `auditLog`/`notifications` collections already scaffolded in the DB layer |

---

## 🔑 API Reference (summary)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate, returns JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/ocr/extract` | Upload a file, run AI extraction, return step-by-step trail + structured fields |
| POST | `/api/expenses` | Submit a new reimbursement claim |
| GET | `/api/expenses` | List claims (role-scoped, filterable, paginated) |
| GET | `/api/expenses/queue/pending` | Claims awaiting the current user's approval |
| GET | `/api/expenses/:id` | Single claim detail |
| POST | `/api/expenses/:id/decision` | Approve or reject a claim at the current level |
| POST | `/api/expenses/:id/reimburse` | Mark a fully-approved claim as paid |
| GET/POST/PUT/DELETE | `/api/config/approval-chains` | Manage multi-level approval rules |
| GET | `/api/dashboard/summary` | Role-scoped analytics for charts |
| GET | `/api/employees` / `/api/employees/team` | User directory |

All endpoints except `/api/auth/login` and `/api/auth/demo-accounts` require
`Authorization: Bearer <token>`.

---

## ⚠️ Notes on this build

- This is a fully functional reference implementation, tested end-to-end (backend API,
  all 4 OCR/document formats, and the complete React UI with real screenshots taken during
  development). It's sized to demonstrate every requested capability clearly, not as a
  drop-in replacement for a hardened enterprise deployment — see "Scaling to production" above
  for what to change before a real 5,000-employee rollout.
- The seeded database (`lowdb`, a JSON file) is intentionally simple so the whole project
  runs with `npm install` and no external services. Swap it for Postgres/Mongo for real
  concurrent-user scale.
- OCR accuracy depends on receipt image quality, exactly like any OCR system (including
  commercial ones) — the step-by-step trail is designed so a human reviewer can always see
  and correct what the AI inferred before the claim is submitted.
