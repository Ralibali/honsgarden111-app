"""
Test iteration 15: Testing new trend-analysis endpoint and key auth/premium endpoints
Focus areas:
1. GET /api/statistics/trend-analysis - New endpoint for trend analysis
2. GET /api/statistics/advanced-insights - Advanced insights with metrics
3. GET /api/premium-page - Premium page loads with checkout
4. Auth endpoints - registration and password reset flows
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndConnectivity:
    """Basic connectivity tests"""
    
    def test_api_root_accessible(self):
        """Test API root endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"API root not accessible: {response.status_code}"
        print("✓ API root endpoint accessible")

    def test_auth_me_returns_401_without_auth(self):
        """Test that auth/me returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/auth/me returns 401 without authentication")


class TestTrendAnalysisEndpoint:
    """Tests for the new /api/statistics/trend-analysis endpoint"""
    
    def test_trend_analysis_returns_200(self):
        """Test that trend-analysis endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/statistics/trend-analysis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/statistics/trend-analysis returns 200")
    
    def test_trend_analysis_response_structure(self):
        """Test that trend-analysis response contains expected fields"""
        response = requests.get(f"{BASE_URL}/api/statistics/trend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level fields
        required_fields = ['period', 'hen_count', 'current_period', 'previous_period', 
                          'changes', 'overall_trend', 'trend_message', 'insights']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Response contains all required top-level fields: {required_fields}")
    
    def test_trend_analysis_period_structure(self):
        """Test period comparison structure"""
        response = requests.get(f"{BASE_URL}/api/statistics/trend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        # Check period structure
        assert 'period' in data
        assert 'current' in data['period']
        assert 'previous' in data['period']
        
        for period_key in ['current', 'previous']:
            period = data['period'][period_key]
            assert 'start' in period, f"Missing 'start' in {period_key} period"
            assert 'end' in period, f"Missing 'end' in {period_key} period"
            assert 'days' in period, f"Missing 'days' in {period_key} period"
        
        print("✓ Period structure verified (current and previous with start, end, days)")
    
    def test_trend_analysis_changes_structure(self):
        """Test changes metrics structure"""
        response = requests.get(f"{BASE_URL}/api/statistics/trend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        # Check changes structure
        assert 'changes' in data
        changes = data['changes']
        
        expected_change_keys = ['eggs', 'laying_rate', 'costs', 'sales', 'profit']
        for key in expected_change_keys:
            assert key in changes, f"Missing change key: {key}"
            assert 'value' in changes[key], f"Missing 'value' in changes[{key}]"
            assert 'unit' in changes[key], f"Missing 'unit' in changes[{key}]"
        
        print(f"✓ Changes structure contains all required metrics: {expected_change_keys}")
    
    def test_trend_analysis_overall_trend_values(self):
        """Test that overall_trend is one of expected values"""
        response = requests.get(f"{BASE_URL}/api/statistics/trend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        assert 'overall_trend' in data
        assert data['overall_trend'] in ['improving', 'declining', 'stable'], \
            f"Unexpected overall_trend value: {data['overall_trend']}"
        
        print(f"✓ overall_trend is valid: '{data['overall_trend']}'")
    
    def test_trend_analysis_trend_message_exists(self):
        """Test that trend_message is a non-empty string"""
        response = requests.get(f"{BASE_URL}/api/statistics/trend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        assert 'trend_message' in data
        assert isinstance(data['trend_message'], str), "trend_message should be a string"
        assert len(data['trend_message']) > 0, "trend_message should not be empty"
        
        print(f"✓ trend_message is present: '{data['trend_message']}'")
    
    def test_trend_analysis_insights_is_list(self):
        """Test that insights is a list"""
        response = requests.get(f"{BASE_URL}/api/statistics/trend-analysis")
        assert response.status_code == 200
        data = response.json()
        
        assert 'insights' in data
        assert isinstance(data['insights'], list), "insights should be a list"
        
        print(f"✓ insights is a list with {len(data['insights'])} items")


class TestAdvancedInsightsEndpoint:
    """Tests for /api/statistics/advanced-insights endpoint"""
    
    def test_advanced_insights_returns_200(self):
        """Test that advanced-insights endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/statistics/advanced-insights")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/statistics/advanced-insights returns 200")
    
    def test_advanced_insights_response_structure(self):
        """Test that advanced-insights response contains expected fields"""
        response = requests.get(f"{BASE_URL}/api/statistics/advanced-insights")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level fields
        required_fields = ['hen_count', 'period_days', 'total_eggs_30d', 'total_costs_30d', 
                          'total_sales_30d', 'metrics', 'insights']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Response contains all required top-level fields")
    
    def test_advanced_insights_metrics_structure(self):
        """Test that metrics contains required keys"""
        response = requests.get(f"{BASE_URL}/api/statistics/advanced-insights")
        assert response.status_code == 200
        data = response.json()
        
        assert 'metrics' in data
        metrics = data['metrics']
        
        expected_metrics = [
            'feed_conversion_ratio', 'laying_rate', 'cost_per_egg', 
            'revenue_per_egg', 'profit_per_egg', 'feed_cost_per_egg',
            'eggs_per_hen_monthly', 'eggs_per_hen_yearly_estimate'
        ]
        
        for metric in expected_metrics:
            assert metric in metrics, f"Missing metric: {metric}"
            assert 'value' in metrics[metric], f"Missing 'value' in metrics[{metric}]"
            assert 'unit' in metrics[metric], f"Missing 'unit' in metrics[{metric}]"
            assert 'description' in metrics[metric], f"Missing 'description' in metrics[{metric}]"
        
        print(f"✓ All required metrics present with proper structure")
    
    def test_advanced_insights_insights_structure(self):
        """Test that insights object contains expected keys"""
        response = requests.get(f"{BASE_URL}/api/statistics/advanced-insights")
        assert response.status_code == 200
        data = response.json()
        
        assert 'insights' in data
        insights = data['insights']
        
        assert 'best_laying_day' in insights, "Missing 'best_laying_day' in insights"
        assert 'productivity_score' in insights, "Missing 'productivity_score' in insights"
        
        print(f"✓ Insights contains best_laying_day and productivity_score")


class TestPremiumPage:
    """Tests for /api/premium-page endpoint"""
    
    def test_premium_page_returns_200(self):
        """Test that premium page returns 200"""
        response = requests.get(f"{BASE_URL}/api/premium-page")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/premium-page returns 200")
    
    def test_premium_page_returns_html(self):
        """Test that premium page returns HTML content"""
        response = requests.get(f"{BASE_URL}/api/premium-page")
        assert response.status_code == 200
        
        content_type = response.headers.get('content-type', '')
        assert 'text/html' in content_type, f"Expected HTML content-type, got: {content_type}"
        print("✓ Premium page returns HTML content")
    
    def test_premium_page_contains_checkout_elements(self):
        """Test that premium page contains checkout functionality"""
        response = requests.get(f"{BASE_URL}/api/premium-page")
        assert response.status_code == 200
        
        html_content = response.text.lower()
        
        # Check for checkout-related elements
        assert 'checkout' in html_content or 'prenumeration' in html_content, \
            "Premium page should contain checkout/subscription elements"
        assert 'stripe' in html_content or 'betalning' in html_content, \
            "Premium page should contain payment-related content"
        
        print("✓ Premium page contains checkout/payment elements")
    
    def test_premium_page_contains_token_handling(self):
        """Test that premium page includes proper token handling for checkout"""
        response = requests.get(f"{BASE_URL}/api/premium-page")
        assert response.status_code == 200
        
        html_content = response.text
        
        # Check that the page has JavaScript for auth token handling
        assert 'auth_token' in html_content or 'token' in html_content, \
            "Premium page should have token handling for authenticated checkout"
        assert 'Authorization' in html_content or 'Bearer' in html_content, \
            "Premium page should handle Authorization header for checkout"
        
        print("✓ Premium page includes auth token handling for checkout")


class TestAuthRegistrationEndpoints:
    """Tests for registration flow endpoints"""
    
    def test_register_validates_required_fields(self):
        """Test that register endpoint validates required fields"""
        # Test missing name
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@example.com",
            "password": "testpassword123",
            "accepted_terms": True
        })
        # Should fail due to missing/empty name
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Registration validates name is required")
    
    def test_register_validates_terms_acceptance(self):
        """Test that register endpoint requires terms acceptance"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@example.com",
            "password": "testpassword123",
            "name": "Test User",
            "accepted_terms": False
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert 'detail' in data or 'message' in data
        print("✓ Registration requires terms acceptance")
    
    def test_register_validates_password_length(self):
        """Test that register endpoint validates password length"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@example.com",
            "password": "12345",  # Too short
            "name": "Test User",
            "accepted_terms": True
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Registration validates password length")
    
    def test_verify_registration_requires_email_and_code(self):
        """Test that verify-registration requires email and code"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-registration", json={
            "email": "",
            "code": ""
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ verify-registration requires email and code")


class TestPasswordResetEndpoints:
    """Tests for password reset flow endpoints"""
    
    def test_forgot_password_returns_200(self):
        """Test that forgot-password endpoint returns 200"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent@example.com"
        })
        # Should return 200 even for non-existent emails (security best practice)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert 'message' in data, "Response should contain 'message'"
        assert 'code_sent' in data, "Response should contain 'code_sent'"
        print("✓ POST /api/auth/forgot-password returns 200 with message and code_sent")
    
    def test_reset_password_with_code_validates_inputs(self):
        """Test that reset-password-with-code validates inputs"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password-with-code", json={
            "token": "",
            "new_password": ""
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ reset-password-with-code validates inputs")
    
    def test_reset_password_with_code_validates_password_length(self):
        """Test that reset-password-with-code validates password length"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password-with-code", json={
            "token": "fake-token-123",
            "new_password": "12345"  # Too short
        })
        # Should return 400 for short password or invalid token
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ reset-password-with-code validates password length")


class TestPremiumStatus:
    """Tests for premium status endpoint"""
    
    def test_premium_status_returns_200(self):
        """Test that premium status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/premium/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/premium/status returns 200")
    
    def test_premium_status_response_structure(self):
        """Test that premium status has correct structure"""
        response = requests.get(f"{BASE_URL}/api/premium/status")
        assert response.status_code == 200
        data = response.json()
        
        assert 'is_premium' in data, "Response should contain 'is_premium'"
        assert isinstance(data['is_premium'], bool), "'is_premium' should be a boolean"
        print(f"✓ Premium status response has correct structure (is_premium: {data['is_premium']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
