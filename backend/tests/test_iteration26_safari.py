"""
Iteration 26: Safari responsiveness fix and API verification tests
Tests:
1. Backend health check
2. AI endpoints (daily-tip, egg-forecast) - require auth
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://egg-logger-mobile.preview.emergentagent.com')

class TestHealthAndBasicAPIs:
    """Test basic API endpoints"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✅ Health check: {data}")
    
    def test_ai_daily_tip_requires_auth(self):
        """Test /api/ai/daily-tip requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ai/daily-tip")
        # Should return 401 or equivalent auth error
        assert response.status_code in [401, 403]
        print(f"✅ AI daily-tip requires auth: status={response.status_code}")
    
    def test_ai_egg_forecast_requires_auth(self):
        """Test /api/ai/egg-forecast requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ai/egg-forecast")
        # Should return 401 or equivalent auth error
        assert response.status_code in [401, 403]
        print(f"✅ AI egg-forecast requires auth: status={response.status_code}")


class TestAuthenticatedAIEndpoints:
    """Test AI endpoints with authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token by logging in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@test.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("session_token")
    
    def test_ai_daily_tip_authenticated(self, auth_token):
        """Test /api/ai/daily-tip with auth returns tip"""
        response = requests.get(
            f"{BASE_URL}/api/ai/daily-tip",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "tip" in data
        print(f"✅ AI daily-tip: {data.get('tip', '')[:50]}...")
    
    def test_ai_egg_forecast_authenticated(self, auth_token):
        """Test /api/ai/egg-forecast with auth returns forecast"""
        response = requests.get(
            f"{BASE_URL}/api/ai/egg-forecast",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "forecast" in data
        print(f"✅ AI egg-forecast: data_quality={data.get('data_quality')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
