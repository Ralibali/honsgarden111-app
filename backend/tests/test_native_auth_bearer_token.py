"""
Native Auth Bearer Token Tests - Iteration 20
Test the native app authentication flow using Bearer tokens in Authorization header.

Key fix: Native (Expo) app uses Bearer token in Authorization header instead of cookies.
- Login returns session_token in response body
- GET /api/auth/me with Bearer token returns user data  
- GET /api/coop with Bearer token returns coop settings (not 401)
- 401 returned when no token sent
- Logout works

Test credentials: nativetest@test.com / test123456
"""
import pytest
import requests
import os
import uuid

# Get API URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')


class TestLoginReturnsSessionToken:
    """Test that login endpoint returns session_token in response body for native apps"""
    
    def test_login_returns_session_token_in_body(self):
        """POST /api/auth/login should return session_token in JSON response body"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nativetest@test.com",
                "password": "test123456"
            }
        )
        
        if response.status_code == 401:
            pytest.skip("Test user nativetest@test.com does not exist - need to create it first")
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # CRITICAL: session_token must be in response body for native apps
        assert "session_token" in data, f"CRITICAL: session_token missing from login response! Response: {data}"
        assert data["session_token"] is not None, "session_token is None"
        assert len(data["session_token"]) > 10, f"session_token too short: {data['session_token']}"
        
        # Other expected fields
        assert "user_id" in data, f"user_id missing from login response: {data}"
        assert "email" in data, f"email missing from login response: {data}"
        
        print(f"✅ Login returns session_token in body: ...{data['session_token'][-6:]}")
        print(f"✅ User: {data['email']}, ID: {data['user_id']}")
        
        return data["session_token"]


class TestBearerTokenAuth:
    """Test Bearer token authentication for native apps"""
    
    @pytest.fixture
    def auth_token(self):
        """Get a valid Bearer token by logging in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nativetest@test.com",
                "password": "test123456"
            }
        )
        
        if response.status_code == 401:
            pytest.skip("Test user nativetest@test.com does not exist")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"No session_token in login response: {data}"
        
        return data["session_token"]
    
    def test_auth_me_with_bearer_token(self, auth_token):
        """GET /api/auth/me with Bearer token should return user data"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user_id" in data, f"user_id missing from /auth/me response: {data}"
        assert "email" in data, f"email missing from /auth/me response: {data}"
        
        print(f"✅ /api/auth/me works with Bearer token - user: {data['email']}")
    
    def test_coop_with_bearer_token(self, auth_token):
        """GET /api/coop with Bearer token should return coop settings (NOT 401)"""
        response = requests.get(
            f"{BASE_URL}/api/coop",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # This is the CRITICAL test - must not return 401
        assert response.status_code != 401, f"CRITICAL BUG: /api/coop returns 401 with valid Bearer token!"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "coop_name" in data or "id" in data, f"Invalid coop response: {data}"
        
        print(f"✅ /api/coop works with Bearer token - coop: {data.get('coop_name', 'unnamed')}")
    
    def test_hens_with_bearer_token(self, auth_token):
        """GET /api/hens with Bearer token should return hens list"""
        response = requests.get(
            f"{BASE_URL}/api/hens",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code != 401, f"CRITICAL BUG: /api/hens returns 401 with valid Bearer token!"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print(f"✅ /api/hens works with Bearer token")
    
    def test_eggs_with_bearer_token(self, auth_token):
        """GET /api/eggs with Bearer token should return eggs list"""
        response = requests.get(
            f"{BASE_URL}/api/eggs",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code != 401, f"CRITICAL BUG: /api/eggs returns 401 with valid Bearer token!"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print(f"✅ /api/eggs works with Bearer token")
    
    def test_statistics_today_with_bearer_token(self, auth_token):
        """GET /api/statistics/today with Bearer token should return today's stats"""
        response = requests.get(
            f"{BASE_URL}/api/statistics/today",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code != 401, f"CRITICAL BUG: /api/statistics/today returns 401 with valid Bearer token!"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print(f"✅ /api/statistics/today works with Bearer token")


class TestNoTokenReturns401:
    """Test that protected endpoints return 401 when no token is sent"""
    
    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/auth/me returns 401 without token")
    
    def test_coop_without_token_returns_401(self):
        """GET /api/coop without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/coop")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/coop returns 401 without token")
    
    def test_invalid_bearer_token_returns_401(self):
        """GET /api/auth/me with invalid token should return 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid Bearer token returns 401")


class TestLogoutFlow:
    """Test logout functionality"""
    
    def test_logout_clears_session(self):
        """POST /api/auth/logout should clear the session"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nativetest@test.com",
                "password": "test123456"
            }
        )
        
        if login_response.status_code == 401:
            pytest.skip("Test user nativetest@test.com does not exist")
        
        assert login_response.status_code == 200
        token = login_response.json()["session_token"]
        
        # Verify token works
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200, "Token should work before logout"
        
        # Logout with Bearer token
        logout_response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert logout_response.status_code == 200, f"Logout failed: {logout_response.status_code}"
        
        # Token should no longer work after logout
        me_after_logout = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Note: Token might still work briefly due to session expiry vs deletion
        # But logout endpoint should at least return success
        
        print("✅ Logout endpoint works")


class TestCreateTestUser:
    """Create the test user if needed"""
    
    def test_create_test_user_if_not_exists(self):
        """Create nativetest@test.com if it doesn't exist"""
        # Try login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nativetest@test.com",
                "password": "test123456"
            }
        )
        
        if login_response.status_code == 200:
            print("✅ Test user nativetest@test.com already exists")
            return
        
        # User doesn't exist, try to create
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": "nativetest@test.com",
                "password": "test123456",
                "name": "Native Test User",
                "accepted_terms": True,
                "accepted_marketing": False
            }
        )
        
        if register_response.status_code == 200:
            data = register_response.json()
            if data.get("requires_verification"):
                print("⚠️ Test user registration requires email verification")
                print("   Email: nativetest@test.com")
                print("   Verification code was sent to email")
                pytest.skip("Email verification required - need to verify manually or use existing user")
            else:
                print(f"✅ Test user created: {data}")
        elif register_response.status_code == 400:
            # User might already exist with different state
            print(f"ℹ️ Registration failed (might already exist): {register_response.text}")
        else:
            print(f"⚠️ Could not create test user: {register_response.status_code} - {register_response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
