from fastapi.testclient import TestClient

from app.main import app


def test_root_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "eden-erp-backend",
        "version": "0.1.0",
    }


def test_v1_health() -> None:
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
