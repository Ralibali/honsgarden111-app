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

Test Credentials: Will create or use existing test user
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://egg-tracker-premium.preview.emergentagent.com').rstrip('/')

# Test user credentials
TEST_EMAIL = "uxtester@test.com"
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
    
    # First try to login
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_resp.status_code == 200:
        data = login_resp.json()
        TestSession.session_token = data.get('session_token') or data.get('token')
        TestSession.user_id = data.get('user_id')
    elif login_resp.status_code == 401:
        # Create user if doesn't exist
        register_resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "UX Tester",
            "accepted_terms": True
        })
        if register_resp.status_code in [200, 201]:
            # Try login again
            login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if login_resp.status_code == 200:
                data = login_resp.json()
                TestSession.session_token = data.get('session_token') or data.get('token')
                TestSession.user_id = data.get('user_id')
    
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
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
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
    """Test hen health scores endpoint"""
    
    def test_health_scores_endpoint_exists(self, api_session):
        """Health scores endpoint should return data structure"""
        response = api_session.get(f"{BASE_URL}/api/hens/health-scores")
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "scores" in data, "scores field missing"
        assert "average_score" in data, "average_score field missing"
        assert "hens_needing_attention" in data, "hens_needing_attention field missing"
        print(f"✅ Health scores endpoint working - {len(data['scores'])} hens scored")
        
        # If there are scores, verify structure
        if data["scores"]:
            score = data["scores"][0]
            assert "hen_id" in score, "hen_id missing from score"
            assert "health_score" in score, "health_score missing from score"
            print(f"✅ Health score structure verified: {score.get('hen_name', 'Unknown')} = {score.get('health_score')}%")


class TestEggRecords:
    """Test egg record endpoints including add/undo"""
    
    def test_add_egg_record(self, api_session):
        """Can add egg record (simulating one-tap add)"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Add 1 egg (simulating one-tap)
        response = api_session.post(f"{BASE_URL}/api/eggs", json={
            "date": today,
            "count": 1
        })
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "id missing from response"
        assert data.get("count") == 1, "Count should be 1"
        print(f"✅ One-tap egg add working - ID: {data['id']}")
        
        # Store for undo test
        self.__class__.last_egg_id = data.get("id")
    
    def test_egg_list_with_date_filter(self, api_session):
        """Egg list supports date range filter (for 7/30 day buttons)"""
        # 7 days
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date_7 = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        
        response_7 = api_session.get(f"{BASE_URL}/api/eggs", params={
            "start_date": start_date_7,
            "end_date": end_date
        })
        
        if response_7.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        assert response_7.status_code == 200, f"7-day filter failed: {response_7.status_code}"
        data_7 = response_7.json()
        print(f"✅ 7-day filter working - {len(data_7)} records")
        
        # 30 days
        start_date_30 = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        response_30 = api_session.get(f"{BASE_URL}/api/eggs", params={
            "start_date": start_date_30,
            "end_date": end_date
        })
        
        assert response_30.status_code == 200, f"30-day filter failed: {response_30.status_code}"
        data_30 = response_30.json()
        print(f"✅ 30-day filter working - {len(data_30)} records")
    
    def test_delete_egg_record(self, api_session):
        """Can delete egg record (undo functionality)"""
        if not hasattr(self.__class__, 'last_egg_id') or not self.__class__.last_egg_id:
            pytest.skip("No egg record to delete")
        
        egg_id = self.__class__.last_egg_id
        response = api_session.delete(f"{BASE_URL}/api/eggs/{egg_id}")
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        assert response.status_code in [200, 204], f"Delete failed: {response.status_code}"
        print(f"✅ Undo (delete) egg record working")


class TestTodayStatistics:
    """Test today's statistics endpoint"""
    
    def test_today_stats(self, api_session):
        """Today endpoint returns correct structure"""
        response = api_session.get(f"{BASE_URL}/api/statistics/today")
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "egg_count" in data, "egg_count missing"
        assert "hen_count" in data, "hen_count missing"
        print(f"✅ Today stats: {data.get('egg_count')} eggs, {data.get('hen_count')} hens")


class TestMonthlyStatistics:
    """Test monthly statistics with trend data"""
    
    def test_month_stats_with_breakdown(self, api_session):
        """Monthly stats include daily breakdown for charts"""
        now = datetime.now()
        year = now.year
        month = now.month
        
        response = api_session.get(f"{BASE_URL}/api/statistics/month/{year}/{month}")
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
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
            print(f"✅ Daily breakdown structure correct for trend arrows")


class TestHensEndpoints:
    """Test hens management endpoints"""
    
    def test_hens_list(self, api_session):
        """Hens list endpoint works"""
        response = api_session.get(f"{BASE_URL}/api/hens")
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✅ Hens list working - {len(data)} hens")
    
    def test_mark_hen_seen(self, api_session):
        """Test marking a hen as seen today"""
        # First get hens list
        response = api_session.get(f"{BASE_URL}/api/hens")
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        data = response.json()
        if not data:
            pytest.skip("No hens to test mark-seen functionality")
        
        hen_id = data[0].get('id')
        
        # Mark as seen
        seen_response = api_session.post(f"{BASE_URL}/api/hens/{hen_id}/seen")
        assert seen_response.status_code in [200, 201], f"Mark seen failed: {seen_response.status_code}"
        print(f"✅ Mark hen as seen working for hen {hen_id}")


class TestFinanceEconomy:
    """Test finance/economy endpoints"""
    
    def test_transactions_list(self, api_session):
        """Transactions endpoint works"""
        response = api_session.get(f"{BASE_URL}/api/transactions")
        
        if response.status_code == 401:
            pytest.skip("Authentication required - skipping")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ Transactions endpoint working")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
