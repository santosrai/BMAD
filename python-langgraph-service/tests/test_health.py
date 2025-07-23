"""
Tests for health check endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client():
    """Test client fixture."""
    app = create_app()
    return TestClient(app)


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health/")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "python-langgraph-service"
    assert "checks" in data
    assert "timestamp" in data


def test_readiness_check(client):
    """Test readiness check endpoint."""
    response = client.get("/health/ready")
    assert response.status_code == 200
    
    data = response.json()
    assert "ready" in data
    assert "dependencies" in data
    assert "timestamp" in data


def test_liveness_check(client):
    """Test liveness check endpoint."""
    response = client.get("/health/live")
    assert response.status_code == 200
    
    data = response.json()
    assert data["alive"] is True
    assert "timestamp" in data


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert data["service"] == "python-langgraph-service"
    assert data["status"] == "running"
    assert "version" in data