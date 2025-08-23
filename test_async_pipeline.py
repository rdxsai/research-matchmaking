#!/usr/bin/env python3
"""
Integration test for registration flow + async embedding pipeline
Tests the complete end-to-end flow from user registration to searchable embeddings
"""
import requests
import time
import os
import sys
from datetime import datetime

# Add the app directory to Python path
sys.path.append('/Users/rudradesai/matchmaking')

from app.database import get_db, Profile, User, ResearcherEmbedding
from app.alogirithm import find_db_matches

# Test configuration
BACKEND_URL = "http://localhost:8000"
TEST_EMAIL = f"integration_test_{int(time.time())}@example.com"

def log(message):
    """Log with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def test_registration_async_pipeline():
    """
    Complete integration test for registration + async embedding pipeline
    """
    log("🚀 Starting Registration + Async Pipeline Integration Test")
    
    # Test user data
    test_user_data = {
        'email': TEST_EMAIL,
        'password': 'testpass123',
        'name': 'Integration Test User',
        'organization': 'Test University',
        'seek_share': 'share',
        'resource_type': 'expertise',
        'description': 'Sharing expertise in quantum computing and machine learning algorithms',
        'research_area': 'Quantum Computing'
    }
    
    log(f"📝 Test user: {test_user_data['name']} ({test_user_data['email']})")
    log(f"🎯 Profile: {test_user_data['seek_share']} - {test_user_data['research_area']}")
    
    # Step 1: Register the user
    log("\n=== STEP 1: User Registration ===")
    try:
        response = requests.post(f'{BACKEND_URL}/auth/register', json=test_user_data, timeout=10)
        if response.status_code == 200:
            log("✅ Registration successful")
        else:
            log(f"❌ Registration failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log(f"❌ Registration request failed: {e}")
        return False
    
    # Step 2: Verify profile was created in database
    log("\n=== STEP 2: Database Profile Verification ===")
    try:
        os.environ['DATABASE_URL'] = 'postgresql://postgres:password@localhost/matchmaking_db'
        db = next(get_db())
        
        # Find the created profile
        profile = db.query(Profile).filter(Profile.email == TEST_EMAIL).first()
        user = db.query(User).filter(User.email == TEST_EMAIL).first()
        
        if profile and user:
            log(f"✅ Profile created: ID {profile.id}, User ID {user.id}")
            log(f"   Name: {profile.name}")
            log(f"   seek_share: {profile.seek_share}")
            log(f"   research_area: {profile.research_area}")
            test_profile_id = profile.id
        else:
            log("❌ Profile not found in database")
            return False
            
    except Exception as e:
        log(f"❌ Database verification failed: {e}")
        return False
    
    # Step 3: Wait for async embedding computation
    log("\n=== STEP 3: Async Embedding Computation ===")
    log("⏳ Waiting for Celery workers to process embedding task...")
    
    embedding_found = False
    max_wait_time = 30  # 30 seconds max wait
    check_interval = 2  # Check every 2 seconds
    
    for attempt in range(1, max_wait_time // check_interval + 1):
        time.sleep(check_interval)
        
        try:
            async_emb = db.query(ResearcherEmbedding).filter(
                ResearcherEmbedding.user_id == test_profile_id
            ).first()
            
            if async_emb:
                log(f"✅ Async embedding found after {attempt * check_interval}s")
                log(f"   Model: {async_emb.model_version}")
                log(f"   Updated: {async_emb.updated_at}")
                embedding_found = True
                break
            else:
                log(f"⏳ Attempt {attempt}/{max_wait_time // check_interval}: No embedding yet...")
                
        except Exception as e:
            log(f"❌ Embedding check failed: {e}")
            
    if not embedding_found:
        log(f"❌ Async embedding not computed within {max_wait_time} seconds")
        return False
    
    # Step 4: Test searchability
    log("\n=== STEP 4: Search Algorithm Integration ===")
    try:
        # Search for someone seeking quantum computing expertise
        # Our test profile is sharing quantum computing expertise
        search_results = find_db_matches(
            user_query='seeking quantum computing expertise and machine learning',
            user_intent='seek',  # Looking for someone who shares
            user_wants_resource_type='expertise',
            current_user_id=None
        )
        
        log(f"🔍 Search query: 'seeking quantum computing expertise'")
        log(f"📊 Found {len(search_results)} matches")
        
        # Check if our test profile appears in results
        test_profile_found = False
        for i, match in enumerate(search_results):
            log(f"   {i+1}. ID: {match['id']}, Name: {match['name']}, Score: {match['match_score']:.3f}")
            log(f"      Research: {match['research_area']}, Source: {match['embedding_source']}")
            
            if match['id'] == test_profile_id:
                log(f"   ⭐ TEST PROFILE FOUND AS MATCH #{i+1}!")
                test_profile_found = True
        
        if test_profile_found:
            log("✅ Test profile is searchable and appears in results")
        else:
            log("❌ Test profile not found in search results")
            return False
            
    except Exception as e:
        log(f"❌ Search test failed: {e}")
        return False
    
    # Step 5: Cleanup
    log("\n=== STEP 5: Cleanup ===")
    try:
        # Remove test data
        if async_emb:
            db.delete(async_emb)
        db.delete(profile)
        db.delete(user)
        db.commit()
        log("✅ Test data cleaned up")
        
    except Exception as e:
        log(f"⚠️  Cleanup warning: {e}")
    
    finally:
        db.close()
    
    log("\n🎉 INTEGRATION TEST PASSED!")
    log("✅ Registration → Profile Creation → Async Embedding → Searchability: ALL WORKING!")
    return True

def test_celery_worker_status():
    """Check if Celery workers are running and responsive"""
    log("\n=== CELERY WORKER STATUS CHECK ===")
    try:
        import subprocess
        result = subprocess.run(['celery', '-A', 'app.celery_app', 'inspect', 'ping'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            log("✅ Celery workers are responsive")
            return True
        else:
            log(f"❌ Celery workers not responsive: {result.stderr}")
            return False
    except Exception as e:
        log(f"❌ Celery status check failed: {e}")
        return False

if __name__ == "__main__":
    log("🧪 ASYNC EMBEDDING PIPELINE INTEGRATION TEST")
    log("=" * 60)
    
    # Check prerequisites
    log("Checking prerequisites...")
    
    # Check Celery workers
    if not test_celery_worker_status():
        log("❌ Celery workers not available - test cannot proceed")
        sys.exit(1)
    
    # Check backend server
    try:
        response = requests.get(f"{BACKEND_URL}/docs", timeout=5)
        if response.status_code == 200:
            log("✅ Backend server is running")
        else:
            log("❌ Backend server not accessible")
            sys.exit(1)
    except Exception as e:
        log(f"❌ Backend server check failed: {e}")
        sys.exit(1)
    
    # Run the integration test
    success = test_registration_async_pipeline()
    
    if success:
        log("\n🎉 ALL TESTS PASSED - ASYNC PIPELINE FULLY FUNCTIONAL!")
        sys.exit(0)
    else:
        log("\n❌ TESTS FAILED - ASYNC PIPELINE NEEDS ATTENTION")
        sys.exit(1)
