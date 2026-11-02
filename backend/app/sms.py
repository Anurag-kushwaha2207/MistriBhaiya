import json, urllib.request
from . import config

def send_otp_sms(phone: str, code: str):
    if config.SMS_PROVIDER == "msg91":
        # MSG91 Flow API. Create a DLT-registered OTP template first. Verify field names in MSG91 docs.
        body = json.dumps({"template_id": config.MSG91_TEMPLATE_ID,
                           "recipients": [{"mobiles": "91" + phone, "var": code}]}).encode()
        req = urllib.request.Request("https://control.msg91.com/api/v5/flow/", data=body,
                                     headers={"authkey": config.MSG91_AUTHKEY, "content-type": "application/json"})
        urllib.request.urlopen(req, timeout=10).read()
    else:
        print(f"[SMS-console] OTP for {phone}: {code}")
