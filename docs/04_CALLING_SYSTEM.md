# Calling system design (Rapido-style hybrid)

Rapido-jaise apps customer aur captain ke asli number chhupate hain (number masking), ride shuru hone ke baad SOS dete hain, aur har ride track karte hain. Hum ye **3 layer** me karte hain:

1. **In-app call (WebRTC, free):** dono app me online hon to call internet se jaati hai. Telecom kharcha = 0. Dono ko asli number nahi dikhta.
2. **Masked phone call (Exotel jaisa provider):** agar samne wala app me online nahi (gaon me data band), to server ek virtual number se dono ko jodta hai.
3. **Direct `tel:` link:** sirf pilot me.

Fallback apne aap hota hai: caller offer bhejta hai, server `rtc_unavailable` bolta hai to app masked call lagati hai.

**Production ke liye zaroori:** HTTPS (mic ke liye), ek **TURN server** (coturn ya paid) kyunki mobile data par sirf STUN se kai calls nahi judti; `TURN_URL/TURN_USER/TURN_PASS` env me daalein.


## Modes (switch with `CALL_PROVIDER` env var)
| Mode | Kaise chalta hai | Kab use karein |
|---|---|---|
| `direct` | App `tel:` link kholta hai; asli number dikhta hai | Pilot (Phase 1). Sabse sasta. Risk: log app ke bahar deal kar lenge |
| `exotel` | Exotel pehle **caller** ko ring karta hai, phir **callee** ko jodta hai; dono ko aapka virtual number dikhta hai | Phase 2+. Number masking + call log |

Code: `backend/app/calls.py`. Dusre provider (Knowlarity, MyOperator, Twilio) ke liye `exotel()` ki copy bana kar `connect_call()` me jodein.

## Rules jo code me already hain
- Call sirf: (a) booking ke dono participants ke beech, ya (b) customer -> worker (booking se pehle).
- Rate limit: 20 calls/hour/user.
- Har call `call_logs` table me (caller, callee, provider, time).

## Aage ke kaam
1. Exotel account + virtual number (ExoPhone) lein, `.env` me keys daalein, `CALL_PROVIDER=exotel`.
2. Call-status webhook (duration, answered/missed) -> `call_logs.status` update.
3. **Missed-call booking / IVR:** feature phone wale mistri ke liye, ek number par missed call -> call back -> "aaj free hain? 1 dabaiye".
4. Calling hours (subah 7 - sham 8), spam/abuse report button.
5. Provider ka kharcha: ek provider ne masked calling ~₹1.5/min batayi thi; asli rate quote lekar compare karein.
