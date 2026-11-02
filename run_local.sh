#!/bin/sh
# Mac/Linux local run: ./run_local.sh  -> open http://localhost:8000 (phone: http://<your-ip>:8000 on the same WiFi)
cd backend && pip install -r requirements.txt && DEV_MODE=1 python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
