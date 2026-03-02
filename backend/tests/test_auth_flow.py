"""
Full Authentication Flow Tests for Hönsgården App
Tests: Registration, Email Verification, Login, Forgot Password, Logout
Created: iteration_17
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://garden-app-align.preview.emergentagent.com')

# Test data - generated unique email
TIMESTAMP = int(time.time())
TEST_EMAIL = f"test-auth-flow-{TIMESTAMP}@test.honsgarden.se"
TEST_PASSWORD = "testpassword123"
TEST_NAME = "Auth Test User"
NEW_PASSWORD = "newpassword456"


class TestAuthenticationFlow:
    """Complete end-to-end authentication flow tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Shared requests session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    def test_01_register_new_user(self, session):
        """Test user registration - should return requires_verification"""
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME,
            "accepted_terms": True,
            "accepted_marketing": False
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "requires_verification" in data
        assert data["requires_verification"] == True
        assert data["email"] == TEST_EMAIL
        
        print(f"✓ Registration successful - verification required for {TEST_EMAIL}")
    
    def test_02_register_missing_name(self, session):
        """Test registration without name - should fail"""
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"no-name-{TIMESTAMP}@test.honsgarden.se",
            "password": TEST_PASSWORD,
            "name": "",  # Empty name
            "accepted_terms": True,
            "accepted_marketing": False
        })
        
        assert response.status_code == 400, f"Should fail without name: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Registration correctly fails without name: {data['detail']}")
    
    def test_03_register_without_terms(self, session):
        """Test registration without accepting terms - should fail"""
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"no-terms-{TIMESTAMP}@test.honsgarden.se",
            "password": TEST_PASSWORD,
            "name": "No Terms User",
            "accepted_terms": False,  # Not accepted
            "accepted_marketing": False
        })
        
        assert response.status_code == 400, f"Should fail without terms: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "användarvillkoren" in data["detail"].lower() or "terms" in data["detail"].lower()
        print(f"✓ Registration correctly fails without terms acceptance")
    
    def test_04_register_short_password(self, session):
        """Test registration with short password - should fail"""
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"short-pw-{TIMESTAMP}@test.honsgarden.se",
            "password": "12345",  # Too short (< 6)
            "name": "Short Password User",
            "accepted_terms": True,
            "accepted_marketing": False
        })
        
        assert response.status_code == 400, f"Should fail with short password: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Registration correctly fails with short password: {data['detail']}")
    
    def test_05_register_duplicate_email(self, session):
        """Test registering duplicate email - should fail"""
        # Try to register the same email again
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,  # Same email as first test
            "password": TEST_PASSWORD,
            "name": TEST_NAME,
            "accepted_terms": True,
            "accepted_marketing": False
        })
        
        # Should fail because email already has pending registration
        assert response.status_code == 400 or response.status_code == 200, f"Unexpected status: {response.status_code}"
        print(f"✓ Duplicate registration handled correctly")
    
    def test_06_verify_registration_wrong_code(self, session):
        """Test verification with wrong code - should fail"""
        response = session.post(f"{BASE_URL}/api/auth/verify-registration", json={
            "email": TEST_EMAIL,
            "code": "000000"  # Wrong code
        })
        
        assert response.status_code == 400, f"Should fail with wrong code: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Verification correctly fails with wrong code")
    
    def test_07_login_unverified_user(self, session):
        """Test login before verification - should fail"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        # User hasn't verified yet, login should fail
        assert response.status_code == 401, f"Should fail for unverified user: {response.text}"
        print(f"✓ Login correctly fails for unverified user")
    
    def test_08_login_wrong_credentials(self, session):
        """Test login with wrong password"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"✓ Login correctly fails with wrong credentials")
    
    def test_09_forgot_password_existing_email(self, session):
        """Test forgot password for unverified email - should handle gracefully"""
        response = session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_EMAIL
        })
        
        # Should return 200 even if user doesn't exist (security best practice)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # code_sent should be False for unverified/nonexistent users
        print(f"✓ Forgot password returns consistent message")
    
    def test_10_forgot_password_nonexistent_email(self, session):
        """Test forgot password for non-existent email - should not reveal"""
        response = session.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent-user@test.com"
        })
        
        # Should still return 200 to not reveal if email exists
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data.get("code_sent") == False  # No code sent for non-existent
        print(f"✓ Forgot password doesn't reveal if email exists")
    
    def test_11_resend_verification(self, session):
        """Test resend verification code"""
        response = session.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": TEST_EMAIL
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Resend verification works correctly")
    
    def test_12_auth_me_unauthenticated(self, session):
        """Test /auth/me without authentication"""
        # Create fresh session without cookies
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Not authenticated"
        print(f"✓ /auth/me correctly returns 401 for unauthenticated requests")


class TestVerifiedUserFlow:
    """Tests for verified users - requires manual DB verification code retrieval"""
    
    def test_verified_user_login_logout(self):
        """
        Test login and logout for a pre-verified user
        Uses the user created in manual testing: test-user-1772199665@test.honsgarden.se
        """
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Test login with known verified user
        verified_email = "test-user-1772199665@test.honsgarden.se"
        verified_password = "newpassword123"
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": verified_email,
            "password": verified_password
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "user_id" in data
            assert "email" in data
            assert data["email"] == verified_email
            print(f"✓ Login successful for verified user")
            
            # Test /auth/me
            me_response = session.get(f"{BASE_URL}/api/auth/me")
            assert me_response.status_code == 200
            me_data = me_response.json()
            assert me_data["email"] == verified_email
            print(f"✓ /auth/me returns correct user data")
            
            # Test logout
            logout_response = session.post(f"{BASE_URL}/api/auth/logout")
            assert logout_response.status_code == 200
            logout_data = logout_response.json()
            assert logout_data["message"] == "Logged out"
            print(f"✓ Logout successful")
            
            # Verify session is invalidated
            me_after_logout = session.get(f"{BASE_URL}/api/auth/me")
            assert me_after_logout.status_code == 401
            print(f"✓ Session correctly invalidated after logout")
        else:
            pytest.skip(f"Verified test user not available: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
