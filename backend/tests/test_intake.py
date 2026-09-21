import pytest
from fastapi.testclient import TestClient

from main import app
from red_flags import check_red_flags

client = TestClient(app)

@pytest.mark.parametrize("name,payload,expected_flag", [
    ("Acute Surgical", {"severity": 9, "onset": "sudden", "site": "rlq"}, "High Priority Triage: Possible acute surgical pattern."),
    ("Infective", {"severity": 8, "associated_sx": "fever"}, "Moderate-High Priority: Possible infective/inflammatory pattern."),
    ("Vascular", {"character": "tearing", "radiation_back": "back"}, "Critical Priority: Immediate evaluation required for vascular pattern."),
    ("Hemorrhagic", {"associated_sx": "blood"}, "High Priority: Potential hemorrhagic/obstructive pattern.")
])
def test_red_flags_triggering(name, payload, expected_flag):
    flags = check_red_flags(payload)
    assert expected_flag in flags

def test_red_flags_missing_data_safe():
    flags = check_red_flags({"severity": 3, "site": "rlq"})
    assert len(flags) == 0

def test_intake_endpoint_stability():
    resp = client.post(
        "/api/intake/abdominal-pain",
        json={"severity": 9, "onset": "sudden", "site": "rlq", "character": "dull"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "flags" in data
    assert "High Priority Triage: Possible acute surgical pattern." in data["flags"]
