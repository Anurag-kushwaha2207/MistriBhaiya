# Kya bana hai, kya baaki hai, aur aur kya jod sakte hain

Seedha jawab: **zip adhura hai, kyunki ye ek chalta hua MVP hai.** Core kaam karta hai (tested), par pan-India product banane ke liye neeche ki list baaki hai.

## A. Ab tak bana hua (tested)
| Area | Feature |
|---|---|
| Login | Mobile + OTP, mistri/ghar-malik role |
| Discovery | Radius search (ghar-malik ka slider + mistri ka apna radius), skill/date/sort filters |
| Live status | Free (auto-expire) / Busy (auto on booking) / Offline, WebSocket live update |
| Booking | Request, accept/reject, double-booking block, complete, rating |
| **Instant (Rapido-style)** | "Abhi chahiye": nearest free mistri ko offer, 30 sec countdown + ring, first-accept-wins, 3 waves, auto no-worker |
| **Start OTP** | Customer ko 4 digit OTP, mistri daale tab hi kaam shuru (fraud kam) |
| **Calling** | In-app free WebRTC call, offline par masked call fallback, direct tel pilot |
| **Safety** | SOS (112), shikayat, admin alert, mistri ka ghar ka exact location kabhi nahi dikhta |
| **Negotiation** | Offer / counter-offer / accept (bookings aur projects), 8 round limit, history, chat with phone masking |
| **Contractor** | Role, dashboard, crew (invite ya offline labour), worker search filters (doori, mazduri, free, tareekh, ghante), projects, assign, hazri, hisaab |
| **Sahayak** | 8 bhasha chat + voice (speech in/out), profile bharna, status, kamai, kaam, instant request, crew add |
| Mistri | Kamai summary (is mahine / kul / aane wale kaam) |
| Admin | Stats, workers, bookings, SOS, complaints, Verify badge |
| Ops | Docker, render.yaml, Windows .bat scripts, 15 tests + UI smoke test, DB migration |

## B. Abhi nahi bana (aapko ya company ko karna hoga)
| Zaroori (launch se pehle) | Kyun |
|---|---|
| Real SMS OTP (MSG91 + DLT) | Bina iske asli users login nahi kar paayenge |
| HTTPS + domain | Mic (in-app call), location, install ke liye zaroori |
| Android/iOS app (Play Store) + push notification (FCM) | App band ho to bhi offer/booking ka alert; background ring |
| Payments (UPI/Razorpay/Cashfree) + wallet | Booking fee, advance, refund, mistri ko payout |
| KYC-light verification (phone + DigiLocker partner), background check | Trust; Rapido bhi third-party verification karta hai |
| Privacy Policy, Terms, consent screen, data delete | DPDP compliance |
| PostgreSQL + PostGIS, Redis | 10,000+ users ke baad SQLite kaafi nahi |
| TURN server | Mobile data par in-app call ke liye |
| Customer support tool (ticketing, call centre) | Disputes |

## C. Jo aur jod sakte hain (research aur aapke idea ke hisaab se, priority order me)
1. **Map view** (OpenStreetMap/Leaflet): free mistri pins, "mistri aa raha hai" live tracking (Rapido ki tarah).
2. **Voice-first / feature phone support:** missed-call se "aaj free hoon", IVR, WhatsApp bot booking.
3. **Rate card + dynamic suggestion:** area aur skill ke hisaab se din ka rate; surge (barish/tyohar) ka option, par transparency ke saath.
4. **Gang/Team booking:** 1 mistri + 3 labour ek saath ("Team booking"), contractor ke liye crew.
5. **Material marketplace:** cement, sariya, ret, tiles (bada ticket, recurring).
6. **Contractor SaaS:** attendance (selfie/GPS), advance/hisaab, payslip, GST invoice.
7. **Schemes/e-Shram help:** mistri ka e-Shram/UAN, insurance, skilling certificate.
8. **Multi-language:** Bhojpuri, Marathi, Gujarati, Bengali, Telugu, Tamil, Kannada, Odia, Punjabi + text-to-speech.
9. **Referral + Mitra (village agent) app:** onboarding commission, QR poster.
10. **Photo/video of work, before-after, warranty;** dispute resolution with evidence.
11. **Pro subscription, verified badge, boost;** ghar-malik ke liye "Premium support".
12. **AI:** voice search ("kal 2 mistri chahiye Sarnath me"), fraud detection, demand prediction, auto-scheduling.
13. **Sarkari kaam / B2B:** builder, real-estate developer, gram panchayat projects, tender-wise crew.
14. **Offline-first** (low network): queue actions, sync later.
15. **Insurance + accident cover** (partner), **tool/loan** (partner).
