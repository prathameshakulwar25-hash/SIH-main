import os

import jwt
import pytest
from fastapi.testclient import TestClient

# Ensure test environment is configured before application imports
os.environ["ENV_MODE"] = "development"
os.environ["JWT_SECRET"] = "test-secret-key-min-32-chars-jeevan-opd"
os.environ["PHYSICIAN_PIN"] = "1234"
os.environ["DATABASE_URL"] = "sqlite:///./data/ayush.db"

from config import settings
from main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def physician_token():
    payload = {
        "sub": "physician-test-1",
        "role": "physician",
        "name": "Dr. Test Physician"
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

@pytest.fixture(scope="session")
def auth_headers(physician_token):
    return {"Authorization": f"Bearer {physician_token}"}
