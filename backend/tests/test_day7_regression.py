import uuid

from fastapi.testclient import TestClient
from fhir.resources.bundle import Bundle


def test_day7_regression_and_validation(client: TestClient, auth_headers: dict):
    session_a = str(uuid.uuid4())
    abha_a = "11-2222-3333-4444"

    # 1. Post to unlocked session -> 400
    export_fail = client.post(f"/api/summary/{session_a}/export-fhir")
    assert export_fail.status_code == 400

    # 2. Grant Consent
    r_consent = client.post("/api/consent/", json={"session_id": session_a, "abha_id": abha_a, "consent_teleconsult": True})
    assert r_consent.status_code == 200

    # 3. Submit Data
    client.post("/api/ayush/submit", json={"session_id": session_a, "answers": [{"question_id": "p1", "mapped_to": "Vata"}]})
    client.post(f"/api/intake/abdominal-pain?session_id={session_a}", json={"character": "tearing", "severity": 10})

    # 4. Lock Session (requires auth)
    lock_res = client.post(f"/api/summary/{session_a}/lock", headers=auth_headers)
    assert lock_res.status_code == 200

    # 5. Export FHIR
    export_success = client.post(f"/api/summary/{session_a}/export-fhir")
    assert export_success.status_code == 200

    # 6. Validate FHIR Resource
    res_data = export_success.json()
    bundle_data = res_data.get("bundle", res_data)
    validated = Bundle.model_validate(bundle_data)
    assert validated is not None

    # 7. Post to locked session -> 403
    r_locked_post = client.post(f"/api/intake/abdominal-pain?session_id={session_a}", json={"severity": 5})
    assert r_locked_post.status_code == 403

    # 8. Concurrent Isolation Test
    session_b = str(uuid.uuid4())
    client.post("/api/consent/", json={"session_id": session_b, "abha_id": "55-6666-7777-8888", "consent_teleconsult": True})
    client.post("/api/ayush/submit", json={"session_id": session_b, "answers": [{"question_id": "p1", "mapped_to": "Kapha"}]})
    client.post(f"/api/intake/fever?session_id={session_b}", json={"severity": 8})

    sum_a = client.get(f"/api/summary/{session_a}").json()
    sum_b = client.get(f"/api/summary/{session_b}").json()

    assert sum_a["intake_triage"]["type"] == "abdominal-pain"
    assert sum_b["intake_triage"]["type"] == "fever"
