import base64, hashlib, hmac, json, re, secrets, time
from fastapi import Header, HTTPException
from . import config
from .db import db

def norm_phone(p: str) -> str:
    d = re.sub(r"\D", "", p or "")[-10:]
    if not re.fullmatch(r"[6-9]\d{9}", d):
        raise HTTPException(400, "Enter a valid 10-digit Indian mobile number")
    return d

def _sig(b: bytes) -> str:
    return hmac.new(config.SECRET_KEY.encode(), b, hashlib.sha256).hexdigest()

def make_token(uid: int) -> str:
    body = base64.urlsafe_b64encode(json.dumps({"uid": uid, "exp": time.time() + config.TOKEN_DAYS * 86400}).encode())
    return body.decode() + "." + _sig(body)

def read_token(tok: str):
    try:
        body, sig = tok.rsplit(".", 1)
        if not hmac.compare_digest(sig, _sig(body.encode())):
            return None
        d = json.loads(base64.urlsafe_b64decode(body.encode()))
        return d["uid"] if d["exp"] > time.time() else None
    except Exception:
        return None

def hash_otp(phone: str, code: str) -> str:
    return hashlib.sha256(f"{config.SECRET_KEY}:{phone}:{code}".encode()).hexdigest()

def new_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000}"

def hash_password(password: str) -> str:
    if not password:
        return ""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return f"{salt}:{key}"

def verify_password(password: str, hashed: str) -> bool:
    if not password or not hashed or ":" not in hashed:
        return False
    try:
        salt, key = hashed.split(":", 1)
        test_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
        return hmac.compare_digest(key, test_key)
    except Exception:
        return False

_rate = {}
def rate_limit(key: str, limit: int, window_s: int):
    now = time.time()
    hits = [t for t in _rate.get(key, []) if now - t < window_s]
    if len(hits) >= limit:
        raise HTTPException(429, "Too many attempts. Please try later.")
    hits.append(now)
    _rate[key] = hits

def check_lockout(key: str, limit: int, window_s: int):
    now = time.time()
    hits = [t for t in _rate.get(key, []) if now - t < window_s]
    if len(hits) >= limit:
        raise HTTPException(429, "Too many failed attempts. Temporarily locked for 15 minutes.")

def record_failure(key: str):
    now = time.time()
    hits = _rate.get(key, [])
    hits.append(now)
    _rate[key] = hits

def clear_failures(key: str):
    _rate.pop(key, None)

def current_user(authorization: str = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Login required")
    uid = read_token(authorization[7:])
    if not uid:
        raise HTTPException(401, "Session expired")
    with db() as c:
        u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not u:
        raise HTTPException(401, "User not found")
    return dict(u)
