from fhir_exporter import generate_fhir_bundle


def test_generate_fhir_bundle_structure():
    session_id = "test-session-123"
    abha_id = "12-3456-7890-1234"
    patient_meta = {
        "name": "Aarav Sharma",
        "gender": "M",
        "dob": "1988-11-23"
    }
    ayush_profile = {
        "prakriti": "Vata, Pitta",
        "agni": "Sama",
        "koshtha": "Madhyama"
    }
    intake_triage = {
        "flags": ["RED_FLAG_HYPOTENSION", "RED_FLAG_CHEST_PAIN"]
    }
    documents_data = {
        "medications": [{"name": "Metformin", "dosage": "500mg"}],
        "labs": [{"test": "HbA1c", "value": "6.8%"}]
    }

    bundle_dict = generate_fhir_bundle(
        session_id=session_id,
        abha_id=abha_id,
        intake_triage=intake_triage,
        documents_data=documents_data,
        ayush_profile=ayush_profile,
        patient_meta=patient_meta
    )

    assert bundle_dict is not None
    assert bundle_dict.get("resourceType") == "Bundle"
    assert bundle_dict.get("type") == "collection"

    entries = bundle_dict.get("entry", [])
    assert len(entries) >= 4  # Patient, Consent, AYUSH Obs, 2 Flags, DocReference

    resource_types = [e["resource"]["resourceType"] for e in entries]
    assert "Patient" in resource_types
    assert "Consent" in resource_types
    assert "Observation" in resource_types
    assert "DocumentReference" in resource_types

    # Validate Patient details
    patient = next(e["resource"] for e in entries if e["resource"]["resourceType"] == "Patient")
    assert patient["gender"] == "male"
    assert str(patient["birthDate"]) == "1988-11-23"
    assert patient["identifier"][0]["value"] == abha_id

def test_generate_fhir_bundle_minimal():
    session_id = "test-minimal-session"
    bundle_dict = generate_fhir_bundle(
        session_id=session_id,
        abha_id=""
    )
    assert bundle_dict["resourceType"] == "Bundle"
    resource_types = [e["resource"]["resourceType"] for e in bundle_dict.get("entry", [])]
    assert "Patient" in resource_types
    assert "Consent" in resource_types
