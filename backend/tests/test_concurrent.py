import uuid

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_concurrent_tab_isolation():
    # Simulate Tab A
    session_a = str(uuid.uuid4())
    client.post("/api/ayush/submit", json={"session_id": session_a, "answers": [{"question_id": "p1", "mapped_to": "Vata"}]})
    client.post(f"/api/intake/abdominal-pain?session_id={session_a}", json={"character": "tearing", "radiation_general": "back", "severity": 10})

    # Simulate Tab B
    session_b = str(uuid.uuid4())
    client.post("/api/ayush/submit", json={"session_id": session_b, "answers": [{"question_id": "a1", "mapped_to": "Kapha"}]})
    client.post(f"/api/intake/fever?session_id={session_b}", json={"associated_sx": "cns", "severity": 8})

    # Fetch Summaries
    sum_a = client.get(f"/api/summary/{session_a}").json()
    sum_b = client.get(f"/api/summary/{session_b}").json()

    assert sum_a["intake_triage"]["type"] == "abdominal-pain"
    assert sum_b["intake_triage"]["type"] == "fever"
