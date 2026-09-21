import uuid

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

print('\n=== 1. Red Flag Rule Validation ===')
sid = str(uuid.uuid4())
client.post('/api/consent/', json={'session_id': sid, 'abha_id': '1'})

# Chest pain
r = client.post(f'/api/intake/chest-pain?session_id={sid}', json={'character': 'crushing', 'severity': '10', 'radiation_cardiac': 'arm_jaw', 'associated_cardiac': 'sweating_palpitations'})
print(f"Chest Pain (Trigger): {r.json().get('flags', [])}")

r = client.post(f'/api/intake/chest-pain?session_id={sid}', json={'character': 'dull'})
print(f"Chest Pain (No Trigger): {r.json().get('flags', [])}")

# Abdominal pain
r = client.post(f'/api/intake/abdominal-pain?session_id={sid}', json={'severity': '8', 'onset': 'sudden', 'site': 'rlq'})
print(f"Abdominal (Trigger): {r.json().get('flags', [])}")

r = client.post(f'/api/intake/abdominal-pain?session_id={sid}', json={'severity': '4'})
print(f"Abdominal (No Trigger): {r.json().get('flags', [])}")

# Fever
r = client.post(f'/api/intake/fever?session_id={sid}', json={'associated_sx': 'cns'})
print(f"Fever (Trigger): {r.json().get('flags', [])}")

r = client.post(f'/api/intake/fever?session_id={sid}', json={'associated_sx': 'none'})
print(f"Fever (No Trigger): {r.json().get('flags', [])}")

print('\n=== 2. Consent Gating (403 Check) ===')
bad_sid = str(uuid.uuid4())
r1 = client.post('/api/ayush/submit', json={'session_id': bad_sid, 'answers': []})
r2 = client.post(f'/api/intake/chest-pain?session_id={bad_sid}', json={})
r3 = client.post('/api/documents/upload', data={'session_id': bad_sid}, files={'file': ('test.txt', b'hello', 'text/plain')})
print(f"Ayush Submit (No Consent): {r1.status_code}")
print(f"Intake Submit (No Consent): {r2.status_code}")
print(f"Doc Upload (No Consent): {r3.status_code}")

print('\n=== 3. Locked Gating (403 Check) ===')
sid2 = str(uuid.uuid4())
client.post('/api/consent/', json={'session_id': sid2, 'abha_id': '1'})
client.post(f'/api/summary/{sid2}/lock')

r1 = client.post('/api/ayush/submit', json={'session_id': sid2, 'answers': []})
r2 = client.post(f'/api/intake/chest-pain?session_id={sid2}', json={})
r3 = client.post('/api/documents/upload', data={'session_id': sid2}, files={'file': ('test.txt', b'hello', 'text/plain')})
print(f"Ayush Submit (Locked): {r1.status_code}")
print(f"Intake Submit (Locked): {r2.status_code}")
print(f"Doc Upload (Locked): {r3.status_code}")

print('\n=== 4. Fresh FHIR Export Validation ===')
r_fhir = client.post(f'/api/summary/{sid2}/export-fhir')
print(f"Fresh Session FHIR Export: {r_fhir.status_code}")
if r_fhir.status_code == 200:
    print('FHIR export successful.')
else:
    print(r_fhir.json())
