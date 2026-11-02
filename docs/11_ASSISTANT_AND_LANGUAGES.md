# Sahayak (AI chat + voice) aur bhashayen

## Kya karta hai
Mistri/labour sab kuch **baat karke** kar sakta hai: naam, kaam, mazduri, anubhav, gaon, location, radius bharna; "main free hoon/busy/aaj band" bolna; kamai, kaam, bookings dekhna; rate/doori badalna.
Ghar-malik: "mistri chahiye" bolkar instant request. Thekedar: "team", "saathi jodo" (naam, phone, kaam, rate).

## Bhashayen (abhi 8)
Hindi, English, Marathi, Gujarati, Bengali, Tamil, Telugu, Bhojpuri. **Har bhasha ke sentence kisi native speaker se zaroor check karwayein.**
Nayi bhasha jodne ke liye `backend/app/assistant.py` me `STR["xx"]`, `SKILLNAMES["xx"]` aur `SKILL_WORDS` me us bhasha ke shabd jodein; `frontend/assistant.js` me `BOT_LANGS` aur `BOT_VOICE` me code daalein.

## Voice
- **Bolna (speech-to-text):** phone ke Chrome ka Web Speech API use hota hai (hi-IN, en-IN, mr-IN, gu-IN, bn-IN, ta-IN, te-IN). Chrome kuch cases me audio Google ko bhejta hai; privacy policy me likhein. Internet chahiye.
- **Sunna (text-to-speech):** reply phone ki awaaz me padh kar sunaya jata hai (🔊 toggle). Voice phone me install hone par depend karti hai.
- Phone me kisi bhasha ki voice na ho to text chalega.

## Smart (LLM) madad, optional
Bina key ke bhi assistant poora chalta hai (rule engine). Free-text samajhne ke liye `.env` me `ANTHROPIC_API_KEY` daalein; jo message rules nahi samajhte, wo LLM se classify hoga. Ye hissa maine live key ke bina test nahi kiya.
Production me agle kadam: LLM se poori profile extraction, voice-only IVR (Exotel), WhatsApp bot.
