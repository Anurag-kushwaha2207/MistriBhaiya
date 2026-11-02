UI smoke test (optional, for developers): drives the real web app (all 3 roles) with jsdom against a running server.
1) cd backend && DB_PATH=/tmp/ui.db DEV_MODE=1 python -m uvicorn app.main:app --port 8079
2) in another terminal: cd tests_ui && npm init -y && npm install jsdom && node ui_smoke_test.js
