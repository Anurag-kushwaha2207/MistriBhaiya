#!/usr/bin/env python3
"""
Seed script for test users:
- Worker: 9837101838 (pass 123456789, skill rajmistri, Kanpur 26.4505, 80.1912)
- Customer: 9837101839 (pass 123456789, Kanpur 26.4505, 80.1912)
- Contractor: 9837101840 (pass 123456789, Kanpur 26.4505, 80.1912)

Gated strictly by DEV_MODE=1.
"""
import os
import sys
import time

# Ensure backend/app is importable
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT_DIR, "backend"))

from app import config
from app.db import db
from app.security import hash_password

KANPUR_LAT = 26.4505
KANPUR_LNG = 80.1912


def seed_test_users():
    if not config.DEV_MODE and os.environ.get("DEV_MODE") != "1":
        print("Skipping seed: DEV_MODE is not 1 (seed is disabled in production).")
        return False

    now = time.time()
    pass_hash = hash_password("123456789")

    users_to_seed = [
        {
            "phone": "9837101838",
            "role": "worker",
            "name": "Anurag Mistri",
            "skill": "rajmistri",
            "daily_rate": 500
        },
        {
            "phone": "9837101839",
            "role": "customer",
            "name": "Anurag Customer",
            "skill": None,
            "daily_rate": 0
        },
        {
            "phone": "9837101840",
            "role": "contractor",
            "name": "Anurag Thekedar",
            "company": "Anurag Constructions",
            "skill": "rajmistri,painter",
            "daily_rate": 0
        }
    ]

    with db() as c:
        for u in users_to_seed:
            row = c.execute("SELECT id FROM users WHERE phone=?", (u["phone"],)).fetchone()
            if row:
                uid = row["id"]
                c.execute(
                    "UPDATE users SET role=?, name=?, password_hash=? WHERE id=?",
                    (u["role"], u["name"], pass_hash, uid)
                )
                print(f"Updated user: {u['phone']} ({u['role']}) id={uid}")
            else:
                cur = c.execute(
                    "INSERT INTO users (phone, role, name, is_admin, password_hash, created_at) "
                    "VALUES (?, ?, ?, 0, ?, ?)",
                    (u["phone"], u["role"], u["name"], pass_hash, now)
                )
                uid = cur.lastrowid
                print(f"Created user: {u['phone']} ({u['role']}) id={uid}")

            # Profile setup
            if u["role"] == "worker":
                c.execute(
                    "INSERT INTO worker_profiles (user_id, skills, daily_rate, experience_years, village, lat, lng, radius_km, status, free_until, status_updated) "
                    "VALUES (?, ?, ?, 5, 'Kanpur', ?, ?, 25, 'free', ?, ?) "
                    "ON CONFLICT(user_id) DO UPDATE SET "
                    "skills=excluded.skills, daily_rate=excluded.daily_rate, village=excluded.village, "
                    "lat=excluded.lat, lng=excluded.lng, status='free', free_until=excluded.free_until",
                    (uid, u["skill"], u["daily_rate"], KANPUR_LAT, KANPUR_LNG, now + 86400 * 30, now)
                )
            elif u["role"] == "contractor":
                c.execute(
                    "INSERT INTO contractor_profiles (user_id, company, skills, village, lat, lng, radius_km, min_budget, experience_years, about) "
                    "VALUES (?, ?, ?, 'Kanpur', ?, ?, 50, 10000, 7, 'Specialist in house construction and finishing') "
                    "ON CONFLICT(user_id) DO UPDATE SET "
                    "company=excluded.company, skills=excluded.skills, village=excluded.village, lat=excluded.lat, lng=excluded.lng",
                    (uid, u.get("company", ""), u.get("skill", ""), KANPUR_LAT, KANPUR_LNG)
                )

    print("Test users seeded successfully.")
    return True


if __name__ == "__main__":
    seed_test_users()
