import json
import os

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_simulated_intakes():
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

    for complaint, scenarios in payloads.items():
        for name, data in scenarios:
            resp = client.post(f"/api/intake/{complaint}", json=data)
            assert resp.status_code == 200
            res_json = resp.json()
            if name.startswith("Red Flag"):
                assert len(res_json.get("flags", [])) > 0, f"Expected red flag for {name} but got none"
            elif name.startswith("Benign"):
                assert len(res_json.get("flags", [])) == 0, f"Expected benign for {name} but got flags: {res_json.get('flags')}"

def test_tree_tracing():
    base_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    for complaint in ["chest_pain", "fever", "abdominal_pain"]:
        tree_path = os.path.join(base_dir, f"{complaint}_tree.json")
        if not os.path.exists(tree_path):
            continue
        with open(tree_path, "r", encoding="utf-8") as f:
            tree = json.load(f)
        assert "nodes" in tree
        assert len(tree["nodes"]) > 0
