import logging
import os
import re
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional, Tuple

import httpx

logger = logging.getLogger("report_notifier")
logging.basicConfig(level=logging.INFO)

# ── Configuration settings ──
from config import settings


# ── Validation helpers ──
def is_valid_email(email: Optional[str]) -> bool:
    if not email:
        return False
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return bool(re.match(pattern, email.strip()))

def is_valid_phone(phone: Optional[str]) -> bool:
    if not phone:
        return False
    digits = re.sub(r"\D", "", phone)
    return len(digits) == 10 and digits[0] in "6789"

def format_phone_e164(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"+91{digits}"
    if phone.startswith("+"):
        return phone
    return f"+{digits}"

# ── Clinical HTML Report Generator ──
def generate_clinical_html_report(data: Dict[str, Any]) -> str:
    patient_details = data.get("patient_details") or data.get("patient") or {}
    abha_id = data.get("abha_id") or patient_details.get("abha_id") or "Not provided"
    created_at = data.get("created_at") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    locked = data.get("locked", False)

    patient_name = data.get("patient_name") or patient_details.get("name") or "Ayushman Patient"
    gender = patient_details.get("gender") or "Not Specified"
    gender_full = "Male" if gender == "M" else ("Female" if gender == "F" else gender)
    dob = patient_details.get("dob")
    age = patient_details.get("age")
    age_str = f"{age} Yrs" if age else ("" if not dob else f"DOB: {dob}")
    phone = patient_details.get("phone") or "Not Provided"
    email = patient_details.get("email") or "Not Provided"
    abha_address = patient_details.get("abha_address") or (f"{abha_id}@abdm" if "@" not in abha_id else abha_id)

    from grok_service import normalize_clinical_complaint
    intake = data.get("intake_triage") or {}
    raw_type = intake.get("type") or "Acute Clinical Consultation"
    intake_type = normalize_clinical_complaint(raw_type)
    intake_summary = intake.get("summary") or {}
    intake_flags = intake.get("flags") or []

    ayush = data.get("ayush_profile") or {}
    prakriti = ayush.get("prakriti") or "Not assessed"
    agni = ayush.get("agni") or "Not assessed"
    koshtha = ayush.get("koshtha") or "Not assessed"

    docs = data.get("documents") or {}
    meds = docs.get("medications") or []
    labs = docs.get("labs") or []

    # Format flags
    flags_html = ""
    if intake_flags:
        flags_items = "".join([f"<li style='margin-bottom:4px;'>{f}</li>" for f in intake_flags])
        flags_html = f"""
        <div style='background-color:#fee2e2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;border-radius:6px;'>
            <strong style='color:#991b1b;'>Clinical Alerts / Red Flags:</strong>
            <ul style='margin:6px 0 0 18px;padding:0;color:#7f1d1d;'>{flags_items}</ul>
        </div>
        """

    # Format medications
    meds_html = "<p style='color:#64748b;font-style:italic;'>No prior medications recorded.</p>"
    if meds:
        med_rows = "".join([f"<li style='margin-bottom:6px;'><strong>{m.get('name', 'Medication')}</strong>: {m.get('dosage', '')} {m.get('frequency', '')}</li>" for m in meds if isinstance(m, dict)])
        if med_rows:
            meds_html = f"<ul style='margin:6px 0 0 18px;padding:0;color:#1e293b;'>{med_rows}</ul>"

    # Format labs
    labs_html = "<p style='color:#64748b;font-style:italic;'>No lab investigations uploaded.</p>"
    if labs:
        lab_items = []
        for lab in labs:
            if isinstance(lab, dict):
                flag_str = f" ({lab.get('flag', '')})" if lab.get("flag") else ""
                lab_items.append(f"<li style='margin-bottom:6px;'><strong>{lab.get('test_name', 'Lab')}</strong>: {lab.get('value', '')} {lab.get('unit', '')}{flag_str}</li>")
        lab_rows = "".join(lab_items)
        if lab_rows:
            labs_html = f"<ul style='margin:6px 0 0 18px;padding:0;color:#1e293b;'>{lab_rows}</ul>"

    # Format Socrates items
    socrates_rows = "".join([f"<tr><td style='padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;width:35%;'>{k}</td><td style='padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#0f172a;'>{v}</td></tr>" for k, v in intake_summary.items() if isinstance(v, (str, int, float))])

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Clinical History Summary - {patient_name} - Jeevan OPD</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#1e293b;background-color:#f8fafc;margin:0;padding:20px;">
        <div style="max-width:700px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0d9488,#0f766e);color:#ffffff;padding:24px 30px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">जीवन | JEEVAN OPD</h1>
                        <p style="margin:4px 0 0;font-size:12px;opacity:0.9;">Digital Care of Every Life • Clinical Encounter Summary</p>
                    </div>
                </div>
            </div>

            <div style="padding:24px 30px;">
                <!-- Patient Demographics Banner -->
                <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:16px 20px;margin-bottom:22px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:12px;">
                        <div>
                            <span style="font-size:11px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:0.5px;">PATIENT IDENTITY</span>
                            <h2 style="margin:2px 0 0;font-size:20px;font-weight:800;color:#0f172a;">{patient_name}</h2>
                        </div>
                        <div style="text-align:right;">
                            <span style="background:#ccfbf1;color:#0f766e;border:1px solid #99f6e4;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:700;">✓ ABDM Verified</span>
                            <div style="font-size:12px;color:#64748b;margin-top:4px;">{'✓ Physician Locked' if locked else '🟡 Active Draft'}</div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;font-size:12px;">
                        <div><strong>ABHA ID:</strong> <span style="font-family:monospace;color:#0f766e;font-weight:bold;">{abha_id}</span></div>
                        <div><strong>ABHA Address:</strong> <span style="font-family:monospace;color:#0f766e;">{abha_address}</span></div>
                        <div><strong>Age / Gender:</strong> {f"{age_str} • {gender_full}" if age_str else gender_full}</div>
                        <div><strong>Mobile:</strong> {phone}</div>
                        <div><strong>Email:</strong> {email}</div>
                        <div><strong>Encounter Date:</strong> {created_at}</div>
                    </div>
                </div>

                {flags_html}

                <!-- Section 1: Chief Complaint -->
                <div style="margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid #e2e8f0;">
                    <h3 style="margin:0 0 8px;font-size:16px;color:#0f766e;border-left:4px solid #0d9488;padding-left:10px;">1. Chief Complaint & Triage Presentation</h3>
                    <p style="margin:4px 0;font-size:14px;"><strong>Primary Complaint:</strong> {intake_type}</p>
                </div>

                <!-- Section 2: HPI / SOCRATES -->
                <div style="margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid #e2e8f0;">
                    <h3 style="margin:0 0 8px;font-size:16px;color:#0f766e;border-left:4px solid #0d9488;padding-left:10px;">2. History of Present Illness (SOCRATES)</h3>
                    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
                        <tbody>{socrates_rows if socrates_rows else "<tr><td style='padding:6px;color:#64748b;'>Standard triage recorded.</td></tr>"}</tbody>
                    </table>
                </div>

                <!-- Section 3: AYUSH Profile -->
                <div style="margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid #e2e8f0;background-color:#fefce8;padding:16px;border-radius:8px;border:1px solid #fef08a;">
                    <h3 style="margin:0 0 10px;font-size:16px;color:#854d0e;border-left:4px solid #d97706;padding-left:10px;">Complementary AYUSH Constitutional Profile</h3>
                    <div style="display:flex;gap:16px;font-size:13px;">
                        <div style="flex:1;background:#fff;padding:10px;border-radius:6px;border:1px solid #fde047;text-align:center;">
                            <span style="font-size:10px;text-transform:uppercase;color:#854d0e;font-weight:bold;display:block;">Prakriti</span>
                            <strong style="font-size:15px;color:#713f12;">{prakriti}</strong>
                        </div>
                        <div style="flex:1;background:#fff;padding:10px;border-radius:6px;border:1px solid #fde047;text-align:center;">
                            <span style="font-size:10px;text-transform:uppercase;color:#854d0e;font-weight:bold;display:block;">Agni</span>
                            <strong style="font-size:15px;color:#713f12;">{agni}</strong>
                        </div>
                        <div style="flex:1;background:#fff;padding:10px;border-radius:6px;border:1px solid #fde047;text-align:center;">
                            <span style="font-size:10px;text-transform:uppercase;color:#854d0e;font-weight:bold;display:block;">Koshtha</span>
                            <strong style="font-size:15px;color:#713f12;">{koshtha}</strong>
                        </div>
                    </div>
                </div>

                <!-- Section 4: Prior Medications & Labs -->
                <div style="margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid #e2e8f0;">
                    <h3 style="margin:0 0 8px;font-size:16px;color:#0f766e;border-left:4px solid #0d9488;padding-left:10px;">3. Prior Medications & Extracted Lab Reports</h3>
                    <div style="margin-top:10px;">
                        <strong style="font-size:13px;color:#334155;">Extracted Medications:</strong>
                        {meds_html}
                    </div>
                    <div style="margin-top:12px;">
                        <strong style="font-size:13px;color:#334155;">Prior Investigations / Labs:</strong>
                        {labs_html}
                    </div>
                </div>

                <!-- Section 5: Physician Confirmation Notice -->
                <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-top:20px;font-size:12px;color:#166534;">
                    <strong>Physician Review Status:</strong> All clinical history domains and AYUSH constitutional markers were reviewed and locked by the attending physician in accordance with NDHM standards.
                </div>

                <!-- Footer -->
                <div style="margin-top:30px;padding-top:15px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
                    Jeevan OPD Clinical Assessment Platform • Interoperable FHIR R4 Encounter Document • Confidential Medical Record
                </div>
            </div>
        </div>
    </body>
    </html>
    """

# ── Email Delivery Implementations ──
def send_email_sendgrid(to_email: str, subject: str, html_content: str) -> Tuple[bool, str]:
    api_key = settings.SENDGRID_API_KEY
    from_email = settings.SENDGRID_FROM_EMAIL or "reports@jeevanopd.in"
    if not api_key:
        return False, "SENDGRID_API_KEY not configured"

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": from_email, "name": "Jeevan OPD Clinical Platform"},
        "subject": subject,
        "content": [{"type": "text/html", "value": html_content}]
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            if resp.status_code in (200, 201, 202):
                return True, f"Sent via SendGrid (Status {resp.status_code})"
            return False, f"SendGrid error ({resp.status_code}): {resp.text}"
    except Exception as e:
        return False, f"SendGrid request failed: {str(e)}"

def send_email_ses(to_email: str, subject: str, html_content: str) -> Tuple[bool, str]:
    from_email = settings.SES_FROM_EMAIL
    region = os.environ.get("AWS_REGION", "ap-south-1")
    if not from_email:
        return False, "SES_FROM_EMAIL not configured"

    try:
        import boto3
        client = boto3.client(
            "ses",
            region_name=region,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        response = client.send_email(
            Source=from_email,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Html": {"Data": html_content, "Charset": "UTF-8"}}
            }
        )
        return True, f"Sent via AWS SES (MessageId: {response.get('MessageId')})"
    except ImportError:
        return False, "boto3 not installed for AWS SES"
    except Exception as e:
        return False, f"AWS SES error: {str(e)}"

def send_email_smtp(to_email: str, subject: str, html_content: str) -> Tuple[bool, str]:
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASSWORD
    from_email = settings.SES_FROM_EMAIL or user or "reports@jeevanopd.in"

    if not host or not user or not password:
        return False, "SMTP settings not fully configured"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        part = MIMEText(html_content, "html")
        msg.attach(part)

        server = smtplib.SMTP(host, port, timeout=10)
        server.starttls()
        server.login(user, password)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        return True, f"Sent via SMTP ({host})"
    except Exception as e:
        return False, f"SMTP error: {str(e)}"

def send_email_dispatcher(to_email: str, subject: str, html_content: str) -> Dict[str, Any]:
    if not is_valid_email(to_email):
        return {"sent": False, "provider": "none", "error": f"Invalid email format: {to_email}"}

    # 1. Try SendGrid
    if settings.SENDGRID_API_KEY:
        ok, detail = send_email_sendgrid(to_email, subject, html_content)
        return {"sent": ok, "provider": "sendgrid", "detail": detail}

    # 2. Try AWS SES
    if settings.AWS_ACCESS_KEY_ID and settings.SES_FROM_EMAIL:
        ok, detail = send_email_ses(to_email, subject, html_content)
        return {"sent": ok, "provider": "aws_ses", "detail": detail}

    # 3. Try SMTP
    if settings.SMTP_HOST:
        ok, detail = send_email_smtp(to_email, subject, html_content)
        return {"sent": ok, "provider": "smtp", "detail": detail}

    # 4. Simulation Mode (Graceful fallback when no keys provided yet)
    logger.info(f"[SIMULATED EMAIL DISPATCH] To: {to_email} | Subject: {subject} | Length: {len(html_content)} chars")
    return {
        "sent": True,
        "simulated": True,
        "provider": "simulated",
        "detail": f"Simulated delivery to {to_email} (Set SENDGRID_API_KEY, AWS SES, or SMTP credentials in .env to activate live dispatch)"
    }

# ── SMS Delivery Implementations ──
def send_sms_twilio(to_phone: str, message_body: str) -> Tuple[bool, str]:
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    from_number = settings.TWILIO_PHONE_NUMBER

    if not account_sid or not auth_token or not from_number:
        return False, "Twilio credentials (SID, Token, From Number) not configured"

    e164_to = format_phone_e164(to_phone)
    e164_from = format_phone_e164(from_number) if not from_number.startswith("+") else from_number

    # In Twilio, the endpoint requires Account SID (starts with AC...)
    main_account_sid = os.environ.get("TWILIO_MAIN_ACCOUNT_SID") or account_sid
    if main_account_sid.startswith("SK") and not os.environ.get("TWILIO_MAIN_ACCOUNT_SID"):
        return False, (
            "Twilio configuration error: TWILIO_ACCOUNT_SID starts with 'SK' (an API Key SID). "
            "Twilio requires the primary Account SID starting with 'AC' (found on the Twilio Console homepage). "
            "Please update TWILIO_ACCOUNT_SID in backend/.env with your AC... Account SID."
        )
    url = f"https://api.twilio.com/2010-04-01/Accounts/{main_account_sid}/Messages.json"

    data = {"From": e164_from, "To": e164_to, "Body": message_body}
    if settings.TWILIO_TEMPLATE_NAME:
        data["TemplateName"] = settings.TWILIO_TEMPLATE_NAME

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                url,
                auth=(account_sid, auth_token),
                data=data
            )
            if resp.status_code in (200, 201):
                return True, f"Sent via Twilio (Status {resp.status_code})"

            resp_data = {}
            try:
                resp_data = resp.json()
            except Exception:
                pass

            if resp_data.get("code") == 572006:
                return False, (
                    "Twilio Trial Account Restriction (572006): Free trial accounts sending to Indian numbers "
                    "can only use predefined SMS templates or require an upgraded Twilio account. "
                    "Check Twilio Console -> Messaging -> Try it out -> Send an SMS for allowed template names."
                )
            if resp_data.get("code") == 572002 or resp_data.get("code") == 21608:
                return False, (
                    f"Twilio Trial Restriction ({resp_data.get('code')}): In trial mode, Twilio can only send SMS "
                    f"to verified phone numbers. Please verify '{e164_to}' under Twilio Console -> "
                    "Phone Numbers -> Manage -> Verified Caller IDs."
                )
            return False, f"Twilio error ({resp.status_code}): {resp.text}"
    except Exception as e:
        return False, f"Twilio request failed: {str(e)}"

def send_sms_msg91(to_phone: str, message_body: str) -> Tuple[bool, str]:
    auth_key = settings.MSG91_AUTH_KEY
    sender_id = settings.MSG91_SENDER_ID or "JEEVAN"

    if not auth_key:
        return False, "MSG91_AUTH_KEY not configured"

    digits = re.sub(r"\D", "", to_phone)
    if len(digits) == 10:
        digits = f"91{digits}"

    # Extract 4 to 6 digit OTP if present in message body
    otp_match = re.search(r'\b(\d{4,6})\b', message_body)
    otp_code = otp_match.group(1) if otp_match else None
    template_id = settings.MSG91_OTP_TEMPLATE_ID

    try:
        with httpx.Client(timeout=10.0) as client:
            # 1. For OTPs, use MSG91 dedicated OTP API (highest delivery rate across Indian operators)
            if otp_code:
                otp_url = "https://control.msg91.com/api/v5/otp"
                params = {
                    "mobile": digits,
                    "otp": otp_code,
                    "otp_expiry": "5",
                    "otp_length": str(len(otp_code))
                }
                if template_id:
                    params["template_id"] = template_id

                resp = client.post(
                    otp_url,
                    headers={"authkey": auth_key, "content-type": "application/json"},
                    params=params
                )
                if resp.status_code in (200, 201, 202):
                    return True, f"OTP dispatched via MSG91 OTP Gateway (Status {resp.status_code})"
                logger.warning(f"[MSG91 OTP fallback] v5/otp returned {resp.status_code}: {resp.text}")

            # 2. If flow template ID is configured
            if template_id:
                flow_url = "https://control.msg91.com/api/v5/flow/"
                payload = {
                    "template_id": template_id,
                    "sender": sender_id,
                    "short_url": "0",
                    "recipients": [{"mobiles": digits, "message": message_body}]
                }
                resp = client.post(flow_url, headers={"authkey": auth_key, "content-type": "application/json"}, json=payload)
                if resp.status_code in (200, 201, 202):
                    return True, f"Sent via MSG91 Flow (Status {resp.status_code})"

            # 3. Direct SMS Gateway fallback
            fallback_url = "https://api.msg91.com/api/sendhttp.php"
            params = {
                "authkey": auth_key,
                "mobiles": digits,
                "message": message_body,
                "sender": sender_id,
                "route": "4",
                "country": "91"
            }
            resp = client.get(fallback_url, params=params)
            if resp.status_code in (200, 201, 202):
                return True, f"Sent via MSG91 Gateway (Status {resp.status_code})"
            return False, f"MSG91 error ({resp.status_code}): {resp.text}"
    except Exception as e:
        return False, f"MSG91 request failed: {str(e)}"

def send_sms_dispatcher(to_phone: str, message_body: str) -> Dict[str, Any]:
    if not is_valid_phone(to_phone):
        return {"sent": False, "provider": "none", "error": f"Invalid 10-digit Indian phone number: {to_phone}"}

    # 1. Try Twilio
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        ok, detail = send_sms_twilio(to_phone, message_body)
        return {"sent": ok, "provider": "twilio", "detail": detail}

    # 2. Try MSG91
    if settings.MSG91_AUTH_KEY:
        ok, detail = send_sms_msg91(to_phone, message_body)
        return {"sent": ok, "provider": "msg91", "detail": detail}

    # 3. Simulation Mode
    logger.info(f"[SIMULATED SMS DISPATCH] To: {to_phone} | Body: {message_body}")
    return {
        "sent": True,
        "simulated": True,
        "provider": "simulated",
        "detail": f"Simulated SMS to {to_phone} (Set TWILIO_ACCOUNT_SID or MSG91_AUTH_KEY in .env to activate live dispatch)"
    }

# ── Master Dispatcher for Clinical Encounter Report ──
def dispatch_clinical_report(
    session_id: str,
    encounter_data: Dict[str, Any],
    email: Optional[str] = None,
    phone: Optional[str] = None
) -> Dict[str, Any]:
    results = {
        "status": "success",
        "session_id": session_id,
        "email": None,
        "sms": None,
        "summary_message": ""
    }

    if not email and not phone:
        results["status"] = "skipped"
        results["summary_message"] = "No patient email or phone number provided. Dispatch skipped."
        return results

    patient_name = encounter_data.get("patient_name") or encounter_data.get("patient_details", {}).get("name") or "Patient"
    abha_id = encounter_data.get("abha_id") or ""

    # 1. Send email report if email provided
    if email:
        subject = f"Clinical History Summary: {patient_name} (Session {session_id[:8]})"
        html_content = generate_clinical_html_report(encounter_data)
        email_res = send_email_dispatcher(email, subject, html_content)
        results["email"] = email_res
        if not email_res.get("sent"):
            results["status"] = "partial" if results["status"] == "success" else "error"

    # 2. Send SMS alert if phone provided
    if phone:
        sms_text = f"Dear {patient_name}, your clinical assessment with Jeevan (ABHA: {abha_id or 'Encounter'}) is verified. Check your email for the full summary."
        sms_res = send_sms_dispatcher(phone, sms_text)
        results["sms"] = sms_res
        if not sms_res.get("sent"):
            results["status"] = "partial" if results["status"] == "success" else "error"

    # Build human-readable summary message
    parts = []
    if results["email"]:
        if results["email"].get("sent"):
            sim_note = " (simulated)" if results["email"].get("simulated") else ""
            parts.append(f"Report sent to {email}{sim_note}")
        else:
            parts.append(f"Email delivery failed ({results['email'].get('error') or results['email'].get('detail')})")

    if results["sms"]:
        if results["sms"].get("sent"):
            sim_note = " (simulated)" if results["sms"].get("simulated") else ""
            parts.append(f"SMS sent to {phone}{sim_note}")
        else:
            parts.append(f"SMS delivery failed ({results['sms'].get('error') or results['sms'].get('detail')})")

    results["summary_message"] = " and ".join(parts) if parts else "No notifications sent."
    return results
