# MistriBaiya 🏗️  (mistri + bhaiya: apna mistri, apne paas)

Gaon aur shehar ke ghar-malik ko aas-paas ka **free mistri / labour** dilane wala app.
Mistri ko **roz kaam**, ghar-malik ko **kaam jaldi**, aur aapko **continuous income**.

## Ye zip me kya hai
| Folder / file | Matlab |
|---|---|
| `backend/` | Python (FastAPI) server: login, search, live free/busy, booking, calling, WebSocket |
| `frontend/` | Phone app (PWA, Hindi + English). "Add to Home screen" se install hota hai |
| `docs/01_ROADMAP.md` | Pura India ka roadmap (Phase 0 se Phase 4) |
| `docs/02_BUSINESS_MODEL.md` | Paise kamane ke 7 raste + simple hisaab |
| `docs/03_LEGAL_COMPLIANCE.md` | Kanooni checklist (gig-worker code, DPDP, DLT, etc.) |
| `docs/04_CALLING_SYSTEM.md` | Calling system (direct / masked Exotel) |
| `docs/05_DEPLOY_GUIDE.md` | Internet par daalna, Play Store, scale |
| `docs/06_API.md` | Saari API ki list |
| `docs/09_MistriBaiya_Vendor_Brief_RFP.docx` | **Word file: kisi company se banwane ke liye poora brief (RFP), requirements, cost guide, contract terms** |
| `start_windows.bat`, `start_https_tunnel.bat` | **Windows par double-click se chalaayein** (phone ke liye HTTPS link) |
| `docs/10_PHONE_TEST_GUIDE.md` | **Phone par test karne ka step-by-step guide** |
| `docs/11_ASSISTANT_AND_LANGUAGES.md` | Sahayak, voice aur bhasha jodna |
| `docs/08_FEATURES_AND_GAPS.md` | **Kya bana hai, kya baaki hai, aur aur kya jod sakte hain** (research ke saath) |
| `docs/07_MASTER_PROMPT_FOR_CLAUDE.md` | **Claude ko ye zip dekar aage ka kaam karwane ka prompt** |
| `Dockerfile`, `render.yaml`, `docker-compose.yml` | Cloud deploy files |

## Jo features abhi kaam kar rahe hain (tested)
- ✅ Mobile number + OTP login (mistri / ghar-malik)
- ✅ **Mistri ki doori customizable:** mistri apna kaam ka radius (1-50 km, default 6) tay karta hai
- ✅ **Ghar-malik ki doori customizable:** search slider 1-50 km
- ✅ **Live "free / busy / offline":** "main free hoon" (auto-expire) + booking accept hote hi **automatic busy**
- ✅ Future date par availability check, double-booking roka jata hai (409)
- ✅ Live updates (WebSocket): mistri free hote hi customer ki list badal jati hai
- ✅ Kaam daalna, mistri "main kar sakta hoon" dabaye, ghar-malik book/call kare
- ✅ Booking: request -> accept/reject -> complete -> rating
- ✅ **⚡ Abhi chahiye (Rapido jaisa instant dispatch):** nearest free mistri ko turant offer (30 sec countdown + ring), pehle accept karne wala jeetta hai, nahi to agla round (3 rounds tak)
- ✅ **Start-work OTP (Rapido ride OTP jaisa):** ghar-malik ko 4 digit OTP milta hai, mistri wo daalkar kaam shuru karta hai (fraud aur "aaya hi nahi" rokta hai)
- ✅ **Calling (Rapido jaisa):** (1) **ऐप से फ्री कॉल (WebRTC)**, (2) agar samne wala app me online nahi to **masked phone call (Exotel)** par apne aap fallback, (3) direct `tel:` pilot ke liye
- ✅ **Safety:** 🆘 SOS button (booking ke baad), shikayat (report), admin ko alert
- ✅ **🤝 Negotiation (mol-bhav):** booking accept hone se pehle dono taraf se kam-zyada: ghar-malik apna ₹ offer deta hai, mistri counter karta hai, ghar-malik counter karta hai... jab ek accept kare to rate aur din **fix**. (Max 8 round; apna hi offer koi accept nahi kar sakta.)
- ✅ **💬 Chat** har booking/project par (phone number apne aap chhupa diye jaate hain)
- ✅ **👷 Thekedar (Contractor) login + dashboard:** apni **crew** (registered mistri ko phone se invite, ya bina-phone wale mazdoor khud sambhale), **mistri khojna** (doori, mazduri limit, free-only, tareekh, "kam se kam kitne ghante free"), **ghar-malik se project + negotiation**, team lagana, **roz ki hazri**, **hisaab (advance / bhugtan / baaki)**
- ✅ **Ghar-malik seedha thekedar se kaam karwa sakta hai**: gadbad ho to sirf thekedar se baat (call + chat), wahi zimmedar
- ✅ **🤖 Sahayak (AI chat + voice), 8 bhasha:** Hindi, English, Marathi, Gujarati, Bengali, Tamil, Telugu, Bhojpuri. Mistri/mazdoor sab kuch chat se bhar sakta hai
- ✅ **Mistri ki kamai screen** (is mahine / kul / aane wale kaam)
- ✅ **Admin page** `/admin.html`: workers, bookings, SOS, shikayat, "Verify" badge
- ✅ Mistri ka asli ghar ka location customer ko kabhi nahi dikhta
- ✅ Admin stats, rate limits, 15 automated tests + UI smoke test (3 roles)

## 5 minute me chalaayein
**Windows:** `start_windows.bat` par double-click. **Phone par HTTPS ke saath:** `start_https_tunnel.bat` (guide: `docs/10_PHONE_TEST_GUIDE.md`).
**Mac/Linux:** `./run_local.sh`, phir browser me `http://localhost:8000`
OTP test mode me apne aap bhar jata hai. Cloud par daalne ke steps: `docs/05_DEPLOY_GUIDE.md`.

## Jo abhi baaki hai (honest list)
Ye **ek chalta hua MVP** hai, finished pan-India product nahi. Ye aapko khud/Claude ke saath karna hoga (details `docs/07_MASTER_PROMPT_FOR_CLAUDE.md`):
real SMS (MSG91 + DLT), Exotel account, payments, push notification, Play Store app, map view, PostgreSQL, KYC, admin dashboard, kanooni registration, aur sabse zaroori: **ground par mistri jodna**.

## Pehle ye karein
1. `docs/01_ROADMAP.md` ka **Phase 0** (manual pilot, 1 block).
2. App local chalaakar 5-10 mistri aur ghar-malik ko dikhayein.
3. Feedback ke baad cloud par daalein.
