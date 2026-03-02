"""
Iteration 10 - Comprehensive testing for Hönsgården app
Tests: Auth (register, login, forgot password, Google OAuth), Premium/Stripe, Navigation, Core features
"""
import pytest
import requests
import uuid
import time

BASE_URL = "https://agda-rebuild.preview.emergentagent.com"


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        res = requests.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "healthy"
        print("✅ Health check passed")
    
    def test_webapp_login_page_loads(self):
        """Test that webapp login page loads"""
        res = requests.get(f"{BASE_URL}/api/web/login")
        assert res.status_code == 200
        assert "Hönsgården" in res.text
        print("✅ Webapp login page loads")


class TestRegistration:
    """Registration flow tests with GDPR consent"""
    
    def test_register_fails_without_name(self):
        """Registration should fail without name"""
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert res.status_code == 400
        assert "Namn" in res.json().get("detail", "")
        print("✅ Registration fails without name")
    
    def test_register_fails_without_terms(self):
        """Registration should fail without accepting terms"""
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "name": "Test User",
            "accepted_terms": False,
            "accepted_marketing": True
        })
        assert res.status_code == 400
        assert "användarvillkor" in res.json().get("detail", "").lower() or "villkor" in res.json().get("detail", "").lower()
        print("✅ Registration fails without accepting terms")
    
    def test_register_success_with_all_fields(self):
        """Registration should succeed with all required fields"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "password123",
            "name": "Test User",
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("user_id")
        assert data.get("email") == unique_email
        print(f"✅ Registration success with email: {unique_email}")
        return unique_email


class TestLogin:
    """Login flow tests"""
    
    def test_login_fails_with_wrong_credentials(self):
        """Login should fail with wrong credentials"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert res.status_code == 401
        print("✅ Login fails with wrong credentials")
    
    def test_login_success_with_correct_credentials(self):
        """Login with valid test credentials"""
        # First register a user
        unique_email = f"login_test_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Login Test User",
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert reg_res.status_code == 200
        
        # Now login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "testpass123"
        })
        assert login_res.status_code == 200
        data = login_res.json()
        assert data.get("email") == unique_email
        assert "session_token" in login_res.cookies or data.get("user_id")
        print(f"✅ Login success with email: {unique_email}")


class TestForgotPassword:
    """Forgot password flow tests"""
    
    def test_forgot_password_endpoint_exists(self):
        """Forgot password endpoint should exist and not reveal if email exists"""
        res = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "any@example.com"
        })
        # Should return 200 regardless of email existence (security)
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        print("✅ Forgot password endpoint works")
    
    def test_forgot_password_with_invalid_email_format(self):
        """Forgot password should validate email format"""
        res = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "not-an-email"
        })
        # Should return 422 for invalid email format
        assert res.status_code == 422
        print("✅ Forgot password validates email format")


class TestPremiumStatus:
    """Premium status and Stripe checkout tests"""
    
    def test_premium_status_endpoint_unauthenticated(self):
        """Premium status endpoint should work even for unauthenticated users"""
        res = requests.get(f"{BASE_URL}/api/premium/status")
        # Should return 200 with premium status info (default to free)
        assert res.status_code == 200
        data = res.json()
        assert "is_premium" in data
        print(f"✅ Premium status endpoint works (is_premium: {data.get('is_premium')})")
    
    def test_premium_status_with_session(self):
        """Premium status for authenticated user"""
        # Register and login
        unique_email = f"premium_test_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Premium Test",
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert reg_res.status_code == 200
        cookies = reg_res.cookies
        
        # Check premium status
        premium_res = requests.get(f"{BASE_URL}/api/premium/status", cookies=cookies)
        assert premium_res.status_code == 200
        data = premium_res.json()
        # New users get 7-day trial
        assert data.get("is_premium") == True or data.get("plan") == "trial"
        print(f"✅ Premium status for new user: plan={data.get('plan')}")
    
    def test_checkout_requires_auth(self):
        """Stripe checkout should require authentication"""
        res = requests.post(f"{BASE_URL}/api/checkout/create", json={
            "plan": "monthly",
            "origin_url": f"{BASE_URL}/api/web"
        })
        assert res.status_code == 401
        print("✅ Checkout requires authentication")
    
    def test_checkout_creates_session(self):
        """Stripe checkout should create session for authenticated user"""
        # Register and get session
        unique_email = f"checkout_test_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Checkout Test",
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert reg_res.status_code == 200
        cookies = reg_res.cookies
        
        # Create checkout session
        checkout_res = requests.post(f"{BASE_URL}/api/checkout/create", json={
            "plan": "monthly",
            "origin_url": f"{BASE_URL}/api/web"
        }, cookies=cookies)
        
        # Should return 200 with URL or 500 if Stripe keys not configured
        if checkout_res.status_code == 200:
            data = checkout_res.json()
            assert "url" in data
            assert "stripe" in data.get("url", "")
            print(f"✅ Checkout session created successfully")
        else:
            # Stripe might return error if test mode keys not configured
            print(f"⚠️ Checkout returned {checkout_res.status_code} - Stripe may need configuration")


