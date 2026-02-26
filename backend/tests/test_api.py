"""
Backend API tests for Hönsgården (Swedish Chicken Coop Management App)
Tests: Health, Coop Settings, Hens CRUD, Eggs CRUD, Transactions CRUD, Statistics
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://flock-manager-11.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

# ============ HEALTH & ROOT TESTS ============
class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_health_endpoint(self, api_client):
        """Test /api/health returns healthy status"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")
    
    def test_root_endpoint(self, api_client):
        """Test /api/ returns API info"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Hönshus" in data["message"] or "API" in data["message"]
        assert data.get("version") == "2.0"
        print("✓ Root endpoint working")

# ============ AUTH TESTS (without actual login) ============
class TestAuthEndpoints:
    """Authentication endpoint tests - verifying endpoints exist"""
    
    def test_auth_me_requires_login(self, api_client):
        """Test /api/auth/me returns 401 without session"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        # Should return 401 as we're not authenticated
        assert response.status_code == 401
        print("✓ Auth /me endpoint requires authentication (401)")
    
    def test_auth_logout_endpoint(self, api_client):
        """Test /api/auth/logout endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/auth/logout")
        # Should work even without session
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Logout endpoint working")

# ============ COOP SETTINGS TESTS ============
class TestCoopSettings:
    """Coop settings endpoint tests"""
    
    def test_get_coop_settings(self, api_client):
        """Test GET /api/coop returns default settings for unauthenticated user"""
        response = api_client.get(f"{BASE_URL}/api/coop")
        assert response.status_code == 200
        data = response.json()
        assert "coop_name" in data
        assert "hen_count" in data
        assert isinstance(data["hen_count"], int)
        print(f"✓ Coop settings: name='{data['coop_name']}', hens={data['hen_count']}")
    
    def test_update_coop_settings(self, api_client):
        """Test PUT /api/coop updates settings"""
        update_data = {
            "coop_name": "TEST_Testtestgården",
            "hen_count": 5
        }
        response = api_client.put(f"{BASE_URL}/api/coop", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["coop_name"] == "TEST_Testtestgården"
        assert data["hen_count"] == 5
        print("✓ Coop settings update working")
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/coop")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["coop_name"] == "TEST_Testtestgården"
        print("✓ Coop settings persisted correctly")

# ============ HENS CRUD TESTS ============
class TestHensCRUD:
    """Hens CRUD endpoint tests"""
    
    @pytest.fixture
    def test_hen_id(self, api_client):
        """Create a test hen and return its ID, cleanup after"""
        # Create
        hen_data = {
            "name": "TEST_Greta",
            "breed": "Rhode Island Red",
            "color": "Rödbrun",
            "notes": "Testar"
        }
        response = api_client.post(f"{BASE_URL}/api/hens", json=hen_data)
        assert response.status_code == 200
        hen = response.json()
        yield hen["id"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/hens/{hen['id']}")
    
    def test_create_hen(self, api_client):
        """Test POST /api/hens creates a new hen"""
        hen_data = {
            "name": "TEST_Maja",
            "breed": "Araucana",
            "color": "Vit",
            "notes": "Lägger blå ägg"
        }
        response = api_client.post(f"{BASE_URL}/api/hens", json=hen_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Maja"
        assert data["breed"] == "Araucana"
        assert data["color"] == "Vit"
        assert data["is_active"] == True
        assert "id" in data
        print(f"✓ Created hen: {data['name']} (id: {data['id']})")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/hens/{data['id']}")
    
    def test_get_all_hens(self, api_client, test_hen_id):
        """Test GET /api/hens returns list of hens"""
        response = api_client.get(f"{BASE_URL}/api/hens")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should contain our test hen
        hen_ids = [h["id"] for h in data]
        assert test_hen_id in hen_ids
        print(f"✓ Got {len(data)} hens")
    
    def test_get_single_hen(self, api_client, test_hen_id):
        """Test GET /api/hens/{id} returns specific hen"""
        response = api_client.get(f"{BASE_URL}/api/hens/{test_hen_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_hen_id
        assert data["name"] == "TEST_Greta"
        print(f"✓ Got hen by ID: {data['name']}")
    
    def test_update_hen(self, api_client, test_hen_id):
        """Test PUT /api/hens/{id} updates hen"""
        update_data = {"name": "TEST_Greta Updated", "notes": "Uppdaterad info"}
        response = api_client.put(f"{BASE_URL}/api/hens/{test_hen_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Greta Updated"
        assert data["notes"] == "Uppdaterad info"
        print("✓ Hen updated successfully")
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/hens/{test_hen_id}")
        assert get_response.json()["name"] == "TEST_Greta Updated"
    
    def test_delete_hen(self, api_client):
        """Test DELETE /api/hens/{id} soft deletes hen"""
        # Create a hen to delete
        hen_data = {"name": "TEST_ToDelete"}
        create_res = api_client.post(f"{BASE_URL}/api/hens", json=hen_data)
        hen_id = create_res.json()["id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/hens/{hen_id}")
        assert response.status_code == 200
        print("✓ Hen deleted successfully")
        
        # Verify it's inactive (not returned in active list)
        get_response = api_client.get(f"{BASE_URL}/api/hens")
        hen_ids = [h["id"] for h in get_response.json()]
        assert hen_id not in hen_ids
        print("✓ Deleted hen no longer in active list")
    
    def test_hen_not_found(self, api_client):
        """Test GET /api/hens/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/hens/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Non-existent hen returns 404")

