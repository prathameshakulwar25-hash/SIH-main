import uuid
from fastapi.testclient import TestClient
from main import app
from fhir.resources.bundle import Bundle

client = TestClient(app)

print("--- Day 7 Regression & Validation Test ---")

session_a = str(uuid.uuid4())
abha_a = "11-2222-3333-4444"

# 1. Post to unlocked session -> 400
export_fail = client.post(f"/api/summary/{session_a}/export-fhir")
print(f"Export Unlocked Session Status: {export_fail.status_code} (Expected 400)")

# 2. Grant Consent
r_consent = client.post("/api/consent/", json={"session_id": session_a, "abha_id": abha_a})
print(f"Consent Status: {r_consent.status_code}")

# 3. Submit Data
client.post("/api/ayush/submit", json={"session_id": session_a, "answers": [{"question_id": "p1", "mapped_to": "Vata"}]})
client.post(f"/api/intake/abdominal-pain?session_id={session_a}", json={"character": "tearing", "severity": 10})

# 4. Lock Session
client.post(f"/api/summary/{session_a}/lock")

# 5. Export FHIR
export_success = client.post(f"/api/summary/{session_a}/export-fhir")
print(f"Export Locked Session Status: {export_success.status_code} (Expected 200)")

# 6. Validate FHIR Resource
bundle_data = export_success.json()
try:
    Bundle.model_validate(bundle_data)
    print("FHIR Validation: SUCCESS (Re-parsed successfully via fhir.resources)")
except Exception as e:
    print(f"FHIR Validation: FAILED -> {e}")

# 7. Post to locked session -> 403
r_locked_post = client.post(f"/api/intake/abdominal-pain?session_id={session_a}", json={"severity": 5})
print(f"Post to Locked Session Status: {r_locked_post.status_code} (Expected 403)")

# 8. Concurrent Isolation Test
session_b = str(uuid.uuid4())
client.post("/api/consent/", json={"session_id": session_b, "abha_id": "55-6666-7777-8888"})
client.post("/api/ayush/submit", json={"session_id": session_b, "answers": [{"question_id": "p1", "mapped_to": "Kapha"}]})
client.post(f"/api/intake/fever?session_id={session_b}", json={"severity": 8})

sum_a = client.get(f"/api/summary/{session_a}").json()
sum_b = client.get(f"/api/summary/{session_b}").json()

print(f"Tab A Intake Type: {sum_a['intake_triage']['type']}")
print(f"Tab B Intake Type: {sum_b['intake_triage']['type']}")
if sum_a['intake_triage']['type'] == 'abdominal-pain' and sum_b['intake_triage']['type'] == 'fever':
    print("Concurrent Isolation: SUCCESS")
else:
    print("Concurrent Isolation: FAILED")
