"""
Iteration 9 - Registration Validation Tests
Testing:
1. All fields mandatory (name, terms, marketing all with *)
2. Registration fails without marketing consent
3. Registration fails without name
4. Consent text says 'honsgarden.se' not 'Aurora Media AB'
5. Forgot password endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mobile-first-43.preview.emergentagent.com')

class TestRegistrationValidation:
    """Tests for registration field validation"""
    
    def test_register_fails_without_name(self):
        """Registration should fail when name is empty"""
        unique_email = f"TEST_noname_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "",  # Empty name
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "Namn är obligatoriskt" in data.get("detail", ""), f"Unexpected error: {data}"
    
    def test_register_fails_without_whitespace_only_name(self):
        """Registration should fail when name is only whitespace"""
        unique_email = f"TEST_whitespace_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "   ",  # Whitespace only
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "Namn är obligatoriskt" in data.get("detail", ""), f"Unexpected error: {data}"
    
    def test_register_fails_without_terms(self):
        """Registration should fail when terms not accepted"""
        unique_email = f"TEST_noterms_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User",
            "accepted_terms": False,  # Terms not accepted
            "accepted_marketing": True
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "användarvillkoren" in data.get("detail", "").lower(), f"Unexpected error: {data}"
    
    def test_register_fails_without_marketing(self):
        """Registration should fail when marketing not accepted (now required)"""
        unique_email = f"TEST_nomarketing_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User",
            "accepted_terms": True,
            "accepted_marketing": False  # Marketing not accepted
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "information från oss" in data.get("detail", "").lower() or "godkänna" in data.get("detail", "").lower(), f"Unexpected error: {data}"
    
    def test_register_success_with_all_fields(self):
        """Registration should succeed when all required fields are provided"""
        unique_email = f"TEST_success_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User Full",
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        data = response.json()
        assert "user_id" in data, f"Expected user_id in response: {data}"
        assert data["email"] == unique_email.lower(), f"Email mismatch: {data}"


class TestForgotPassword:
    """Tests for forgot password flow"""
    
    def test_forgot_password_endpoint_exists(self):
        """Forgot password endpoint should exist"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "test@example.com"
        })
        # Should return success (not revealing if email exists)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data, f"Expected message in response: {data}"
    
    def test_forgot_password_with_invalid_email(self):
        """Forgot password should handle unknown emails gracefully"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@nowhere.com"
        })
        # Should still return success (security - don't reveal if email exists)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data, f"Expected message in response: {data}"


class TestPremiumStatus:
    """Tests for premium status API"""
    
    def test_premium_status_endpoint(self):
        """Premium status endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/premium/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "is_premium" in data, f"Expected is_premium in response: {data}"


class TestWeatherEndpoint:
    """Tests for weather API"""
    
    def test_weather_endpoint(self):
        """Weather endpoint should return weather data"""
        response = requests.get(f"{BASE_URL}/api/weather")
        # Should work without auth (may return default location)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should have tips array
        assert "tips" in data, f"Expected tips in response: {data}"
    
    def test_weather_with_location(self):
        """Weather endpoint should accept lat/lon parameters"""
        # Stockholm coordinates
        response = requests.get(f"{BASE_URL}/api/weather?lat=59.33&lon=18.07")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "tips" in data, f"Expected tips in response: {data}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
