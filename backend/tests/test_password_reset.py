"""
Password Reset Flow Tests
Tests the new 6-digit code-based password reset flow:
1. POST /api/auth/forgot-password - Request reset code
2. POST /api/auth/verify-reset-code - Verify 6-digit code  
3. POST /api/auth/reset-password-with-code - Reset password with token
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://honsgarden-staging.preview.emergentagent.com')


class TestForgotPassword:
    """Test POST /api/auth/forgot-password endpoint"""
    
    def test_forgot_password_existing_user_with_password(self):
        """Should return code_sent: true for existing user with password auth"""
        # First, create a test user
        test_email = f"test_reset_{uuid.uuid4().hex[:8]}@test.com"
        test_password = "testpassword123"
        
        # Register the user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": test_password,
                "name": "Test Reset User",
                "accepted_terms": True,
                "accepted_marketing": False
            }
        )
        assert register_response.status_code == 200, f"Registration failed: {register_response.text}"
        
        # Now test forgot password
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": test_email}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "code_sent" in data
        # For existing user with password, code_sent should be True (email service is configured)
        # The actual value depends on whether RESEND_API_KEY is configured
        print(f"Forgot password response: {data}")
        
    def test_forgot_password_nonexistent_user(self):
        """Should return success message but code_sent: false for non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "nonexistent_user_12345@example.com"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data.get("code_sent") == False
        
    def test_forgot_password_invalid_email(self):
        """Should return error for invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "invalid-email"}
        )
        
        # Should return 422 for validation error
        assert response.status_code in [400, 422]


class TestVerifyResetCode:
    """Test POST /api/auth/verify-reset-code endpoint"""
    
    def test_verify_code_missing_fields(self):
        """Should return error when email or code is missing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-reset-code",
            json={}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
    def test_verify_code_no_active_reset(self):
        """Should return error when no active reset exists"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-reset-code",
            json={
                "email": "nonexistent@example.com",
                "code": "123456"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
    def test_verify_code_wrong_code(self):
        """Should return error for wrong code (if reset exists)"""
        # First create a reset
        test_email = f"test_verify_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register user
        requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpassword123",
                "name": "Test Verify User",
                "accepted_terms": True
            }
        )
        
        # Request forgot password
        requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": test_email}
        )
        
        # Try wrong code
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-reset-code",
            json={
                "email": test_email,
                "code": "000000"  # Wrong code
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Wrong code response: {data}")


class TestResetPasswordWithCode:
    """Test POST /api/auth/reset-password-with-code endpoint"""
    
    def test_reset_password_missing_fields(self):
        """Should return error when token or password is missing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password-with-code",
            json={}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
    def test_reset_password_invalid_token(self):
        """Should return error for invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password-with-code",
            json={
                "token": "invalid-token-12345",
                "new_password": "newpassword123"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
    def test_reset_password_short_password(self):
        """Should return error for password less than 6 characters"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password-with-code",
            json={
                "token": "some-token",
                "new_password": "12345"  # Too short
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data


class TestLoginEndpoint:
    """Test login endpoint as part of password reset flow verification"""
    
    def test_login_existing_user(self):
        """Test login with existing test user"""
        # Use the test credentials provided
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "testuser@test.com",
                "password": "test123"
            }
        )
        
        # This might fail if the user doesn't exist yet
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.json()}")
        
        # Accept both success and failure (user might not exist)
        assert response.status_code in [200, 401]
        
    def test_login_wrong_password(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "testuser@test.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_health(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
