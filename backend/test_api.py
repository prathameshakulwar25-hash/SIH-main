import json
import sqlite3
from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

print("--- 1. Testing GET /api/ayush/questions ---")
response = client.get("/api/ayush/questions")
print(f"Status Code: {response.status_code}")
data = response.json()
if "sections" in data:
    print(f"Success! Retrieved {len(data['sections'])} sections.")
else:
    print("Failed to get questions format.")

print("\n--- 2. Testing POST /api/ayush/submit ---")
sample_answers = [
    # Prakriti
    {"question_id": "p1", "mapped_to": "Vata"},
    {"question_id": "p2", "mapped_to": "Vata"},
    {"question_id": "p3", "mapped_to": "Pitta"},
    {"question_id": "p4", "mapped_to": "Vata"},
    # Agni
    {"question_id": "a1", "mapped_to": "Manda"},
    {"question_id": "a2", "mapped_to": "Tikshna"},
    {"question_id": "a3", "mapped_to": "Tikshna"},
    # Koshtha
    {"question_id": "k1", "mapped_to": "Madhyama"},
    {"question_id": "k2", "mapped_to": "Krura"},
    {"question_id": "k3", "mapped_to": "Krura"}
]

post_response = client.post("/api/ayush/submit", json={"answers": sample_answers})
print(f"Status Code: {post_response.status_code}")
post_data = post_response.json()
print("Response Result:")
print(json.dumps(post_data, indent=2))
session_id = post_data.get("session_id")

print("\n--- 3. Querying SQLite ayush_results ---")
db_path = os.path.join("data", "ayush.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT session_id, prakriti, agni, koshtha, raw_tally, timestamp FROM ayush_results WHERE session_id = ?", (session_id,))
row = cursor.fetchone()
if row:
    print("Found row in DB!")
    print(f"session_id: {row[0]}")
    print(f"prakriti: {row[1]}")
    print(f"agni: {row[2]}")
    print(f"koshtha: {row[3]}")
    print(f"raw_tally: {row[4]}")
    print(f"timestamp: {row[5]}")
else:
    print("Row not found in DB!")
conn.close()
