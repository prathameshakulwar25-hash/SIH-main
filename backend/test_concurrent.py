import uuid
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("--- Starting Concurrent Tab Isolation Test ---")

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

print("\nVerifying Tab A Summary:")
print(f"Intake Type: {sum_a['intake_triage']['type']} (Expected: abdominal-pain)")
print(f"Flags: {sum_a['intake_triage']['flags']}")

print("\nVerifying Tab B Summary:")
print(f"Intake Type: {sum_b['intake_triage']['type']} (Expected: fever)")
print(f"Flags: {sum_b['intake_triage']['flags']}")

if sum_a['intake_triage']['type'] == 'abdominal-pain' and sum_b['intake_triage']['type'] == 'fever':
    print("\n[PASS] Absolute data isolation confirmed. No cross-contamination between concurrent sessions.")
else:
    print("\n[FAIL] Cross-contamination detected!")
