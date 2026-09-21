from abdm_service import (
    ABDM_TXN_STORE,
    generate_aadhaar_otp,
    generate_mobile_otp,
    generate_random_abha_number,
    search_abha_by_id,
    verify_aadhaar_otp,
    verify_mobile_otp,
)


def test_generate_random_abha_number():
    num = generate_random_abha_number()
    parts = num.split("-")
    assert len(parts) == 4
    assert len(parts[0]) == 2
    assert len(parts[1]) == 4
    assert len(parts[2]) == 4
    assert len(parts[3]) == 4

def test_aadhaar_otp_flow_simulation():
    # 1. Invalid Aadhaar (too short)
    res_invalid = generate_aadhaar_otp("12345")
    assert res_invalid["success"] is False

    # 2. Valid Aadhaar
    res_valid = generate_aadhaar_otp("987654321098")
    assert res_valid["success"] is True
    assert "txnId" in res_valid
    txn_id = res_valid["txnId"]

    # 3. Invalid OTP
    res_wrong_otp = verify_aadhaar_otp(txn_id, "000000")
    assert res_wrong_otp["success"] is False

    # 4. Valid OTP
    expected_otp = ABDM_TXN_STORE[txn_id]["otp"]
    res_correct_otp = verify_aadhaar_otp(txn_id, expected_otp)
    assert res_correct_otp["success"] is True
    assert "profile" in res_correct_otp
    assert res_correct_otp["profile"]["aadhaar"].endswith("1098")

def test_mobile_otp_flow():
    res = generate_mobile_otp("9876543210")
    assert res["success"] is True
    assert "txnId" in res
    txn_id = res["txnId"]

    expected_otp = ABDM_TXN_STORE[txn_id]["otp"]
    ver = verify_mobile_otp(txn_id, expected_otp)
    assert ver["success"] is True
    assert "profile" in ver

def test_search_abha_by_id():
    res = search_abha_by_id("rahul.sharma@abdm")
    assert res is not None
    assert res["name"] == "Rahul Dev Sharma"

    # Query with no match and short length returns None
    not_found = search_abha_by_id("no")
    assert not_found is None
