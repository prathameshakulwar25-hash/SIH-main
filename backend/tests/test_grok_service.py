from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_llm_status():
    resp = client.get("/api/llm/status")
    assert resp.status_code == 200
    status_data = resp.json()
    assert status_data.get("status") in ["ready", "mock_mode"]

def test_llm_chat():
    chat_payload = {
        "history": [
            {"role": "user", "content": "Please begin the intake."}
        ],
        "language": "en"
    }
    resp = client.post("/api/llm/chat", json=chat_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "reply" in data

def test_llm_clinician_summary():
    summary_payload = {
        "history": [
            {"role": "user", "content": "I have had a headache for 2 days, moderate throbbing pain."},
            {"role": "assistant", "content": "Are you experiencing any nausea or visual disturbances?"},
            {"role": "user", "content": "No nausea, just light sensitivity. No known allergies."}
        ]
    }
    resp = client.post("/api/llm/clinician-summary", json=summary_payload)
    assert resp.status_code == 200
    summary_data = resp.json()
    assert "clinician_summary" in summary_data

def test_llm_generate():
    gen_payload = {
        "prompt": "Say hello in one sentence.",
        "system_prompt": "You are a friendly medical receptionist."
    }
    resp = client.post("/api/llm/generate", json=gen_payload)
    assert resp.status_code == 200
    assert "output" in resp.json()
