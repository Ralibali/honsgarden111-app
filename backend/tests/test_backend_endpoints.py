"""
Backend API Tests for Hönsgården App
Testing: Health check, Advanced insights, Auth endpoints, Static pages
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://coop-hub-1.preview.emergentagent.com').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """Basic health and connectivity tests"""
    
    def test_api_root_accessible(self, api_client):
        """Test that the API root is accessible"""
        response = api_client.get(f"{BASE_URL}/api/")
        # Should return something (even 404 is acceptable if API is running)
        assert response.status_code in [200, 404, 307], f"API not accessible, status: {response.status_code}"
        print(f"✓ API root accessible, status: {response.status_code}")
    
    def test_health_endpoint_or_auth_endpoint(self, api_client):
        """Test basic API is responding"""
        # Try auth/me which should return 401 if not authenticated
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [200, 401], f"Expected 200 or 401, got {response.status_code}"
        print(f"✓ API health check passed, auth/me returns: {response.status_code}")


class TestAdvancedInsights:
    """Tests for /api/statistics/advanced-insights endpoint"""
    
    def test_advanced_insights_endpoint_exists(self, api_client):
        """Test that advanced insights endpoint responds"""
        response = api_client.get(f"{BASE_URL}/api/statistics/advanced-insights")
        # Should return 200 (with default user data) or 401 if auth required
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
        print(f"✓ Advanced insights endpoint accessible, status: {response.status_code}")
    
    def test_advanced_insights_response_structure(self, api_client):
        """Test that advanced insights returns expected data structure"""
        response = api_client.get(f"{BASE_URL}/api/statistics/advanced-insights")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required top-level fields
            assert "hen_count" in data, "Missing hen_count field"
            assert "period_days" in data, "Missing period_days field"
            assert "total_eggs_30d" in data, "Missing total_eggs_30d field"
            assert "total_costs_30d" in data, "Missing total_costs_30d field"
            assert "total_sales_30d" in data, "Missing total_sales_30d field"
            assert "metrics" in data, "Missing metrics field"
            assert "insights" in data, "Missing insights field"
            
            # Check metrics structure
            metrics = data["metrics"]
            required_metrics = [
                "feed_conversion_ratio",
                "laying_rate", 
                "cost_per_egg",
                "revenue_per_egg",
                "profit_per_egg",
                "feed_cost_per_egg",
                "eggs_per_hen_monthly",
                "eggs_per_hen_yearly_estimate"
            ]
            
            for metric in required_metrics:
                assert metric in metrics, f"Missing metric: {metric}"
                assert "value" in metrics[metric], f"Missing value in {metric}"
                assert "unit" in metrics[metric], f"Missing unit in {metric}"
                assert "description" in metrics[metric], f"Missing description in {metric}"
            
            # Check insights structure
            insights = data["insights"]
            assert "best_laying_day" in insights, "Missing best_laying_day in insights"
            assert "productivity_score" in insights, "Missing productivity_score in insights"
            
            print(f"✓ Advanced insights response structure is valid")
            print(f"  - hen_count: {data['hen_count']}")
            print(f"  - total_eggs_30d: {data['total_eggs_30d']}")
            print(f"  - laying_rate: {metrics['laying_rate']['value']}")
            print(f"  - cost_per_egg: {metrics['cost_per_egg']['value']}")
            print(f"  - productivity_score: {insights['productivity_score']}")
        else:
            pytest.skip(f"Endpoint returned {response.status_code}, skipping structure validation")


class TestAuthRegister:
    """Tests for registration endpoints"""
    
    def test_register_endpoint_exists(self, api_client):
        """Test that /api/auth/register endpoint exists and accepts POST"""
        # Send invalid data to check endpoint exists
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "",
            "password": ""
        })
        # Should return 400 or 422 (validation error), not 404
        assert response.status_code in [400, 422, 500], f"Unexpected status: {response.status_code}"
        print(f"✓ Register endpoint exists, returns: {response.status_code}")
    
    def test_register_requires_name(self, api_client):
        """Test that registration requires name"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpassword123",
            "accepted_terms": True
            # Missing name
        })
        # Should require name
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data or "message" in data
        print(f"✓ Register correctly requires name field")
    
    def test_register_requires_terms_acceptance(self, api_client):
        """Test that registration requires terms acceptance"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpassword123",
            "name": "Test User",
            "accepted_terms": False
        })
        # Should require terms acceptance
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Register correctly requires terms acceptance")
    
    def test_register_requires_valid_password(self, api_client):
        """Test that registration requires password of min 6 chars"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "12345",  # Too short
            "name": "Test User",
            "accepted_terms": True
        })
        # Should require longer password
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Register correctly validates password length")


