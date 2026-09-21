import uuid

from fastapi.testclient import TestClient


def test_day8_flow_overwrite_regression(client: TestClient):
    session_a = str(uuid.uuid4())
    abha_a = "11-2222-3333-4444"

    # 1. Grant Consent
    client.post("/api/consent", json={"session_id": session_a, "abha_id": abha_a, "consent_teleconsult": True})

    # 2. AYUSH Submit #1
    ans1 = [{"question_id": "p1", "mapped_to": "Vata"}]
    r1 = client.post("/api/ayush/submit", json={"session_id": session_a, "answers": ans1})
    assert r1.status_code == 200

    # 3. AYUSH Submit #2 (Redo/Overwrite)
    ans2 = [{"question_id": "p1", "mapped_to": "Kapha"}]
    r2 = client.post("/api/ayush/submit", json={"session_id": session_a, "answers": ans2})
    assert r2.status_code == 200

    # Verify overwrite in summary
    sum_a = client.get(f"/api/summary/{session_a}").json()
    assert "Kapha" in sum_a["ayush_profile"]["prakriti"]
    assert "Vata" not in sum_a["ayush_profile"]["prakriti"]

    # 4. Intake Submit #1
    i1 = client.post(f"/api/intake/abdominal-pain?session_id={session_a}", json={"character": "tearing", "severity": 10})
    assert i1.status_code == 200

    # 5. Intake Submit #2 (Redo/Overwrite)
    i2 = client.post(f"/api/intake/abdominal-pain?session_id={session_a}", json={"character": "dull", "severity": 5})
    assert i2.status_code == 200

    # Verify overwrite
    sum_a2 = client.get(f"/api/summary/{session_a}").json()
    assert sum_a2["intake_triage"]["summary"]["character"] == "dull"
