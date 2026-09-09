import json
from fastapi.testclient import TestClient
from main import app
from scoring import score_ayush
import os

client = TestClient(app)

print("--- 1. Testing /health ---")
response = client.get("/health")
print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")

print("\n--- 2. Validating ayush_questions.json ---")
file_path = os.path.join("data", "ayush_questions.json")
with open(file_path, "r") as f:
    data = json.load(f)

total_qs = 0
valid_maps_to = {
    "Prakriti": {"Vata", "Pitta", "Kapha"},
    "Agni": {"Vishama", "Tikshna", "Manda", "Sama"},
    "Koshtha": {"Krura", "Mridu", "Madhyama"}
}

invalid_maps = []

for section in data.get("sections", []):
    sec_name = section["section"]
    qs = section.get("questions", [])
    total_qs += len(qs)
    for q in qs:
        for opt in q.get("options", []):
            maps_to = opt.get("maps_to")
            if maps_to not in valid_maps_to.get(sec_name, set()):
                invalid_maps.append(f"Section {sec_name}, Q {q.get('question_id')}, Maps to: {maps_to}")

print(f"Total Questions: {total_qs} (Expected 17)")
if invalid_maps:
    print("INVALID maps_to found:")
    for inv in invalid_maps:
        print(inv)
else:
    print("All maps_to values are valid.")

print("\n--- 3. Testing score_ayush() ---")
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
print("Sample Answers submitted:", sample_answers)
result = score_ayush(sample_answers)
print("Score Result:")
print(json.dumps(result, indent=2))
