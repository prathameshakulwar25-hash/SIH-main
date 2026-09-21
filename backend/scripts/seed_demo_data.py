import uuid

from main import AyushResult, ConsentRecord, Document, IntakeResult, SessionLocal, SessionMeta
from red_flags import check_red_flags
from scoring import score_ayush

db = SessionLocal()

def create_case(case_name, abha_id, ayush_answers, complaint_type, intake_data, parsed_docs, patient_meta=None):
    session_id = str(uuid.uuid4())
    p = patient_meta or {}
    name = p.get("name", "Ayushman Patient")
    gender = p.get("gender")
    dob = p.get("dob")
    phone = p.get("phone")
    email = p.get("email")
    abha_address = p.get("abha_address") or (f"{abha_id}@abdm" if "@" not in abha_id else abha_id)

    # 1. Consent
    db.add(ConsentRecord(
        session_id=session_id,
        abha_id=abha_id,
        name=name,
        gender=gender,
        dob=dob,
        phone=phone,
        email=email,
        abha_address=abha_address,
        status="granted",
        profile_data={"source": "seed-demo", "profile": p}
    ))

    # 2. AYUSH
    if ayush_answers:
        ayush_res = score_ayush(ayush_answers)
        db.add(AyushResult(
            session_id=session_id,
            prakriti=", ".join(ayush_res["dominant"].get("Prakriti", [])),
            agni=", ".join(ayush_res["dominant"].get("Agni", [])),
            koshtha=", ".join(ayush_res["dominant"].get("Koshtha", [])),
            raw_tally=ayush_res["scores"]
        ))

    # 3. Intake (Using real aggregator logic check_red_flags)
    if complaint_type and intake_data:
        flags = check_red_flags(intake_data, complaint_type=complaint_type)
        db.add(IntakeResult(
            session_id=session_id,
            intake_type=complaint_type,
            summary=intake_data,
            flags=flags
        ))

    # 4. Documents
    if parsed_docs:
        for doc in parsed_docs:
            db.add(Document(
                session_id=session_id,
                raw_text="[Seeded Demo Document Text]",
                parsed_data=doc
            ))

    # 5. Lock Session
    db.add(SessionMeta(session_id=session_id, locked=1))

    db.commit()
    print(f"{case_name}: {session_id} (Patient: {name})")
    return session_id

print("--- Seeding Demo Data ---")

# Case A: Red Flag Chest Pain
case_a = create_case(
    "Case A (Red Flag Chest Pain)",
    "11-1111-1111-1111",
    [],
    "chest-pain",
    {"character": "crushing", "severity": "10", "radiation_cardiac": "arm_jaw", "associated_cardiac": "sweating_palpitations"},
    [{
        "labs": [{"test": "Troponin", "value": "1.2 ng/mL", "confidence": "low", "flag": "High"}],
        "medications": [{"name": "Aspirin", "dosage": "300mg", "confidence": "high"}]
    }],
    patient_meta={
        "name": "Rajesh Kumar",
        "gender": "M",
        "dob": "1970-05-14",
        "phone": "9876543210",
        "email": "rajesh.kumar@example.com",
        "abha_address": "rajesh.kumar@abdm"
    }
)

# Case B: Benign Abdominal Pain
case_b = create_case(
    "Case B (Benign Abdominal Pain)",
    "22-2222-2222-2222",
    [],
    "abdominal-pain",
    {"character": "dull", "severity": "3", "duration": "1 week"},
    [],
    patient_meta={
        "name": "Sunita Sharma",
        "gender": "F",
        "dob": "1986-09-22",
        "phone": "9812345678",
        "email": "sunita.sharma@example.com",
        "abha_address": "sunita.sharma@abdm"
    }
)

# Case C: AYUSH Heavy + Mild Fever
case_c = create_case(
    "Case C (AYUSH Heavy + Mild Fever)",
    "33-3333-3333-3333",
    [
        {"question_id": "p1", "mapped_to": "Vata"},
        {"question_id": "p2", "mapped_to": "Vata"},
        {"question_id": "a1", "mapped_to": "Vishamagni"},
        {"question_id": "k1", "mapped_to": "Krura"}
    ],
    "fever",
    {"severity": "99 F", "duration": "2 days", "associated_symptoms": "none"},
    [{
        "labs": [{"test": "WBC", "value": "7500", "confidence": "high", "flag": "Normal"}],
        "medications": []
    }],
    patient_meta={
        "name": "Amit Patel",
        "gender": "M",
        "dob": "1995-11-03",
        "phone": "9723456789",
        "email": "amit.patel@example.com",
        "abha_address": "amit.patel@abdm"
    }
)

print("--- Seed Complete ---")
