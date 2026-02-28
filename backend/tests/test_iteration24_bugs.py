"""
Test suite for iteration 24 - Testing bug fixes:
1. Login flow with email/password
2. Premium status after login
3. Admin panel access
4. Goals endpoint
5. Settings page loads
6. Home page displays
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://streaks-goals-update.preview.emergentagent.com')

class TestLoginFlow:
    """Test authentication flows"""
    
    def test_login_with_valid_credentials(self):
        """Test login with admin@test.com / admin123"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user_id" in data
        assert data["email"] == "admin@test.com"
        print(f"✅ Login successful, token: ...{data['session_token'][-6:]}")
        return data["session_token"]
    
    def test_login_with_invalid_credentials(self):
        """Test login with wrong password fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")


class TestPremiumStatus:
    """Test premium status endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        return response.json().get("session_token")
    
    def test_premium_status_returns_200(self, auth_token):
        """Test premium status endpoint returns 200 with auth"""
        response = requests.get(
            f"{BASE_URL}/api/premium/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Premium status: {data}")
        
    def test_premium_status_shows_active(self, auth_token):
        """Test premium status shows active for admin user"""
        response = requests.get(
            f"{BASE_URL}/api/premium/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_premium"] == True
        assert "plan" in data
        print(f"✅ Premium is active, plan: {data['plan']}")
    
    def test_premium_status_requires_auth(self):
        """Test premium status returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/premium/status")
        assert response.status_code == 401
        print("✅ Premium status requires authentication")


class TestAdminPanel:
    """Test admin panel endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        return response.json().get("session_token")
    
    def test_admin_check_returns_is_admin(self, auth_token):
        """Test admin check endpoint for admin user"""
        response = requests.get(
            f"{BASE_URL}/api/admin/check",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"] == True
        print(f"✅ Admin check: is_admin={data['is_admin']}")
    
    def test_admin_users_list(self, auth_token):
        """Test admin users list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert len(data["users"]) > 0
        print(f"✅ Admin users list: {data['total']} total users")
    
    def test_admin_subscriptions_list(self, auth_token):
        """Test admin subscriptions list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/subscriptions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "subscriptions" in data
        print(f"✅ Admin subscriptions: {len(data['subscriptions'])} subscriptions")


class TestGoalsEndpoint:
    """Test user goals endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        return response.json().get("session_token")
    
    def test_get_goals_returns_200(self, auth_token):
        """Test GET /api/user/goals returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/user/goals",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have eggs_per_month and profit_target keys
        assert "eggs_per_month" in data or data == {}
        print(f"✅ Goals endpoint: {data}")
    
    def test_set_goals(self, auth_token):
        """Test POST /api/user/goals to set goals"""
        response = requests.post(
            f"{BASE_URL}/api/user/goals",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"eggs_per_month": 100, "profit_target": 500.0}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Goals set successfully: {data}")
    
    def test_goals_requires_auth(self):
        """Test goals endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/user/goals")
        assert response.status_code == 401
        print("✅ Goals endpoint requires auth")


class TestHomePageAPIs:
    """Test APIs used by home page"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        return response.json().get("session_token")
    
    def test_coop_settings(self, auth_token):
        """Test coop settings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/coop",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print(f"✅ Coop settings: {response.json()}")
    
    def test_today_stats(self, auth_token):
        """Test today statistics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/statistics/today",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print(f"✅ Today stats: {response.json()}")
    
    def test_summary_stats(self, auth_token):
        """Test summary statistics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/statistics/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print(f"✅ Summary stats: {response.json()}")
    
    def test_insights(self, auth_token):
        """Test insights endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/insights",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print(f"✅ Insights: {response.json()}")
    
    def test_weather(self, auth_token):
        """Test weather endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/weather",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "temperature" in data
        print(f"✅ Weather: {data['temperature']}°C")
    
    def test_daily_chores(self, auth_token):
        """Test daily chores endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/daily-chores",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print(f"✅ Daily chores: {response.json()}")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ Health endpoint OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
