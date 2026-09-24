# 🪙 Swarna Pawn: Gold Loan & Pawn Shop Management System

A digitized pawn ledger, vault collateral tracking, and automated messaging recovery system for Gold Loan NBFCs and Jeweller Pawnshops.

---

## 🌟 Key Architecture & Feature Highlights

1. **Role-Based Access Control (RBAC):**
   - **Admin (Shop Owner):** Full access to audit trails, staff creation, loan approvals, interest policy management, and vault auctions.
   - **Staff (Appraiser / Cashier):** Customer KYC origination, collateral weighing/appraisal, interest payment collection, and receipt printing.

2. **Customer & KYC Ledger:**
   - Digitize Aadhaar, PAN, Passport, or Voter ID records.
   - Immediate phone lookup prevents duplicate customer records across ledgers.

3. **Collateral & Vault Inventory Tracking:**
   - Supports **Gold (24K, 22K, 18K, 14K)** and **Silver (999, 925)**.
   - Automatic calculation: `Net Weight = Gross Weight - Stone Weight`.
   - Real-time statutory 75% Loan-to-Value (LTV) ceiling calculation based on live gold market rates per gram.
   - Individual anti-tamper Vault Packet IDs (e.g., `VBX-101`).

4. **Financial Calculation & Repayment Waterfall:**
   - Daily pro-rata and monthly interest calculation (`(Principal * Monthly Rate %) / 30`).
   - **Strict Statutory Waterfall Allocation:**
     1. Late Penalties settled first.
     2. Outstanding Accrued Interest settled second.
     3. Remainder directly reduces Outstanding Principal.
   - Full loan settlement validation before vault collateral release.

5. **Omnichannel Messaging Automation (WhatsApp Cloud API + Twilio SMS):**
   - **Pre-due & Due Reminders:** Sent automatically 3 days prior and on the monthly interest due date.
   - **Overdue Delinquency Notices:** Sent automatically when loans cross grace period.
   - **Instant Payment Receipts:** Dispatched to customer's WhatsApp upon receiving payment.

6. **Automated Scheduled Cron Job:**
   - Runs daily at 09:00 AM (`0 9 * * *`).
   - Scans active loans, computes dues, prevents duplicate spamming within 48 hours, and dispatches WhatsApp/SMS alerts.

---

## 🏗️ Project Architecture

```
gold-app/
├── docker-compose.yml              # PostgreSQL container with auto-migrations
├── backend/
│   ├── package.json
│   ├── .env.example                # PostgreSQL, Meta WhatsApp & Twilio API keys
│   ├── cron/
│   │   └── monthlyReminders.js     # Standalone CLI cron execution script
│   └── src/
│       ├── server.js               # Express server with node-cron schedule
│       ├── config/
│       │   └── db.js               # PostgreSQL connection pool (pg)
│       ├── db/
│       │   ├── schema.sql          # Full PostgreSQL DDL (tables, triggers, indexes)
│       │   └── seed.sql            # Sample data (admin, staff, customers, loans)
│       ├── middleware/
│       │   ├── auth.js             # JWT bearer verification
│       │   └── rbac.js             # ADMIN vs STAFF role enforcement
│       ├── services/
│       │   ├── interestEngine.js   # LTV calculation, accruals & repayment waterfall
│       │   ├── messagingService.js # Meta WhatsApp Cloud API & Twilio SMS provider
│       │   └── cronReminderService.js # Automated reminder sweep routine
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── customerController.js
│       │   ├── loanController.js
│       │   ├── paymentController.js
│       │   └── dashboardController.js
│       └── routes/
│           ├── authRoutes.js
│           ├── customerRoutes.js
│           ├── loanRoutes.js
│           ├── paymentRoutes.js
│           ├── dashboardRoutes.js
│           └── webhookRoutes.js    # WhatsApp status & webhook receiver
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx            # Shop Dashboard with KPIs & Delinquency alerts
        │   ├── loans/
        │   │   ├── page.tsx        # Master Loan Ledger with filters & actions
        │   │   └── new/page.tsx    # Loan Origination & Collateral Appraisal Form
        ├── components/
        │   ├── Navbar.tsx
        │   ├── DashboardMetrics.tsx
        │   ├── LoanCreationForm.tsx
        │   └── PaymentModal.tsx
        └── types/
            └── index.ts
```

---

## ⚡ Quick Start & Setup

### 1. Database Setup (Docker or Local Postgres)
Start PostgreSQL using Docker Compose:
```bash
docker-compose up -d
```
*Note: Docker automatically loads `schema.sql` and `seed.sql` on startup.*

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials and WhatsApp API tokens
npm install
npm run migrate   # Runs schema.sql
npm run seed      # Seeds sample data
npm run dev       # Starts server on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev       # Starts Next.js app on http://localhost:3000
```

---

## ⏰ Cron Job for Automated Reminders

The automated WhatsApp reminder job can run in two modes:

### Mode A: Embedded Daemon (Default)
The Express backend starts an internal `node-cron` scheduler that runs automatically every day at 09:00 AM:
```javascript
cron.schedule('0 9 * * *', async () => {
  await runDailyReminderRoutine();
});
```

### Mode B: Standalone OS Cron / Task Scheduler
Run directly from terminal or schedule in Linux crontab:
```bash
# Test manually:
npm run cron:reminders

# Linux Crontab (Runs daily at 09:00 AM):
0 9 * * * cd /path/to/backend && /usr/bin/node cron/monthlyReminders.js >> /var/log/gold-pawn-cron.log 2>&1
```

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Auth / Role |
|---|---|---|---|
| `POST` | `/api/auth/login` | Staff / Admin login | Public |
| `POST` | `/api/auth/staff` | Create new staff user | Admin only |
| `GET` | `/api/customers?q=` | Search customer by phone/name | Staff / Admin |
| `POST` | `/api/customers` | Register customer with KYC | Staff / Admin |
| `GET` | `/api/loans` | List loans with search & status filters | Staff / Admin |
| `POST` | `/api/loans` | Disburse new loan with collateral appraisal | Staff / Admin |
| `GET` | `/api/loans/:id` | Get loan, pledged items & live interest dues | Staff / Admin |
| `POST` | `/api/loans/:id/close`| Settle & release collateral items from vault | Staff / Admin |
| `POST` | `/api/payments` | Record payment & send WhatsApp receipt | Staff / Admin |
| `GET` | `/api/dashboard/metrics`| Active loans, vault gold weight, cash collection | Staff / Admin |
| `GET/POST`| `/api/webhooks/whatsapp`| WhatsApp Cloud API verification & delivery status | Public |
