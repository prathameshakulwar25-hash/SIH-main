from unittest.mock import patch

from report_notifier import (
    dispatch_clinical_report,
    format_phone_e164,
    generate_clinical_html_report,
    is_valid_email,
    is_valid_phone,
)


def test_validation_helpers():
    assert is_valid_email("patient@example.com") is True
    assert is_valid_email("invalid-email") is False
    assert is_valid_email(None) is False

    assert is_valid_phone("9876543210") is True
    assert is_valid_phone("12345") is False
    assert is_valid_phone("5876543210") is False  # Must start with 6-9 in India
    assert is_valid_phone(None) is False

    assert format_phone_e164("9876543210") == "+919876543210"
    assert format_phone_e164("+919876543210") == "+919876543210"

def test_generate_clinical_html_report():
    sample_data = {
        "patient_name": "Meera Joshi",
        "patient_details": {
            "name": "Meera Joshi",
            "gender": "F",
            "dob": "1995-03-12",
            "phone": "9876543210"
        },
        "locked": True,
        "ayush_profile": {"prakriti": "Pitta", "agni": "Tikshna", "koshtha": "Mridu"},
        "intake_triage": {"type": "chest-pain", "summary": {"character": "burning", "severity": 6}}
    }
    html = generate_clinical_html_report(sample_data)
    assert "Meera Joshi" in html
    assert "Pitta" in html
    assert "Precordial Chest Pain" in html

def test_dispatch_clinical_report_mocked():
    sample_data = {
        "session_id": "test-sess",
        "patient_name": "Test User",
        "patient_details": {"name": "Test User", "gender": "M", "phone": "9876543210", "email": "test@example.com"}
    }

    with patch("report_notifier.send_email_dispatcher") as mock_email, \
         patch("report_notifier.send_sms_dispatcher") as mock_sms:
        mock_email.return_value = {"sent": True, "provider": "mock-smtp", "message": "Email dispatched"}
        mock_sms.return_value = {"sent": True, "provider": "mock-sms", "message": "SMS dispatched"}

        result = dispatch_clinical_report(
            session_id="test-sess",
            encounter_data=sample_data,
            email="test@example.com",
            phone="9876543210"
        )

        assert result["status"] == "success"
        assert result["email"]["sent"] is True
        assert result["sms"]["sent"] is True
