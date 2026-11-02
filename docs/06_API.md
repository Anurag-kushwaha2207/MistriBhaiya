# MistriBaiya API (v0.1)
Base: `/api`. Auth: `Authorization: Bearer <token>`. Interactive docs: `/docs` (Swagger) when the server runs.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /auth/request-otp | all | `{phone}` -> sends OTP (dev mode returns `dev_otp`) |
| POST | /auth/verify | all | `{phone, otp, role, name}` -> `{token,user}` (creates account on first login) |
| GET/PUT | /me | all | profile; worker gets `profile` incl. live `status` |
| PUT | /worker/profile | worker | skills, daily_rate, experience, village, lat/lng, **radius_km** (how far worker will travel) |
| POST | /worker/status | worker | `{status: free|busy|offline, hours}`; "free" auto-expires |
| GET | /worker/jobs?radius_km= | worker | open jobs inside worker's own radius, matching skills |
| POST | /jobs/{id}/interest | worker | "I can do this" -> customer notified live |
| GET | /workers/search | customer | `lat,lng,radius_km,skill,free_only,on_date,sort(smart/distance/rating/rate)` |
| POST | /jobs, GET /jobs/mine, POST /jobs/{id}/cancel | customer | post/manage work |
| GET | /jobs/{id}/interested | customer | workers who showed interest |
| POST | /bookings | customer | request a mistri for dates (409 if already booked) |
| GET | /bookings/mine | both | list |
| POST | /bookings/{id}/respond | worker | `{accept}`; accept makes worker BUSY automatically |
| POST | /bookings/{id}/complete, /cancel | both | lifecycle |
| POST | /bookings/{id}/rate | customer | `{stars, review}` |
| POST | /calls/connect | both | `{worker_id}` or `{booking_id}` -> direct tel link or masked call |
| GET | /admin/stats | admin | counts |
| WS | /ws?token= | both | send `{type:"subscribe",lat,lng,radius_km}`; receive `worker_status`, `booking_new`, `booking_update`, `job_interest` |

## Instant dispatch (Rapido-style)
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /instant | customer | `{skill,lat,lng,radius_km,days,note}` -> offers go to the nearest FREE workers (wave size 5, 30 s per wave, max 3 waves) |
| GET | /instant/{id} | customer | status: searching / matched / no_worker / cancelled (also advances an expired wave) |
| POST | /instant/{id}/accept | worker | first accept wins (409 if taken/expired) -> booking is created `accepted`, worker becomes BUSY, start-OTP generated |
| POST | /instant/{id}/decline, /cancel | worker / customer | decline moves to next wave when everyone declined |
WebSocket events: `instant_offer` (to workers), `instant_status` (to customer), `instant_closed`.

## Trust and safety
| Method | Path | Purpose |
|---|---|---|
| POST | /bookings/{id}/start | worker enters customer's 4-digit OTP; `complete` needs it when REQUIRE_START_OTP=1 |
| POST | /sos | `{booking_id,lat,lng}` logs SOS, alerts other party and admins, returns emergency number 112 |
| POST | /reports | `{reported_id,reason,booking_id}` |
| GET | /worker/earnings | jobs done, days, total and this-month earnings |
| GET | /admin/workers, /admin/bookings, /admin/safety; POST /admin/workers/{id}/verify | admin |

## In-app voice call (WebRTC signalling over /ws)
Client sends `{type:"rtc", booking_id, data:{kind:"offer|answer|ice|hangup|busy", ...}}`; server relays to the other participant only.
If the other person is offline, server replies `{type:"rtc_unavailable"}` and the app falls back to a masked phone call (`POST /calls/connect`).
`GET /meta` returns `ice_servers` (STUN, and TURN if configured). Microphone needs HTTPS (or localhost).

## How "who is free right now" works (real time)
1. Worker taps "I am free" -> status=free with an expiry (default 12 h). Expiry prevents stale "free" labels.
2. Accepting a booking marks the worker BUSY automatically for those dates (no manual action needed).
3. Every change is pushed over WebSocket to customers whose search circle contains that worker.
4. For a future date, a worker is "free" if no accepted booking overlaps that date.
5. Exact home coordinates are never sent to customers; only distance and village.

## Negotiation and chat (bookings and projects)
`{kind}` is `bookings` or `projects`. For bookings the amount is the **daily rate**, for projects the **total budget**.
| Method | Path | Purpose |
|---|---|---|
| POST | /bookings (with `agreed_rate`) | customer's first offer; `offer_by` = customer |
| POST | /{kind}/{id}/counter | `{rate, days?, note}` the party who did NOT make the last offer counters (max 8 rounds) |
| POST | /{kind}/{id}/accept | accept the other side's latest offer; deal is fixed (booking -> accepted, OTP generated, worker busy) |
| POST | /{kind}/{id}/reject | either side |
| GET | /{kind}/{id}/negotiation | offer history, `my_turn`, current rate/days |
| GET/POST | /{kind}/{id}/messages | chat; phone numbers are masked as `[number hidden]` |
| POST | /jobs/{id}/interest | worker can quote `{rate}`; customer sees `quoted_rate` |

## Contractor (role = contractor)
| Method | Path | Purpose |
|---|---|---|
| PUT | /contractor/profile | company, skills, location, radius, min budget |
| GET | /contractors/search | customers find contractors (distance, skill, rating, crew size) |
| GET | /contractor/find-workers | filters: `radius_km, skill, max_rate, free_only, on_date, min_hours_free, sort` |
| GET/POST | /contractor/crew | list; add by name+phone (registered worker -> invite, else offline labour) |
| POST | /contractor/crew/from-worker/{wid} | invite a worker found in search |
| PUT/DELETE | /contractor/crew/{id} | edit rate / remove |
| GET/POST | /worker/invites, /worker/invites/{id}/respond | worker accepts or declines crew invitation |
| POST | /projects | customer -> contractor: title, dates, days, budget, workers_needed |
| GET | /projects/mine, /projects/{id} | list / detail |
| POST | /projects/{id}/assign, /attendance, /start, /complete, /cancel, /rate, /call | project lifecycle |
| POST | /contractor/ledger; GET /contractor/ledger/summary | advance / payment; earned - advance - paid = balance |
| GET | /contractor/dashboard | counts, business value, wages due |

## Assistant
`POST /assistant {text, lang, start, location:{lat,lng}}` -> `{reply, chips[], actions[], lang}`. Actions: `request_location`, `navigate`, `refresh`, `instant_started`, `choose_language`. `POST /assistant/reset`.
