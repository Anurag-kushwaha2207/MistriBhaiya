
import sqlite3
import shutil
from pathlib import Path

db = Path("kaamsetu.db")

if not db.exists():
    raise SystemExit("kaamsetu.db nahi mili. Koi change nahi hua.")

backup = Path("kaamsetu_backup_before_admin.db")
if not backup.exists():
    shutil.copy2(db, backup)
    print("Backup ban gaya:", backup.resolve())

phone = input("Apna registered mobile number enter karein: ")
phone = "".join(c for c in phone if c.isdigit())[-10:]

if len(phone) != 10:
    raise SystemExit("Number galat hai. Koi change nahi hua.")

with sqlite3.connect(db) as con:
    con.row_factory = sqlite3.Row

    user = con.execute(
        "SELECT id, phone, role, is_admin FROM users WHERE phone=?",
        (phone,)
    ).fetchone()

    if user is None:
        print("Account is database mein nahi mila.")
        raise SystemExit(0)

    print("Account mila.")
    print("Current admin status:", user["is_admin"])

    confirm = input("Is account ko admin banana hai? YES likhein: ")
    if confirm == "YES":
        con.execute(
            "UPDATE users SET is_admin=1 WHERE id=?",
            (user["id"],)
        )
        print("Admin status update ho gaya.")
    else:
        print("Cancelled. Koi change nahi hua.")
