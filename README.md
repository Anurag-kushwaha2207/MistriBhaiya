# MistriBhaiya 🏗️  (mistri + bhaiya: apna mistri, apne paas)

Gaon aur shehar ke ghar-malik ko aas-paas ka **free mistri / labour** dilane wala app.
Mistri ko **roz kaam**, ghar-malik ko **kaam jaldi**, aur thekedar ko **continuous business**.

---

## 🚀 Live Links & Credentials
- **Frontend (Firebase Hosting):** [https://mistribhaiya-f5a94.web.app](https://mistribhaiya-f5a94.web.app)
- **Backend API (Render):** [https://mistribaiya-api.onrender.com](https://mistribaiya-api.onrender.com)
- **Interactive API Docs:** `/docs` (Swagger UI)

### 🔑 Test Accounts (Password: `123456789`)
| Role | Phone | Name | Location |
|---|---|---|---|
| **मिस्त्री (Worker)** | `9837101838` | Anurag Mistri | Kanpur (26.4505, 80.1912) |
| **घर मालिक (Customer)** | `9837101839` | Anurag Customer | Kanpur (26.4505, 80.1912) |
| **ठेकेदार (Contractor)** | `9837101840` | Anurag Thekedar | Kanpur (26.4505, 80.1912) |

Seed test accounts anytime (gated by `DEV_MODE=1`):
```bash
DEV_MODE=1 python scripts/seed_test_users.py
```

---

## 🛠️ Tech Stack & Architecture
- **Backend:** Python 3.12, FastAPI, SQLite (with WAL mode & foreign keys), WebSockets.
- **Frontend:** React 19, Vite, PWA support, Razorpay Checkout SDK.
- **Security:** PBKDF2-HMAC-SHA256 password hashing (100k iterations + per-user salt), rate limiting, brute force lockout, timing-attack-safe comparisons.
- **Realtime:** WebSocket notification hub with persistent database fallback (`notifications` table).
- **Payments:** Razorpay Escrow (UPI / Cards / Netbanking), Webhook verification, Cash-on-delivery tracking, Digital Receipts.
- **AI & NLP:** Multilingual voice/text assistant supporting 10 construction trades, regional colloquialisms (Bhojpuri/Hindi), city geocoding, and relative date parsing.

---

## ✨ Features

### 1. Accurate Request Routing & Instant Dispatch
- **GPS-First with No Stale Fallbacks:** Never silently falls back to Delhi or Kanpur. Requires explicit GPS or city selection.
- **Instant Dispatch (Rapido-style):** Dispatches to nearest free and online workers within custom radius with a live 30-second countdown and fallback polling (`GET /api/instant/{id}`).
- **Persistent Notifications:** Render free-tier sleep safe! Missed WS notifications are stored in `notifications` table and synced on login.
- **Start-Work OTP:** 4-digit customer-generated OTP verified by worker before work commences.

### 2. Comprehensive Security
- **Production Hardened:** `DEV_MODE=0` in production disables test-OTP leakage.
- **PBKDF2 Password Hashing:** 100,000 rounds of PBKDF2 with SHA-256 and unique 16-byte random salts.
- **Brute Force & Rate Limit Protection:** Lockouts on failed login and OTP attempts.
- **Phone Masking:** Phone numbers masked as `[number hidden]` across public chat messages.

### 3. Thekedar (Contractor) Suite
- **Crew Management:** Invite registered workers or manage offline labour rosters.
- **Milestone-Based Projects:** Create projects with scheduled milestones and budgets.
- **Daily Attendance & Wage Ledger:** Track advances, payments, and export ledger to CSV (`GET /api/contractor/ledger/export`).

### 4. Multilingual NLP Assistant
- Recognizes 10 construction trades with colloquial terms (e.g., *chunaai*, *plumber*, *lohar*, *putty*).
- Geocodes Indian cities (Kanpur, Lucknow, Delhi, Varanasi, etc.).
- Natural relative date parsing (*aaj*, *kal*, *parson*, *somwar*).
- Role-gated workflows preventing cross-role command execution.

### 5. Escrow Payments & Receipts
- **Razorpay Escrow:** Customer advance held securely in escrow (`held` status) until job completion.
- **Automatic Release:** Completion by customer automatically triggers escrow payout release (with 5% platform fee deduction).
- **Cash Option:** Dedicated cash confirmation workflow with dual-party acknowledgement.
- **Digital Receipts:** Detailed breakdown of gross amount, platform fee, net payout, and transaction metadata.

---

## 🧪 Testing

Run all automated test suites:
```bash
# Full test suite (Flows, NLP Evaluation, Payments)
pytest backend/tests/test_flow.py backend/tests/test_nlp_eval.py backend/tests/test_payments.py -v
```

Run UI Playwright E2E verification:
```bash
npm run test:e2e
```

Build production bundle:
```bash
npm run build
```
