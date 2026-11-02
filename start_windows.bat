@echo off
REM MistriBaiya: double-click to start on Windows (needs Python installed with "Add to PATH").
cd /d "%~dp0backend"
echo Installing requirements (first time only)...
python -m pip install -r requirements.txt
echo.
echo ================================================================
echo  PHONE par kholne ke liye: laptop aur phone ek hi WiFi par rakhein.
echo  Neeche "IPv4 Address" dekhein, phir phone ke Chrome me kholein:
echo      http://IPv4-ADDRESS:8000
echo  (GPS/mic/install ke liye HTTPS chahiye: start_https_tunnel.bat chalayein)
echo ================================================================
ipconfig | findstr /i "IPv4"
echo.
set DEV_MODE=1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