# ============ EGGS CRUD TESTS ============
class TestEggsCRUD:
    """Eggs CRUD endpoint tests"""
    
    @pytest.fixture
    def test_egg_id(self, api_client):
        """Create a test egg record and return its ID, cleanup after"""
        today = date.today().isoformat()
        egg_data = {
            "date": today,
            "count": 3,
            "notes": "TEST_egg"
        }
        response = api_client.post(f"{BASE_URL}/api/eggs", json=egg_data)
        assert response.status_code == 200
        egg = response.json()
        yield egg["id"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/eggs/{egg['id']}")
    
    def test_create_egg_record(self, api_client):
        """Test POST /api/eggs creates egg record"""
        today = date.today().isoformat()
        egg_data = {
            "date": today,
            "count": 5,
            "notes": "TEST_record"
        }
        response = api_client.post(f"{BASE_URL}/api/eggs", json=egg_data)
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 5
        assert data["date"] == today
        assert "id" in data
        print(f"✓ Created egg record: {data['count']} eggs on {data['date']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/eggs/{data['id']}")
    
    def test_create_egg_with_hen(self, api_client):
        """Test POST /api/eggs with hen_id associates egg to hen"""
        # First create a hen
        hen_res = api_client.post(f"{BASE_URL}/api/hens", json={"name": "TEST_EggHen"})
        hen_id = hen_res.json()["id"]
        
        today = date.today().isoformat()
        egg_data = {
            "date": today,
            "count": 2,
            "hen_id": hen_id,
            "notes": "TEST_from specific hen"
        }
        response = api_client.post(f"{BASE_URL}/api/eggs", json=egg_data)
        assert response.status_code == 200
        data = response.json()
        assert data["hen_id"] == hen_id
        assert data["count"] == 2
        print(f"✓ Created egg record with hen_id: {hen_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/eggs/{data['id']}")
        api_client.delete(f"{BASE_URL}/api/hens/{hen_id}")
    
    def test_get_egg_records(self, api_client, test_egg_id):
        """Test GET /api/eggs returns list of egg records"""
        today = date.today().isoformat()
        week_ago = (date.today() - timedelta(days=7)).isoformat()
        
        response = api_client.get(f"{BASE_URL}/api/eggs?start_date={week_ago}&end_date={today}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} egg records")
    
    def test_delete_egg_record(self, api_client):
        """Test DELETE /api/eggs/{id} removes record"""
        # Create an egg to delete
        egg_data = {"date": date.today().isoformat(), "count": 1, "notes": "TEST_delete"}
        create_res = api_client.post(f"{BASE_URL}/api/eggs", json=egg_data)
        egg_id = create_res.json()["id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/eggs/{egg_id}")
        assert response.status_code == 200
        print("✓ Egg record deleted")

# ============ TRANSACTIONS CRUD TESTS ============
class TestTransactionsCRUD:
    """Financial transactions CRUD tests"""
    
    def test_create_cost_transaction(self, api_client):
        """Test POST /api/transactions creates a cost"""
        today = date.today().isoformat()
        trans_data = {
            "date": today,
            "type": "cost",
            "category": "feed",
            "amount": 199.0,
            "description": "TEST_Foder 10kg"
        }
        response = api_client.post(f"{BASE_URL}/api/transactions", json=trans_data)
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "cost"
        assert data["category"] == "feed"
        assert data["amount"] == 199.0
        print(f"✓ Created cost transaction: {data['amount']} kr for {data['category']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/transactions/{data['id']}")
    
    def test_create_sale_transaction(self, api_client):
        """Test POST /api/transactions creates a sale"""
        today = date.today().isoformat()
        trans_data = {
            "date": today,
            "type": "sale",
            "category": "egg_sale",
            "amount": 45.0,
            "description": "TEST_Sålt 12 ägg"
        }
        response = api_client.post(f"{BASE_URL}/api/transactions", json=trans_data)
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "sale"
        assert data["category"] == "egg_sale"
        assert data["amount"] == 45.0
        print(f"✓ Created sale transaction: {data['amount']} kr")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/transactions/{data['id']}")
    
    def test_get_transactions(self, api_client):
        """Test GET /api/transactions returns list"""
        today = date.today().isoformat()
        month_ago = (date.today() - timedelta(days=30)).isoformat()
        
        response = api_client.get(f"{BASE_URL}/api/transactions?start_date={month_ago}&end_date={today}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} transactions")
    
    def test_delete_transaction(self, api_client):
        """Test DELETE /api/transactions/{id} removes record"""
        trans_data = {
            "date": date.today().isoformat(),
            "type": "cost",
            "category": "other_cost",
            "amount": 50.0,
            "description": "TEST_delete"
        }
        create_res = api_client.post(f"{BASE_URL}/api/transactions", json=trans_data)
        trans_id = create_res.json()["id"]
        
        response = api_client.delete(f"{BASE_URL}/api/transactions/{trans_id}")
        assert response.status_code == 200
        print("✓ Transaction deleted")

# ============ STATISTICS TESTS ============
class TestStatistics:
    """Statistics endpoint tests"""
    
    def test_today_statistics(self, api_client):
        """Test GET /api/statistics/today"""
        response = api_client.get(f"{BASE_URL}/api/statistics/today")
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "egg_count" in data
        assert "hen_count" in data
        assert "total_costs" in data
        assert "total_sales" in data
        assert "net" in data
        print(f"✓ Today's stats: {data['egg_count']} eggs, net: {data['net']} kr")
    
    def test_month_statistics(self, api_client):
        """Test GET /api/statistics/month/{year}/{month}"""
        today = date.today()
        response = api_client.get(f"{BASE_URL}/api/statistics/month/{today.year}/{today.month}")
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == today.year
        assert data["month"] == today.month
        assert "total_eggs" in data
        assert "avg_eggs_per_day" in data
        assert "total_costs" in data
        assert "total_sales" in data
        assert "net" in data
        assert "daily_breakdown" in data
        print(f"✓ Month stats: {data['total_eggs']} eggs, net: {data['net']} kr")
    
    def test_year_statistics(self, api_client):
        """Test GET /api/statistics/year/{year}"""
        today = date.today()
        response = api_client.get(f"{BASE_URL}/api/statistics/year/{today.year}")
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == today.year
        assert "total_eggs" in data
        assert "monthly_breakdown" in data
        assert len(data["monthly_breakdown"]) == 12
        print(f"✓ Year stats: {data['total_eggs']} eggs total")
    
    def test_summary_statistics(self, api_client):
        """Test GET /api/statistics/summary"""
        response = api_client.get(f"{BASE_URL}/api/statistics/summary")
        assert response.status_code == 200
        data = response.json()
        assert "hen_count" in data
        assert "total_eggs_all_time" in data
        assert "total_costs_all_time" in data
        assert "total_sales_all_time" in data
        assert "net_all_time" in data
        assert "this_month" in data
        assert "eggs" in data["this_month"]
        print(f"✓ Summary stats: {data['total_eggs_all_time']} total eggs, net: {data['net_all_time']} kr")

# ============ PREMIUM STATUS TESTS ============
class TestPremiumStatus:
    """Premium subscription status tests"""
    
    def test_premium_status(self, api_client):
        """Test GET /api/premium/status"""
        response = api_client.get(f"{BASE_URL}/api/premium/status")
        assert response.status_code == 200
        data = response.json()
        assert "is_premium" in data
        assert isinstance(data["is_premium"], bool)
        print(f"✓ Premium status: {'Premium' if data['is_premium'] else 'Free'}")

# ============ CLEANUP TEST DATA ============
class TestCleanup:
    """Cleanup any test data after tests"""
    
    def test_cleanup_test_hens(self, api_client):
        """Remove any TEST_ prefixed hens"""
        response = api_client.get(f"{BASE_URL}/api/hens?active_only=false")
        if response.status_code == 200:
            hens = response.json()
            for hen in hens:
                if hen.get("name", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/hens/{hen['id']}")
        print("✓ Cleaned up test hens")
    
    def test_reset_coop_name(self, api_client):
        """Reset coop name if it was changed"""
        response = api_client.get(f"{BASE_URL}/api/coop")
        if response.status_code == 200:
            data = response.json()
            if data.get("coop_name", "").startswith("TEST_"):
                api_client.put(f"{BASE_URL}/api/coop", json={"coop_name": "Min Hönsgård"})
        print("✓ Reset coop name")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
