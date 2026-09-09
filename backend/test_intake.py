import json
import sqlite3
import os
from fastapi.testclient import TestClient
from main import app
from red_flags import check_red_flags

client = TestClient(app)

print("=== 1. Automated Tests ===")
# 4 specific red flag patterns
tests = [
    ("Acute Surgical", {"severity": 9, "onset": "sudden", "site": "rlq"}, "High Priority Triage: Possible acute surgical pattern."),
    ("Infective", {"severity": 8, "associated_sx": "fever"}, "Moderate-High Priority: Possible infective/inflammatory pattern."),
    ("Vascular", {"character": "tearing", "radiation_back": "back"}, "Critical Priority: Immediate evaluation required for vascular pattern."),
    ("Hemorrhagic", {"associated_sx": "blood"}, "High Priority: Potential hemorrhagic/obstructive pattern.")
]

for name, payload, expected_flag in tests:
    flags = check_red_flags(payload)
    if expected_flag in flags:
        print(f"[PASS] {name} flag triggered correctly.")
    else:
        print(f"[FAIL] {name} flag NOT triggered. Got: {flags}")

# Missing data test
flags = check_red_flags({"severity": 3, "site": "rlq"}) # Missing onset, etc
if len(flags) == 0:
    print("[PASS] Missing data handled safely (0 flags).")
else:
    print(f"[FAIL] Missing data triggered flags: {flags}")

# Endpoint stability test
resp = client.post("/api/intake/abdominal-pain", json={"severity": 9, "onset": "sudden", "site": "rlq", "character": "dull"})
if resp.status_code == 200 and "High Priority Triage: Possible acute surgical pattern." in resp.json()["flags"]:
    print("[PASS] Endpoint stability test passed.")
    session_id = resp.json()["session_id"]
else:
    print("[FAIL] Endpoint stability test failed.")


print("\n=== 2. Path Tracing ===")
tree_path = os.path.join("data", "abdominal_pain_tree.json")
with open(tree_path, "r") as f:
    tree = json.load(f)

nodes = {n["id"]: n for n in tree["nodes"]}

def trace_paths(node_id, current_path):
    node = nodes.get(node_id)
    if not node:
        print(f"[FAIL] Node not found: {node_id}")
        return
    
    path_so_far = current_path + [node_id]
    
    if node_id == "severity":
        # Check that it ends here
        has_next = any(opt.get("next") is not None for opt in node["options"])
        if has_next:
            print(f"[FAIL] Severity node does not terminate: {node_id}")
        else:
            print(f"[PASS] Path terminates safely at severity: {' -> '.join(path_so_far)}")
        return
        
    for opt in node["options"]:
        nxt = opt.get("next")
        if not nxt:
            print(f"[FAIL] Dead end found at {node_id} via option {opt['value']}")
        else:
            trace_paths(nxt, path_so_far)

print("Tracing distinct structural paths:")
# Just trace distinct node paths (since options loop to same next node usually, we will only follow unique 'next' paths to avoid combinatorial explosion)
distinct_paths = set()
def trace_distinct_node_paths(node_id, current_path):
    node = nodes.get(node_id)
    path_str = " -> ".join(current_path + [node_id])
    
    if node_id == "severity":
        distinct_paths.add(path_str)
        return
        
    next_nodes = set(opt["next"] for opt in node["options"] if opt["next"])
    for nxt in next_nodes:
        trace_distinct_node_paths(nxt, current_path + [node_id])

trace_distinct_node_paths(tree["start_node"], [])
for p in distinct_paths:
    print(p)

print("\n=== 3. Tearing -> Back-specific verification ===")
tearing_path = any("character -> radiation_back -> associated_sx" in p for p in distinct_paths)
if tearing_path:
    print("[PASS] Tearing -> radiation_back -> associated_sx is structurally sound.")
else:
    print("[FAIL] Tearing path broken.")

print("\n=== 5. Database Save Verification ===")
conn = sqlite3.connect(os.path.join("data", "ayush.db"))
cur = conn.cursor()
cur.execute("SELECT session_id, flags FROM intake_results WHERE session_id = ?", (session_id,))
row = cur.fetchone()
if row:
    print(f"[PASS] Intake data saved to SQLite. Session: {row[0]}")
else:
    print("[FAIL] Intake data NOT saved to SQLite.")
conn.close()
