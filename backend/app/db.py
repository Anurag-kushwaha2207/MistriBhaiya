import sqlite3
from contextlib import contextmanager
from . import config

USERS_DDL = """CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('worker','customer','contractor')),
  password_hash TEXT DEFAULT '',
  lang TEXT DEFAULT 'hi',
  is_admin INTEGER DEFAULT 0,
  avatar TEXT DEFAULT '',
  created_at REAL NOT NULL
);
"""

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('worker','customer','contractor')),
  password_hash TEXT DEFAULT '',
  lang TEXT DEFAULT 'hi',
  is_admin INTEGER DEFAULT 0,
  avatar TEXT DEFAULT '',
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS otps(
  phone TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires REAL NOT NULL, attempts INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS worker_profiles(
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  skills TEXT DEFAULT '',
  daily_rate INTEGER DEFAULT 0,
  experience_years INTEGER DEFAULT 0,
  village TEXT DEFAULT '',
  lat REAL, lng REAL,
  radius_km REAL DEFAULT 6,
  status TEXT DEFAULT 'offline' CHECK(status IN ('free','busy','offline')),
  free_until REAL DEFAULT 0,
  status_updated REAL DEFAULT 0,
  rating_avg REAL DEFAULT 0, rating_count INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wp_geo ON worker_profiles(lat, lng);
CREATE TABLE IF NOT EXISTS jobs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  skill TEXT NOT NULL, description TEXT DEFAULT '',
  lat REAL NOT NULL, lng REAL NOT NULL, address TEXT DEFAULT '',
  start_date TEXT NOT NULL, days INTEGER DEFAULT 1, budget INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','assigned','done','cancelled')),
  created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_geo ON jobs(lat, lng);
CREATE TABLE IF NOT EXISTS bookings(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER REFERENCES jobs(id),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  worker_id INTEGER NOT NULL REFERENCES users(id),
  skill TEXT NOT NULL, note TEXT DEFAULT '', address TEXT DEFAULT '',
  lat REAL, lng REAL,
  start_date TEXT NOT NULL, days INTEGER DEFAULT 1, agreed_rate INTEGER DEFAULT 0,
  status TEXT DEFAULT 'requested' CHECK(status IN ('requested','accepted','work_done','completed','rejected','cancelled')),
  rating INTEGER, review TEXT DEFAULT '',
  created_at REAL NOT NULL, updated_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_b_worker ON bookings(worker_id, status);
CREATE TABLE IF NOT EXISTS job_interests(
  job_id INTEGER NOT NULL REFERENCES jobs(id), worker_id INTEGER NOT NULL REFERENCES users(id),
  created_at REAL NOT NULL, PRIMARY KEY(job_id, worker_id)
);
CREATE TABLE IF NOT EXISTS instant_requests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL, skill TEXT NOT NULL, note TEXT DEFAULT '', address TEXT DEFAULT '',
  lat REAL NOT NULL, lng REAL NOT NULL, radius_km REAL NOT NULL, days INTEGER DEFAULT 1,
  status TEXT DEFAULT 'searching' CHECK(status IN ('searching','matched','no_worker','cancelled')),
  wave INTEGER DEFAULT 1, wave_started REAL NOT NULL, worker_id INTEGER, booking_id INTEGER,
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS instant_offers(
  request_id INTEGER NOT NULL, worker_id INTEGER NOT NULL, wave INTEGER NOT NULL,
  status TEXT DEFAULT 'sent', distance_km REAL, created_at REAL NOT NULL, PRIMARY KEY(request_id, worker_id)
);
CREATE TABLE IF NOT EXISTS reports(
  id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id INTEGER NOT NULL, reported_id INTEGER NOT NULL,
  booking_id INTEGER, reason TEXT NOT NULL, created_at REAL NOT NULL, status TEXT DEFAULT 'open'
);
CREATE TABLE IF NOT EXISTS sos_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, booking_id INTEGER, lat REAL, lng REAL,
  created_at REAL NOT NULL, status TEXT DEFAULT 'open'
);
CREATE TABLE IF NOT EXISTS offers(
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, ref_id INTEGER NOT NULL, from_id INTEGER NOT NULL,
  rate INTEGER NOT NULL, days INTEGER NOT NULL, note TEXT DEFAULT '', created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, ref_id INTEGER NOT NULL, from_id INTEGER NOT NULL,
  text TEXT NOT NULL, created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_msg ON messages(kind, ref_id);
CREATE TABLE IF NOT EXISTS contractor_profiles(
  user_id INTEGER PRIMARY KEY, company TEXT DEFAULT '', skills TEXT DEFAULT '', village TEXT DEFAULT '',
  lat REAL, lng REAL, radius_km REAL DEFAULT 25, min_budget INTEGER DEFAULT 0, experience_years INTEGER DEFAULT 0,
  about TEXT DEFAULT '', rating_avg REAL DEFAULT 0, rating_count INTEGER DEFAULT 0, verified INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS crew_members(
  id INTEGER PRIMARY KEY AUTOINCREMENT, contractor_id INTEGER NOT NULL, worker_id INTEGER,
  name TEXT NOT NULL, phone TEXT DEFAULT '', skills TEXT DEFAULT '', daily_rate INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('invited','active','declined','removed')),
  notes TEXT DEFAULT '', created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_crew_c ON crew_members(contractor_id, status);
CREATE TABLE IF NOT EXISTS projects(
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, contractor_id INTEGER NOT NULL,
  title TEXT NOT NULL, description TEXT DEFAULT '', address TEXT DEFAULT '', lat REAL, lng REAL, skill TEXT DEFAULT '',
  start_date TEXT NOT NULL, days INTEGER DEFAULT 1, budget INTEGER DEFAULT 0, workers_needed INTEGER DEFAULT 1,
  status TEXT DEFAULT 'requested' CHECK(status IN ('requested','accepted','in_progress','completed','rejected','cancelled')),
  offer_by INTEGER, offer_rounds INTEGER DEFAULT 0, rating INTEGER, review TEXT DEFAULT '',
  created_at REAL NOT NULL, updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS project_crew(project_id INTEGER NOT NULL, crew_id INTEGER NOT NULL, daily_rate INTEGER DEFAULT 0, PRIMARY KEY(project_id, crew_id));
CREATE TABLE IF NOT EXISTS attendance(project_id INTEGER NOT NULL, crew_id INTEGER NOT NULL, day TEXT NOT NULL, present INTEGER DEFAULT 1, wage INTEGER DEFAULT 0, PRIMARY KEY(project_id, crew_id, day));
CREATE TABLE IF NOT EXISTS ledger(
  id INTEGER PRIMARY KEY AUTOINCREMENT, contractor_id INTEGER NOT NULL, crew_id INTEGER NOT NULL, project_id INTEGER,
  kind TEXT NOT NULL CHECK(kind IN ('advance','payment')), amount INTEGER NOT NULL, note TEXT DEFAULT '', created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS project_milestones(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'released')),
  due_date TEXT,
  created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_milestones_proj ON project_milestones(project_id);
CREATE TABLE IF NOT EXISTS assistant_sessions(user_id INTEGER PRIMARY KEY, lang TEXT DEFAULT 'hi', state TEXT DEFAULT '{}', updated_at REAL);
CREATE TABLE IF NOT EXISTS call_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caller_id INTEGER NOT NULL, callee_id INTEGER NOT NULL, booking_id INTEGER,
  provider TEXT, provider_call_id TEXT DEFAULT '', status TEXT DEFAULT '', created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at REAL NOT NULL,
  read INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notifications_u ON notifications(user_id, read);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id),
  project_id INTEGER REFERENCES projects(id),
  milestone_id INTEGER REFERENCES project_milestones(id),
  customer_id INTEGER NOT NULL REFERENCES users(id),
  worker_id INTEGER REFERENCES users(id),
  amount_paise INTEGER NOT NULL,
  fee_paise INTEGER NOT NULL DEFAULT 0,
  net_paise INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'created' CHECK(status IN ('created','held','released','refunded','failed','cash_pending','cash_confirmed')),
  gateway TEXT DEFAULT 'razorpay',
  gateway_order_id TEXT DEFAULT '',
  gateway_payment_id TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'online',
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_b ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_c ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_w ON payments(worker_id);
CREATE TABLE IF NOT EXISTS payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  payment_id INTEGER REFERENCES payments(id),
  amount_paise INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processed','failed')),
  created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payouts_u ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_b_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_b_job ON bookings(job_id);
CREATE INDEX IF NOT EXISTS idx_offers_ref ON offers(kind, ref_id);
CREATE INDEX IF NOT EXISTS idx_crew_worker ON crew_members(worker_id);
CREATE INDEX IF NOT EXISTS idx_att_proj ON attendance(project_id);
"""

def connect():
    c = sqlite3.connect(config.DB_PATH, check_same_thread=False, timeout=15)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    c.execute("PRAGMA journal_mode=WAL")
    return c

@contextmanager
def db():
    c = connect()
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()

def _add_cols(c, table, items):
    cols = {r["name"] for r in c.execute(f"PRAGMA table_info({table})")}
    for name, ddl in items:
        if name not in cols:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")

def migrate(c):
    """Upgrades databases created by older versions (safe to run on every start)."""
    # users.role CHECK must allow 'contractor': SQLite cannot alter a CHECK, so rebuild the table once.
    sql = c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").fetchone()
    if sql and "'contractor'" not in sql["sql"]:
        c.commit()
        c.execute("PRAGMA foreign_keys=OFF")
        c.execute(USERS_DDL.replace("IF NOT EXISTS users(", "users_new(").replace("CREATE TABLE users_new(", "CREATE TABLE users_new(", 1))
        cols = {r["name"] for r in c.execute("PRAGMA table_info(users)")}
        av_col = "avatar" if "avatar" in cols else "'' AS avatar"
        pw_col = "password_hash" if "password_hash" in cols else "'' AS password_hash"
        c.execute(f"INSERT INTO users_new(id,phone,name,role,password_hash,lang,is_admin,avatar,created_at) SELECT id,phone,name,role,{pw_col},lang,is_admin,{av_col},created_at FROM users")
        c.execute("DROP TABLE users")
        c.execute("ALTER TABLE users_new RENAME TO users")
        c.commit()
        c.execute("PRAGMA foreign_keys=ON")

    _add_cols(c, "users", [("password_hash", "TEXT DEFAULT ''"), ("avatar", "TEXT DEFAULT ''")])
    _add_cols(c, "bookings", [("start_otp", "TEXT DEFAULT ''"), ("started_at", "REAL"), ("instant_id", "INTEGER"),
                              ("offer_by", "INTEGER"), ("offer_rounds", "INTEGER DEFAULT 0")])
    _add_cols(c, "job_interests", [("rate", "INTEGER DEFAULT 0")])

    c.execute("""CREATE TABLE IF NOT EXISTS notifications(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at REAL NOT NULL,
      read INTEGER DEFAULT 0
    )""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_notifications_u ON notifications(user_id, read)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_b_customer ON bookings(customer_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_b_job ON bookings(job_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_offers_ref ON offers(kind, ref_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_crew_worker ON crew_members(worker_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_att_proj ON attendance(project_id)")

    c.execute("""CREATE TABLE IF NOT EXISTS project_milestones(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      percentage INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'released')),
      due_date TEXT,
      created_at REAL NOT NULL
    )""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_milestones_proj ON project_milestones(project_id)")

def init_db():
    with db() as c:
        c.executescript(SCHEMA)
        migrate(c)
