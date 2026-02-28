"""
Test iteration 2 - Testing new features:
1. Data limits endpoint (/api/account/data-limits)
2. Premium status endpoint (/api/premium/status)
3. Egg registration with quick add buttons
4. Hens listing and basic CRUD
"""

import pytest
import requests
import os
from datetime import date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://streaks-goals-update.preview.emergentagent.com"


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint working")


class TestDataLimitsEndpoint:
    """Test /api/account/data-limits endpoint - Data Holdback Premium feature"""
    
    def test_data_limits_returns_200(self):
        """Test data limits endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/account/data-limits")
        assert response.status_code == 200
        print("✓ Data limits endpoint returns 200")
    
    def test_data_limits_structure(self):
        """Test data limits response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/account/data-limits")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields exist
        assert "is_premium" in data
        assert "data_limit_days" in data
        assert "hidden_data" in data
        
        # Validate hidden_data structure if not None
        if data.get("hidden_data"):
            hidden = data["hidden_data"]
            assert "months_of_history" in hidden
            assert "total" in hidden
            assert "eggs" in hidden
        
        print(f"✓ Data limits structure correct: is_premium={data['is_premium']}, limit_days={data['data_limit_days']}")
    
    def test_data_limits_free_user_values(self):
        """Test free user gets correct data limit (30 days)"""
        response = requests.get(f"{BASE_URL}/api/account/data-limits")
        data = response.json()
        
        # Free user should have 30 day limit
        if not data.get("is_premium"):
            assert data.get("data_limit_days") == 30
            assert data.get("oldest_allowed_date") is not None
            print(f"✓ Free user has 30 day limit, cutoff: {data.get('oldest_allowed_date')}")
        else:
            assert data.get("data_limit_days") is None
            print("✓ Premium user has no data limit")


class TestPremiumStatus:
    """Test /api/premium/status endpoint"""
    
    def test_premium_status_returns_200(self):
        """Test premium status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/premium/status")
        assert response.status_code == 200
        print("✓ Premium status endpoint returns 200")
    
    def test_premium_status_structure(self):
        """Test premium status has correct structure"""
        response = requests.get(f"{BASE_URL}/api/premium/status")
        data = response.json()
        
        # Check required fields
        assert "is_premium" in data
        print(f"✓ Premium status structure correct: is_premium={data['is_premium']}")


class TestEggRegistration:
    """Test egg registration endpoints for quick add functionality"""
    
    def test_eggs_list_endpoint(self):
        """Test eggs listing endpoint"""
        response = requests.get(f"{BASE_URL}/api/eggs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Eggs list returns {len(data)} records")
    
    def test_egg_registration_quick_add(self):
        """Test registering eggs with quick add (various counts like +1, +2, +3, +5, +10)"""
        today = date.today().isoformat()
        
        # Test adding eggs with count 3 (simulating +3 button)
        payload = {
            "date": today,
            "count": 3,
            "notes": "TEST_quick_add"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eggs",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data.get("count") == 3
        assert data.get("date") == today
        assert "id" in data
        
        egg_id = data["id"]
        print(f"✓ Quick add egg registration works (count=3), id={egg_id}")
        
        # Clean up
        delete_response = requests.delete(f"{BASE_URL}/api/eggs/{egg_id}")
        assert delete_response.status_code == 200
        print(f"✓ Test egg record cleaned up")
    
    def test_egg_registration_with_hen_id(self):
        """Test registering eggs linked to a specific hen"""
        today = date.today().isoformat()
        
        # First create a test hen
        hen_payload = {
            "name": "TEST_QuickAddHen",
            "breed": "Test Breed"
        }
        hen_response = requests.post(
            f"{BASE_URL}/api/hens",
            json=hen_payload,
            headers={"Content-Type": "application/json"}
        )
        assert hen_response.status_code == 200
        hen_data = hen_response.json()
        hen_id = hen_data["id"]
        print(f"✓ Created test hen: {hen_id}")
        
        # Register egg with hen_id (simulating hen selector dropdown)
        egg_payload = {
            "date": today,
            "count": 2,
            "hen_id": hen_id,
            "notes": "TEST_with_hen_selector"
        }
        
        egg_response = requests.post(
            f"{BASE_URL}/api/eggs",
            json=egg_payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert egg_response.status_code == 200
        egg_data = egg_response.json()
        
        assert egg_data.get("count") == 2
        assert egg_data.get("hen_id") == hen_id
        
        egg_id = egg_data["id"]
        print(f"✓ Egg registered with hen_id: {hen_id}")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/eggs/{egg_id}")
        requests.delete(f"{BASE_URL}/api/hens/{hen_id}")
        print("✓ Test data cleaned up")
    
    def test_egg_registration_custom_count(self):
        """Test registering eggs with custom count (via custom input field)"""
        today = date.today().isoformat()
        
        # Test custom count like 7 (not a quick button)
        payload = {
            "date": today,
            "count": 7,
            "notes": "TEST_custom_count"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eggs",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("count") == 7
        
        egg_id = data["id"]
        print(f"✓ Custom egg count (7) registered successfully")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/eggs/{egg_id}")
        print("✓ Test data cleaned up")


class TestHensEndpoints:
    """Test hens endpoints for hen selector functionality"""
    
    def test_hens_list_active(self):
        """Test listing active hens (for hen selector dropdown)"""
        response = requests.get(f"{BASE_URL}/api/hens?active_only=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Hens list returns {len(data)} active hens")
    
    def test_hens_include_inactive(self):
        """Test listing all hens including inactive"""
        response = requests.get(f"{BASE_URL}/api/hens?active_only=false")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Hens list (all) returns {len(data)} hens")


class TestInsightsEndpoint:
    """Test insights endpoint for Insights section"""
    
    def test_insights_returns_200(self):
        """Test insights endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/insights")
        assert response.status_code == 200
        print("✓ Insights endpoint returns 200")
    
    def test_insights_structure(self):
        """Test insights response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/insights")
        data = response.json()
        
        # Check basic fields
        assert "cost_per_egg" in data
        assert "total_eggs" in data
        assert "productivity_index" in data
        assert "is_premium" in data
        
        print(f"✓ Insights structure correct: cost_per_egg={data['cost_per_egg']}, productivity={data['productivity_index']}%")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