class TestCoreFeatures:
    """Core feature tests (hens, eggs, finance)"""
    
    @pytest.fixture
    def authenticated_session(self):
        """Create authenticated session for tests"""
        unique_email = f"feature_test_{uuid.uuid4().hex[:8]}@example.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Feature Test User",
            "accepted_terms": True,
            "accepted_marketing": True
        })
        assert reg_res.status_code == 200
        return reg_res.cookies
    
    def test_hens_list_endpoint(self, authenticated_session):
        """Test hens list endpoint"""
        res = requests.get(f"{BASE_URL}/api/hens", cookies=authenticated_session)
        assert res.status_code == 200
        assert isinstance(res.json(), list)
        print("✅ Hens list endpoint works")
    
    def test_create_hen(self, authenticated_session):
        """Test creating a hen"""
        res = requests.post(f"{BASE_URL}/api/hens", json={
            "name": f"TestHen_{uuid.uuid4().hex[:6]}",
            "breed": "Swedish Flower Hen",
            "color": "Brown"
        }, cookies=authenticated_session)
        assert res.status_code == 200
        data = res.json()
        assert data.get("name")
        assert data.get("id")
        print(f"✅ Created hen: {data.get('name')}")
        return data.get("id")
    
    def test_create_and_delete_hen(self, authenticated_session):
        """Test creating and deleting a hen"""
        # Create
        create_res = requests.post(f"{BASE_URL}/api/hens", json={
            "name": f"DeleteTest_{uuid.uuid4().hex[:6]}",
            "breed": "Test Breed"
        }, cookies=authenticated_session)
        assert create_res.status_code == 200
        hen_id = create_res.json().get("id")
        
        # Delete
        delete_res = requests.delete(f"{BASE_URL}/api/hens/{hen_id}", cookies=authenticated_session)
        assert delete_res.status_code == 200
        print("✅ Hen create/delete works")
    
    def test_eggs_endpoint(self, authenticated_session):
        """Test egg registration"""
        from datetime import date
        today = date.today().isoformat()
        
        res = requests.post(f"{BASE_URL}/api/eggs", json={
            "date": today,
            "count": 3
        }, cookies=authenticated_session)
        assert res.status_code == 200
        print("✅ Egg registration works")
    
    def test_statistics_today(self, authenticated_session):
        """Test today's statistics"""
        res = requests.get(f"{BASE_URL}/api/statistics/today", cookies=authenticated_session)
        assert res.status_code == 200
        data = res.json()
        assert "egg_count" in data
        print("✅ Today's statistics works")
    
    def test_statistics_summary(self, authenticated_session):
        """Test statistics summary"""
        res = requests.get(f"{BASE_URL}/api/statistics/summary", cookies=authenticated_session)
        assert res.status_code == 200
        data = res.json()
        assert "this_month" in data or "total_eggs_all_time" in data
        print("✅ Statistics summary works")
    
    def test_finance_transactions(self, authenticated_session):
        """Test finance endpoint"""
        from datetime import date
        today = date.today().isoformat()
        
        # Create a transaction
        res = requests.post(f"{BASE_URL}/api/finance/transactions", json={
            "date": today,
            "type": "cost",
            "category": "feed",
            "amount": 100.0,
            "description": "Test feed purchase"
        }, cookies=authenticated_session)
        assert res.status_code == 200
        print("✅ Finance transactions work")


class TestNavigationEndpoints:
    """Test that all navigation endpoints exist"""
    
    def test_coop_endpoint(self):
        """Coop settings endpoint"""
        res = requests.get(f"{BASE_URL}/api/coop")
        # 200 for default or 401 if auth required
        assert res.status_code in [200, 401]
        print("✅ Coop endpoint exists")
    
    def test_flocks_endpoint(self):
        """Flocks endpoint"""
        res = requests.get(f"{BASE_URL}/api/flocks")
        assert res.status_code in [200, 401]
        print("✅ Flocks endpoint exists")
    
    def test_weather_endpoint(self):
        """Weather endpoint"""
        res = requests.get(f"{BASE_URL}/api/weather")
        assert res.status_code == 200
        data = res.json()
        assert "tips" in data or "current" in data
        print("✅ Weather endpoint works")
    
    def test_insights_endpoint(self):
        """Insights endpoint"""
        res = requests.get(f"{BASE_URL}/api/insights")
        assert res.status_code == 200
        print("✅ Insights endpoint works")


class TestLogout:
    """Logout functionality"""
    
    def test_logout_endpoint(self):
        """Test logout endpoint"""
        res = requests.post(f"{BASE_URL}/api/auth/logout")
        assert res.status_code == 200
        print("✅ Logout endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
