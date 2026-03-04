"""
Test iteration 27: Viral engagement features
- GET /api/stats/flock-comparison
- GET /api/stats/percentile
- GET /api/stats/leaderboard
- POST /api/share/generate-image
"""
import pytest
import requests
import os
import base64

# MUST use environment URL - DO NOT add default
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://chicken-hub-redesign.preview.emergentagent.com"

# Test credentials from previous iterations
TEST_EMAIL = "admin@test.com"
TEST_PASSWORD = "admin123"


class TestViralFeatures:
    """Test viral engagement features for flock comparison and social sharing"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create and configure a requests session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login and get session token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        token = data.get("session_token")
        assert token, "No session_token returned"
        return token
    
    @pytest.fixture(scope="class")
    def authenticated_session(self, session, auth_token):
        """Return session with auth header"""
        session.headers.update({"Authorization": f"Bearer {auth_token}"})
        return session
    
    # ========== Health check ==========
    def test_health_endpoint(self, session):
        """Test API is running"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint working")
    
    # ========== Auth required tests ==========
    def test_flock_comparison_requires_auth(self, session):
        """Test flock-comparison endpoint requires authentication"""
        # Use fresh session without auth
        response = requests.get(f"{BASE_URL}/api/stats/flock-comparison")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: flock-comparison requires auth")
    
    def test_percentile_requires_auth(self, session):
        """Test percentile endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/stats/percentile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: percentile requires auth")
    
    def test_leaderboard_requires_auth(self, session):
        """Test leaderboard endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/stats/leaderboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: leaderboard requires auth")
    
    def test_generate_image_requires_auth(self, session):
        """Test generate-image endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/share/generate-image")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: generate-image requires auth")
    
    # ========== Authenticated API tests ==========
    def test_flock_comparison_authenticated(self, authenticated_session):
        """Test flock-comparison returns proper data when authenticated"""
        response = authenticated_session.get(f"{BASE_URL}/api/stats/flock-comparison")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "app_avg_eggs_per_day" in data, "Missing app_avg_eggs_per_day"
        assert "user_avg_eggs_per_day" in data, "Missing user_avg_eggs_per_day"
        assert "percent_difference" in data, "Missing percent_difference"
        assert "comparison_text" in data, "Missing comparison_text"
        assert "status" in data, "Missing status"
        assert "total_active_users" in data, "Missing total_active_users"
        
        # Verify types
        assert isinstance(data["app_avg_eggs_per_day"], (int, float))
        assert isinstance(data["user_avg_eggs_per_day"], (int, float))
        assert isinstance(data["percent_difference"], (int, float))
        assert isinstance(data["comparison_text"], str)
        assert data["status"] in ["above", "below", "equal"]
        assert isinstance(data["total_active_users"], int)
        
        print(f"PASS: flock-comparison returns valid data: {data['comparison_text']}")
    
    def test_percentile_authenticated(self, authenticated_session):
        """Test percentile endpoint returns proper data when authenticated"""
        response = authenticated_session.get(f"{BASE_URL}/api/stats/percentile")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "percentile" in data, "Missing percentile"
        assert "badge" in data, "Missing badge"
        assert "message" in data, "Missing message"
        assert "tips" in data, "Missing tips"
        assert "total_users" in data, "Missing total_users"
        
        # Percentile can be None if user has no eggs
        if data["percentile"] is not None:
            assert isinstance(data["percentile"], (int, float))
            assert 0 <= data["percentile"] <= 100
        
        assert isinstance(data["badge"], str)
        assert isinstance(data["message"], str)
        assert isinstance(data["tips"], list)
        
        print(f"PASS: percentile returns valid data - badge: {data['badge']}, message: {data['message'][:50]}...")
    
    def test_leaderboard_authenticated(self, authenticated_session):
        """Test leaderboard endpoint returns proper data when authenticated"""
        response = authenticated_session.get(f"{BASE_URL}/api/stats/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "leaderboard" in data, "Missing leaderboard"
        assert "total_users" in data, "Missing total_users"
        
        assert isinstance(data["leaderboard"], list)
        assert isinstance(data["total_users"], int)
        
        # Verify leaderboard entry structure (if any exist)
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            assert "name" in entry, "Missing name in leaderboard entry"
            assert "eggs_per_day" in entry, "Missing eggs_per_day in leaderboard entry"
            assert "total_eggs" in entry, "Missing total_eggs in leaderboard entry"
            
            assert isinstance(entry["name"], str)
            assert isinstance(entry["eggs_per_day"], (int, float))
            assert isinstance(entry["total_eggs"], int)
        
        print(f"PASS: leaderboard returns {len(data['leaderboard'])} entries, {data['total_users']} total users")
    
    def test_generate_image_authenticated(self, authenticated_session):
        """Test generate-image endpoint returns valid base64 PNG when authenticated"""
        response = authenticated_session.post(f"{BASE_URL}/api/share/generate-image")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "image_data" in data, "Missing image_data"
        assert "stats" in data, "Missing stats"
        
        # Verify image_data is base64 PNG
        image_data = data["image_data"]
        assert image_data.startswith("data:image/png;base64,"), "Image data should be base64 PNG"
        
        # Verify we can decode the base64
        base64_content = image_data.split(",")[1]
        try:
            decoded = base64.b64decode(base64_content)
            # PNG files start with specific bytes
            assert decoded[:8] == b'\x89PNG\r\n\x1a\n', "Not a valid PNG file"
        except Exception as e:
            pytest.fail(f"Failed to decode base64 image: {e}")
        
        # Verify stats structure
        stats = data["stats"]
        assert "user_avg" in stats, "Missing user_avg in stats"
        assert "app_avg" in stats, "Missing app_avg in stats"
        assert "percent_diff" in stats, "Missing percent_diff in stats"
        
        print(f"PASS: generate-image creates valid PNG, size: {len(decoded)} bytes, user_avg: {stats['user_avg']} ägg/dag")
    
    # ========== Data integrity tests ==========
    def test_flock_comparison_data_consistency(self, authenticated_session):
        """Test that flock-comparison data is internally consistent"""
        response = authenticated_session.get(f"{BASE_URL}/api/stats/flock-comparison")
        assert response.status_code == 200
        
        data = response.json()
        
        # If user is above average, percent_difference should be positive
        # If user is below average, percent_difference should be negative
        status = data["status"]
        percent_diff = data["percent_difference"]
        
        if status == "above":
            assert percent_diff > 0, f"Status is 'above' but percent_diff is {percent_diff}"
        elif status == "below":
            assert percent_diff < 0, f"Status is 'below' but percent_diff is {percent_diff}"
        elif status == "equal":
            assert percent_diff == 0, f"Status is 'equal' but percent_diff is {percent_diff}"
        
        print(f"PASS: Data consistency verified - status: {status}, percent_diff: {percent_diff}")
    
    def test_leaderboard_is_sorted(self, authenticated_session):
        """Test that leaderboard is sorted by eggs_per_day descending"""
        response = authenticated_session.get(f"{BASE_URL}/api/stats/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        if len(leaderboard) > 1:
            eggs_values = [e["eggs_per_day"] for e in leaderboard]
            sorted_values = sorted(eggs_values, reverse=True)
            assert eggs_values == sorted_values, f"Leaderboard not sorted: {eggs_values}"
            print(f"PASS: Leaderboard is correctly sorted descending")
        else:
            print("SKIP: Not enough entries to verify sorting")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
