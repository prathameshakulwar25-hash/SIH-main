import pytest

from grok_service import GrokService, build_intake_system_prompt, normalize_clinical_complaint


def test_normalize_clinical_complaint():
    assert normalize_clinical_complaint("headache") == "Headache / Cephalea"
    assert normalize_clinical_complaint("sar dard") == "Headache / Cephalea"
    assert normalize_clinical_complaint("pet dard") == "Acute Abdominal Discomfort"
    assert normalize_clinical_complaint("chest pain") == "Precordial Chest Pain"
    assert normalize_clinical_complaint("bukhar") == "Pyrexia / Febrile Illness"
    assert normalize_clinical_complaint("") == "Acute Clinical Consultation"

def test_build_intake_system_prompt():
    prompt_en = build_intake_system_prompt("en")
    assert "Jeevan" in prompt_en
    assert "English" in prompt_en
    assert "doctor_reply" in prompt_en

    prompt_hi = build_intake_system_prompt("hi")
    assert "Hindi" in prompt_hi
    assert "हिन्दी में" in prompt_hi

    prompt_mr = build_intake_system_prompt("mr")
    assert "Marathi" in prompt_mr

@pytest.mark.asyncio
async def test_grok_service_mock_fallback():
    service = GrokService()
    # Force mock mode by clearing api_key
    service.api_key = ""
    assert service.is_configured() is False

    status = service.get_status()
    assert status["status"] == "mock_mode"
    assert status["configured"] is False

    response = await service.call_grok(
        system_prompt="You are a clinical intake assistant.",
        messages=[{"role": "user", "content": "I have a mild headache since yesterday."}],
        language="en"
    )
    assert response is not None
    assert len(response) > 0
