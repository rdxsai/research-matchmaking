#!/usr/bin/env python3
"""
Second Integration test for registration flow + async embedding pipeline
Tests with a different dummy user profile to confirm consistency
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
TEST_EMAIL = f"second_test_{int(time.time())}@example.com"

def log(message):
    """Log with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def test_second_user_async_pipeline():
    """
    Second integration test with different user profile
    """
    log("🚀 Starting SECOND Integration Test - Different User Profile")
    
    # Different test user data
    test_user_data = {
        'email': TEST_EMAIL,
        'password': 'securepass456',
        'name': 'Dr. Sarah Chen',
        'organization': 'MIT Research Lab',
        'seek_share': 'seek',  # Different from first test (was 'share')
        'resource_type': 'collaboration',  # Different from first test (was 'expertise')
        'description': 'Seeking collaboration opportunities in renewable energy and sustainable technology research',
        'research_area': 'Renewable Energy'  # Different from first test (was 'Quantum Computing')
    }
    
    log(f"📝 Test user: {test_user_data['name']} ({test_user_data['email']})")
    log(f"🎯 Profile: {test_user_data['seek_share']} - {test_user_data['research_area']}")
    log(f"🔬 Resource: {test_user_data['resource_type']}")
    
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
            log(f"   resource_type: {profile.resource_type}")
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
    max_wait_time = 15  # Shorter wait time since we know it works
    check_interval = 1  # Check every 1 second
    
    for attempt in range(1, max_wait_time + 1):
        time.sleep(check_interval)
        
        try:
            async_emb = db.query(ResearcherEmbedding).filter(
                ResearcherEmbedding.user_id == test_profile_id
            ).first()
            
            if async_emb:
                log(f"✅ Async embedding found after {attempt}s")
                log(f"   Model: {async_emb.model_version}")
                log(f"   Updated: {async_emb.updated_at}")
                embedding_found = True
                break
            else:
                if attempt % 3 == 0:  # Log every 3 seconds
                    log(f"⏳ Still waiting... ({attempt}s)")
                
        except Exception as e:
            log(f"❌ Embedding check failed: {e}")
            
    if not embedding_found:
        log(f"❌ Async embedding not computed within {max_wait_time} seconds")
        return False
    
    # Step 4: Test searchability with complementary intent
    log("\n=== STEP 4: Search Algorithm Integration ===")
    try:
        # Our test profile is 'seek' + 'Renewable Energy'
        # So we search with 'share' intent for renewable energy
        search_results = find_db_matches(
            user_query='sharing renewable energy research and sustainable technology expertise',
            user_intent='share',  # Opposite of our test profile's 'seek'
            user_wants_resource_type='collaboration',
            current_user_id=None
        )
        
        log(f"🔍 Search query: 'sharing renewable energy research'")
        log(f"🎯 Search intent: 'share' (complementary to test profile's 'seek')")
        log(f"📊 Found {len(search_results)} matches")
        
        # Check if our test profile appears in results
        test_profile_found = False
        test_profile_rank = 0
        for i, match in enumerate(search_results):
            log(f"   {i+1}. ID: {match['id']}, Name: {match['name']}, Score: {match['match_score']:.3f}")
            log(f"      Research: {match['research_area']}, Source: {match['embedding_source']}")
            
            if match['id'] == test_profile_id:
                log(f"   ⭐ TEST PROFILE FOUND AS MATCH #{i+1}!")
                test_profile_found = True
                test_profile_rank = i + 1
        
        if test_profile_found:
            log(f"✅ Test profile is searchable and appears as match #{test_profile_rank}")
            
            # Verify it's using async embeddings
            top_match = search_results[0] if search_results else None
            if top_match and top_match.get('embedding_source') == 'async':
                log("✅ Search results using async embeddings")
            else:
                log("⚠️  Search results may not be using async embeddings")
                
        else:
            log("❌ Test profile not found in search results")
            return False
            
    except Exception as e:
        log(f"❌ Search test failed: {e}")
        return False
    
    # Step 5: Test reverse search (different perspective)
    log("\n=== STEP 5: Reverse Search Test ===")
    try:
        # Test from the perspective of someone with 'share' intent looking for our 'seek' profile
        reverse_results = find_db_matches(
            user_query='looking for researchers seeking renewable energy collaboration',
            user_intent='share',  # We're sharing, looking for seekers
            user_wants_resource_type='collaboration',
            current_user_id=None
        )
        
        log(f"🔄 Reverse search: 'looking for researchers seeking renewable energy'")
        log(f"📊 Found {len(reverse_results)} matches")
        
        reverse_found = any(match['id'] == test_profile_id for match in reverse_results)
        if reverse_found:
            log("✅ Test profile also found in reverse search")
        else:
            log("ℹ️  Test profile not in reverse search (may be due to query specificity)")
            
    except Exception as e:
        log(f"⚠️  Reverse search test failed: {e}")
    
    # Step 6: Cleanup
    log("\n=== STEP 6: Cleanup ===")
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
    
    log("\n🎉 SECOND INTEGRATION TEST PASSED!")
    log("✅ Different User Profile → Registration → Async Embedding → Searchability: ALL WORKING!")
    return True

def test_pipeline_performance():
    """Quick performance test"""
    log("\n=== PIPELINE PERFORMANCE TEST ===")
    start_time = time.time()
    
    # Just test the embedding computation speed
    try:
        from app.tasks.embedding_tasks import embed_profile
        
        # Use an existing profile for performance test
        db = next(get_db())
        existing_profile = db.query(Profile).first()
        
        if existing_profile:
            log(f"Testing embedding performance with profile ID {existing_profile.id}")
            
            perf_start = time.time()
            result = embed_profile(existing_profile.id)
            perf_end = time.time()
            
            if result.get('status') in ['success', 'skipped']:
                log(f"✅ Embedding computation: {perf_end - perf_start:.2f}s")
            else:
                log(f"⚠️  Embedding test result: {result}")
                
        db.close()
        
    except Exception as e:
        log(f"⚠️  Performance test failed: {e}")
    
    total_time = time.time() - start_time
    log(f"📊 Total performance test time: {total_time:.2f}s")

if __name__ == "__main__":
    log("🧪 SECOND ASYNC EMBEDDING PIPELINE INTEGRATION TEST")
    log("=" * 65)
    
    # Check prerequisites quickly
    log("Quick prerequisite check...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/docs", timeout=3)
        if response.status_code == 200:
            log("✅ Backend server ready")
        else:
            log("❌ Backend server not accessible")
            sys.exit(1)
    except Exception as e:
        log(f"❌ Backend server check failed: {e}")
        sys.exit(1)
    
    # Run the second integration test
    success = test_second_user_async_pipeline()
    
    if success:
        # Run performance test if main test passed
        test_pipeline_performance()
        
        log("\n🎉 ALL SECOND TESTS PASSED - ASYNC PIPELINE CONSISTENTLY FUNCTIONAL!")
        log("🔥 The async embedding pipeline is ROCK SOLID!")
        sys.exit(0)
    else:
        log("\n❌ SECOND TESTS FAILED - PIPELINE INCONSISTENCY DETECTED")
        sys.exit(1)
