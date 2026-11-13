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
    elif config.SMS_PROVIDER == "fast2sms" or config.FAST2SMS_API_KEY:
        # Fast2SMS OTP Route (Quick Indian SMS delivery directly to mobile handsets)
        try:
            body = json.dumps({
                "route": "otp",
                "variables_values": code,
                "numbers": phone
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://www.fast2sms.com/dev/bulkV2",
                data=body,
                headers={
                    "authorization": config.FAST2SMS_API_KEY,
                    "content-type": "application/json"
                }
            )
            resp = urllib.request.urlopen(req, timeout=10)
            logger.info("Fast2SMS OTP sent to %s, status=%s", phone, resp.status)
        except Exception as e:
            logger.error("Failed to send Fast2SMS OTP to %s: %s", phone, e)
    else:
        print(f"[SMS-console] OTP for {phone}: {code}")
        if not config.DEV_MODE:
            logger.info("SMS_PROVIDER=console: Real SMS provider not configured. OTP for %s is: %s", phone, code)
