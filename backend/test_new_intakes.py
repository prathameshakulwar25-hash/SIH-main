import json
import sqlite3
import os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("=== 1. Simulated Intakes ===")

payloads = {
    "chest-pain": [
        ("Red Flag (Cardiac)", {"character": "crushing", "radiation_cardiac": "arm_jaw", "associated_cardiac": "sweating_palpitations", "severity": 9}),
        ("Benign", {"character": "burning", "exacerbating_eating": "after_meals", "severity": 4})
    ],
    "fever": [
        ("Red Flag (Systemic)", {"severity": 9, "associated_sx": "rigors", "duration": "gt_5"}),
        ("Benign", {"severity": 4, "associated_sx": "respiratory", "duration": "lt_3"})
    ],
    "abdominal-pain": [
        ("Benign", {"severity": 3, "onset": "gradual", "site": "epigastric"})
    ]
}

db_sessions = []

for complaint, scenarios in payloads.items():
    print(f"\n--- {complaint.upper()} ---")
    for name, data in scenarios:
        resp = client.post(f"/api/intake/{complaint}", json=data)
        res_json = resp.json()
        db_sessions.append((res_json["session_id"], complaint))
        print(f"[{name}] Flags: {res_json.get('flags', [])}")
        if name.startswith("Red Flag") and not res_json.get('flags'):
            print(f"[FAIL] Expected red flag for {name} but got none.")
        elif name.startswith("Benign") and res_json.get('flags'):
            print(f"[FAIL] Expected benign for {name} but got flags: {res_json.get('flags')}")

print("\n=== 2. Path Tracing ===")

def trace_tree(complaint):
    print(f"\nTracing {complaint}_tree.json...")
    tree_path = os.path.join("data", f"{complaint}_tree.json")
    with open(tree_path, "r") as f:
        tree = json.load(f)
        
    nodes = {n["id"]: n for n in tree["nodes"]}
    distinct_paths = set()
    
    def trace(node_id, current_path):
        node = nodes.get(node_id)
        if not node:
            print(f"[FAIL] Node not found: {node_id}")
            return
            
        path_str = " -> ".join(current_path + [node_id])
        
        has_next = any(opt.get("next") is not None for opt in node["options"])
        if not has_next:
            distinct_paths.add(path_str)
            return
            
        next_nodes = set(opt["next"] for opt in node["options"] if opt["next"])
        for nxt in next_nodes:
            trace(nxt, current_path + [node_id])
            
    trace(tree["start_node"], [])
    for p in distinct_paths:
        print(p)
    print(f"[PASS] All {len(distinct_paths)} structural paths terminate safely.")

trace_tree("chest_pain")
trace_tree("fever")

print("\n=== 4. SQLite DB Save Verification ===")
conn = sqlite3.connect(os.path.join("data", "ayush.db"))
cur = conn.cursor()

for sid, expected_type in db_sessions:
    cur.execute("SELECT session_id, intake_type, summary FROM intake_results WHERE session_id = ?", (sid,))
    row = cur.fetchone()
    if row:
        if row[1] == expected_type:
            print(f"[PASS] {expected_type} saved correctly. Session: {row[0][:8]}...")
        else:
            print(f"[FAIL] Cross-contamination! Expected {expected_type} but found {row[1]}")
    else:
        print(f"[FAIL] Session {sid} not found in DB.")
        
conn.close()
