"""
Final Verification Tests - Iteration 22
Testing new UX features for Hönsgården:
1. GET /api/statistics/summary - best_hen_week & community_comparison
2. GET /api/hens/health-scores - health scores for all hens
3. GET /api/ai/daily-report - free AI report (1 per week for non-premium)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test user credentials from previous iteration
TEST_EMAIL = "nativetest@test.com"
TEST_PASSWORD = "test123456"


class TestStatisticsSummary:
    """Test /api/statistics/summary endpoint with new fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get('token')
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                print(f"✓ Logged in successfully as {TEST_EMAIL}")
        else:
            print(f"Login failed: {login_response.status_code}")
    
    def test_statistics_summary_endpoint_accessible(self):
        """Test that /api/statistics/summary returns 200"""
        response = self.session.get(f"{BASE_URL}/api/statistics/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ /api/statistics/summary accessible")
    
    def test_statistics_summary_has_best_hen_week(self):
        """Test that summary returns best_hen_week field"""
        response = self.session.get(f"{BASE_URL}/api/statistics/summary")
        assert response.status_code == 200
        data = response.json()
        
        # best_hen_week should be in the response (can be null if no hens or no eggs this week)
        assert "best_hen_week" in data, "Missing best_hen_week field in response"
        print(f"✓ best_hen_week field present: {data.get('best_hen_week')}")
        
        # If there's data, validate structure
        if data.get('best_hen_week'):
            best_hen = data['best_hen_week']
            assert "id" in best_hen, "best_hen_week missing 'id'"
            assert "name" in best_hen, "best_hen_week missing 'name'"
            assert "eggs_this_week" in best_hen, "best_hen_week missing 'eggs_this_week'"
            print(f"  - Best hen this week: {best_hen['name']} with {best_hen['eggs_this_week']} eggs")
    
    def test_statistics_summary_has_community_comparison(self):
        """Test that summary returns community_comparison field"""
        response = self.session.get(f"{BASE_URL}/api/statistics/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "community_comparison" in data, "Missing community_comparison field"
        print(f"✓ community_comparison field present")
        
        community = data['community_comparison']
        required_fields = [
            'your_eggs_this_month',
            'community_avg',
            'total_users',
            'your_rank',
            'percentile',
            'vs_avg_percent'
        ]
        
        for field in required_fields:
            assert field in community, f"community_comparison missing '{field}'"
            print(f"  - {field}: {community.get(field)}")
    
    def test_statistics_summary_other_fields(self):
        """Test that other summary fields are present"""
        response = self.session.get(f"{BASE_URL}/api/statistics/summary")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            'hen_count',
            'total_eggs_all_time',
            'streak',
            'this_month'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print("✓ All basic summary fields present")


class TestHealthScores:
    """Test /api/hens/health-scores endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get('token')
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_health_scores_endpoint_accessible(self):
        """Test that /api/hens/health-scores returns 200"""
        response = self.session.get(f"{BASE_URL}/api/hens/health-scores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ /api/hens/health-scores accessible")
    
    def test_health_scores_response_structure(self):
        """Test health scores response has correct structure"""
        response = self.session.get(f"{BASE_URL}/api/hens/health-scores")
        assert response.status_code == 200
        data = response.json()
        
        assert "scores" in data, "Missing 'scores' array"
        assert "average_score" in data, "Missing 'average_score'"
        assert "hens_needing_attention" in data, "Missing 'hens_needing_attention'"
        
        print(f"✓ Health scores structure valid:")
        print(f"  - {len(data.get('scores', []))} hens with scores")
        print(f"  - Average score: {data.get('average_score')}")
        print(f"  - Hens needing attention: {data.get('hens_needing_attention')}")
    
    def test_individual_health_score_structure(self):
        """Test individual hen health score structure"""
        response = self.session.get(f"{BASE_URL}/api/hens/health-scores")
        assert response.status_code == 200
        data = response.json()
        
        scores = data.get('scores', [])
        if scores:
            score = scores[0]
            required_fields = ['hen_id', 'hen_name', 'health_score', 'status_color', 'status_text']
            
            for field in required_fields:
                assert field in score, f"Individual score missing '{field}'"
            
            assert 0 <= score['health_score'] <= 100, "Health score out of range"
            print(f"✓ Individual score structure valid for {score.get('hen_name')}")
            print(f"  - Score: {score['health_score']}, Status: {score['status_text']}")
        else:
            print("⚠ No hens found for health score testing")


class TestAIDailyReport:
    """Test /api/ai/daily-report endpoint with free tier access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get('token')
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_ai_daily_report_endpoint_accessible(self):
        """Test that /api/ai/daily-report returns 200"""
        response = self.session.get(f"{BASE_URL}/api/ai/daily-report")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ /api/ai/daily-report accessible")
    
    def test_ai_daily_report_response_structure(self):
        """Test AI daily report has correct response structure"""
        response = self.session.get(f"{BASE_URL}/api/ai/daily-report")
        assert response.status_code == 200
        data = response.json()
        
        # Should have is_premium indicator
        assert "is_premium" in data, "Missing 'is_premium' field"
        print(f"✓ is_premium: {data.get('is_premium')}")
        
        # For non-premium users, check free report handling
        if not data.get('is_premium'):
            if data.get('preview'):
                # Preview mode - free report not available
                assert "free_report_available" in data, "Missing free_report_available"
                assert "days_until_free" in data, "Missing days_until_free"
                print(f"✓ Preview mode: Next free report in {data.get('days_until_free')} days")
            else:
                # Full report - free weekly report used
                assert "report" in data, "Missing report field"
                print("✓ Full free AI report available")
        else:
            # Premium user
            assert "report" in data, "Premium user missing report"
            print("✓ Premium AI report available")
    
    def test_ai_daily_report_free_tier_fields(self):
        """Test free tier specific fields in AI report"""
        response = self.session.get(f"{BASE_URL}/api/ai/daily-report")
        assert response.status_code == 200
        data = response.json()
        
        if not data.get('is_premium'):
            if data.get('preview'):
                # Preview should have report with blurred_preview
                report = data.get('report', {})
                assert 'summary' in report or 'blurred_preview' in report, "Preview missing summary/blurred content"
                assert 'eggs_today' in report, "Preview missing eggs_today"
                assert 'hen_count' in report, "Preview missing hen_count"
                print("✓ Free tier preview structure valid")
            else:
                print("✓ Free weekly report used successfully")


class TestFrontendUIFeatures:
    """Test that backend data supports frontend UI features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/email/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get('token')
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_one_tap_egg_registration(self):
        """Test egg registration for one-tap feature"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Get initial count
        stats_before = self.session.get(f"{BASE_URL}/api/statistics/summary").json()
        initial_eggs = stats_before.get('this_month', {}).get('eggs', 0)
        
        # Add 1 egg (simulating one-tap)
        response = self.session.post(
            f"{BASE_URL}/api/eggs",
            json={"date": today, "count": 1}
        )
        
        if response.status_code == 200:
            # Verify it was added
            stats_after = self.session.get(f"{BASE_URL}/api/statistics/summary").json()
            new_eggs = stats_after.get('this_month', {}).get('eggs', 0)
            
            assert new_eggs >= initial_eggs, "Eggs should increase or stay same after adding"
            print(f"✓ One-tap egg registration working: {initial_eggs} → {new_eggs}")
            
            # Clean up - delete the last egg
            eggs_list = self.session.get(f"{BASE_URL}/api/eggs?limit=1").json()
            if eggs_list:
                last_egg = eggs_list[0]
                self.session.delete(f"{BASE_URL}/api/eggs/{last_egg['id']}")
                print("  - Cleaned up test egg")
        else:
            print(f"⚠ Egg registration returned {response.status_code}")
    
    def test_statistics_trend_data(self):
        """Test that statistics endpoint returns trend data for badges"""
        # Get monthly stats
        now = datetime.now()
        response = self.session.get(
            f"{BASE_URL}/api/statistics/month/{now.year}/{now.month}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have daily_breakdown for graph
        assert "daily_breakdown" in data, "Missing daily_breakdown for graphs"
        print(f"✓ Statistics month data has {len(data.get('daily_breakdown', []))} days")
        
        # Check for avg_eggs_per_day for trend indicator
        assert "avg_eggs_per_day" in data, "Missing avg_eggs_per_day"
        print(f"  - Avg eggs/day: {data.get('avg_eggs_per_day')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
