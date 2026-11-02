"""Calling layer.
direct : returns a tel: link (reveals the real number). Cheapest. Use in the pilot only.
exotel : masked call. Exotel rings the CALLER first, then connects to the CALLEE; both see your virtual number.
Add more providers (Knowlarity, MyOperator, Twilio ...) by copying the exotel() function.
"""
import base64, json, urllib.parse, urllib.request
from . import config

def connect_call(caller_phone: str, callee_phone: str):
    if config.CALL_PROVIDER == "exotel":
        return exotel(caller_phone, callee_phone)
    return {"mode": "direct", "provider": "direct", "tel": "tel:+91" + callee_phone, "provider_call_id": ""}

def exotel(caller_phone, callee_phone):
    url = f"https://{config.EXOTEL_SUBDOMAIN}/v1/Accounts/{config.EXOTEL_SID}/Calls/connect.json"
    data = urllib.parse.urlencode({"From": "0" + caller_phone, "To": "0" + callee_phone,
                                   "CallerId": config.EXOTEL_EXOPHONE}).encode()
    req = urllib.request.Request(url, data=data)
    auth = base64.b64encode(f"{config.EXOTEL_API_KEY}:{config.EXOTEL_API_TOKEN}".encode()).decode()
    req.add_header("Authorization", "Basic " + auth)
    with urllib.request.urlopen(req, timeout=15) as r:
        resp = json.loads(r.read().decode() or "{}")
    sid = (resp.get("Call") or {}).get("Sid", "")
    return {"mode": "masked", "provider": "exotel", "provider_call_id": sid,
            "message": "Aapke phone par call aa rahi hai. Utha lijiye."}
