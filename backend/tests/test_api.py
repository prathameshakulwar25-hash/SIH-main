from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_get_ayush_questions():
    response = client.get("/api/ayush/questions")
    assert response.status_code == 200
    data = response.json()
    assert "sections" in data
    assert len(data["sections"]) > 0

def test_submit_ayush_answers():
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
    response = client.post("/api/ayush/submit", json={"answers": sample_answers})
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "result" in data
