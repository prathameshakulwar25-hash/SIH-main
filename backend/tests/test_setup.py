import json
import os

from fastapi.testclient import TestClient

from main import app
from scoring import score_ayush

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json().get("status") == "ok"

def test_validate_ayush_questions_json():
    file_path = os.path.join(os.path.dirname(__file__), "..", "data", "ayush_questions.json")
    assert os.path.exists(file_path), "ayush_questions.json not found"
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    valid_maps_to = {
        "Prakriti": {"Vata", "Pitta", "Kapha"},
        "Agni": {"Vishama", "Tikshna", "Manda", "Sama"},
        "Koshtha": {"Krura", "Mridu", "Madhyama"}
    }

    total_qs = 0
    for section in data.get("sections", []):
        sec_name = section["section"]
        qs = section.get("questions", [])
        total_qs += len(qs)
        for q in qs:
            for opt in q.get("options", []):
                maps_to = opt.get("maps_to")
                assert maps_to in valid_maps_to.get(sec_name, set()), f"Invalid maps_to: {maps_to} in section {sec_name}"

    assert total_qs == 17

def test_score_ayush():
    sample_answers = [
        {"question_id": "p1", "mapped_to": "Vata"},
        {"question_id": "p2", "mapped_to": "Vata"},
        {"question_id": "p3", "mapped_to": "Pitta"},
        {"question_id": "p4", "mapped_to": "Vata"},
        {"question_id": "a1", "mapped_to": "Manda"},
        {"question_id": "a2", "mapped_to": "Tikshna"},
        {"question_id": "a3", "mapped_to": "Tikshna"},
        {"question_id": "k1", "mapped_to": "Madhyama"},
        {"question_id": "k2", "mapped_to": "Krura"},
        {"question_id": "k3", "mapped_to": "Krura"}
    ]
    result = score_ayush(sample_answers)
    assert result is not None
    assert "dominant" in result
    assert "Prakriti" in result["dominant"]
    assert "Agni" in result["dominant"]
    assert "Koshtha" in result["dominant"]
