# MistriBhaiya API (v1.0)
Base: `/api`. Auth: `Authorization: Bearer <token>`. Interactive docs: `/docs` (Swagger) when the server runs.

## 1. Authentication & Security
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /auth/request-otp | all | `{phone}` -> sends OTP (dev mode returns `dev_otp`, prod uses SMS gateway) |
| POST | /auth/verify | all | `{phone, otp, role, name, password}` -> verifies OTP, creates/logs in account |
| POST | /auth/login-password | all | `{phone, password}` -> logs in using password |
| POST | /auth/set-password | authenticated | `{password}` -> sets or changes password for authenticated user |
| POST | /auth/reset-password | all | `{phone, otp, new_password}` -> resets password after OTP verification |
| GET/PUT | /me | all | profile; worker gets `profile` incl. live `status` and `skills` |

*Security notes:* Password hashes use PBKDF2-HMAC-SHA256 with 100,000 iterations and per-user random salt. Login and OTP endpoints enforce rate limiting and temporary lockouts after failed attempts.

## 2. Worker & Customer Core
| Method | Path | Who | Purpose |
|---|---|---|---|
| PUT | /worker/profile | worker | skills, daily_rate, experience, village, lat/lng, **radius_km** (requires lat/lng) |
| POST | /worker/status | worker | `{status: free\|busy\|offline, hours}`; "free" auto-expires |
| GET | /worker/jobs?radius_km= | worker | open jobs inside worker's own radius, matching skills |
| POST | /jobs/{id}/interest | worker | "I can do this" -> customer notified live |
| GET | /workers/search | customer | `lat,lng,radius_km,skill,free_only,on_date,sort,expand` |
| POST | /jobs, GET /jobs/mine, POST /jobs/{id}/cancel | customer | post/manage work |
| GET | /jobs/{id}/interested | customer | workers who showed interest |
| POST | /bookings | customer | request a mistri for dates (409 if already booked; lat/lng validated) |
| GET | /bookings/mine | both | list bookings with negotiation rates and payment states |
| POST | /bookings/{id}/respond | worker | `{accept}`; accept makes worker BUSY automatically |
| POST | /bookings/{id}/start | worker | `{otp}`; starts work with 4-digit OTP provided by customer |
| POST | /bookings/{id}/complete | both | marks work completed; auto-releases escrow payment to worker payout |
| POST | /bookings/{id}/cancel | both | cancels booking |
| POST | /bookings/{id}/rate | customer | `{stars, review}` |
| POST | /calls/connect | both | `{worker_id}` or `{booking_id}` -> direct tel link or masked call |
| GET | /admin/stats | admin | counts and platform metrics |

## 3. Instant Dispatch (Rapido-style)
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /instant | customer | `{skill,lat,lng,radius_km,days,note}` -> offers go to nearest free/online workers |
| GET | /instant/{id} | customer | status: searching / matched / no_worker / cancelled |
| POST | /instant/{id}/accept | worker | first accept wins -> booking created `accepted`, worker BUSY, start-OTP generated |
| POST | /instant/{id}/decline | worker | decline moves to next wave |
| POST | /instant/{id}/cancel | customer | cancels searching instant request |

## 4. Notifications & Realtime
| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | /notifications | all | retrieves unread and recent persisted notifications |
| POST | /notifications/read | all | `{id}` -> marks notification as read |
| POST | /notifications/read-all | all | marks all notifications as read |
| WS | /ws?token= | all | subscribe to live events: `worker_status`, `booking_new`, `booking_update`, `job_interest`, `payment_held`, `sos` |

## 5. Payments, Escrow & Receipts
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /payments/order | customer | `{booking_id, project_id, amount_paise, method: online\|cash}` -> creates Razorpay order or registers cash |
| POST | /payments/verify | customer | `{payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature}` -> verifies signature, places funds in escrow (`held`) |
| POST | /payments/webhook | gateway | webhook handler for Razorpay `order.paid` / `payment.captured` |
| POST | /payments/{id}/cash-confirm | both | worker or customer confirms physical cash exchange |
| POST | /payments/{id}/release | customer/admin | releases funds held in escrow to worker payout |
| GET | /payments/{id}/receipt | customer/worker | returns structured receipt with gross, 5% fee, net payout, and status |
| GET | /payments/my | all | lists recent payments for logged-in user |
| GET | /payments/booking/{booking_id} | all | retrieves active payment record for booking |

## 6. Thekedar (Contractor) Features
| Method | Path | Who | Purpose |
|---|---|---|---|
| PUT | /contractor/profile | contractor | company, skills, location, radius, min budget |
| GET | /contractors/search | customer | customers search contractors (distance, skill, rating, crew size) |
| GET | /contractor/find-workers | contractor | filters: `radius_km, skill, max_rate, free_only, on_date, sort` |
| GET/POST | /contractor/crew | contractor | list crew; add by name+phone |
| POST | /contractor/crew/from-worker/{wid} | contractor | invite a registered worker from search |
| PUT/DELETE | /contractor/crew/{id} | contractor | edit rate or remove crew member |
| GET/POST | /worker/invites | worker | view and respond to crew invitations |
| POST | /contractor/projects | customer | create project with contractor: title, dates, days, budget, workers_needed |
| GET | /projects/mine, /projects/{id} | both | list / detail project |
| POST | /projects/{id}/milestones | contractor/customer | add milestone with title, amount, and due date |
| POST | /projects/{id}/assign | contractor | assign crew members to project |
| POST | /projects/{id}/attendance | contractor | daily crew attendance records |
| POST | /contractor/ledger | contractor | record advance, expense, or wage payment |
| GET | /contractor/ledger/summary | contractor | total earned, advances, wages paid, and net balance |
| GET | /contractor/ledger/export | contractor | CSV export of complete contractor ledger |
| GET | /contractor/dashboard | contractor | dashboard statistics, business value, active crew, wages due |

## 7. AI Sahayak (NLP Assistant)
`POST /assistant`
- Body: `{text: str, lang: str, start: bool, location: {lat, lng}}`
- Response: `{reply: str, chips: list[str], actions: list[dict], lang: str, session: dict}`
- Capabilities:
  - 10 Construction trade skills recognized with colloquial Bhojpuri/Hindi aliases (rajmistri, mazdoor, plumber, electrician, painter, carpenter, tiles, welder, pop, saria).
  - Indian and regional city geocoding (Kanpur, Lucknow, Delhi, Varanasi, etc.).
  - Natural relative date parsing ("aaj", "kal", "parson", "somwar", "agle hafte").
  - LLM fallback (Gemini/Anthropic/OpenAI) with pure rule-based fallback when offline.
  - Strict role validation (workers cannot post customer jobs, customers cannot change worker status).
