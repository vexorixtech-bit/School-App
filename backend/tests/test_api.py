"""Basic API tests for School ERP system."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_invalid():
    """Invalid credentials return 401."""
    response = client.post("/api/auth/login", json={"username": "nonexistent", "password": "wrong"})
    assert response.status_code == 401

def test_login_valid():
    """Valid admin credentials return token."""
    response = client.post("/api/auth/login", json={"username": "superadmin", "password": "admin123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_me_endpoint():
    """Authenticated user can access /me."""
    login = client.post("/api/auth/login", json={"username": "superadmin", "password": "admin123"})
    token = login.json()["access_token"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "superadmin"

def test_classes_endpoint():
    """Classes endpoint returns data."""
    login = client.post("/api/auth/login", json={"username": "superadmin", "password": "admin123"})
    token = login.json()["access_token"]
    response = client.get("/api/classes/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 11

def test_students_pagination():
    """Students endpoint supports pagination."""
    login = client.post("/api/auth/login", json={"username": "superadmin", "password": "admin123"})
    token = login.json()["access_token"]
    response = client.get("/api/students/?page=1&per_page=10", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "students" in data
    assert "total" in data
    assert "page" in data
    assert "total_pages" in data
    assert len(data["students"]) <= 10

def test_forgot_password():
    """Forgot password endpoint accepts valid email."""
    response = client.post("/api/auth/forgot-password", json={"email": "admin@schooleerp.com"})
    assert response.status_code == 200
    data = response.json()
    assert "reset_token" in data or "message" in data
