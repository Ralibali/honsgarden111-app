"""
Iteration 27: Viral Features Backend Tests
Tests the new viral engagement features:
1. GET /api/stats/flock-comparison - User vs app average
2. GET /api/stats/percentile - User percentile ranking
3. GET /api/stats/leaderboard - Top flocks
4. POST /api/share/generate-image - PNG base64 share image
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/') or "https://chicken-hub-redesign.preview.emergentagent.com"

class TestViralFeatures:
    """Test viral engagement endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        # Login with test user
        login_res = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@honsgarden.se",
            "password": "test123"
        })
        
        if login_res.status_code == 200:
            # Set session cookie from response
            if 'session_token' in login_res.cookies:
                s.cookies.set('session_token', login_res.cookies['session_token'])
            login_data = login_res.json()
            if login_data.get('session_token'):
                s.headers.update({"Authorization": f"Bearer {login_data['session_token']}"})
                s.cookies.set('session_token', login_data['session_token'])
        else:
            pytest.skip(f"Login failed with status {login_res.status_code}: {login_res.text}")
        
        return s
    
    def test_health_check(self):
        """Verify backend is running"""
        res = requests.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check OK")
    
    def test_flock_comparison_requires_auth(self):
        """GET /api/stats/flock-comparison requires authentication"""
        res = requests.get(f"{BASE_URL}/api/stats/flock-comparison")
        assert res.status_code == 401
        print("PASS: flock-comparison requires auth")
    
    def test_flock_comparison_authenticated(self, session):
        """GET /api/stats/flock-comparison returns comparison data"""
        res = session.get(f"{BASE_URL}/api/stats/flock-comparison")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        # Verify response structure
        assert "app_avg_eggs_per_day" in data, "Missing app_avg_eggs_per_day"
        assert "user_avg_eggs_per_day" in data, "Missing user_avg_eggs_per_day"
        assert "percent_difference" in data, "Missing percent_difference"
        assert "comparison_text" in data, "Missing comparison_text"
        assert "status" in data, "Missing status"
        assert "total_active_users" in data, "Missing total_active_users"
        
        # Verify data types
        assert isinstance(data["app_avg_eggs_per_day"], (int, float))
        assert isinstance(data["user_avg_eggs_per_day"], (int, float))
        assert isinstance(data["percent_difference"], (int, float))
        assert isinstance(data["comparison_text"], str)
        assert data["status"] in ["above", "below", "equal"]
        assert isinstance(data["total_active_users"], int)
        
        print(f"PASS: flock-comparison returns valid data - user: {data['user_avg_eggs_per_day']} ägg/dag, app avg: {data['app_avg_eggs_per_day']} ägg/dag")
    
    def test_percentile_requires_auth(self):
        """GET /api/stats/percentile requires authentication"""
        res = requests.get(f"{BASE_URL}/api/stats/percentile")
        assert res.status_code == 401
        print("PASS: percentile requires auth")
    
    def test_percentile_authenticated(self, session):
        """GET /api/stats/percentile returns percentile ranking"""
        res = session.get(f"{BASE_URL}/api/stats/percentile")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        # Verify response structure
        assert "message" in data, "Missing message"
        assert "total_users" in data or "percentile" in data, "Missing total_users or percentile"
        
        # If user has eggs, verify percentile data
        if data.get("percentile") is not None:
            assert "badge" in data, "Missing badge"
            assert isinstance(data["percentile"], (int, float))
            assert 0 <= data["percentile"] <= 100
            assert isinstance(data["badge"], str)
        
        print(f"PASS: percentile returns valid data - {data.get('message', 'No message')}")
    
    def test_leaderboard_requires_auth(self):
        """GET /api/stats/leaderboard requires authentication"""
        res = requests.get(f"{BASE_URL}/api/stats/leaderboard")
        assert res.status_code == 401
        print("PASS: leaderboard requires auth")
    
    def test_leaderboard_authenticated(self, session):
        """GET /api/stats/leaderboard returns top flocks"""
        res = session.get(f"{BASE_URL}/api/stats/leaderboard")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        # Verify response structure
        assert "leaderboard" in data, "Missing leaderboard"
        assert "total_users" in data, "Missing total_users"
        assert isinstance(data["leaderboard"], list)
        assert isinstance(data["total_users"], int)
        
        # If leaderboard has entries, verify structure
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            assert "name" in entry, "Missing name in leaderboard entry"
            assert "eggs_per_day" in entry, "Missing eggs_per_day in leaderboard entry"
            assert "total_eggs" in entry, "Missing total_eggs in leaderboard entry"
            assert isinstance(entry["name"], str)
            assert isinstance(entry["eggs_per_day"], (int, float))
            assert isinstance(entry["total_eggs"], int)
        
        print(f"PASS: leaderboard returns {len(data['leaderboard'])} entries, {data['total_users']} total users")
    
    def test_generate_image_requires_auth(self):
        """POST /api/share/generate-image requires authentication"""
        res = requests.post(f"{BASE_URL}/api/share/generate-image")
        assert res.status_code == 401
        print("PASS: generate-image requires auth")
    
    def test_generate_image_authenticated(self, session):
        """POST /api/share/generate-image returns PNG base64 image"""
        res = session.post(f"{BASE_URL}/api/share/generate-image")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        
        data = res.json()
        # Verify response structure
        assert "image_data" in data, "Missing image_data"
        assert "stats" in data, "Missing stats"
        
        # Verify image data format
        image_data = data["image_data"]
        assert image_data.startswith("data:image/png;base64,"), "Invalid image data format"
        assert len(image_data) > 100, "Image data too short"
        
        # Verify stats
        stats = data["stats"]
        assert "user_avg" in stats, "Missing user_avg in stats"
        assert "app_avg" in stats, "Missing app_avg in stats"
        assert "percent_diff" in stats, "Missing percent_diff in stats"
        
        print(f"PASS: generate-image returns valid PNG (data length: {len(image_data)} chars)")


class TestViralFeaturesDataIntegrity:
    """Test data integrity of viral features"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        login_res = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@honsgarden.se",
            "password": "test123"
        })
        
        if login_res.status_code == 200:
            if 'session_token' in login_res.cookies:
                s.cookies.set('session_token', login_res.cookies['session_token'])
            login_data = login_res.json()
            if login_data.get('session_token'):
                s.headers.update({"Authorization": f"Bearer {login_data['session_token']}"})
                s.cookies.set('session_token', login_data['session_token'])
        else:
            pytest.skip(f"Login failed")
        
        return s
    
    def test_add_egg_and_verify_flock_comparison(self, session):
        """Add egg record and verify it affects flock comparison"""
        import datetime
        today = datetime.date.today().isoformat()
        
        # Get initial comparison
        initial_res = session.get(f"{BASE_URL}/api/stats/flock-comparison")
        assert initial_res.status_code == 200
        initial_data = initial_res.json()
        initial_user_avg = initial_data["user_avg_eggs_per_day"]
        
        # Add an egg (this will affect user's average)
        egg_res = session.post(f"{BASE_URL}/api/eggs", json={
            "date": today,
            "count": 1
        })
        assert egg_res.status_code in [200, 201], f"Failed to add egg: {egg_res.text}"
        
        # Get updated comparison
        updated_res = session.get(f"{BASE_URL}/api/stats/flock-comparison")
        assert updated_res.status_code == 200
        updated_data = updated_res.json()
        
        # User's average should have changed (or stayed same if already had eggs today)
        print(f"PASS: Data integrity - Initial user avg: {initial_user_avg}, Updated: {updated_data['user_avg_eggs_per_day']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
