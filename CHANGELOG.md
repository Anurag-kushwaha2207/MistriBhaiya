# Changelog

All notable changes to the MistriBhaiya application are documented in this file.

## [v1.0.0] - 2026-11-08

### Section A: Request Routing & Realtime Communication
- **Location Fixes:** Removed hardcoded Delhi and Kanpur coordinates across all backend endpoints and frontend components. Location requests now strictly check device GPS or prompt city selection. Added 10-minute TTL to cached location.
- **Instant Dispatch:** Connected frontend instant dispatch to handle `instant_status` websocket events (`searching`, `matched`, `no_worker`, `cancelled`) with a live countdown modal and periodic fallback polling (`GET /api/instant/{id}`).
- **Worker Matching:** Updated instant candidate filtering to include workers who are online via live WebSocket connection even if their background status was offline, while strictly excluding busy workers.
- **WebSocket Stability:** Stabilized WebSocket lifecycle by memoizing translation functions, eliminating socket thrashing on every render, adding exponential backoff, and preventing reconnection on deliberate unmount.
- **Event Listeners:** Added client handlers for `project_update`, `crew_update`, `crew_assigned`, `sos`, `instant_status`, `instant_closed`, and `booking_update`.
- **Persisted Notifications:** Added `notifications` database table and API endpoints (`GET /api/notifications`, `POST /api/notifications/read`, `POST /api/notifications/read-all`) to ensure notifications are never lost when Render server sleeps or client is offline.
- **Targeted Job Alerts:** Restricted new job alerts (`job_new`) only to qualified workers within distance radius matching the job skill, rather than broadcasting to all connected users.
- **Job Booking Continuity:** Preserved job context when booking a worker from a job posting, automatically updating job status to `assigned` and auto-rejecting competing bids upon acceptance.

### Section B: Security Hardening
- **Production DEV_MODE Enforcement:** Gated test-OTP leakage behind `DEV_MODE=1`, ensuring production returns generic responses and hides developer toasts.
- **Password Hashing:** Upgraded user password hashing to PBKDF2-HMAC-SHA256 with 100,000 iterations and per-user random cryptographic salt (`secrets.token_hex(16)`).
- **Brute Force & Rate Limit Protection:** Added sliding-window rate limiters and temporary 15-minute lockouts for failed login and OTP verification attempts.
- **Timing Attack Mitigation:** Implemented constant-time string comparisons (`hmac.compare_digest`) for all password and token signature verifications.
- **SQL Sanitization:** Enforced strict parameter binding and validated dynamic column and table identifiers.

### Section C: Backend Consistency & Validation
- **Unified Query Parameters:** Standardized worker and contractor search APIs to use `on_date` consistently across backend and frontend.
- **Booking Lifecycle Constraints:** Updated SQLite check constraints and transitions to support `work_done` and require start OTP before work commencement.
- **Response Schemas:** Standardized booking and payment endpoints to return complete structured objects.

### Section D: Contractor (Thekedar) Features
- **Milestones & Projects:** Added support for milestone-based project creation with title, amount, and due date.
- **Ledger & Accounting:** Implemented contractor wage ledger tracking advances, wage disbursements, and net balances with CSV export capability (`GET /api/contractor/ledger/export`).
- **Crew Management:** Enabled searching registered workers by trade and radius to send crew invitations.

### Section E: Multilingual NLP Assistant
- **Trade Vocabulary:** Added 10 construction trades with colloquial Hindi, Bhojpuri, and regional slang keywords.
- **Entity Extraction:** Implemented date, duration, budget, and Indian city geocoding extractors.
- **State Machine & Confirmation:** Created multi-turn conversation state machine with chip suggestions for job posting and instant dispatch.
- **Role Isolation:** Enforced strict role permissions preventing cross-role command execution.
- **Evaluation Suite:** Added 60 comprehensive test cases in `backend/tests/test_nlp_eval.py` covering classification, entity extraction, and intent handling.

### Section F: Razorpay Payments & Escrow
- **Escrow Holding:** Implemented Razorpay order generation (`POST /api/payments/order`) and webhook/signature verification (`POST /api/payments/verify`), holding funds in `held` status until completion.
- **Platform Fee:** Deducted 5% platform fee on payout calculation, crediting 95% net to worker payout ledger.
- **Auto-Release:** Customer completing booking automatically triggers escrow payout release to worker.
- **Cash Management:** Added dual-party cash confirmation workflow (`POST /api/payments/{id}/cash-confirm`).
- **Digital Receipts:** Created printable receipt modal showing gross amount, platform fee, net payout, and transaction details.

### Section G: Test Suite, Seeding & Production Build
- **Test Automation:** Validated 81 passing tests across `test_flow.py`, `test_nlp_eval.py`, and `test_payments.py`.
- **Test Seeding:** Created `scripts/seed_test_users.py` gated by `DEV_MODE=1` to seed worker (`9837101838`), customer (`9837101839`), and contractor (`9837101840`).
- **UI Testing:** Added Playwright E2E verification test in `tests_ui/e2e.spec.js` and `tests_ui/playwright.config.js`.
- **Production Build:** Recompiled frontend distribution with `npm run build` updating `frontend/react-app.js`.
