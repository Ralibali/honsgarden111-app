#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Hönshus Statistik (Chicken Coop Statistics)
Tests all endpoints with realistic chicken coop data and verifies statistics calculations.
"""

import requests
import json
from datetime import datetime, date, timedelta
import uuid
import time

# Backend URL from frontend/.env
BACKEND_URL = "https://honsgarden-staging.preview.emergentagent.com/api"

class ChickenCoopAPITester:
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
        """Test basic connectivity and health endpoint"""
        self.log("Testing API health check...")
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            return self.assert_response(response, 200, "Health check")
        except requests.exceptions.RequestException as e:
            self.errors.append(f"Health check - Connection error: {str(e)}")
            self.log(f"❌ Health check - Connection error: {str(e)}", "ERROR")
            return False

    def test_coop_settings(self):
        """Test coop settings GET and PUT endpoints"""
        self.log("Testing coop settings endpoints...")
        
        # Test GET coop settings (should create default if not exists)
        response = self.session.get(f"{self.base_url}/coop")
        if not self.assert_response(response, 200, "GET coop settings"):
            return False
            
        coop_data = response.json()
        self.log(f"Initial coop data: {coop_data}")
        
        # Test PUT coop settings - update hen count and name
        update_data = {
            "coop_name": "Lyckliga Hönor Gård",
            "hen_count": 12
        }
        
        response = self.session.put(f"{self.base_url}/coop", json=update_data)
        if not self.assert_response(response, 200, "PUT coop settings"):
            return False
            
        updated_coop = response.json()
        self.test_data['coop_settings'] = updated_coop
        
        # Verify the update worked
        if updated_coop['coop_name'] == "Lyckliga Hönor Gård" and updated_coop['hen_count'] == 12:
            self.log("✅ Coop settings updated correctly")
            return True
        else:
            self.errors.append("Coop settings update failed - data not persisted correctly")
            return False

    def test_egg_records_crud(self):
        """Test egg records CRUD operations"""
        self.log("Testing egg records CRUD...")
        
        today = date.today()
        yesterday = today - timedelta(days=1)
        day_before = today - timedelta(days=2)
        
        # Test POST - Create egg records for different dates
        egg_records_data = [
            {"date": today.isoformat(), "count": 8, "notes": "Morgonägg"},
            {"date": yesterday.isoformat(), "count": 10, "notes": "Bra dag för äggläggning"},
            {"date": day_before.isoformat(), "count": 6, "notes": "Lite färre ägg"}
        ]
        
        created_records = []
        for egg_data in egg_records_data:
            response = self.session.post(f"{self.base_url}/eggs", json=egg_data)
            if self.assert_response(response, 200, f"POST egg record for {egg_data['date']}"):
                created_records.append(response.json())
            else:
                return False
        
        self.test_data['egg_records'] = created_records
        
        # Test GET all egg records
        response = self.session.get(f"{self.base_url}/eggs")
        if not self.assert_response(response, 200, "GET all egg records"):
            return False
            
        all_records = response.json()
        if len(all_records) >= 3:
            self.log(f"✅ Retrieved {len(all_records)} egg records")
        else:
            self.errors.append(f"Expected at least 3 egg records, got {len(all_records)}")
            return False
        
        # Test GET with date filtering
        response = self.session.get(f"{self.base_url}/eggs", params={
            "start_date": yesterday.isoformat(),
            "end_date": today.isoformat()
        })
        if not self.assert_response(response, 200, "GET egg records with date filter"):
            return False
            
        filtered_records = response.json()
        if len(filtered_records) >= 2:
            self.log(f"✅ Date filtering works - got {len(filtered_records)} records")
        else:
            self.errors.append(f"Date filtering failed - expected at least 2 records, got {len(filtered_records)}")
        
        # Test GET specific egg record by ID
        if created_records:
            record_id = created_records[0]['id']
            response = self.session.get(f"{self.base_url}/eggs/{record_id}")
            self.assert_response(response, 200, "GET specific egg record")
        
        # Test GET egg record by date
        response = self.session.get(f"{self.base_url}/eggs/date/{today.isoformat()}")
        self.assert_response(response, 200, "GET egg record by date")
        
        # Test PUT - Update an egg record
        if created_records:
            record_id = created_records[0]['id']
            update_data = {"count": 9, "notes": "Uppdaterad morgonräkning"}
            response = self.session.put(f"{self.base_url}/eggs/{record_id}", json=update_data)
            if self.assert_response(response, 200, "PUT update egg record"):
                updated_record = response.json()
                if updated_record['count'] == 9:
                    self.log("✅ Egg record updated successfully")
                else:
                    self.errors.append("Egg record update failed - count not updated")
        
        return True

    def test_transactions_crud(self):
        """Test transaction CRUD operations with various categories"""
        self.log("Testing transactions CRUD...")
        
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        # Test POST - Create various types of transactions
        transactions_data = [
            # Cost transactions
            {"date": today.isoformat(), "type": "cost", "category": "feed", 
             "amount": 85.50, "description": "Hönsfoder 25kg"},
            {"date": yesterday.isoformat(), "type": "cost", "category": "equipment", 
             "amount": 245.0, "description": "Ny värmelampa"},
            {"date": today.isoformat(), "type": "cost", "category": "medicine", 
             "amount": 120.0, "description": "Vitamintillskott"},
            
            # Sale transactions
            {"date": today.isoformat(), "type": "sale", "category": "egg_sale", 
             "amount": 60.0, "description": "Äggförsäljning grannar", "quantity": 24},
            {"date": yesterday.isoformat(), "type": "sale", "category": "egg_sale", 
             "amount": 45.0, "description": "Äggförsäljning marknad", "quantity": 18},
            {"date": today.isoformat(), "type": "sale", "category": "other_income", 
             "amount": 200.0, "description": "Försäljning gammal hönsgård"}
        ]
        
        created_transactions = []
        for trans_data in transactions_data:
            response = self.session.post(f"{self.base_url}/transactions", json=trans_data)
            if self.assert_response(response, 200, f"POST {trans_data['type']} transaction ({trans_data['category']})"):
                created_transactions.append(response.json())
            else:
                return False
        
        self.test_data['transactions'] = created_transactions
        
        # Test GET all transactions
        response = self.session.get(f"{self.base_url}/transactions")
        if not self.assert_response(response, 200, "GET all transactions"):
            return False
            
        all_transactions = response.json()
        if len(all_transactions) >= 6:
            self.log(f"✅ Retrieved {len(all_transactions)} transactions")
        else:
            self.errors.append(f"Expected at least 6 transactions, got {len(all_transactions)}")
        
        # Test GET transactions with type filter (costs only)
        response = self.session.get(f"{self.base_url}/transactions", params={"type": "cost"})
        if self.assert_response(response, 200, "GET cost transactions"):
            cost_transactions = response.json()
            cost_count = len([t for t in cost_transactions if t['type'] == 'cost'])
            if cost_count >= 3:
                self.log(f"✅ Cost filter works - got {cost_count} cost transactions")
            else:
                self.errors.append(f"Cost filter failed - expected at least 3, got {cost_count}")
        
        # Test GET transactions with date filtering
        response = self.session.get(f"{self.base_url}/transactions", params={
            "start_date": today.isoformat(),
            "end_date": today.isoformat()
        })
        if self.assert_response(response, 200, "GET transactions with date filter"):
            today_transactions = response.json()
            self.log(f"✅ Today's transactions: {len(today_transactions)}")
        
        # Test GET specific transaction by ID
        if created_transactions:
            trans_id = created_transactions[0]['id']
            response = self.session.get(f"{self.base_url}/transactions/{trans_id}")
            self.assert_response(response, 200, "GET specific transaction")
        
        return True

    def test_statistics_endpoints(self):
        """Test all statistics endpoints and verify calculations"""
        self.log("Testing statistics endpoints...")
        
        # Test today's statistics
        response = self.session.get(f"{self.base_url}/statistics/today")
        if not self.assert_response(response, 200, "GET today statistics"):
            return False
            
        today_stats = response.json()
        self.log(f"Today's stats: {json.dumps(today_stats, indent=2)}")
        
        # Verify today's stats structure
        required_fields = ['date', 'egg_count', 'hen_count', 'total_costs', 'total_sales', 'net']
        for field in required_fields:
            if field not in today_stats:
                self.errors.append(f"Today statistics missing field: {field}")
                return False
        
        # Test monthly statistics
        current_date = date.today()
        response = self.session.get(f"{self.base_url}/statistics/month/{current_date.year}/{current_date.month}")
        if not self.assert_response(response, 200, "GET month statistics"):
            return False
            
        month_stats = response.json()
        self.log(f"Month stats: {json.dumps(month_stats, indent=2)}")
        
        # Verify monthly stats structure
        required_fields = ['year', 'month', 'total_eggs', 'avg_eggs_per_day', 'total_costs', 'total_sales', 'net']
        for field in required_fields:
            if field not in month_stats:
                self.errors.append(f"Month statistics missing field: {field}")
                return False
        
        # Test yearly statistics
        response = self.session.get(f"{self.base_url}/statistics/year/{current_date.year}")
        if not self.assert_response(response, 200, "GET year statistics"):
            return False
            
        year_stats = response.json()
        self.log(f"Year stats summary: eggs={year_stats.get('total_eggs')}, net={year_stats.get('net')}")
        
        # Verify yearly stats structure
        required_fields = ['year', 'total_eggs', 'avg_eggs_per_day', 'total_costs', 'total_sales', 'net', 'monthly_breakdown']
        for field in required_fields:
            if field not in year_stats:
                self.errors.append(f"Year statistics missing field: {field}")
                return False
        
        # Verify monthly breakdown has 12 months
        if len(year_stats['monthly_breakdown']) != 12:
            self.errors.append(f"Monthly breakdown should have 12 months, got {len(year_stats['monthly_breakdown'])}")
        
        # Test summary statistics
        response = self.session.get(f"{self.base_url}/statistics/summary")
        if not self.assert_response(response, 200, "GET summary statistics"):
            return False
            
        summary_stats = response.json()
        self.log(f"Summary stats: {json.dumps(summary_stats, indent=2)}")
        
        # Verify summary stats structure
        required_fields = ['hen_count', 'total_eggs_all_time', 'total_costs_all_time', 'total_sales_all_time', 'net_all_time', 'this_month']
        for field in required_fields:
            if field not in summary_stats:
                self.errors.append(f"Summary statistics missing field: {field}")
                return False
        
        return True

    def test_delete_operations(self):
        """Test delete operations for eggs and transactions"""
        self.log("Testing delete operations...")
        
        # Delete one egg record if we have any
        if 'egg_records' in self.test_data and self.test_data['egg_records']:
            record_to_delete = self.test_data['egg_records'][-1]  # Delete the last one
            record_id = record_to_delete['id']
            
            response = self.session.delete(f"{self.base_url}/eggs/{record_id}")
            if self.assert_response(response, 200, "DELETE egg record"):
                # Verify it's actually deleted
                response = self.session.get(f"{self.base_url}/eggs/{record_id}")
                if response.status_code == 404:
                    self.log("✅ Egg record successfully deleted")
                else:
                    self.errors.append("Egg record delete failed - record still exists")
        
        # Delete one transaction if we have any
        if 'transactions' in self.test_data and self.test_data['transactions']:
            trans_to_delete = self.test_data['transactions'][-1]  # Delete the last one
            trans_id = trans_to_delete['id']
            
            response = self.session.delete(f"{self.base_url}/transactions/{trans_id}")
            if self.assert_response(response, 200, "DELETE transaction"):
                # Verify it's actually deleted
                response = self.session.get(f"{self.base_url}/transactions/{trans_id}")
                if response.status_code == 404:
                    self.log("✅ Transaction successfully deleted")
                else:
                    self.errors.append("Transaction delete failed - record still exists")
        
        return True

    def verify_statistics_calculations(self):
        """Verify that statistics calculations are mathematically correct"""
        self.log("Verifying statistics calculations...")
        
        # Get all data to manually calculate totals
        eggs_response = self.session.get(f"{self.base_url}/eggs")
        trans_response = self.session.get(f"{self.base_url}/transactions")
        
        if eggs_response.status_code != 200 or trans_response.status_code != 200:
            self.errors.append("Failed to get data for statistics verification")
            return False
        
        all_eggs = eggs_response.json()
        all_transactions = trans_response.json()
        
        # Calculate totals manually
        total_eggs_calc = sum(egg['count'] for egg in all_eggs)
        total_costs_calc = sum(t['amount'] for t in all_transactions if t['type'] == 'cost')
        total_sales_calc = sum(t['amount'] for t in all_transactions if t['type'] == 'sale')
        net_calc = total_sales_calc - total_costs_calc
        
        # Get summary statistics
        summary_response = self.session.get(f"{self.base_url}/statistics/summary")
        if summary_response.status_code != 200:
            self.errors.append("Failed to get summary statistics for verification")
            return False
        
        summary_stats = summary_response.json()
        
        # Verify calculations match
        tolerance = 0.01  # Allow for small floating point differences
        
        if abs(summary_stats['total_eggs_all_time'] - total_eggs_calc) > tolerance:
            self.errors.append(f"Total eggs mismatch: expected {total_eggs_calc}, got {summary_stats['total_eggs_all_time']}")
            return False
        
        if abs(summary_stats['total_costs_all_time'] - total_costs_calc) > tolerance:
            self.errors.append(f"Total costs mismatch: expected {total_costs_calc}, got {summary_stats['total_costs_all_time']}")
            return False
        
        if abs(summary_stats['total_sales_all_time'] - total_sales_calc) > tolerance:
            self.errors.append(f"Total sales mismatch: expected {total_sales_calc}, got {summary_stats['total_sales_all_time']}")
            return False
        
        if abs(summary_stats['net_all_time'] - net_calc) > tolerance:
            self.errors.append(f"Net total mismatch: expected {net_calc}, got {summary_stats['net_all_time']}")
            return False
        
        self.log("✅ Statistics calculations verified as correct")
        return True

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        self.log("Testing error handling...")
        
        # Test 404 for non-existent egg record
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{self.base_url}/eggs/{fake_id}")
        self.assert_response(response, 404, "GET non-existent egg record (should 404)")
        
        # Test 404 for non-existent transaction
        response = self.session.get(f"{self.base_url}/transactions/{fake_id}")
        self.assert_response(response, 404, "GET non-existent transaction (should 404)")
        
        # Test invalid transaction type (should fail validation)
        invalid_transaction = {
            "date": date.today().isoformat(),
            "type": "invalid_type",
            "category": "feed",
            "amount": 100.0
        }
        response = self.session.post(f"{self.base_url}/transactions", json=invalid_transaction)
        if response.status_code in [400, 422]:  # Either bad request or validation error
            self.log("✅ Invalid transaction type properly rejected")
            self.success_count += 1
        else:
            self.errors.append(f"Invalid transaction type should be rejected, got {response.status_code}")
        self.total_tests += 1
        
        return True

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("="*60)
        self.log("Starting Hönshus Statistik Backend API Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log("="*60)
        
        test_functions = [
            self.test_health_check,
            self.test_coop_settings,
            self.test_egg_records_crud,
            self.test_transactions_crud,
            self.test_statistics_endpoints,
            self.verify_statistics_calculations,
            self.test_delete_operations,
            self.test_error_handling
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
        self.log("\n" + "="*60)
        self.log("TEST RESULTS SUMMARY")
        self.log("="*60)
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
            self.log("\n🎉 ALL TESTS PASSED! Backend APIs are working correctly.")
        
        self.log("="*60)
        
        return len(self.errors) == 0

if __name__ == "__main__":
    tester = ChickenCoopAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ ALL BACKEND TESTS SUCCESSFUL")
        exit(0)
    else:
        print(f"\n❌ {len(tester.errors)} BACKEND ISSUES FOUND")
        exit(1)