import json
import sqlite3
import uuid

from fastapi.testclient import TestClient

from main import app

print("=== 1. Seed Data Integrity ===")
conn = sqlite3.connect("./data/ayush.db")
cursor = conn.cursor()

# Get seeded sessions
seed_ids = [
    "8246efca-d7a7-4632-aaa9-5c56afce98f0",
    "c9a9bd15-d6b8-474e-a415-2091cfa5ce03",
    "7da3a916-4171-4b99-9271-f8f49bc23406"
]

# 1.1 Check locked=1
for sid in seed_ids:
    cursor.execute("SELECT locked FROM session_meta WHERE session_id=?", (sid,))
    res = cursor.fetchone()
    print(f"Session {sid} locked status: {res[0] if res else 'MISSING'}")

# 1.2 Check UUID uniqueness/format
for sid in seed_ids:
    try:
        uuid_obj = uuid.UUID(sid, version=4)
        print(f"UUID {sid} is valid version 4")
    except ValueError:
        print(f"UUID {sid} is INVALID")

# 1.3 Try POST to Case A -> Expect 403
client = TestClient(app)
res_post = client.post(f"/api/intake/chest-pain?session_id={seed_ids[0]}", json={"character": "dull", "severity": 2})
print(f"POST to Case A returned: {res_post.status_code}")

# 1.4 Case A Red flag
cursor.execute("SELECT flags FROM intake_results WHERE session_id=?", (seed_ids[0],))
row = cursor.fetchone()
if row and row[0]:
    flags = json.loads(row[0])
    print(f"Case A Flags: {flags}")

# 1.5 Case C AYUSH Result
cursor.execute("SELECT prakriti, agni, koshtha FROM ayush_results WHERE session_id=?", (seed_ids[2],))
ayush_res = cursor.fetchone()
if ayush_res:
    print(f"Case C AYUSH: Prakriti={ayush_res[0]}, Agni={ayush_res[1]}, Koshtha={ayush_res[2]}")

# 1.6 Grep for disease names (Intake DB rows for seeds)
cursor.execute("SELECT summary, flags FROM intake_results WHERE session_id IN (?, ?, ?)", tuple(seed_ids))
intakes = cursor.fetchall()
print("Checking for disease names in seeded triage output:")
for row in intakes:
    print(row)

print("\n=== 2. FHIR Export on Seed Data ===")
for sid in seed_ids:
    try:
        res = client.post(f"/api/summary/{sid}/export-fhir")
        print(f"FHIR Export {sid}: {res.status_code}")
        if sid == seed_ids[0] and res.status_code == 200:
            print(f"Case A Bundle:\n{json.dumps(res.json(), indent=2)}")
    except Exception as e:
        print(f"FHIR Export FAILED on {sid} with error: {e}")

print("\n=== 3. UI Polish Regression (New Session E2E) ===")
new_sess = str(uuid.uuid4())
client.post("/api/consent/", json={"session_id": new_sess, "abha_id": "99-9999-9999-9999"})
client.post("/api/ayush/submit", json={"session_id": new_sess, "answers": [{"question_id": "p1", "mapped_to": "Vata"}]})
client.post(f"/api/intake/abdominal-pain?session_id={new_sess}", json={"character": "dull", "severity": 5})
res_sum = client.get(f"/api/summary/{new_sess}")
print(f"New session summary retrieval: {res_sum.status_code}")
client.post(f"/api/summary/{new_sess}/lock")

print("\n=== 4. Cross-session Isolation Check ===")
s1 = str(uuid.uuid4())
s2 = str(uuid.uuid4())
client.post("/api/consent/", json={"session_id": s1, "abha_id": "1"})
client.post("/api/consent/", json={"session_id": s2, "abha_id": "2"})
client.post("/api/ayush/submit", json={"session_id": s1, "answers": [{"question_id": "p1", "mapped_to": "Vata"}]})
client.post("/api/ayush/submit", json={"session_id": s2, "answers": [{"question_id": "p1", "mapped_to": "Kapha"}]})
sum1 = client.get(f"/api/summary/{s1}").json()
sum2 = client.get(f"/api/summary/{s2}").json()
print(f"Session 1 Prakriti: {sum1['ayush_profile']['prakriti']}")
print(f"Session 2 Prakriti: {sum2['ayush_profile']['prakriti']}")

conn.close()
