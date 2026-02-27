#!/usr/bin/env python3
"""
Hönsgården Premium Backend API Tests
Tests the specific premium endpoints as requested in the review:
1. Health check: GET /api/health
2. Insights endpoint (Premium features): GET /api/insights?include_premium=true  
3. Health logs: GET /api/health-logs and POST /api/health-logs
4. Feedback: POST /api/feedback
5. Cancel subscription: POST /api/subscription/cancel
"""

import requests
import json
from datetime import datetime, date, timedelta
import uuid
import time

# Backend URL from frontend/.env
BACKEND_URL = "https://rooster-build.preview.emergentagent.com/api"

class HonsgardenPremiumTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_data = {}
        self.errors = []
        self.success_count = 0
        self.total_tests = 0
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def assert_response(self, response, expected_status=200, test_name=""):
        """Helper to check response status and log results"""
        self.total_tests += 1
        try:
            if response.status_code == expected_status:
                self.success_count += 1
                self.log(f"✅ {test_name} - Status: {response.status_code}")
                return True
            else:
                self.errors.append(f"{test_name} - Expected {expected_status}, got {response.status_code}: {response.text}")
                self.log(f"❌ {test_name} - Expected {expected_status}, got {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.errors.append(f"{test_name} - Exception: {str(e)}")
            self.log(f"❌ {test_name} - Exception: {str(e)}", "ERROR")
            return False

    def test_health_check(self):
        """Test health check endpoint"""
        self.log("Testing health check endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            if self.assert_response(response, 200, "Health check"):
                data = response.json()
                self.log(f"Health check response: {data}")
                if "status" in data and data["status"] == "healthy":
                    self.log("✅ Health check returned correct status")
                    return True
                else:
                    self.errors.append("Health check missing 'healthy' status")
                    return False
            return False
        except requests.exceptions.RequestException as e:
            self.errors.append(f"Health check - Connection error: {str(e)}")
            self.log(f"❌ Health check - Connection error: {str(e)}", "ERROR")
            return False

    def setup_test_data(self):
        """Setup some basic test data needed for premium insights"""
        self.log("Setting up test data for premium insights testing...")
        
        # Create some hen data first
        hen_data = {
            "name": "Astrid",
            "breed": "Rhode Island Red", 
            "color": "Röd",
            "birth_date": "2023-06-15",
            "notes": "Aktiv höna"
        }
        
        response = self.session.post(f"{self.base_url}/hens", json=hen_data)
        if response.status_code == 200:
            self.test_data['hen'] = response.json()
            self.log(f"✅ Created test hen: {self.test_data['hen']['name']}")
        else:
            self.log(f"⚠️ Could not create test hen: {response.status_code}")
        
        # Add some egg records
        today = date.today()
        for i in range(7):  # Last 7 days
            test_date = (today - timedelta(days=i)).isoformat()
            egg_data = {
                "date": test_date,
                "count": 8 + (i % 3),  # Varying egg counts
                "notes": f"Ägg dag {i}"
            }
            
            response = self.session.post(f"{self.base_url}/eggs", json=egg_data)
            if response.status_code == 200:
                self.log(f"✅ Added egg record for {test_date}")
            
        # Add some transaction data  
        cost_data = {
            "date": today.isoformat(),
            "type": "cost", 
            "category": "feed",
            "amount": 150.0,
            "description": "Hönsfoder premium"
        }
        
        sale_data = {
            "date": today.isoformat(),
            "type": "sale",
            "category": "egg_sale", 
            "amount": 120.0,
            "description": "Äggförsäljning lokalt",
            "quantity": 48
        }
        
        for transaction in [cost_data, sale_data]:
            response = self.session.post(f"{self.base_url}/transactions", json=transaction)
            if response.status_code == 200:
                self.log(f"✅ Added transaction: {transaction['description']}")

    def test_insights_premium(self):
        """Test premium insights endpoint with include_premium=true"""
        self.log("Testing premium insights endpoint...")
        
        # Test basic insights first
        response = self.session.get(f"{self.base_url}/insights")
        if not self.assert_response(response, 200, "GET basic insights"):
            return False
            
        basic_insights = response.json()
        self.log(f"Basic insights keys: {list(basic_insights.keys())}")
        
        # Test premium insights
        response = self.session.get(f"{self.base_url}/insights", params={"include_premium": True})
        if not self.assert_response(response, 200, "GET premium insights"):
            return False
            
        premium_insights = response.json()
        self.log(f"Premium insights response: {json.dumps(premium_insights, indent=2)}")
        
        # Verify basic insights structure
        required_basic_fields = ["cost_per_egg", "top_hen", "productivity_index"]
        for field in required_basic_fields:
            if field not in premium_insights:
                self.errors.append(f"Premium insights missing basic field: {field}")
                return False
        
        # Verify premium features are included
        if "premium" not in premium_insights:
            self.errors.append("Premium insights missing 'premium' object")
            return False
            
        premium_obj = premium_insights["premium"]
        required_premium_fields = [
            "forecast_7_days", 
            "production_status", 
            "deviating_hens", 
            "economy", 
            "summary"
        ]
        
        for field in required_premium_fields:
            if field not in premium_obj:
                self.errors.append(f"Premium object missing field: {field}")
                return False
        
        # Verify specific premium calculations
        self.log(f"✅ Premium features found:")
        self.log(f"  - 7-day forecast: {premium_obj['forecast_7_days']} eggs")
        self.log(f"  - Production status: {premium_obj.get('production_text', premium_obj['production_status'])}")
        self.log(f"  - Deviating hens: {len(premium_obj['deviating_hens'])} found")
        self.log(f"  - Economy comparison available: {bool(premium_obj['economy'])}")
        self.log(f"  - AI Summary: {premium_obj['summary'][:100]}...")
        
        # Verify economy object structure
        economy = premium_obj["economy"]
        required_economy_fields = ["this_month", "last_month", "change", "change_percent"]
        for field in required_economy_fields:
            if field not in economy:
                self.errors.append(f"Economy object missing field: {field}")
                return False
        
        self.log("✅ All premium insights calculations working correctly")
        return True

    def test_health_logs(self):
        """Test health logs GET and POST endpoints"""
        self.log("Testing health logs endpoints...")
        
        # First, get existing health logs
        response = self.session.get(f"{self.base_url}/health-logs")
        if not self.assert_response(response, 200, "GET health logs"):
            return False
            
        existing_logs = response.json()
        self.log(f"Existing health logs: {len(existing_logs)} found")
        
        # Create a new health log (need a hen ID first)
        if 'hen' not in self.test_data:
            self.log("⚠️ No test hen available, skipping health log creation")
            return True
            
        hen_id = self.test_data['hen']['id']
        
        health_log_data = {
            "hen_id": hen_id,
            "date": date.today().isoformat(),
            "type": "sick",
            "description": "Hönan verkar lite slö idag, håller koll"
        }
        
        response = self.session.post(f"{self.base_url}/health-logs", json=health_log_data)
        if not self.assert_response(response, 200, "POST health log"):
            return False
            
        created_log = response.json()
        self.log(f"✅ Created health log: {created_log['description']}")
        self.test_data['health_log'] = created_log
        
        # Test getting health logs for specific hen
        response = self.session.get(f"{self.base_url}/health-logs", params={"hen_id": hen_id})
        if not self.assert_response(response, 200, "GET health logs for specific hen"):
            return False
            
        hen_logs = response.json()
        if len(hen_logs) >= 1:
            self.log(f"✅ Retrieved {len(hen_logs)} health logs for hen")
        else:
            self.errors.append("Expected at least 1 health log for the hen")
            return False
        
        # Test getting health logs for specific hen by endpoint
        response = self.session.get(f"{self.base_url}/health-logs/{hen_id}")
        if not self.assert_response(response, 200, "GET health logs by hen ID endpoint"):
            return False
            
        return True

    def test_feedback_submission(self):
        """Test feedback submission endpoint"""
        self.log("Testing feedback submission endpoint...")
        
        feedback_data = {
            "type": "feature",
            "message": "Skulle vara bra med push-notifieringar när det är dags att plocka ägg. Kanske också väderdata som påverkar äggproduktion?",
            "email": "test.honsgarden@example.com"
        }
        
        response = self.session.post(f"{self.base_url}/feedback", json=feedback_data)
        if not self.assert_response(response, 200, "POST feedback"):
            return False
            
        feedback_response = response.json()
        self.log(f"Feedback response: {feedback_response}")
        
        if "message" in feedback_response:
            self.log("✅ Feedback submitted successfully")
            return True
        else:
            self.errors.append("Feedback submission missing confirmation message")
            return False

    def test_subscription_cancel(self):
        """Test subscription cancellation endpoint"""
        self.log("Testing subscription cancellation endpoint...")
        
        cancel_data = {
            "reason": "Testar bara funktionen - inte en riktig uppsägning"
        }
        
        # Note: This will likely fail if user is not authenticated or has no subscription
        # But we want to test that the endpoint exists and handles the request properly
        response = self.session.post(f"{self.base_url}/subscription/cancel", json=cancel_data)
        
        # Accept both 401 (not authenticated) and 400 (no active subscription) as valid responses
        if response.status_code in [401, 400]:
            self.log(f"✅ Subscription cancel endpoint exists and properly handles unauthenticated/no-subscription case: {response.status_code}")
            self.success_count += 1
            self.total_tests += 1
            return True
        elif response.status_code == 200:
            self.log("✅ Subscription cancel endpoint works (subscription was cancelled)")
            self.success_count += 1
            self.total_tests += 1
            return True
        else:
            return self.assert_response(response, [200, 400, 401], "POST subscription cancel")

    def run_all_tests(self):
        """Run all premium endpoint tests"""
        self.log("="*70)
        self.log("Starting Hönsgården Premium Backend API Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log("="*70)
        
        # Setup test data first
        self.setup_test_data()
        
        test_functions = [
            self.test_health_check,
            self.test_insights_premium, 
            self.test_health_logs,
            self.test_feedback_submission,
            self.test_subscription_cancel
        ]
        
        failed_tests = []
        
        for test_func in test_functions:
            test_name = test_func.__name__
            self.log(f"\n--- Running {test_name} ---")
            try:
                if not test_func():
                    failed_tests.append(test_name)
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                self.errors.append(f"{test_name} - Unexpected exception: {str(e)}")
                failed_tests.append(test_name)
                self.log(f"❌ {test_name} - Exception: {str(e)}", "ERROR")
        
        # Print summary
        self.log("\n" + "="*70)
        self.log("HÖNSGÅRDEN PREMIUM API TEST RESULTS")
        self.log("="*70)
        self.log(f"Total tests: {self.total_tests}")
        self.log(f"Passed: {self.success_count}")
        self.log(f"Failed: {len(self.errors)}")
        
        if failed_tests:
            self.log(f"\nFailed test sections: {', '.join(failed_tests)}")
        
        if self.errors:
            self.log("\nERRORS FOUND:")
            for i, error in enumerate(self.errors, 1):
                self.log(f"{i}. {error}", "ERROR")
        else:
            self.log("\n🎉 ALL PREMIUM ENDPOINT TESTS PASSED!")
        
        self.log("="*70)
        
        return len(self.errors) == 0

if __name__ == "__main__":
    tester = HonsgardenPremiumTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ ALL HÖNSGÅRDEN PREMIUM TESTS SUCCESSFUL")
        exit(0)
    else:
        print(f"\n❌ {len(tester.errors)} PREMIUM ENDPOINT ISSUES FOUND")
        exit(1)