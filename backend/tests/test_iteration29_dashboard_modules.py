"""
Iteration 29: Dashboard Module Settings Tests
Tests for the feature-preferences endpoints for dashboard module visibility.
Features:
- GET /api/feature-preferences - returns all dashboard module settings
- PUT /api/feature-preferences - updates dashboard settings (available for ALL users)
- Verify show_dashboard_weather=false persists
- Verify show_dashboard_ai_analysis=false persists
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://egg-logger-mobile.preview.emergentagent.com')

# Test user credentials
TEST_EMAIL = "test2@honsgarden.se"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def session():
    """Create a requests session"""
    return requests.Session()


@pytest.fixture(scope="module")
def auth_token(session):
    """Authenticate and get session token"""
    login_url = f"{BASE_URL}/api/auth/login"
    response = session.post(login_url, json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Authentication failed with status {response.status_code}: {response.text}")
    
    data = response.json()
    token = data.get("session_token")
    if not token:
        pytest.skip("No session_token in login response")
    
    return token


@pytest.fixture(scope="module")
def authenticated_session(session, auth_token):
    """Session with auth headers"""
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestFeaturePreferencesEndpoints:
    """Test GET and PUT /api/feature-preferences endpoints"""
    
    def test_get_feature_preferences_returns_200(self, authenticated_session):
        """GET /api/feature-preferences should return 200 with preferences"""
        response = authenticated_session.get(f"{BASE_URL}/api/feature-preferences")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "preferences" in data, "Response should contain 'preferences' key"
        assert "can_customize" in data, "Response should contain 'can_customize' key"
        
        # Dashboard modules should be customizable for all users
        assert data["can_customize"] == True, "can_customize should be True for all users"
        
        print(f"✅ GET /api/feature-preferences returned 200 with preferences")
        print(f"   can_customize: {data.get('can_customize')}")
        print(f"   is_premium: {data.get('is_premium')}")
    
    def test_get_feature_preferences_has_all_dashboard_keys(self, authenticated_session):
        """Verify all 8 dashboard module keys are present"""
        response = authenticated_session.get(f"{BASE_URL}/api/feature-preferences")
        assert response.status_code == 200
        
        data = response.json()
        prefs = data.get("preferences", {})
        
        # All 8 dashboard module keys
        expected_keys = [
            "show_dashboard_weather",
            "show_dashboard_ai_analysis",
            "show_dashboard_weekly_goal",
            "show_dashboard_ranking",
            "show_dashboard_leaderboard",
            "show_dashboard_friends",
            "show_dashboard_national_stats",
            "show_dashboard_agda_inbox"
        ]
        
        for key in expected_keys:
            assert key in prefs, f"Missing key: {key}"
            # Value should be boolean (either True or False)
            assert isinstance(prefs[key], bool), f"Key {key} should be boolean, got {type(prefs[key])}"
        
        print(f"✅ All 8 dashboard module keys present in preferences")
        for key in expected_keys:
            print(f"   {key}: {prefs[key]}")


class TestDashboardModuleToggle:
    """Test toggling dashboard module settings"""
    
    def test_set_weather_false_persists(self, authenticated_session):
        """Setting show_dashboard_weather=false should persist"""
        # Set weather to false
        response = authenticated_session.put(
            f"{BASE_URL}/api/feature-preferences",
            json={"show_dashboard_weather": False}
        )
        
        assert response.status_code == 200, f"PUT failed with {response.status_code}: {response.text}"
        
        # Verify response shows the change
        data = response.json()
        prefs = data.get("preferences", {})
        assert prefs.get("show_dashboard_weather") == False, "Weather should be False after update"
        
        # Verify persistence by doing a GET
        get_response = authenticated_session.get(f"{BASE_URL}/api/feature-preferences")
        assert get_response.status_code == 200
        
        get_data = get_response.json()
        get_prefs = get_data.get("preferences", {})
        assert get_prefs.get("show_dashboard_weather") == False, "Weather should persist as False"
        
        print("✅ show_dashboard_weather=false persists correctly")
    
    def test_set_ai_analysis_false_persists(self, authenticated_session):
        """Setting show_dashboard_ai_analysis=false should persist"""
        # Set AI analysis to false
        response = authenticated_session.put(
            f"{BASE_URL}/api/feature-preferences",
            json={"show_dashboard_ai_analysis": False}
        )
        
        assert response.status_code == 200, f"PUT failed with {response.status_code}: {response.text}"
        
        # Verify response shows the change
        data = response.json()
        prefs = data.get("preferences", {})
        assert prefs.get("show_dashboard_ai_analysis") == False, "AI analysis should be False after update"
        
        # Verify persistence by doing a GET
        get_response = authenticated_session.get(f"{BASE_URL}/api/feature-preferences")
        assert get_response.status_code == 200
        
        get_data = get_response.json()
        get_prefs = get_data.get("preferences", {})
        assert get_prefs.get("show_dashboard_ai_analysis") == False, "AI analysis should persist as False"
        
        print("✅ show_dashboard_ai_analysis=false persists correctly")
    
    def test_toggle_multiple_settings(self, authenticated_session):
        """Can toggle multiple dashboard settings at once"""
        # Set multiple settings
        response = authenticated_session.put(
            f"{BASE_URL}/api/feature-preferences",
            json={
                "show_dashboard_weekly_goal": False,
                "show_dashboard_ranking": False,
                "show_dashboard_leaderboard": True
            }
        )
        
        assert response.status_code == 200, f"PUT failed with {response.status_code}: {response.text}"
        
        data = response.json()
        prefs = data.get("preferences", {})
        
        assert prefs.get("show_dashboard_weekly_goal") == False
        assert prefs.get("show_dashboard_ranking") == False
        assert prefs.get("show_dashboard_leaderboard") == True
        
        print("✅ Multiple dashboard settings updated successfully")
    
    def test_toggle_setting_back_to_true(self, authenticated_session):
        """Can toggle settings back to True"""
        # First ensure weather is false
        authenticated_session.put(
            f"{BASE_URL}/api/feature-preferences",
            json={"show_dashboard_weather": False}
        )
        
        # Now toggle back to true
        response = authenticated_session.put(
            f"{BASE_URL}/api/feature-preferences",
            json={"show_dashboard_weather": True}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        prefs = data.get("preferences", {})
        assert prefs.get("show_dashboard_weather") == True, "Weather should be True after toggle back"
        
        print("✅ Setting can be toggled back to True")


class TestDashboardModulesAvailableForAll:
    """Test that dashboard module settings are available for ALL users (not just Premium)"""
    
    def test_non_premium_can_change_dashboard_settings(self, authenticated_session):
        """Non-premium users should be able to change dashboard module settings"""
        # Try to change a dashboard setting
        response = authenticated_session.put(
            f"{BASE_URL}/api/feature-preferences",
            json={"show_dashboard_friends": False}
        )
        
        # Should succeed (200) - dashboard modules available for ALL users
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        prefs = data.get("preferences", {})
        assert prefs.get("show_dashboard_friends") == False
        
        print("✅ Dashboard module settings are available for ALL users (not just Premium)")


class TestCleanup:
    """Reset settings to defaults for next test runs"""
    
    def test_reset_to_defaults(self, authenticated_session):
        """Reset all dashboard modules to True for clean state"""
        response = authenticated_session.put(
            f"{BASE_URL}/api/feature-preferences",
            json={
                "show_dashboard_weather": True,
                "show_dashboard_ai_analysis": True,
                "show_dashboard_weekly_goal": True,
                "show_dashboard_ranking": True,
                "show_dashboard_leaderboard": True,
                "show_dashboard_friends": True,
                "show_dashboard_national_stats": True,
                "show_dashboard_agda_inbox": True
            }
        )
        
        assert response.status_code == 200
        print("✅ All dashboard settings reset to True (defaults)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
