# Deploy guide (Hinglish, step by step)

## A. Apne laptop par chalaayein (5 minute)
1. Python 3.10+ install hona chahiye.
2. Terminal me project folder me jaayein: `./run_local.sh`
3. Browser me `http://localhost:8000` kholein. Phone par same wifi se `http://<laptop-ip>:8000`.
4. Login: kisi bhi 10 digit number se. OTP test mode me apne aap bhar jaata hai.
5. Test: ek browser me "mistri" bankar profile + location + "main free hoon". Dusre me "ghar malik" bankar Khojein.
6. Tests chalane ke liye: `cd backend && python -m pytest -q`

## B. Internet par (Render.com, sabse aasan)
1. Code ko GitHub par daalein (private repo).
2. render.com -> New -> Blueprint -> repo chunein (`render.yaml` apne aap padh liya jaayega). Disk (1 GB) attach hota hai.
3. Environment me `DEV_MODE=0` hona chahiye. `SECRET_KEY` apne aap ban jaata hai.
4. Pehla admin: `ADMIN_PHONES=aapka_number` set karein, phir usi number se signup karein.
5. HTTPS apne aap milta hai. Apna domain jodne ke liye Render settings -> Custom domain.
6. **OTP SMS:** MSG91 account + DLT template -> `SMS_PROVIDER=msg91`, `MSG91_AUTHKEY`, `MSG91_TEMPLATE_ID`. Jab tak ye nahi hota, `DEV_MODE=1` sirf private testing ke liye.

Doosre options: Railway, Fly.io, AWS Lightsail/EC2 (`docker compose up -d`), DigitalOcean. Docker image: `docker build -t mistribaiya .`

## C. Phone me install (PWA)
Chrome me site kholein -> menu -> "Add to Home screen". Icon, full screen, aur offline shell milta hai.

## D. Play Store par daalna
Option 1 (sabse jaldi): **Bubblewrap / TWA** se PWA ko Android app me wrap karein (Digital Asset Links ke saath).
Option 2: **Capacitor** se native shell, jisse FCM push, GPS background, call-log jaise native features milte hain.
Play Console developer account (ek baar ki fees), privacy policy URL, data-safety form zaroori.

## E. Scale ke liye (jab 10,000+ users ho)
1. SQLite -> **PostgreSQL + PostGIS** (geo queries `ST_DWithin`).
2. Multiple servers par WebSocket: **Redis pub/sub** (hub ko Redis se jodein).
3. Background jobs (Celery/RQ): reminders, status expiry sweep, payouts.
4. Monitoring: Sentry + uptime alerts. Daily backups.
5. FCM push notification (jab app band ho tab bhi booking alert).
