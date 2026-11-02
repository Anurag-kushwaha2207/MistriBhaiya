# Phone par test karne ka poora guide (Windows ke liye)

## Zaroori baat
Phone par `localhost` ka matlab phone khud hota hai. Laptop kholne ke liye laptop ka IP ya ek HTTPS link chahiye.
GPS (lokation), microphone (voice aur in-app call) aur "Add to Home screen" **sirf HTTPS par** chalte hain. Isliye asli test ke liye **Tareeka 1** use karein.

## Tareeka 1 (best): HTTPS link, GPS + mic + install sab chalega
1. Python install karein (python.org, "Add Python to PATH" tick karein).
2. Zip ko Extract karein.
3. `cloudflared.exe` ek baar download karein: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe . File ko `cloudflared.exe` naam dekar `mistribaiya` folder me rakhein (jahan `start_https_tunnel.bat` hai).
4. `start_https_tunnel.bat` par double-click karein. Do window khulengi: ek **server** wali, ek **tunnel** wali.
5. Tunnel wali window me `https://kuch-random.trycloudflare.com` jaisa link dikhega. Wahi link phone ke Chrome me kholein.
6. OTP: ye test link public hota hai, isliye OTP apne aap nahi bharta. **Server wali window me `[SMS-console] OTP for ... : 123456`** dikhega, wahi OTP phone me daalein.
7. Phone me Chrome menu, "Add to Home screen" dabayein. App icon ban jayega.

## Tareeka 2 (sirf same WiFi; GPS ke liye flag chahiye)
1. `start_windows.bat` par double-click karein.
2. Window me "IPv4 Address" dekhein (jaise 192.168.1.23). Phone ke Chrome me `http://192.168.1.23:8000` kholein.
3. GPS/mic ke liye phone ke Chrome me `chrome://flags` kholein, "Insecure origins treated as secure" dhundhein, usme `http://192.168.1.23:8000` daalein, Enable karein, Chrome relaunch karein.
4. Is mode me OTP apne aap bhar jata hai (test mode).

## Do phone se poora test (10 minute)
| Phone / Browser | Role | Kya karein |
|---|---|---|
| Phone 1 | **Mistri** | Login, profile (ya 🤖 sahayak se bolkar bharein), location, "main free hoon" |
| Phone 2 | **Ghar malik** | Login, "Khojein" me mistri dikhe, "Book" par ₹ offer daalein |
| Phone 1 | Mistri | Bookings me "↔️ kam-zyada" se counter dein, 💬 chat karein |
| Phone 2 | Ghar malik | "✅ manzoor" karein; OTP dikhega |
| Phone 1 | Mistri | "▶ Kaam shuru (OTP)" me OTP daalein, phir "Kaam poora" |
| Phone 2 | Ghar malik | "⚡ Abhi chahiye" dabakar instant dispatch dekhein |
| Laptop | **Thekedar** | Login (Contractor), crew me saathi jodein, mistri ko "Find workers" se khojkar jodein |
| Phone 2 | Ghar malik | "👷 Thekedar" tab se project bhejein, rate negotiate karein |
| Laptop | Thekedar | Project manzoor, team lagayein, hazri bharein, "Hisaab" dekhein |

Admin dekhne ke liye: `ADMIN_PHONES` me apna number daalkar login karein, phir `/admin.html` kholein.

## Dikkat aaye to
- "Site nahi khul rahi": firewall me "Private networks" wala box tick hona chahiye; laptop aur phone same WiFi par hon.
- Mic/location block: sirf HTTPS link par chalega.
- Server wali window band na karein.
