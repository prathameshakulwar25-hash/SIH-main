import os
import uuid

from fastapi.testclient import TestClient


def test_end_to_end_flow(client: TestClient, auth_headers: dict):
    session_id = str(uuid.uuid4())

    # 1. AYUSH Data
    ayush_payload = {
        "session_id": session_id,
        "answers": [
            {"question_id": "p1", "mapped_to": "Vata"},
            {"question_id": "a1", "mapped_to": "Vishama"}
        ]
    }
    r1 = client.post("/api/ayush/submit", json=ayush_payload)
    assert r1.status_code == 200

    # 2. Intake Data
    intake_payload = {
        "character": "crushing",
        "radiation_cardiac": "arm_jaw",
        "associated_cardiac": "sweating_palpitations",
        "severity": 9
    }
    r2 = client.post(f"/api/intake/chest-pain?session_id={session_id}", json=intake_payload)
    assert r2.status_code == 200
    assert len(r2.json().get("flags", [])) > 0

    # 3. Document upload if sample exists
    sample_path = os.path.join(os.path.dirname(__file__), "..", "sample_lab_report.jpg")
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            r3 = client.post("/api/documents/upload", data={"session_id": session_id}, files={"file": ("sample_lab_report.jpg", f, "image/jpeg")})
            assert r3.status_code == 200

    # 4. Summary
    r4 = client.get(f"/api/summary/{session_id}")
    assert r4.status_code == 200
    summary = r4.json()
    assert "prakriti" in summary["ayush_profile"]
    assert summary["intake_triage"]["type"] == "chest-pain"

    # 5. Lock Session (requires auth)
    r5 = client.post(f"/api/summary/{session_id}/lock", headers=auth_headers)
    assert r5.status_code == 200
    assert r5.json()["locked"] is True

    # 6. Post-lock rejection
    r6 = client.post(f"/api/intake/chest-pain?session_id={session_id}", json=intake_payload)
    assert r6.status_code == 403
