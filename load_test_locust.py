#!/usr/bin/env python3

"""
Advanced Load Test using Locust
Simulates 30 concurrent users placing orders

Installation:
  pip install locust requests

Usage:
  locust -f load_test_locust.py --host=https://fsi-dds.onrender.com
  
Then open http://localhost:8089 in browser
"""

import os
import random
import string
from locust import HttpUser, task, between, events
from datetime import datetime

# Configuration
API_URL = os.getenv('API_URL', 'https://fsi-dds.onrender.com')
NUM_USERS = 30

# Test data
DISHES = [
    {'id': 1, 'name': 'Cơm gà'},
    {'id': 2, 'name': 'Cơm tấm'},
    {'id': 3, 'name': 'Cơm chiên'},
    {'id': 4, 'name': 'Cơm cà ri'},
    {'id': 5, 'name': 'Cơm lạc'}
]

# Metrics
metrics = {
    'total_orders': 0,
    'successful_orders': 0,
    'failed_orders': 0,
    'response_times': []
}


class OrderUser(HttpUser):
    """Simulates a user placing orders"""
    
    wait_time = between(1, 3)  # Wait 1-3 seconds between actions
    
    def on_start(self):
        """Called when a user starts"""
        self.token = None
        self.user_id = None
        self.register_and_login()
    
    def register_and_login(self):
        """Register a new user and get auth token"""
        username = f"testuser_{random.randint(1000, 9999)}"
        password = "testpass123"
        fullname = f"Test User {random.randint(1, 1000)}"
        
        # Register
        response = self.client.post('/api/auth/register', json={
            'username': username,
            'password': password,
            'fullname': fullname
        })
        
        if response.status_code in [200, 201]:
            data = response.json()
            self.token = data.get('token')
            self.user_id = data.get('user', {}).get('id')
            print(f"✓ Registered: {username}")
        else:
            print(f"✗ Registration failed: {response.status_code}")
    
    @task(3)
    def place_order(self):
        """Place an order"""
        if not self.token:
            return
        
        dish1 = random.choice(DISHES)
        dish2 = random.choice(DISHES)
        
        headers = {'Authorization': f'Bearer {self.token}'}
        
        response = self.client.post('/api/orders', 
            json={
                'dish1Id': dish1['id'],
                'dish2Id': dish2['id'],
                'orderedFor': self.user_id,
                'notes': f'Test order - {datetime.now().isoformat()}'
            },
            headers=headers,
            name='/api/orders'
        )
        
        metrics['total_orders'] += 1
        if response.status_code in [200, 201]:
            metrics['successful_orders'] += 1
        else:
            metrics['failed_orders'] += 1
    
    @task(1)
    def get_orders(self):
        """Get user's orders"""
        if not self.token:
            return
        
        headers = {'Authorization': f'Bearer {self.token}'}
        self.client.get('/api/orders/my', headers=headers, name='/api/orders/my')
    
    @task(1)
    def get_menu(self):
        """Get today's menu"""
        self.client.get('/api/menus/today', name='/api/menus/today')


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    print("\n" + "="*60)
    print("🚀 LOAD TEST STARTED")
    print("="*60)
    print(f"Target: {API_URL}")
    print(f"Concurrent Users: {NUM_USERS}")
    print("="*60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    print("\n" + "="*60)
    print("📊 LOAD TEST RESULTS")
    print("="*60)
    
    stats = environment.stats
    
    print(f"\n📈 Requests:")
    print(f"  Total: {stats.total.num_requests}")
    print(f"  Failed: {stats.total.num_failures}")
    print(f"  Success Rate: {((stats.total.num_requests - stats.total.num_failures) / stats.total.num_requests * 100):.2f}%")
    
    print(f"\n⏱️ Response Times:")
    print(f"  Average: {stats.total.avg_response_time:.2f}ms")
    print(f"  Min: {stats.total.min_response_time:.2f}ms")
    print(f"  Max: {stats.total.max_response_time:.2f}ms")
    print(f"  Median: {stats.total.median_response_time:.2f}ms")
    print(f"  95th percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    
    print(f"\n📊 Orders Placed:")
    print(f"  Total: {metrics['total_orders']}")
    print(f"  Successful: {metrics['successful_orders']}")
    print(f"  Failed: {metrics['failed_orders']}")
    
    print("\n" + "="*60)
    
    # Performance assessment
    success_rate = (stats.total.num_requests - stats.total.num_failures) / stats.total.num_requests * 100
    avg_response = stats.total.avg_response_time
    
    if success_rate >= 95 and avg_response < 500:
        print("✅ EXCELLENT: System can handle 30 concurrent users")
    elif success_rate >= 90 and avg_response < 1000:
        print("⚠️ GOOD: System can handle 30 concurrent users with some delays")
    else:
        print("❌ POOR: System needs optimization for 30 concurrent users")
    
    print("="*60 + "\n")
