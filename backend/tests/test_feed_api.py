"""
Test Feed Management API Endpoints (Etapp 4 - Foderhantering)
Tests for: POST /api/feed, GET /api/feed, GET /api/feed/inventory, GET /api/feed/statistics, DELETE /api/feed/{id}
"""
import pytest
import requests
import os
from datetime import date, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://chicken-hub-redesign.preview.emergentagent.com"


class TestFeedAPIEndpoints:
    """Test all Feed Management API endpoints"""
    
    # Store created record IDs for cleanup
    created_record_ids = []
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup before each test"""
        yield
        # Cleanup after tests - delete test records
        for record_id in self.created_record_ids:
            try:
                requests.delete(f"{BASE_URL}/api/feed/{record_id}", timeout=10)
            except:
                pass
        self.created_record_ids.clear()
    
    # ============ POST /api/feed - Create Feed Record ============
    
    def test_create_feed_consumption_layer_feed(self):
        """Test creating a feed consumption record with layer_feed type"""
        today = date.today().isoformat()
        payload = {
            "date": today,
            "feed_type": "layer_feed",
            "amount_kg": 2.5,
            "is_purchase": False,
            "notes": "TEST_morning feed"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/feed",
            json=payload,
            timeout=15
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Response should contain id"
        assert data["feed_type"] == "layer_feed"
        assert data["amount_kg"] == 2.5
        assert data["is_purchase"] == False
        assert data["date"] == today
        
        # Store for cleanup
        self.created_record_ids.append(data["id"])
        print(f"✓ Created feed consumption record with id: {data['id']}")
    
    def test_create_feed_purchase_with_cost(self):
        """Test creating a feed purchase record with cost and brand"""
        today = date.today().isoformat()
        payload = {
            "date": today,
            "feed_type": "layer_feed",
            "amount_kg": 25.0,
            "cost": 450.0,
            "is_purchase": True,
            "brand": "TEST_Granngården",
            "notes": "TEST_Weekly purchase"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/feed",
            json=payload,
            timeout=15
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response
        assert data["feed_type"] == "layer_feed"
        assert data["amount_kg"] == 25.0
        assert data["cost"] == 450.0
        assert data["is_purchase"] == True
        assert data["brand"] == "TEST_Granngården"
        
        self.created_record_ids.append(data["id"])
        print(f"✓ Created feed purchase record with cost: {data['cost']} SEK")
    
    def test_create_feed_all_feed_types(self):
        """Test creating records with all valid feed types"""
        feed_types = [
            "layer_feed",
            "grower_feed", 
            "starter_feed",
            "scratch_grain",
            "treats",
            "supplements",
            "other"
        ]
        
        today = date.today().isoformat()
        
        for feed_type in feed_types:
            payload = {
                "date": today,
                "feed_type": feed_type,
                "amount_kg": 1.0,
                "is_purchase": False
            }
            
            response = requests.post(
                f"{BASE_URL}/api/feed",
                json=payload,
                timeout=15
            )
            
            assert response.status_code == 200, f"Failed for feed_type={feed_type}: {response.text}"
            data = response.json()
            assert data["feed_type"] == feed_type
            
            self.created_record_ids.append(data["id"])
            print(f"✓ Created record for feed_type: {feed_type}")
    
    def test_create_feed_invalid_feed_type(self):
        """Test creating record with invalid feed type returns error"""
        payload = {
            "date": date.today().isoformat(),
            "feed_type": "invalid_type",
            "amount_kg": 1.0,
            "is_purchase": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/feed",
            json=payload,
            timeout=15
        )
        
        # Should return validation error (422)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Invalid feed_type correctly rejected with 422")
    
    # ============ GET /api/feed - List Feed Records ============
    
    def test_get_feed_records_list(self):
        """Test retrieving list of feed records"""
        # First create a record
        today = date.today().isoformat()
        create_payload = {
            "date": today,
            "feed_type": "layer_feed",
            "amount_kg": 3.0,
            "is_purchase": False,
            "notes": "TEST_list_test"
        }
        
        create_res = requests.post(f"{BASE_URL}/api/feed", json=create_payload, timeout=15)
        assert create_res.status_code == 200
        created_id = create_res.json()["id"]
        self.created_record_ids.append(created_id)
        
        # Get the list
        response = requests.get(f"{BASE_URL}/api/feed", timeout=15)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Response should be a list"
        
        # Find our created record
        found = any(r.get("id") == created_id for r in data)
        assert found, f"Created record {created_id} not found in list"
        
        print(f"✓ GET /api/feed returned {len(data)} records")
    
    def test_get_feed_records_with_filters(self):
        """Test filtering feed records by date and feed_type"""
        today = date.today().isoformat()
        
        # Create a specific record
        create_payload = {
            "date": today,
            "feed_type": "grower_feed",
            "amount_kg": 5.0,
            "is_purchase": True,
            "cost": 100.0
        }
        
        create_res = requests.post(f"{BASE_URL}/api/feed", json=create_payload, timeout=15)
        assert create_res.status_code == 200
        self.created_record_ids.append(create_res.json()["id"])
        
        # Filter by feed_type
        response = requests.get(
            f"{BASE_URL}/api/feed",
            params={"feed_type": "grower_feed", "is_purchase": True},
            timeout=15
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned records should match filter
        for record in data:
            assert record["feed_type"] == "grower_feed", f"Record has wrong feed_type: {record['feed_type']}"
            assert record["is_purchase"] == True
        
        print(f"✓ Filtered records: {len(data)} grower_feed purchases")
    
    # ============ GET /api/feed/inventory - Feed Inventory ============
    
    def test_get_feed_inventory(self):
        """Test getting feed inventory"""
        response = requests.get(f"{BASE_URL}/api/feed/inventory", timeout=15)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Validate response structure
        assert "inventory" in data, "Response should contain 'inventory'"
        assert "low_stock_alerts" in data, "Response should contain 'low_stock_alerts'"
        assert "total_stock_kg" in data, "Response should contain 'total_stock_kg'"
        
        assert isinstance(data["inventory"], list)
        assert isinstance(data["low_stock_alerts"], list)
        assert isinstance(data["total_stock_kg"], (int, float))
        
        print(f"✓ Inventory: {len(data['inventory'])} items, {data['total_stock_kg']} kg total")
        print(f"✓ Low stock alerts: {len(data['low_stock_alerts'])}")
    
    def test_inventory_updates_on_purchase(self):
        """Test that inventory increases when creating a purchase record"""
        # Get initial inventory
        initial_res = requests.get(f"{BASE_URL}/api/feed/inventory", timeout=15)
        assert initial_res.status_code == 200
        initial_total = initial_res.json()["total_stock_kg"]
        
        # Create a purchase
        payload = {
            "date": date.today().isoformat(),
            "feed_type": "layer_feed",
            "amount_kg": 10.0,
            "is_purchase": True,
            "cost": 200.0
        }
        
        create_res = requests.post(f"{BASE_URL}/api/feed", json=payload, timeout=15)
        assert create_res.status_code == 200
        self.created_record_ids.append(create_res.json()["id"])
        
        # Get updated inventory
        updated_res = requests.get(f"{BASE_URL}/api/feed/inventory", timeout=15)
        assert updated_res.status_code == 200
        updated_total = updated_res.json()["total_stock_kg"]
        
        # Inventory should have increased
        assert updated_total >= initial_total, \
            f"Inventory should increase on purchase: {initial_total} -> {updated_total}"
        
        print(f"✓ Inventory updated: {initial_total} -> {updated_total} kg")
    
    # ============ GET /api/feed/statistics - Feed Statistics ============
    
    def test_get_feed_statistics(self):
        """Test getting feed statistics"""
        response = requests.get(
            f"{BASE_URL}/api/feed/statistics",
            params={"days": 30},
            timeout=15
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Validate response structure
        required_fields = [
            "period_days",
            "total_consumed_kg",
            "total_purchased_kg",
            "total_cost",
            "daily_consumption_avg_kg",
            "feed_per_hen_per_day_g",
            "hen_count"
        ]
        
        for field in required_fields:
            assert field in data, f"Response missing field: {field}"
        
        # Validate types
        assert data["period_days"] == 30
        assert isinstance(data["total_consumed_kg"], (int, float))
        assert isinstance(data["total_purchased_kg"], (int, float))
        assert isinstance(data["total_cost"], (int, float))
        assert isinstance(data["daily_consumption_avg_kg"], (int, float))
        assert isinstance(data["feed_per_hen_per_day_g"], (int, float))
        assert isinstance(data["hen_count"], int)
        
        print(f"✓ Statistics: {data['daily_consumption_avg_kg']} kg/day avg, {data['feed_per_hen_per_day_g']} g/hen/day")
        print(f"✓ Total consumed: {data['total_consumed_kg']} kg, Total cost: {data['total_cost']} SEK")
    
    def test_get_feed_statistics_different_periods(self):
        """Test statistics for different time periods"""
        periods = [7, 14, 30, 90]
        
        for days in periods:
            response = requests.get(
                f"{BASE_URL}/api/feed/statistics",
                params={"days": days},
                timeout=15
            )
            
            assert response.status_code == 200, f"Failed for days={days}: {response.text}"
            data = response.json()
            assert data["period_days"] == days
            
            print(f"✓ Statistics for {days} days: consumed {data['total_consumed_kg']} kg")
    
    # ============ DELETE /api/feed/{record_id} - Delete Record ============
    
    def test_delete_feed_record(self):
        """Test deleting a feed record"""
        # First create a record
        payload = {
            "date": date.today().isoformat(),
            "feed_type": "treats",
            "amount_kg": 0.5,
            "is_purchase": False,
            "notes": "TEST_to_be_deleted"
        }
        
        create_res = requests.post(f"{BASE_URL}/api/feed", json=payload, timeout=15)
        assert create_res.status_code == 200
        record_id = create_res.json()["id"]
        
        # Delete the record
        delete_res = requests.delete(f"{BASE_URL}/api/feed/{record_id}", timeout=15)
        
        assert delete_res.status_code == 200, f"Expected 200, got {delete_res.status_code}"
        data = delete_res.json()
        assert "message" in data
        
        # Verify it's deleted by checking the list
        list_res = requests.get(f"{BASE_URL}/api/feed", timeout=15)
        records = list_res.json()
        found = any(r.get("id") == record_id for r in records)
        assert not found, "Deleted record should not appear in list"
        
        print(f"✓ Successfully deleted record {record_id}")
    
    def test_delete_nonexistent_record(self):
        """Test deleting a non-existent record returns 404"""
        fake_id = f"test_{uuid.uuid4().hex[:12]}"
        
        response = requests.delete(f"{BASE_URL}/api/feed/{fake_id}", timeout=15)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent record correctly returns 404")


class TestFeedAPIIntegration:
    """Integration tests for Feed API workflow"""
    
    created_record_ids = []
    
    @pytest.fixture(autouse=True)
    def cleanup(self):
        yield
        for record_id in self.created_record_ids:
            try:
                requests.delete(f"{BASE_URL}/api/feed/{record_id}", timeout=10)
            except:
                pass
        self.created_record_ids.clear()
    
    def test_full_feed_workflow(self):
        """Test complete workflow: create purchase -> create consumption -> check stats"""
        today = date.today().isoformat()
        
        # Step 1: Create a purchase
        purchase_payload = {
            "date": today,
            "feed_type": "layer_feed",
            "amount_kg": 20.0,
            "cost": 380.0,
            "is_purchase": True,
            "brand": "TEST_Integration_Brand"
        }
        
        purchase_res = requests.post(f"{BASE_URL}/api/feed", json=purchase_payload, timeout=15)
        assert purchase_res.status_code == 200
        purchase_id = purchase_res.json()["id"]
        self.created_record_ids.append(purchase_id)
        print(f"Step 1: Created purchase record - 20kg for 380 SEK")
        
        # Step 2: Create consumption records
        for i in range(3):
            consumption_payload = {
                "date": today,
                "feed_type": "layer_feed",
                "amount_kg": 2.0,
                "is_purchase": False
            }
            
            consumption_res = requests.post(f"{BASE_URL}/api/feed", json=consumption_payload, timeout=15)
            assert consumption_res.status_code == 200
            self.created_record_ids.append(consumption_res.json()["id"])
        
        print("Step 2: Created 3 consumption records - 2kg each")
        
        # Step 3: Check inventory
        inventory_res = requests.get(f"{BASE_URL}/api/feed/inventory", timeout=15)
        assert inventory_res.status_code == 200
        inventory_data = inventory_res.json()
        print(f"Step 3: Inventory check - Total: {inventory_data['total_stock_kg']} kg")
        
        # Step 4: Check statistics
        stats_res = requests.get(f"{BASE_URL}/api/feed/statistics?days=1", timeout=15)
        assert stats_res.status_code == 200
        stats_data = stats_res.json()
        print(f"Step 4: Statistics - Consumed: {stats_data['total_consumed_kg']} kg, Cost: {stats_data['total_cost']} SEK")
        
        print("✓ Full feed workflow completed successfully")


def test_api_health_check():
    """Quick health check for the API"""
    response = requests.get(f"{BASE_URL}/api/feed", timeout=10)
    assert response.status_code == 200, f"API not responding: {response.status_code}"
    print(f"✓ API is healthy at {BASE_URL}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
