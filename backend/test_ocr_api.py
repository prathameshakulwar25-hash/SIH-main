import json
import sqlite3
import os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_upload(file_path, name):
    print(f"\n{'='*40}")
    print(f"Testing {name}")
    print(f"{'='*40}")
    with open(file_path, "rb") as f:
        response = client.post("/api/documents/upload", files={"file": (file_path, f, "image/jpeg")})
    
    if response.status_code != 200:
        print("Upload Failed!")
        print(response.text)
        return None
        
    data = response.json()
    print("--- RAW OCR TEXT ---")
    print(data["raw_text"])
    print("--- PARSED STRUCTURED FIELDS ---")
    print(json.dumps(data["parsed_data"], indent=2))
    
    # DB Check
    print("--- SQLITE DB CHECK ---")
    conn = sqlite3.connect(os.path.join("data", "ayush.db"))
    cur = conn.cursor()
    cur.execute("SELECT raw_text, parsed_data FROM documents WHERE session_id = ?", (data["session_id"],))
    row = cur.fetchone()
    if row:
        print("[PASS] Saved to SQLite successfully.")
    else:
        print("[FAIL] Missing from SQLite.")
    conn.close()
    
    return data["parsed_data"]

print("Starting OCR tests...")
rx_data = test_upload("sample_prescription.jpg", "Prescription Image")
lab_data = test_upload("sample_lab_report.jpg", "Lab Report Image")

# Specific verifications
print("\n" + "="*40)
print("SPECIFIC VERIFICATIONS")
print("="*40)

if lab_data:
    labs = lab_data.get("labs", [])
    hba1c = next((l for l in labs if l["test"] == "HbA1c"), None)
    wbc = next((l for l in labs if l["test"] == "WBC"), None)
    
    if hba1c:
        print(f"1. [PASS] Fuzzy anchor caught 'HbA1e' as '{hba1c['test']}' with confidence: {hba1c['confidence']}")
        if "above" in hba1c['flag'].lower():
            print(f"2. [PASS] High HbA1c (8.2) correctly flagged: {hba1c['flag']}")
        else:
            print(f"2. [FAIL] High HbA1c (8.2) flagged as: {hba1c['flag']}")
    else:
        print("1. [FAIL] Fuzzy anchor failed to catch HbA1c.")
        
    if wbc:
        if "Normal" in wbc['flag']:
            print(f"3. [PASS] Normal WBC (8.5) correctly flagged: {wbc['flag']}")
        else:
            print(f"3. [FAIL] Normal WBC (8.5) flagged as: {wbc['flag']}")
    else:
        print("3. [FAIL] Missed WBC.")

if rx_data:
    meds = rx_data.get("medications", [])
    print(f"4. Found {len(meds)} medications. Checking for cross-contamination...")
    for med in meds:
        print(f"   Extracted: {med['name']} | Dosage: {med['dosage']} | Confidence: {med['confidence']}")
        if med['confidence'] == 'low':
            print("   [PASS] Confidence correctly marked 'low'")
        else:
            print("   [FAIL] Confidence NOT marked 'low'")
