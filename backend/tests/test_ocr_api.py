import os

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_upload_ocr_prescription_and_lab():
    base_dir = os.path.join(os.path.dirname(__file__), "..")
    rx_path = os.path.join(base_dir, "sample_prescription.jpg")
    lab_path = os.path.join(base_dir, "sample_lab_report.jpg")

    if not os.path.exists(rx_path) or not os.path.exists(lab_path):
        pytest.skip("Sample OCR images not found in backend directory")

    with open(rx_path, "rb") as f:
        rx_res = client.post("/api/documents/upload", files={"file": ("sample_prescription.jpg", f, "image/jpeg")})
    assert rx_res.status_code == 200
    rx_data = rx_res.json()
    assert "session_id" in rx_data
    assert "raw_text" in rx_data

    with open(lab_path, "rb") as f:
        lab_res = client.post("/api/documents/upload", files={"file": ("sample_lab_report.jpg", f, "image/jpeg")})
    assert lab_res.status_code == 200
    lab_data = lab_res.json()
    assert "parsed_data" in lab_data
