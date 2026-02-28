"""
Test UX Features - Iteration 21
Tests:
1. Egg card one-tap add functionality
2. Streak calculation in statistics/summary
3. Undo egg registration
4. Hen Health Scores endpoint
5. Filter buttons for egg log
6. Economy insights (revenue per egg, break-even)
7. Statistics with trend arrows
8. Mark hen as seen functionality

Test Credentials: nativetest@test.com / test123456
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://egg-forecast-test.preview.emergentagent.com').rstrip('/')

# Test user credentials (from previous iteration testing)
TEST_EMAIL = "nativetest@test.com"
TEST_PASSWORD = "test123456"

class TestSession:
    """Shared session for authenticated tests"""
    session_token = None
    user_id = None

@pytest.fixture(scope="module")
def api_session():
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login with existing test user
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_resp.status_code == 200:
        data = login_resp.json()
        TestSession.session_token = data.get('session_token') or data.get('token')
        TestSession.user_id = data.get('user_id')
        print(f"Logged in as {TEST_EMAIL}, user_id: {TestSession.user_id}")
    else:
        print(f"Login failed: {login_resp.status_code} - {login_resp.text}")
    
    if TestSession.session_token:
        session.headers.update({"Authorization": f"Bearer {TestSession.session_token}"})
    
    return session


class TestHealthEndpoint:
    """Test basic health endpoint"""
    
    def test_health_check(self, api_session):
        """Health endpoint should return 200"""
        response = api_session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Health endpoint working")


class TestStatisticsSummary:
    """Test statistics summary including streak"""
    
    def test_summary_returns_streak(self, api_session):
        """Summary endpoint should include streak field"""
        response = api_session.get(f"{BASE_URL}/api/statistics/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify streak field exists
        assert "streak" in data, "Streak field missing from summary"
        assert isinstance(data["streak"], int), "Streak should be an integer"
        print(f"✅ Streak calculation present: {data['streak']} days")
        
        # Verify other summary fields
        assert "this_month" in data, "this_month data missing"
        assert "total_eggs_all_time" in data, "total_eggs_all_time missing"
        assert "average_eggs_per_day" in data, "average_eggs_per_day missing"
        print(f"✅ Summary includes eggs/day average: {data['average_eggs_per_day']}")


class TestHenHealthScores:
    """Test hen health scores endpoint - /api/hens/health-scores"""
    
    def test_health_scores_endpoint_exists(self, api_session):
        """Health scores endpoint should return data structure"""
        response = api_session.get(f"{BASE_URL}/api/hens/health-scores")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "scores" in data, "scores field missing"
        assert "average_score" in data, "average_score field missing"
        assert "hens_needing_attention" in data, "hens_needing_attention field missing"
        print(f"✅ Health scores endpoint working - {len(data['scores'])} hens scored, avg={data['average_score']}")
        
        # If there are scores, verify structure
        if data["scores"]:
            score = data["scores"][0]
            assert "hen_id" in score, "hen_id missing from score"
            assert "health_score" in score, "health_score missing from score"
            assert "status_color" in score, "status_color missing from score (for badge color)"
            print(f"✅ Health score structure verified: {score.get('hen_name', 'Unknown')} = {score.get('health_score')}/100")


class TestEggRecords:
    """Test egg record endpoints including add/undo functionality"""
    
    def test_add_egg_record_one_tap(self, api_session):
        """Can add egg record (simulating one-tap add from card)"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Add 1 egg (simulating one-tap)
        response = api_session.post(f"{BASE_URL}/api/eggs", json={
            "date": today,
            "count": 1
        })
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "id missing from response"
        assert data.get("count") == 1, "Count should be 1"
        print(f"✅ One-tap egg add working - ID: {data['id']}")
        
        # Store for undo test
        TestEggRecords.last_egg_id = data.get("id")
    
    def test_egg_list_with_7_day_filter(self, api_session):
        """Egg list supports 7-day filter (for filter button)"""
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date_7 = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        
        response = api_session.get(f"{BASE_URL}/api/eggs", params={
            "start_date": start_date_7,
            "end_date": end_date
        })
        
        assert response.status_code == 200, f"7-day filter failed: {response.status_code}"
        data = response.json()
        print(f"✅ 7-day filter working - {len(data)} records")
    
    def test_egg_list_with_30_day_filter(self, api_session):
        """Egg list supports 30-day filter (for filter button)"""
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date_30 = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        response = api_session.get(f"{BASE_URL}/api/eggs", params={
            "start_date": start_date_30,
            "end_date": end_date
        })
        
        assert response.status_code == 200, f"30-day filter failed: {response.status_code}"
        data = response.json()
        print(f"✅ 30-day filter working - {len(data)} records")
    
    def test_delete_egg_record_undo(self, api_session):
        """Can delete egg record (undo functionality)"""
        if not hasattr(TestEggRecords, 'last_egg_id') or not TestEggRecords.last_egg_id:
            pytest.skip("No egg record to delete")
        
        egg_id = TestEggRecords.last_egg_id
        response = api_session.delete(f"{BASE_URL}/api/eggs/{egg_id}")
        
        assert response.status_code in [200, 204], f"Delete failed: {response.status_code}"
        print(f"✅ Undo (delete) egg record working - deleted ID: {egg_id}")


