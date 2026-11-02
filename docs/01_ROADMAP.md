# MistriBaiya: Pan-India Roadmap (Mistri + Labour + Ghar Malik)

> Honest note: koi bhi roadmap success guarantee nahi karta. Pichhle apps (jaise Labouradda, UP) band ho gaye. Is roadmap ka maqsad hai ki aap wo galtiyan na dohraayein.

## Aap kya bana rahe hain (ek line me)
Gaon aur shehar ke ghar-malik / contractor ko aas-paas (apni chuni hui doori me) ka **free mistri ya labour** kuch minute me mile, call par baat ho, kaam book ho; aur mistri ko **roz kaam** mile.

## Market me jagah (research ka nichod)
- Pehle se maujood: Digital Labour Chowk, Rojgar app, WorkerBhaiya, MistriX, Mazdoor Adda, BookMyWorker, Heywork, Apna, WorkIndia, Urban Company. Zyada tar **shehar ya contractor** par focus karte hain; Urban Company middle/high-income gharon ke liye hai.
- **Khali jagah:** gaon-level, ghar-malik se seedha booking, **"abhi free hai ya nahi" ka bharosemand live status**, aur apni chuni hui doori. Yahi aapka wedge hai.
- Sabse badi chunauti technology nahi, **bharosa (trust)** aur **do-taraf ki supply** (mistri + ghar-malik dono ek hi jagah) hai. Digital Labour Chowk ne bhi yahi kaha: kam digital samajh, contractors ka shak, kharab internet.

## Phase 0: Validation (Hafta 0-4), kharcha ~₹20-50 hazaar
- 1 block chunein (jaha aap ko log jaante hon). 50 mistri/labour aur 50 ghar-malik se baat karein: roz kitna kaam milta hai, kitna idle rehte hain, kaise dhundhte hain, kitna dene ko taiyaar.
- **Manual pilot:** WhatsApp group + aapka phone number. Aap khud match karein. Agar 2 hafte me 30+ bookings aa gayi, tabhi app me paisa lagayein.
- Company/legal: apni existing Pvt Ltd company (jaise JAVICS) ya nayi company; CA/lawyer se `03_LEGAL_COMPLIANCE.md` check karwayein. Domain + brand name + Play Store developer account.
- Success ka sanket: 100 mistri ne bola "main use karunga" aur 30 bookings manual me hui.

## Phase 1: MVP, ek zila (Mahina 1-3), kharcha ~₹1-3 lakh
- Is zip ka app deploy karein (`05_DEPLOY_GUIDE.md`). Direct calling (tel: link) se shuru, kyunki masked calling ka kharcha abhi zaroori nahi.
- **Supply pehle:** har gaon/chowk par ek "Mitra" (local agent, ₹3-5 hazaar/month ya per-onboarding ₹20-30) jo mistri ko app me jodta hai. Chowk par QR/poster, rozgar mela.
- Mistri ke liye 100% free. Ghar-malik ke liye bhi free (bookings badhane tak).
- Target: 500 mistri, 20% roz "free" status daalen, 300 bookings/month, repeat booking 30%.
- Roz monitor: kitne mistri ne aaj "free" daala, search me kitni baar "no result" aaya, request accept rate, call-to-booking rate.

## Phase 2: Paisa kamana shuru (Mahina 4-9), kharcha ~₹5-12 lakh
- **Masked calling** (Exotel jaisa) taaki log app ke bahar deal na karein. Booking fee ya call credit se kharcha nikalein (`04_CALLING_SYSTEM.md`).
- Paid features: ghar-malik ko booking fee, mistri ke liye "Pro" (priority listing/verified badge), contractor ke liye attendance + payroll tool.
- UPI payment (advance + kaam ke baad), dispute handling, rating system, photo-based "kaam ka proof".
- Android app (PWA se Play Store par, `05_DEPLOY_GUIDE.md`), push notification (FCM), Hindi voice instructions / missed-call booking (feature phone wale mistri ke liye).
- 3-5 zile, UP + Bihar ke paas ke zile (similar bhasha, similar kaam ka pattern).
- KPI: 5,000 mistri, 3,000 bookings/month, repeat 40%, paid conversion 5-10%.

## Phase 3: State level + naye paise ke raste (Mahina 10-18)
- UP, Bihar, MP, Rajasthan, Jharkhand. Local-language support (Bhojpuri/Awadhi boli me voice).
- **Material marketplace:** cement, sariya, ret, tiles. Ghar banate waqt yahi sabse bada kharcha hai; commission 2-5% (asli margin supplier se baat karke tay hoga).
- Tool/loan/insurance partners (RBI-regulated partner ke saath, khud loan na dein). e-Shram registration mein madad (value-add).
- Contractor SaaS: attendance, advance/hisaab, GST invoice.
- Seed/angel funding ya grant (Startup India, state startup missions) tab maangein jab 3 zile me repeat bookings dikh rahi hon.

## Phase 4: Pan-India (Mahina 18-36)
- Bhasha: Hindi + Marathi, Gujarati, Bengali, Telugu, Tamil, Kannada, Odia, Punjabi.
- Tier-2/3 shehar me contractor + builder + real-estate developer (B2B) se bada volume.
- AI: rate suggestion, "kaunsa mistri kab free hoga" ki prediction, fraud detection, voice search.
- Data se value: area-wise mazdoori index, demand heatmap (privacy rules ke saath).

## Team (kam se kam)
| Phase | Log |
|---|---|
| 0-1 | Aap (founder, ground), 1 developer (ya aap + Claude), 1-2 field Mitra |
| 2 | + 1 backend dev, 1 mobile/UI dev, 1 operations lead, 5-10 Mitra |
| 3 | + data/AI, support team (Hindi call centre), finance/compliance |

## Sabse zaroori KPIs (har hafte dekhein)
1. **Liquidity:** search karne par kitne % me kam se kam 1 free mistri mila.
2. Roz "free" status daalne wale mistri (% of active).
3. Request accept rate aur 30 minute ke andar jawab.
4. Booking completion rate aur repeat rate.
5. Cost per onboarded mistri, cost per booking, revenue per booking.

## Badi galtiyan jo avoid karein
- Pehle poore India me launch karna. **Ek zila jeetiye, phir doosra.**
- Sirf ghar-malik ko khinchna ya sirf mistri ko. Dono saath badhane padte hain.
- Mistri se paise lena (phone number lock/subscription) jab tak unhe roz kaam na mil raha ho.
- Trust ko ignore karna: ID/phone verification, rating, complaint, disputes.
- Offline log ko bhoolna: chowk, rozgar mela, missed call, WhatsApp.
