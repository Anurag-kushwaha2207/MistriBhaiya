# Master prompt (is zip ko Claude Code / Claude me upload karke ye paste karein)

```
You are my senior full-stack engineer and product partner. This zip is "MistriBaiya": a marketplace app that connects
village/city home-owners with masons (rajmistri), labour and construction tradespeople across India.

READ FIRST: README.md, docs/01_ROADMAP.md, docs/04_CALLING_SYSTEM.md, docs/06_API.md.
The backend (FastAPI + SQLite) and a Hindi/English PWA frontend already work and have passing tests
(cd backend && python -m pytest -q). Do NOT rewrite from scratch; extend.

Already built: negotiation (counter-offers) + chat with phone masking, contractor role (crew, find-workers filters, projects, attendance, ledger, dashboard), multilingual assistant (8 languages, voice), instant dispatch (waves), start-work OTP, in-app WebRTC calling with masked-call fallback, SOS, reports, earnings, admin page, OTP login, worker profile with customizable work radius, live free/busy status (auto-expiring, auto-busy
on accepted booking), radius search (haversine), job posting, "I can do this" interest, bookings (accept/reject/
complete/cancel/rate), WebSocket live updates, call connect (direct tel / Exotel masked), admin stats.

Do these next, one at a time, keeping tests green and adding tests for each:
1. Admin web dashboard (workers, bookings, calls, free-now map) + CSV export.
2. Replace SQLite with PostgreSQL + PostGIS (keep SQLite for tests), Alembic migrations.
3. Redis pub/sub so WebSocket works across multiple servers.
4. FCM push notifications and Android wrapper (Capacitor) with background-safe location prompt.
5. Map view (Leaflet + OpenStreetMap) for customers: show free mistris as pins inside the chosen radius.
6. Payments: Razorpay/Cashfree booking fee + UPI advance, with refunds and a dispute flow.
7. Exotel call-status webhook, call recording consent, IVR/missed-call "I am free" for feature phones.
8. KYC-light verification (phone + optional DigiLocker via an authorised partner; never store Aadhaar numbers).
9. Rate-card suggestions per area and skill; wage transparency.
10. Contractor tools: crew management, attendance, advance ledger, GST invoice PDF.
11. Add more Indian languages via the T dictionary in frontend/app.js (Marathi, Bengali, Telugu, Tamil, Gujarati...).
12. Security hardening: rate limits per IP, token refresh, input validation review, DPDP consent screen, data deletion endpoint.

Rules: simple Hindi-first UX for low-literacy users, big buttons, works on slow networks, never expose a worker's exact home
location, never store Aadhaar numbers, all secrets via environment variables. After each step update README and docs.
```
