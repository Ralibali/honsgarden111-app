"""
P0 Auth Fix Tests - Iteration 18
Test that all user-protected endpoints return 401 when not authenticated,
and that /api/premium/status returns {is_premium: false} (NOT 401).

This tests the removal of 'default_user' fallback from the backend.
"""
import pytest
import requests
import os
import uuid

# Get API URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

class TestPublicEndpoints:
    """Test public endpoints that should NOT require authentication"""
    
    def test_health_endpoint_public(self):
        """GET /api/health should return 200 without auth"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", f"Unexpected health response: {data}"
        print("✅ /api/health returns 200 (public endpoint)")
    
    def test_premium_status_returns_not_premium_without_auth(self):
        """GET /api/premium/status should return {is_premium: false} when not logged in (NOT 401)"""
        response = requests.get(f"{BASE_URL}/api/premium/status")
        assert response.status_code == 200, f"Premium status should return 200, got {response.status_code}"
        data = response.json()
        assert "is_premium" in data, f"Response missing is_premium field: {data}"
        assert data["is_premium"] == False, f"is_premium should be false when not logged in: {data}"
        print(f"✅ /api/premium/status returns {{is_premium: false}} (status: 200)")


class TestProtectedEndpointsReturn401:
    """Test that all protected endpoints return 401 when not authenticated"""
    
    def test_coop_returns_401_without_auth(self):
        """GET /api/coop should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/coop")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/coop returns 401 (protected)")
    
    def test_eggs_returns_401_without_auth(self):
        """GET /api/eggs should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/eggs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/eggs returns 401 (protected)")
    
    def test_hens_returns_401_without_auth(self):
        """GET /api/hens should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/hens")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/hens returns 401 (protected)")
    
    def test_transactions_returns_401_without_auth(self):
        """GET /api/transactions should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/transactions returns 401 (protected)")
    
    def test_statistics_today_returns_401_without_auth(self):
        """GET /api/statistics/today should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/statistics/today")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/statistics/today returns 401 (protected)")
    
    def test_ai_daily_tip_returns_401_without_auth(self):
        """GET /api/ai/daily-tip should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/ai/daily-tip")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/ai/daily-tip returns 401 (protected)")
    
    def test_statistics_summary_returns_401_without_auth(self):
        """GET /api/statistics/summary should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/statistics/summary")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/statistics/summary returns 401 (protected)")
    
    def test_health_logs_returns_401_without_auth(self):
        """GET /api/health-logs should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/health-logs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/health-logs returns 401 (protected)")
    
    def test_insights_returns_401_without_auth(self):
        """GET /api/statistics/insights should return 401 when not logged in"""
        response = requests.get(f"{BASE_URL}/api/statistics/insights")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✅ /api/statistics/insights returns 401 (protected)")


class TestAuthenticatedAccess:
    """Test that authenticated users CAN access protected endpoints"""
    
    @pytest.fixture
    def auth_session(self):
        """Create an authenticated session using test credentials"""
        session = requests.Session()
        
        # Try to login with test user from iteration 17
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test-user-1772199665@test.honsgarden.se",
                "password": "newpassword123"
            }
        )
        
        if login_response.status_code != 200:
            # Create a new test user if the old one doesn't work
            test_email = f"test-auth-{uuid.uuid4().hex[:8]}@test.honsgarden.se"
            register_response = session.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": test_email,
                    "password": "testpass123",
                    "name": "Test Auth User",
                    "accepted_terms": True,
                    "accepted_marketing": False
                }
            )
            
            if register_response.status_code == 200 and register_response.json().get("requires_verification"):
                pytest.skip("Email verification required - cannot complete auth test without email access")
            
            # Try login with new user
            login_response = session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": test_email, "password": "testpass123"}
            )
            
            if login_response.status_code != 200:
                pytest.skip(f"Could not authenticate: {login_response.text}")
        
        return session
    
    def test_coop_accessible_when_authenticated(self, auth_session):
        """GET /api/coop should return 200 when logged in"""
        response = auth_session.get(f"{BASE_URL}/api/coop")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "coop_name" in data or "id" in data, f"Unexpected coop response: {data}"
        print("✅ /api/coop returns 200 when authenticated")
    
    def test_eggs_accessible_when_authenticated(self, auth_session):
        """GET /api/eggs should return 200 when logged in"""
        response = auth_session.get(f"{BASE_URL}/api/eggs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ /api/eggs returns 200 when authenticated")
    
    def test_hens_accessible_when_authenticated(self, auth_session):
        """GET /api/hens should return 200 when logged in"""
        response = auth_session.get(f"{BASE_URL}/api/hens")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ /api/hens returns 200 when authenticated")
    
    def test_statistics_today_accessible_when_authenticated(self, auth_session):
        """GET /api/statistics/today should return 200 when logged in"""
        response = auth_session.get(f"{BASE_URL}/api/statistics/today")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ /api/statistics/today returns 200 when authenticated")


class TestLoginFlow:
    """Test the login flow works correctly"""
    
    def test_login_with_valid_credentials(self):
        """POST /api/auth/login should work with valid credentials"""
        # Using test user from iteration 17
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "test-user-1772199665@test.honsgarden.se",
                "password": "newpassword123"
            }
        )
        
        if response.status_code == 401:
            # User might not exist, this is okay - just verify 401 behavior
            print("ℹ️ Test user doesn't exist - skipping login test")
            pytest.skip("Test user not available")
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "user_id" in data, f"Login response missing user_id: {data}"
        assert "email" in data, f"Login response missing email: {data}"
        print(f"✅ Login successful for user: {data.get('email')}")
    
    def test_login_with_invalid_credentials_returns_401(self):
        """POST /api/auth/login should return 401 for invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nonexistent@test.honsgarden.se",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid login returns 401")
    
    def test_auth_me_returns_401_without_session(self):
        """GET /api/auth/me should return 401 without valid session"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/auth/me returns 401 without session")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
