"""
Test file for P0 features:
- Stripe checkout with subscription mode
- Email/password authentication (login and register)
- Insights endpoint production_text logic
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://mobile-first-43.preview.emergentagent.com').rstrip('/')

class TestStripeCheckout:
    """P0: Test Stripe checkout endpoint returns valid checkout.stripe.com URL"""
    
    @pytest.fixture
    def auth_session(self):
        """Create a test user and get session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Generate unique test email
        test_email = f"TEST_stripe_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register test user
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Stripe Test User"
        })
        
        if register_response.status_code == 200:
            return session, test_email
        
        pytest.skip(f"Could not create test user: {register_response.text}")
    
    def test_checkout_create_monthly_returns_stripe_url(self, auth_session):
        """Test that /api/checkout/create returns valid checkout.stripe.com URL for monthly plan"""
        session, test_email = auth_session
        
        response = session.post(f"{BASE_URL}/api/checkout/create", json={
            "plan": "monthly",
            "origin_url": "https://mobile-first-43.preview.emergentagent.com"
        })
        
        # Validate response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain 'url' field"
        assert "session_id" in data, "Response should contain 'session_id' field"
        
        # Validate URL is valid Stripe checkout URL
        checkout_url = data["url"]
        assert checkout_url.startswith("https://checkout.stripe.com/"), \
            f"URL should start with https://checkout.stripe.com/, got: {checkout_url}"
        
        print(f"✅ Stripe checkout URL (monthly): {checkout_url[:80]}...")
        print(f"✅ Session ID: {data['session_id']}")
    
    def test_checkout_create_yearly_returns_stripe_url(self, auth_session):
        """Test that /api/checkout/create returns valid checkout.stripe.com URL for yearly plan"""
        session, test_email = auth_session
        
        response = session.post(f"{BASE_URL}/api/checkout/create", json={
            "plan": "yearly",
            "origin_url": "https://mobile-first-43.preview.emergentagent.com"
        })
        
        # Validate response
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain 'url' field"
        assert data["url"].startswith("https://checkout.stripe.com/"), \
            f"URL should start with https://checkout.stripe.com/, got: {data['url']}"
        
        print(f"✅ Stripe checkout URL (yearly): {data['url'][:80]}...")
    
    def test_checkout_create_requires_auth(self):
        """Test that /api/checkout/create requires authentication"""
        response = requests.post(f"{BASE_URL}/api/checkout/create", json={
            "plan": "monthly",
            "origin_url": "https://mobile-first-43.preview.emergentagent.com"
        })
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✅ Checkout endpoint correctly requires authentication")
    
    def test_checkout_create_invalid_plan(self, auth_session):
        """Test that /api/checkout/create rejects invalid plans"""
        session, test_email = auth_session
        
        response = session.post(f"{BASE_URL}/api/checkout/create", json={
            "plan": "invalid_plan",
            "origin_url": "https://mobile-first-43.preview.emergentagent.com"
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print("✅ Checkout endpoint correctly rejects invalid plan")


class TestEmailPasswordAuth:
    """P0: Test email/password authentication"""
    
    def test_register_new_user(self):
        """Test registering a new user with email and password"""
        test_email = f"TEST_auth_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test User"
        })
        
        # Should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert data["email"] == test_email.lower(), f"Email should match: {data.get('email')}"
        assert "message" in data, "Response should contain welcome message"
        
        print(f"✅ User registered successfully: {data['email']}")
        print(f"✅ Welcome message: {data.get('message')}")
    
    def test_register_duplicate_email(self):
        """Test that registering duplicate email returns 400"""
        test_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        
        # First registration
        first_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert first_response.status_code == 200
        
        # Second registration with same email
        second_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass456"
        })
        
        assert second_response.status_code == 400, f"Expected 400 for duplicate, got {second_response.status_code}"
        assert "registrerad" in second_response.json().get("detail", "").lower() or "redan" in second_response.json().get("detail", "").lower()
        print("✅ Duplicate email correctly rejected")
    
    def test_login_valid_credentials(self):
        """Test login with valid email and password"""
        test_email = f"TEST_login_{uuid.uuid4().hex[:8]}@example.com"
        test_password = "testpass123"
        
        # First register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "name": "Login Test User"
        })
        assert register_response.status_code == 200, f"Registration failed: {register_response.text}"
        
        # Then login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        
        assert login_response.status_code == 200, f"Expected 200, got {login_response.status_code}: {login_response.text}"
        
        data = login_response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert data["email"] == test_email.lower(), f"Email should match"
        
        print(f"✅ Login successful for: {data['email']}")
    
    def test_login_invalid_password(self):
        """Test login with invalid password returns 401"""
        test_email = f"TEST_wrongpw_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "correctpassword"
        })
        
        # Login with wrong password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "wrongpassword"
        })
        
        assert login_response.status_code == 401, f"Expected 401, got {login_response.status_code}"
        print("✅ Wrong password correctly rejected with 401")
    
    def test_login_nonexistent_email(self):
        """Test login with nonexistent email returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent_email_12345@example.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Nonexistent email correctly rejected with 401")
    
    def test_register_short_password(self):
        """Test that short passwords (< 6 chars) are rejected"""
        test_email = f"TEST_shortpw_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "12345"  # Only 5 chars
        })
        
        assert response.status_code == 400, f"Expected 400 for short password, got {response.status_code}"
        print("✅ Short password correctly rejected")


class TestInsightsEndpoint:
    """P2: Test insights endpoint production_text logic"""
    
    def test_insights_new_user_shows_no_eggs_message(self):
        """Test that a new user with 0 eggs sees 'Inga ägg registrerade än'
        
        New users get 7-day premium trial, so they have access to premium section.
        When total_eggs=0, production_text should be 'Inga ägg registrerade än'
        """
        # Create a fresh test user
        test_email = f"TEST_insights_{uuid.uuid4().hex[:8]}@example.com"
        
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Register - new users get 7-day premium trial
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert register_response.status_code == 200, f"Registration failed: {register_response.text}"
        assert "7 dagars gratis Premium" in register_response.json().get("message", ""), \
            "New user should get 7-day trial message"
        
        # Get insights - should have premium section since user has trial
        insights_response = session.get(f"{BASE_URL}/api/insights")
        assert insights_response.status_code == 200, f"Insights failed: {insights_response.text}"
        
        data = insights_response.json()
        
        # Verify user is premium (trial)
        assert data.get("is_premium") == True, "New user should have premium trial"
        
        # Check premium insights section
        assert "premium" in data, "Response should contain 'premium' section (user has trial)"
        premium_data = data["premium"]
        
        assert "production_text" in premium_data, "Premium should contain production_text"
        assert "production_status" in premium_data, "Premium should contain production_status"
        
        # Verify the correct text for no eggs
        production_text = premium_data["production_text"]
        production_status = premium_data["production_status"]
        
        assert production_status == "no_data", f"Expected status 'no_data', got: {production_status}"
        assert "Inga ägg registrerade" in production_text, \
            f"Expected 'Inga ägg registrerade' in text, got: {production_text}"
        
        print(f"✅ New user (with trial) sees correct message: {production_text}")
        print(f"✅ Production status: {production_status}")
    
    def test_insights_accessible_anonymous(self):
        """Test insights endpoint is accessible for anonymous users (default_user)
        
        Note: Premium section only appears for premium users.
        Non-premium users see basic insights without production_text.
        """
        # Without any auth, uses default_user
        response = requests.get(f"{BASE_URL}/api/insights")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Basic insights should always be present
        assert "total_eggs" in data, "Should have total_eggs"
        assert "is_premium" in data, "Should have is_premium flag"
        
        # Premium section is only for premium users
        is_premium = data.get("is_premium", False)
        if is_premium:
            assert "premium" in data, "Premium user should have premium section"
        else:
            # Non-premium users may not have premium section
            print(f"ℹ️ Default user is_premium={is_premium}, no premium section expected")
        
        print(f"✅ Insights endpoint accessible for default user")
        print(f"✅ Total eggs: {data.get('total_eggs', 0)}")
        print(f"✅ Is premium: {is_premium}")


# Cleanup fixture - runs after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup():
    """Info about test data created"""
    yield
    print("\n📋 Note: Test users created with TEST_ prefix can be cleaned up from MongoDB")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
