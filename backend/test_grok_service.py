import sys
import json
from dotenv import load_dotenv

# Reconfigure stdout for utf-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

load_dotenv()

from fastapi.testclient import TestClient
from main import app

def test_llm():
    client = TestClient(app)
    
    print("\n--- 1. Testing GET /api/llm/status ---")
    resp = client.get("/api/llm/status")
    print(f"Status: {resp.status_code}")
    status_data = resp.json()
    print(f"Response: {status_data}")
    assert resp.status_code == 200
    assert status_data.get("configured") is True
    
    print("\n--- 2. Testing POST /api/llm/chat (Clinical Intake) ---")
    chat_payload = {
        "history": [
            {"role": "user", "content": "Please begin the intake."}
        ],
        "language": "en"
    }
    resp = client.post("/api/llm/chat", json=chat_payload)
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Provider: {data.get('provider')}")
    print(f"Model: {data.get('model_used')}")
    print(f"Reply sample: {data.get('reply')[:200]}...")
    assert resp.status_code == 200
    assert "reply" in data
    
    print("\n--- 3. Testing POST /api/llm/clinician-summary ---")
    summary_payload = {
        "history": [
            {"role": "user", "content": "I have had a headache for 2 days, moderate throbbing pain."},
            {"role": "assistant", "content": "Are you experiencing any nausea or visual disturbances?"},
            {"role": "user", "content": "No nausea, just light sensitivity. No known allergies."}
        ]
    }
    resp = client.post("/api/llm/clinician-summary", json=summary_payload)
    print(f"Status: {resp.status_code}")
    summary_data = resp.json()
    print(f"Summary sample: {summary_data.get('clinician_summary')[:200]}...")
    assert resp.status_code == 200
    assert "Chief Complaint" in summary_data.get("clinician_summary", "")

    print("\n--- 4. Testing POST /api/llm/generate (Custom System Prompt) ---")
    gen_payload = {
        "prompt": "Say hello in one sentence.",
        "system_prompt": "You are a friendly medical receptionist."
    }
    resp = client.post("/api/llm/generate", json=gen_payload)
    print(f"Status: {resp.status_code}")
    gen_data = resp.json()
    print(f"Output: {gen_data.get('output')}")
    assert resp.status_code == 200

    print("\n✅ All LLM endpoint tests passed successfully with live model integration!")

if __name__ == "__main__":
    test_llm()

