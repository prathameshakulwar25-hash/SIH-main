import uuid
import json
import threading
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
sid = str(uuid.uuid4())

# 1. Setup session with consent and meta row
client.post('/api/consent/', json={'session_id': sid, 'abha_id': '1'})
client.post('/api/ayush/submit', json={'session_id': sid, 'answers': []})

# 2. Corrupt OCR
print('\n=== Corrupt OCR Upload ===')
r = client.post('/api/documents/upload', data={'session_id': sid}, files={'file': ('garbage.jpg', b'this is not an image', 'image/jpeg')})
print(f'Status: {r.status_code}')
print(f'Body: {json.dumps(r.json(), ensure_ascii=True)}')

# 3. Concurrent Lock
print('\n=== Concurrent Lock ===')
import sqlite3
sid2 = str(uuid.uuid4())
client.post('/api/consent/', json={'session_id': sid2, 'abha_id': '1'})
client.post('/api/ayush/submit', json={'session_id': sid2, 'answers': []})

def lock_func():
    client.post(f'/api/summary/{sid2}/lock')

t1 = threading.Thread(target=lock_func)
t2 = threading.Thread(target=lock_func)
t1.start()
t2.start()
t1.join()
t2.join()

conn = sqlite3.connect('./data/ayush.db')
c = conn.cursor()
c.execute('SELECT COUNT(*), locked FROM session_meta WHERE session_id=?', (sid2,))
row = c.fetchone()
print(f'DB Session Meta Count: {row[0]}, Locked Status: {row[1]}')
conn.close()
