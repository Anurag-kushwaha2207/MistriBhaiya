@echo off
REM Gives your phone a public HTTPS link (needed for GPS, microphone and "Add to Home screen").
REM 1) Download cloudflared.exe once from:
REM    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
REM    and save it in THIS folder with the name cloudflared.exe
cd /d "%~dp0"
if not exist cloudflared.exe (
  echo cloudflared.exe is not in this folder yet. Download it from the link inside this file, rename it to cloudflared.exe and run again.
  pause
  exit /b 1
)
echo Starting MistriBaiya server in a new window...
REM DEV_MODE=0 keeps OTPs private: the OTP is printed in the SERVER window; tell it to your testers.
start "MistriBaiya server" cmd /k "cd /d %~dp0backend && python -m pip install -r requirements.txt && set DEV_MODE=0 && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 8 >nul
echo.
echo Look for a line like  https://something-random.trycloudflare.com  below. Open THAT link on your phone.
echo Share it only with people you trust (it is a test link).
cloudflared.exe tunnel --url http://localhost:8000
pause
