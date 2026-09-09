import os
import uuid
import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

session_id = str(uuid.uuid4())
print(f"Starting E2E Test. Generated Session ID: {session_id}\n")

print("--- 1. Submitting AYUSH Data ---")
ayush_payload = {
    "session_id": session_id,
    "answers": [
        {"question_id": "p1", "mapped_to": "Vata"},
        {"question_id": "a1", "mapped_to": "Vishama"}
    ]
}
r1 = client.post("/api/ayush/submit", json=ayush_payload)
print(f"AYUSH Status: {r1.status_code}")

print("\n--- 2. Submitting Intake Data (Red Flag) ---")
intake_payload = {
    "character": "crushing", 
    "radiation_cardiac": "arm_jaw", 
    "associated_cardiac": "sweating_palpitations", 
    "severity": 9
}
r2 = client.post(f"/api/intake/chest-pain?session_id={session_id}", json=intake_payload)
print(f"Intake Status: {r2.status_code}")
print(f"Intake Flags: {r2.json().get('flags')}")

print("\n--- 3. Submitting Document ---")
with open("sample_lab_report.jpg", "rb") as f:
    r3 = client.post("/api/documents/upload", data={"session_id": session_id}, files={"file": ("sample_lab_report.jpg", f, "image/jpeg")})
print(f"Document Upload Status: {r3.status_code}")

print("\n--- 4. Fetching Aggregated Summary ---")
r4 = client.get(f"/api/summary/{session_id}")
summary = r4.json()
print(f"Summary Fetch Status: {r4.status_code}")
print(f"AYUSH Profile Populated: {'prakriti' in summary['ayush_profile']}")
print(f"Intake Populated: {summary['intake_triage']['type'] == 'chest-pain'}")
print(f"Documents Populated: {len(summary['documents']['labs']) > 0}")

print("\n--- 5. Locking Session ---")
r5 = client.post(f"/api/summary/{session_id}/lock")
print(f"Lock Status: {r5.status_code}")

print("\n--- 6. Testing 403 Forbidden on Locked Session ---")
r6 = client.post(f"/api/intake/chest-pain?session_id={session_id}", json=intake_payload)
print(f"Post-Lock Intake Status: {r6.status_code}")
if r6.status_code == 403:
    print(f"SUCCESS: Backend rejected write with detail: {r6.json().get('detail')}")
else:
    print("FAIL: Backend allowed write on a locked session!")