class TestTodayStatistics:
    """Test today's statistics endpoint for dashboard card"""
    
    def test_today_stats(self, api_session):
        """Today endpoint returns correct structure for egg card"""
        response = api_session.get(f"{BASE_URL}/api/statistics/today")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "egg_count" in data, "egg_count missing (needed for today's egg display)"
        assert "hen_count" in data, "hen_count missing"
        print(f"✅ Today stats: {data.get('egg_count')} eggs, {data.get('hen_count')} hens")


class TestMonthlyStatistics:
    """Test monthly statistics with trend data for graphs"""
    
    def test_month_stats_with_daily_breakdown(self, api_session):
        """Monthly stats include daily breakdown for bar charts with trend arrows"""
        now = datetime.now()
        year = now.year
        month = now.month
        
        response = api_session.get(f"{BASE_URL}/api/statistics/month/{year}/{month}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify structure for charts
        assert "daily_breakdown" in data, "daily_breakdown missing for charts"
        assert "total_eggs" in data, "total_eggs missing"
        assert "avg_eggs_per_day" in data, "avg_eggs_per_day missing"
        
        print(f"✅ Monthly stats: {data.get('total_eggs')} eggs, {len(data.get('daily_breakdown', []))} days of data")
        
        # Check if daily breakdown has proper structure for trend arrows
        if data.get('daily_breakdown'):
            day = data['daily_breakdown'][0]
            assert 'date' in day, "date missing from daily breakdown"
            assert 'eggs' in day, "eggs missing from daily breakdown"
            print(f"✅ Daily breakdown structure correct - supports trend arrow calculation")


class TestHensEndpoints:
    """Test hens management endpoints including mark-as-seen"""
    
    def test_hens_list(self, api_session):
        """Hens list endpoint works"""
        response = api_session.get(f"{BASE_URL}/api/hens")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✅ Hens list working - {len(data)} hens")
        
        # Store for later tests
        TestHensEndpoints.hens = data
    
    def test_mark_hen_seen_today(self, api_session):
        """Test 'Markera som sedd idag' functionality"""
        if not hasattr(TestHensEndpoints, 'hens') or not TestHensEndpoints.hens:
            pytest.skip("No hens to test mark-seen functionality")
        
        hen_id = TestHensEndpoints.hens[0].get('id')
        
        # Mark as seen
        seen_response = api_session.post(f"{BASE_URL}/api/hens/{hen_id}/seen")
        assert seen_response.status_code in [200, 201], f"Mark seen failed: {seen_response.status_code}"
        print(f"✅ 'Markera som sedd idag' working for hen {hen_id}")


class TestFinanceEconomy:
    """Test finance/economy endpoints for insights"""
    
    def test_transactions_list(self, api_session):
        """Transactions endpoint works for economy tracking"""
        response = api_session.get(f"{BASE_URL}/api/transactions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Transactions endpoint working (for economy insights)")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
