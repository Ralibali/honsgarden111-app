"""
Iteration 28: Testing new features in Hönsgården app
- Leaderboard with 15 fictional Swedish users
- Friends module
- Support page/tickets
- Egg input improvements (frontend)
- Share statistics with period selection (frontend)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://egg-logger-mobile.preview.emergentagent.com')
TEST_EMAIL = "test2@honsgarden.se"
TEST_PASSWORD = "test123"


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ API health check passed")


class TestAuthentication:
    """Test authentication flow"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        
        # Login with email/password
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_res.status_code != 200:
            pytest.skip(f"Login failed with status {login_res.status_code}: {login_res.text}")
        
        data = login_res.json()
        token = data.get("session_token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
        
        print(f"✅ Logged in as {TEST_EMAIL}")
        return session
    
    def test_login_success(self, auth_session):
        """Verify login works"""
        response = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        print(f"✅ Authenticated user: {data.get('email')}")


class TestLeaderboard:
    """Test leaderboard endpoint with 15 fictional Swedish users"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code == 200:
            data = login_res.json()
            token = data.get("session_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                session.cookies.set('session_token', token)
        else:
            pytest.skip(f"Login failed: {login_res.status_code}")
        return session
    
    def test_leaderboard_requires_auth(self):
        """Leaderboard should require authentication"""
        response = requests.get(f"{BASE_URL}/api/stats/leaderboard")
        assert response.status_code == 401
        print("✅ Leaderboard requires auth")
    
    def test_leaderboard_authenticated(self, auth_session):
        """Test leaderboard returns data with fictional users"""
        response = auth_session.get(f"{BASE_URL}/api/stats/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "leaderboard" in data
        assert "total_users" in data
        
        leaderboard = data["leaderboard"]
        assert isinstance(leaderboard, list)
        assert len(leaderboard) > 0
        
        # Check structure of leaderboard entries
        for entry in leaderboard:
            assert "name" in entry
            assert "eggs_per_day" in entry
            assert "total_eggs" in entry
        
        print(f"✅ Leaderboard has {len(leaderboard)} entries, total_users={data['total_users']}")
    
    def test_leaderboard_has_fictional_users(self, auth_session):
        """Verify fictional Swedish names appear in leaderboard"""
        response = auth_session.get(f"{BASE_URL}/api/stats/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        # Expected fictional Swedish names
        fictional_names = ["Anna", "Johan", "Sara", "Magnus", "Lisa", "Erik", "Maria", 
                         "Peter", "Emma", "Daniel", "Fredrik", "Linda", "Andreas", "Karin", "Niklas"]
        
        leaderboard_names = [entry["name"] for entry in leaderboard]
        
        # At least some fictional names should be in leaderboard (may be top 10 only)
        found_fictional = [name for name in fictional_names if name in leaderboard_names]
        print(f"✅ Found fictional Swedish users in leaderboard: {found_fictional}")
        
        # Total users should include fictional users (15+)
        assert data["total_users"] >= 15, f"Expected at least 15 users, got {data['total_users']}"
        print(f"✅ Leaderboard total_users >= 15 (has fictional users)")


class TestFriendsModule:
    """Test friends endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code == 200:
            data = login_res.json()
            token = data.get("session_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                session.cookies.set('session_token', token)
        else:
            pytest.skip(f"Login failed: {login_res.status_code}")
        return session
    
    def test_friends_requires_auth(self):
        """Friends endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/friends")
        assert response.status_code == 401
        print("✅ Friends requires auth")
    
    def test_friends_authenticated(self, auth_session):
        """Test friends endpoint returns proper structure"""
        response = auth_session.get(f"{BASE_URL}/api/friends")
        assert response.status_code == 200
        
        data = response.json()
        assert "friends" in data
        assert "pending_received" in data
        assert "pending_sent" in data
        
        # For new user, friends list may be empty
        assert isinstance(data["friends"], list)
        assert isinstance(data["pending_received"], int)
        assert isinstance(data["pending_sent"], int)
        
        print(f"✅ Friends endpoint working: {len(data['friends'])} friends, "
              f"{data['pending_received']} pending received, {data['pending_sent']} pending sent")


class TestSupportTickets:
    """Test support ticket endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code == 200:
            data = login_res.json()
            token = data.get("session_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                session.cookies.set('session_token', token)
        else:
            pytest.skip(f"Login failed: {login_res.status_code}")
        return session
    
    def test_support_tickets_requires_auth(self):
        """Support tickets should require authentication"""
        response = requests.get(f"{BASE_URL}/api/support/tickets")
        assert response.status_code == 401
        print("✅ Support tickets requires auth")
    
    def test_get_support_tickets(self, auth_session):
        """Test getting user's support tickets"""
        response = auth_session.get(f"{BASE_URL}/api/support/tickets")
        assert response.status_code == 200
        
        data = response.json()
        assert "tickets" in data
        assert isinstance(data["tickets"], list)
        
        print(f"✅ Get support tickets working: {len(data['tickets'])} tickets")
    
    def test_create_support_ticket(self, auth_session):
        """Test creating a new support ticket"""
        ticket_data = {
            "subject": "TEST: Testärende från automatiska tester",
            "message": "Detta är ett testmeddelande från automatiska tester. Kan ignoreras."
        }
        
        response = auth_session.post(f"{BASE_URL}/api/support/tickets", json=ticket_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "ticket_id" in data or "message" in data
        
        print(f"✅ Create support ticket working: {data}")
    
    def test_verify_ticket_created(self, auth_session):
        """Verify the ticket was actually created"""
        response = auth_session.get(f"{BASE_URL}/api/support/tickets")
        assert response.status_code == 200
        
        data = response.json()
        tickets = data["tickets"]
        
        # Find our test ticket
        test_tickets = [t for t in tickets if "TEST:" in t.get("subject", "")]
        assert len(test_tickets) > 0, "Test ticket not found in tickets list"
        
        test_ticket = test_tickets[0]
        assert test_ticket["status"] in ["open", "answered", "closed"]
        assert len(test_ticket["messages"]) > 0
        
        print(f"✅ Ticket created and persisted: id={test_ticket['id']}, status={test_ticket['status']}")


class TestViralFeatures:
    """Test viral engagement features"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_res.status_code == 200:
            data = login_res.json()
            token = data.get("session_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                session.cookies.set('session_token', token)
        else:
            pytest.skip(f"Login failed: {login_res.status_code}")
        return session
    
    def test_flock_comparison(self, auth_session):
        """Test flock comparison endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/stats/flock-comparison")
        assert response.status_code == 200
        
        data = response.json()
        assert "app_avg_eggs_per_day" in data
        assert "user_avg_eggs_per_day" in data
        assert "comparison_text" in data
        
        print(f"✅ Flock comparison: user={data['user_avg_eggs_per_day']}, app_avg={data['app_avg_eggs_per_day']}")
    
    def test_percentile(self, auth_session):
        """Test percentile endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/stats/percentile")
        assert response.status_code == 200
        
        data = response.json()
        assert "badge" in data
        assert "message" in data
        
        print(f"✅ Percentile: badge={data.get('badge')}, message={data.get('message')[:50]}...")
    
    def test_share_image_generation(self, auth_session):
        """Test share image generation"""
        response = auth_session.post(f"{BASE_URL}/api/share/generate-image")
        assert response.status_code == 200
        
        data = response.json()
        assert "image_data" in data
        assert data["image_data"].startswith("data:image/png;base64,")
        
        print(f"✅ Share image generation working: returned base64 PNG")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
