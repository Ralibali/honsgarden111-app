#!/usr/bin/env python3
"""
Minimal MongoDB connection test script for Render debugging.
Run with: python test_mongo.py
"""
import os
import sys

def test_connection():
    print("=" * 60)
    print("MongoDB Connection Test")
    print("=" * 60)
    
    # Check if MONGO_URL is set
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ ERROR: MONGO_URL environment variable is not set!")
        sys.exit(1)
    
    # Mask password for logging
    masked_url = mongo_url
    if '@' in mongo_url and ':' in mongo_url:
        try:
            prefix = mongo_url.split('://')[0]
            rest = mongo_url.split('://')[1]
            user = rest.split(':')[0]
            after_pass = rest.split('@')[1]
            masked_url = f"{prefix}://{user}:****@{after_pass}"
        except:
            pass
    
    print(f"📍 MONGO_URL: {masked_url}")
    print(f"📍 DB_NAME: {os.environ.get('DB_NAME', 'honsgarden')}")
    print()
    
    # Check for common issues
    if 'authSource=honsgarden' in mongo_url:
        print("⚠️  WARNING: authSource=honsgarden detected!")
        print("   This is likely WRONG. MongoDB Atlas users authenticate against 'admin'.")
        print("   Change to: authSource=admin")
        print("   Or remove authSource entirely (defaults to admin)")
        print()
    
    try:
        from pymongo import MongoClient
        print("🔄 Attempting to connect...")
        
        # Connect with a short timeout
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=10000)
        
        # Force connection by listing databases
        db_name = os.environ.get('DB_NAME', 'honsgarden')
        db = client[db_name]
        
        # Try to ping
        client.admin.command('ping')
        print("✅ SUCCESS: Connected to MongoDB!")
        
        # List collections
        collections = db.list_collection_names()
        print(f"✅ Database '{db_name}' has {len(collections)} collections: {collections[:5]}...")
        
        client.close()
        print()
        print("=" * 60)
        print("🎉 MongoDB connection is working correctly!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {type(e).__name__}: {e}")
        print()
        print("=" * 60)
        print("TROUBLESHOOTING:")
        print("=" * 60)
        print("1. Check authSource - should be 'admin' not 'honsgarden'")
        print("2. Verify password has no special chars that need URL encoding")
        print("3. Ensure IP 0.0.0.0/0 is in MongoDB Atlas Network Access")
        print("4. Try resetting password in MongoDB Atlas (Database Access)")
        print()
        print("CORRECT FORMAT:")
        print("mongodb+srv://USER:PASSWORD@cluster.mongodb.net/honsgarden?retryWrites=true&w=majority&authSource=admin")
        print()
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
