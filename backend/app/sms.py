import json, logging, urllib.request
from . import config

logger = logging.getLogger("kaamsetu.sms")

def send_otp_sms(phone: str, code: str):
    if config.SMS_PROVIDER == "msg91":
        # MSG91 Flow API with DLT-registered OTP template
        try:
            body = json.dumps({
                "template_id": config.MSG91_TEMPLATE_ID,
                "short_url": "0",
                "recipients": [{"mobiles": "91" + phone, "otp": code, "var": code}]
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://control.msg91.com/api/v5/flow/",
                data=body,
                headers={"authkey": config.MSG91_AUTHKEY, "content-type": "application/json"}
            )
            resp = urllib.request.urlopen(req, timeout=10)
            logger.info("MSG91 OTP sent to %s, status=%s", phone, resp.status)
        except Exception as e:
            logger.error("Failed to send MSG91 OTP to %s: %s", phone, e)
    else:
        if not config.DEV_MODE:
            # In production with SMS_PROVIDER=console: log a warning but still let the OTP
            # be stored in the DB. The user WON'T receive an SMS. This is a configuration error.
            logger.error(
                "SMS_PROVIDER=console in production! OTP for %s will NOT be delivered. "
                "Set SMS_PROVIDER=msg91 and configure MSG91 credentials in Render Dashboard.",
                phone
            )
        else:
            print(f"[SMS-console] OTP for {phone}: {code}")