class TestVerifyRegistration:
    """Tests for /api/auth/verify-registration endpoint"""
    
    def test_verify_registration_endpoint_exists(self, api_client):
        """Test that verify-registration endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/auth/verify-registration", json={
            "email": "test@test.com",
            "code": "123456"
        })
        # Should return 400 (no pending registration), not 404
        assert response.status_code in [400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Verify registration endpoint exists, returns: {response.status_code}")
    
    def test_verify_registration_requires_email_and_code(self, api_client):
        """Test that verify-registration requires both email and code"""
        response = api_client.post(f"{BASE_URL}/api/auth/verify-registration", json={
            "email": "",
            "code": ""
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Verify registration correctly validates input")


class TestForgotPassword:
    """Tests for /api/auth/forgot-password endpoint"""
    
    def test_forgot_password_endpoint_exists(self, api_client):
        """Test that forgot-password endpoint exists and responds"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@test.com"
        })
        # Should return 200 even for non-existent email (security - don't reveal if email exists)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Forgot password endpoint exists and returns 200")
    
    def test_forgot_password_response_structure(self, api_client):
        """Test forgot-password returns expected fields"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "test@test.com"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data, "Missing message in response"
            assert "code_sent" in data, "Missing code_sent in response"
            print(f"✓ Forgot password response structure valid: message='{data['message'][:50]}...', code_sent={data['code_sent']}")


class TestResetPasswordWithCode:
    """Tests for /api/auth/reset-password-with-code endpoint"""
    
    def test_reset_password_with_code_endpoint_exists(self, api_client):
        """Test that reset-password-with-code endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password-with-code", json={
            "token": "invalid_token",
            "new_password": "newpassword123"
        })
        # Should return 400 (invalid token), not 404
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Reset password with code endpoint exists")
    
    def test_reset_password_validates_password_length(self, api_client):
        """Test that reset validates password length"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password-with-code", json={
            "token": "some_token",
            "new_password": "12345"  # Too short
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Reset password validates password length")


class TestStaticPages:
    """Tests for static HTML pages"""
    
    def test_premium_page_loads(self, api_client):
        """Test that premium page loads correctly"""
        response = api_client.get(f"{BASE_URL}/api/premium-page")
        assert response.status_code == 200, f"Premium page failed to load, status: {response.status_code}"
        
        # Check it's HTML
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type, f"Expected HTML, got: {content_type}"
        
        # Check for key content
        content = response.text
        assert "Hönsgården" in content or "Premium" in content, "Page doesn't contain expected content"
        print(f"✓ Premium page loads correctly (status 200, HTML content)")
    
    def test_reset_password_page_loads(self, api_client):
        """Test that reset-password page loads correctly"""
        response = api_client.get(f"{BASE_URL}/api/reset-password")
        assert response.status_code == 200, f"Reset password page failed to load, status: {response.status_code}"
        
        # Check it's HTML
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type, f"Expected HTML, got: {content_type}"
        
        # Check for key content
        content = response.text
        assert "lösenord" in content.lower() or "password" in content.lower(), "Page doesn't contain password-related content"
        print(f"✓ Reset password page loads correctly (status 200, HTML content)")
    
    def test_register_page_loads(self, api_client):
        """Test that register page loads correctly"""
        response = api_client.get(f"{BASE_URL}/api/register")
        assert response.status_code == 200, f"Register page failed to load, status: {response.status_code}"
        
        # Check it's HTML
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type, f"Expected HTML, got: {content_type}"
        
        # Check for key content
        content = response.text
        assert "konto" in content.lower() or "register" in content.lower() or "skapa" in content.lower(), "Page doesn't contain registration-related content"
        print(f"✓ Register page loads correctly (status 200, HTML content)")


class TestAdditionalEndpoints:
    """Additional endpoint tests"""
    
    def test_login_endpoint_exists(self, api_client):
        """Test that login endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "wrongpassword"
        })
        # Should return 401 (wrong credentials), not 404
        assert response.status_code in [401, 400], f"Expected 401 or 400, got {response.status_code}"
        print(f"✓ Login endpoint exists, returns: {response.status_code}")
    
    def test_premium_status_endpoint(self, api_client):
        """Test premium status endpoint"""
        response = api_client.get(f"{BASE_URL}/api/premium/status")
        assert response.status_code in [200, 401], f"Expected 200 or 401, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "is_premium" in data, "Missing is_premium field"
            print(f"✓ Premium status endpoint works, is_premium: {data['is_premium']}")
        else:
            print(f"✓ Premium status endpoint exists (requires auth)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
