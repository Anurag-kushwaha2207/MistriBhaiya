"""All settings come from environment variables (see .env.example)."""
import os

def _b(name, default="0"):
    return os.getenv(name, default).lower() in ("1", "true", "yes")

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
DB_PATH = os.getenv("DB_PATH", "kaamsetu.db")
DEV_MODE = _b("DEV_MODE", "1")            # DEV_MODE=1 returns the OTP in the API response. NEVER use in production.
ADMIN_PHONES = {p.strip() for p in os.getenv("ADMIN_PHONES", "").split(",") if p.strip()}

DEFAULT_RADIUS_KM = float(os.getenv("DEFAULT_RADIUS_KM", "6"))
MAX_RADIUS_KM = float(os.getenv("MAX_RADIUS_KM", "100"))
FREE_DEFAULT_HOURS = float(os.getenv("FREE_DEFAULT_HOURS", "12"))   # "I am free" auto-expires after this many hours
TOKEN_DAYS = int(os.getenv("TOKEN_DAYS", "60"))

SMS_PROVIDER = os.getenv("SMS_PROVIDER", "console")     # console | msg91
MSG91_AUTHKEY = os.getenv("MSG91_AUTHKEY", "")
MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID", "")   # DLT-approved OTP template

CALL_PROVIDER = os.getenv("CALL_PROVIDER", "direct")     # direct | exotel
EXOTEL_SID = os.getenv("EXOTEL_SID", "")
EXOTEL_API_KEY = os.getenv("EXOTEL_API_KEY", "")
EXOTEL_API_TOKEN = os.getenv("EXOTEL_API_TOKEN", "")
EXOTEL_SUBDOMAIN = os.getenv("EXOTEL_SUBDOMAIN", "api.exotel.com")
EXOTEL_EXOPHONE = os.getenv("EXOTEL_EXOPHONE", "")       # your virtual number (caller id for both legs)

# Rapido-style instant dispatch
INSTANT_WAVE_SECONDS = float(os.getenv("INSTANT_WAVE_SECONDS", "30"))   # how long each wave of offers stays open
INSTANT_WAVE_SIZE = int(os.getenv("INSTANT_WAVE_SIZE", "5"))            # offers sent per wave (nearest free workers first)
INSTANT_MAX_WAVES = int(os.getenv("INSTANT_MAX_WAVES", "3"))
REQUIRE_START_OTP = _b("REQUIRE_START_OTP", "1")                        # worker must enter customer's OTP to start work

# In-app voice calling (WebRTC). STUN is free. For reliable calls on mobile data add a TURN server (e.g. coturn, Twilio, Metered).
STUN_URLS = os.getenv("STUN_URLS", "stun:stun.l.google.com:19302")
TURN_URL = os.getenv("TURN_URL", "")
TURN_USER = os.getenv("TURN_USER", "")
TURN_PASS = os.getenv("TURN_PASS", "")

# Optional LLM help for the assistant (free-text understanding). Leave empty to use the built-in rule based assistant only.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ASSISTANT_MODEL = os.getenv("ASSISTANT_MODEL", "claude-sonnet-4-6")
