import uuid

from fastapi.testclient import TestClient


def test_lock_session_requires_auth(client: TestClient):
    session_id = str(uuid.uuid4())
    res = client.post(f"/api/summary/{session_id}/lock")
    assert res.status_code == 401

def test_lock_session_invalid_token(client: TestClient):
    session_id = str(uuid.uuid4())
    res = client.post(
        f"/api/summary/{session_id}/lock",
        headers={"Authorization": "Bearer invalid.token.value"}
    )
    assert res.status_code == 401

def test_lock_session_and_abdm_fhir_gating(client: TestClient, auth_headers: dict):
    session_id = str(uuid.uuid4())

    # Step 1: Provide consent
    consent_res = client.post("/api/consent/", json={
        "session_id": session_id,
        "abha_id": "12-3456-7890-1234",
        "name": "Ramesh Kumar",
        "gender": "M",
        "dob": "1980-05-15",
        "phone": "9876543210",
        "consent_teleconsult": True,
        "consent_abdm_link": True,
        "consent_ayush_assessment": True
    })
    assert consent_res.status_code == 200

    # Step 2: Submit intake
    intake_res = client.post(f"/api/intake/chest-pain?session_id={session_id}", json={
        "onset": "sudden",
        "character": "crushing",
        "radiation": "arm_jaw",
        "severity": 8
    })
    assert intake_res.status_code == 200

    # Step 3: Verify ABDM FHIR export is gated when session is draft (unlocked)
    fhir_unlocked = client.get(f"/api/abdm/fhir/{session_id}")
    assert fhir_unlocked.status_code == 400
    assert "locked" in fhir_unlocked.json()["detail"].lower()

    # Step 4: Lock session with valid physician credentials
    lock_res = client.post(f"/api/summary/{session_id}/lock", headers=auth_headers)
    assert lock_res.status_code == 200
    lock_data = lock_res.json()
    assert lock_data["status"] == "locked"
    assert lock_data["locked"] is True

    # Step 5: Verify session summary confirms lock and physician_id from JWT sub
    summary_res = client.get(f"/api/summary/{session_id}")
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["locked"] is True
    assert summary_data["physician_id"] == "physician-test-1"
    assert summary_data["physician_verified"] is True

    # Step 6: Verify ABDM FHIR export now succeeds on locked encounter
    fhir_locked = client.get(f"/api/abdm/fhir/{session_id}")
    assert fhir_locked.status_code == 200
    bundle = fhir_locked.json()
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "collection"

def test_physician_endpoints_derive_sub_claim(client: TestClient, auth_headers: dict):
    session_id = str(uuid.uuid4())

    # Create consent and intake
    client.post("/api/consent/", json={
        "session_id": session_id,
        "abha_id": "98-7654-3210-9876",
        "name": "Priya Sharma",
        "gender": "F",
        "dob": "1992-08-20",
        "consent_teleconsult": True
    })

    # Review steps: client passes spoofed 'physician-spoofed', backend must use token 'physician-test-1'
    steps_res = client.post(
        f"/api/physician/reports/{session_id}/review-steps",
        json={
            "physician_id": "physician-spoofed",
            "review_steps": {"chief_complaint": {"status": "accepted"}}
        },
        headers=auth_headers
    )
    assert steps_res.status_code == 200

    summary_res = client.get(f"/api/summary/{session_id}")
    assert summary_res.status_code == 200
    assert summary_res.json()["physician_id"] == "physician-test-1"

    # Set criticality using query parameters
    crit_res = client.post(
        f"/api/physician/reports/{session_id}/criticality",
        params={"urgency": "urgent", "critical": True},
        headers=auth_headers
    )
    assert crit_res.status_code == 200

    # Set verification notes
    notes_res = client.post(
        f"/api/physician/reports/{session_id}/verify",
        json={"verified": True, "notes": "Verified by attending", "physician_id": "physician-spoofed"},
        headers=auth_headers
    )
    assert notes_res.status_code == 200
    assert notes_res.json()["physician_id"] == "physician-test-1"
