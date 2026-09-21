import sys
import uuid

from fastapi.testclient import TestClient

from abdm_service import ABDM_TXN_STORE, generate_aadhaar_otp, verify_aadhaar_otp
from flow_engine import _SESSIONS, advance_step, get_or_create_session, get_session_summary, reset_session
from main import AUTH_OTP_STORE, PHYSICIAN_PIN, SessionLocal, SessionMeta, app, create_access_token


def run_tests():
    print("================================================================")
    print("  JEEVAN CLINICAL PLATFORM - PRODUCTION VERIFICATION SUITE")
    print("================================================================")
    client = TestClient(app)
    failures = 0

    # -------------------------------------------------------------
    # 1. Zero-Trust Security & Protected Physician Routes
    # -------------------------------------------------------------
    print("\n[Test 1] Zero-Trust Security: Protected Physician Routes")

    # 1.1 No Auth Header -> Expect 401
    r = client.get("/api/physician/reports")
    if r.status_code == 401:
        print("  PASS: /api/physician/reports returned 401 for unauthenticated request.")
    else:
        print(f"  FAIL: Expected 401, got {r.status_code}: {r.text}")
        failures += 1

    # 1.2 Invalid Bearer Token -> Expect 401
    r = client.get("/api/physician/reports", headers={"Authorization": "Bearer forged.invalid.token"})
    if r.status_code == 401:
        print("  PASS: /api/physician/reports returned 401 for forged token.")
    else:
        print(f"  FAIL: Expected 401, got {r.status_code}: {r.text}")
        failures += 1

    # 1.3 Patient Token on Physician Route -> Expect 403 Forbidden
    patient_token = create_access_token({"sub": "patient_123", "role": "patient", "abha_id": "12-3456-7890-1234"})
    r = client.get("/api/physician/reports", headers={"Authorization": f"Bearer {patient_token}"})
    if r.status_code == 403:
        print("  PASS: /api/physician/reports returned 403 for patient token (privilege escalation blocked).")
    else:
        print(f"  FAIL: Expected 403, got {r.status_code}: {r.text}")
        failures += 1

    # 1.4 Valid Physician Token -> Expect 200
    physician_token = create_access_token({"sub": "doc_9876543210", "role": "physician", "phone": "9876543210"})
    r = client.get("/api/physician/reports", headers={"Authorization": f"Bearer {physician_token}"})
    if r.status_code == 200:
        reports_list = r.json().get("reports", [])
        print(f"  PASS: /api/physician/reports returned 200 OK with valid physician token. ({len(reports_list)} reports)")
    else:
        print(f"  FAIL: Expected 200, got {r.status_code}: {r.text}")
        failures += 1

    # -------------------------------------------------------------
    # 2. Authentication: OTP Hardcoding Elimination
    # -------------------------------------------------------------
    print("\n[Test 2] Physician Authentication & Elimination of Hardcoded 123456")
    test_mobile = "9876501234"
    r_send = client.post("/api/auth/physician/send-otp", json={"pin": PHYSICIAN_PIN, "mobile": test_mobile})
    if r_send.status_code == 200 and r_send.json().get("status") == "otp_sent":
        print("  PASS: /api/auth/physician/send-otp initiated successfully.")
    else:
        print(f"  FAIL: OTP send failed: {r_send.text}")
        failures += 1

    # Attempt backdoor 123456 -> must fail
    r_backdoor = client.post("/api/auth/physician/verify-otp", json={"pin": PHYSICIAN_PIN, "otp": "123456"})
    if r_backdoor.status_code == 400:
        print("  PASS: Hardcoded '123456' was rejected as invalid OTP.")
    else:
        print(f"  FAIL: '123456' backdoor was NOT rejected! Status {r_backdoor.status_code}")
        failures += 1

    # Retrieve real OTP from secure in-memory store
    stored_doc = AUTH_OTP_STORE.get("physician_otp")
    real_otp = stored_doc.get("otp") if stored_doc else None
    if real_otp:
        r_real = client.post("/api/auth/physician/verify-otp", json={"pin": PHYSICIAN_PIN, "otp": real_otp})
        if r_real.status_code == 200 and r_real.json().get("access_token"):
            print("  PASS: Correct OTP issued a signed JWT access_token.")
        else:
            print(f"  FAIL: Verify with real OTP failed: {r_real.text}")
            failures += 1
    else:
        print("  FAIL: Real OTP was not stored in AUTH_OTP_STORE.")
        failures += 1

    # -------------------------------------------------------------
    # 3. ABDM Service Hardening
    # -------------------------------------------------------------
    print("\n[Test 3] ABDM Service Hardening & Aadhaar OTP Security")
    gen_res = generate_aadhaar_otp("999911112222")
    if gen_res.get("success"):
        tx_id = gen_res.get("txnId")
        print(f"  PASS: ABDM OTP generated with txnId: {tx_id}")

        # Verify dummy 123456 rejected
        bad_res = verify_aadhaar_otp(tx_id, "123456")
        if not bad_res.get("success"):
            print("  PASS: ABDM backdoor '123456' rejected.")
        else:
            print("  FAIL: ABDM backdoor '123456' was accepted!")
            failures += 1

        # Verify correct OTP from transaction store
        stored_otp = ABDM_TXN_STORE.get(tx_id, {}).get("otp")
        if stored_otp:
            good_res = verify_aadhaar_otp(tx_id, stored_otp)
            if good_res.get("success") and good_res.get("profile", {}).get("name"):
                print(f"  PASS: Correct ABDM OTP validated patient: {good_res['profile']['name']}")
            else:
                print(f"  FAIL: Stored OTP validation failed: {good_res}")
                failures += 1

    # -------------------------------------------------------------
    # 4. Flow Engine SQLite Persistence
    # -------------------------------------------------------------
    print("\n[Test 4] Flow Engine SQLite State Persistence")
    test_sid = f"test-flow-{uuid.uuid4()}"
    get_or_create_session(test_sid, "hi")
    adv = advance_step(test_sid, "छाती में बहुत तेज दर्द है", "hi")
    print(f"  Step 1 advanced: next_question present = {bool(adv.get('next_question'))}")

    # Wipe in-memory cache to simulate server restart
    if test_sid in _SESSIONS:
        del _SESSIONS[test_sid]
    print("  In-memory session cache purged. Attempting retrieval from SQLite...")

    restored_summary = get_session_summary(test_sid)
    collected = restored_summary.get("collected", {})
    if collected:
        print(f"  PASS: Restored session from persistent DB after restart! Collected: {list(collected.keys())}")
    else:
        print("  FAIL: Session was not recovered from SQLite persistence store.")
        failures += 1
    reset_session(test_sid)

    # -------------------------------------------------------------
    # 5. Live HL7 FHIR R4 Bundle Export
    # -------------------------------------------------------------
    print("\n[Test 5] Live HL7 FHIR R4 Bundle Construction & Transmission")
    db = SessionLocal()
    meta = db.query(SessionMeta).filter(SessionMeta.locked == 1).first()
    if meta:
        test_encounter_sid = meta.session_id
    else:
        test_encounter_sid = "8246efca-d7a7-4632-aaa9-5c56afce98f0"
        meta = db.query(SessionMeta).filter(SessionMeta.session_id == test_encounter_sid).first()
        if not meta:
            meta = SessionMeta(session_id=test_encounter_sid, locked=1)
            db.add(meta)
        else:
            meta.locked = 1
        db.commit()
    db.close()

    r_fhir = client.post(
        f"/api/summary/{test_encounter_sid}/export-fhir",
        headers={"Authorization": f"Bearer {physician_token}"}
    )
    if r_fhir.status_code == 200:
        fhir_data = r_fhir.json()
        dispatch = fhir_data.get("his_dispatch", {})
        print(f"  PASS: FHIR R4 export handled with status_code: {dispatch.get('status_code')}")
        print(f"        FHIR Server: {dispatch.get('server_url')}")
        print(f"        Transmission details: {dispatch.get('detail')}")
    else:
        print(f"  FAIL: FHIR export endpoint returned {r_fhir.status_code}: {r_fhir.text}")
        failures += 1

    print("\n================================================================")
    if failures == 0:
        print("  ALL PRODUCTION VERIFICATION CHECKS PASSED SUCCESSFULLY! (0 Failures)")
    else:
        print(f"  VERIFICATION COMPLETED WITH {failures} FAILURE(S).")
    print("================================================================\n")
    return failures

if __name__ == "__main__":
    code = run_tests()
    sys.exit(code)
