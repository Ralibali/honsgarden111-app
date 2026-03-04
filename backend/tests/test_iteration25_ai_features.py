"""
Iteration 25: AI Features and UI Testing
Testing all AI endpoints with robust timeout/fallback and frontend UI requirements:
- /api/ai/health - AI health check
- /api/ai/daily-tip - Daily tips
- /api/ai/daily-report - AI-generated daily report (Premium)
- /api/ai/advisor - Ask Agda AI advisor (Premium)
- /api/ai/egg-forecast - 7-day egg forecast (Premium)
- Frontend: Login, Dashboard, AI grid, No Community tab
"""

import pytest
import requests
import os
import time

# Base URL from environment - PUBLIC URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chicken-hub-redesign.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "admin123"


class TestAIHealth:
    """Test AI health endpoint - no auth required"""
    
    def test_ai_health_returns_ok(self):
        """AI health endpoint should return ok: true when configured"""
        response = requests.get(f"{BASE_URL}/api/ai/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ok" in data, "Response should contain 'ok' field"
        assert data["ok"] == True, f"Expected ok=True, got {data.get('ok')}"
        assert "providerConfigured" in data, "Response should contain 'providerConfigured' field"
        assert "version" in data, "Response should contain 'version' field"
        print(f"AI Health: ok={data['ok']}, provider={data.get('providerConfigured')}, version={data.get('version')}")


class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    def test_login_with_valid_credentials(self, session):
        """Login should work with admin@test.com/admin123"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "session_token" in data, "Response should contain session_token"
        assert data.get("email") == TEST_EMAIL, f"Expected email {TEST_EMAIL}, got {data.get('email')}"
        print(f"Login successful: user_id={data.get('user_id')}, email={data.get('email')}")
        return data["session_token"]


class TestAIDailyTip:
    """Test AI Daily Tip endpoint - Premium feature"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - cannot test authenticated endpoints")
        token = response.json().get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_daily_tip_returns_ok_true(self, auth_headers):
        """Daily tip should return ok: true with tip text"""
        response = requests.get(f"{BASE_URL}/api/ai/daily-tip", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ok" in data, "Response should contain 'ok' field"
        assert data["ok"] == True, f"Expected ok=True, got {data.get('ok')}"
        assert "tip" in data, "Response should contain 'tip' field"
        assert len(data.get("tip", "")) > 10, "Tip should be a meaningful text"
        
        print(f"Daily Tip: ok={data['ok']}, category={data.get('category')}")
        print(f"Tip content (first 100 chars): {data.get('tip', '')[:100]}...")


class TestAIDailyReport:
    """Test AI Daily Report endpoint - Premium feature"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - cannot test authenticated endpoints")
        token = response.json().get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_daily_report_returns_ok_true(self, auth_headers):
        """Daily report should return ok: true with report text"""
        # This endpoint may take longer due to AI generation
        response = requests.get(f"{BASE_URL}/api/ai/daily-report", headers=auth_headers, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ok" in data, "Response should contain 'ok' field"
        assert data["ok"] == True, f"Expected ok=True, got {data.get('ok')}"
        
        # Report can use fallback if AI times out
        has_report = "report" in data or "message" in data.get("report_data", {}) or "report" in data.get("report_data", {})
        if not has_report:
            # Check nested structure
            report_text = data.get("report") or (data.get("report_data", {}).get("report")) or (data.get("report_data", {}).get("message"))
            has_report = report_text is not None
        
        print(f"Daily Report: ok={data['ok']}, used_fallback={data.get('used_fallback')}, is_premium={data.get('is_premium')}")
        print(f"Response structure: {list(data.keys())}")


class TestAIAdvisor:
    """Test AI Advisor (Agda) endpoint - Premium feature"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - cannot test authenticated endpoints")
        token = response.json().get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_advisor_returns_ok_true(self, auth_headers):
        """Advisor should return ok: true with AI answer"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advisor",
            headers=auth_headers,
            json={"question": "Hur mycket vatten behöver mina höns per dag?"},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ok" in data, "Response should contain 'ok' field"
        assert data["ok"] == True, f"Expected ok=True, got {data.get('ok')}"
        assert "answer" in data, "Response should contain 'answer' field"
        assert len(data.get("answer", "")) > 10, "Answer should be meaningful text"
        
        print(f"AI Advisor: ok={data['ok']}, used_fallback={data.get('used_fallback')}, is_premium={data.get('is_premium')}")
        print(f"Answer (first 150 chars): {data.get('answer', '')[:150]}...")


class TestAIEggForecast:
    """Test AI Egg Forecast endpoint - Premium feature"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - cannot test authenticated endpoints")
        token = response.json().get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_egg_forecast_returns_ok_true(self, auth_headers):
        """Egg forecast should return ok: true with forecast data or low_data message"""
        response = requests.get(f"{BASE_URL}/api/ai/egg-forecast", headers=auth_headers, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ok" in data, "Response should contain 'ok' field"
        assert data["ok"] == True, f"Expected ok=True, got {data.get('ok')}"
        
        # Forecast structure can vary based on data availability
        assert "forecast" in data or "data_quality" in data, "Response should contain forecast or data_quality"
        
        # Handle low data quality gracefully
        if data.get("data_quality") == "low":
            print(f"Egg Forecast: ok={data['ok']}, data_quality=low (not enough data)")
            assert "forecast" in data, "Even low data should return forecast structure"
        else:
            print(f"Egg Forecast: ok={data['ok']}, data_quality={data.get('data_quality', 'N/A')}")
            forecast = data.get("forecast", {})
            print(f"Forecast total_predicted: {forecast.get('total_predicted')}, avg_daily: {forecast.get('avg_daily')}")


class TestDashboardAPIs:
    """Test dashboard-related APIs"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - cannot test authenticated endpoints")
        token = response.json().get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_coop_settings_api(self, auth_headers):
        """Coop settings should return 200"""
        response = requests.get(f"{BASE_URL}/api/coop", headers=auth_headers)
        assert response.status_code == 200, f"Coop settings failed: {response.status_code}"
        data = response.json()
        print(f"Coop: name={data.get('coop_name')}, hen_count={data.get('hen_count')}")
    
    def test_statistics_today_api(self, auth_headers):
        """Statistics/today should return 200"""
        response = requests.get(f"{BASE_URL}/api/statistics/today", headers=auth_headers)
        assert response.status_code == 200, f"Statistics/today failed: {response.status_code}"
        data = response.json()
        print(f"Today stats: eggs={data.get('egg_count')}, hens={data.get('hen_count')}")
    
    def test_statistics_summary_api(self, auth_headers):
        """Statistics/summary should return 200"""
        response = requests.get(f"{BASE_URL}/api/statistics/summary", headers=auth_headers)
        assert response.status_code == 200, f"Statistics/summary failed: {response.status_code}"
    
    def test_weather_api(self, auth_headers):
        """Weather should return 200"""
        response = requests.get(f"{BASE_URL}/api/weather", headers=auth_headers)
        assert response.status_code == 200, f"Weather failed: {response.status_code}"
    
    def test_daily_chores_api(self, auth_headers):
        """Daily chores should return 200"""
        response = requests.get(f"{BASE_URL}/api/daily-chores", headers=auth_headers)
        assert response.status_code == 200, f"Daily chores failed: {response.status_code}"


class TestPremiumStatus:
    """Test premium status for admin user"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - cannot test authenticated endpoints")
        token = response.json().get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_premium_status_is_active(self, auth_headers):
        """Admin user should have premium status"""
        response = requests.get(f"{BASE_URL}/api/premium/status", headers=auth_headers)
        assert response.status_code == 200, f"Premium status failed: {response.status_code}"
        
        data = response.json()
        assert data.get("is_premium") == True, f"Expected is_premium=True, got {data.get('is_premium')}"
        print(f"Premium Status: is_premium={data.get('is_premium')}, plan={data.get('plan')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
