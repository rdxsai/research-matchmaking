#!/usr/bin/env python3
"""
Quick script to fix corrupted resource_type data in the database
"""
import sys
sys.path.append('/Users/rudradesai/matchmaking')

from app.database import get_db, Profile, User

def fix_corrupted_resource_types():
    """Fix corrupted resource_type data in the database"""
    db = next(get_db())
    
    try:
        # Find profiles with corrupted resource_type data (containing single characters)
        profiles = db.query(Profile).all()
        
        for profile in profiles:
            if profile.resource_type:
                print(f"Profile ID {profile.id} ({profile.name}): {profile.resource_type}")
                
                # Check if the resource_type contains single character entries (corrupted)
                if ',' in profile.resource_type:
                    parts = [part.strip() for part in profile.resource_type.split(',')]
                    
                    # Filter out single characters and empty strings
                    valid_parts = [part for part in parts if len(part) > 1]
                    
                    if len(valid_parts) != len(parts):
                        print(f"  -> Found corrupted data, fixing...")
                        
                        # If we have valid parts, use them
                        if valid_parts:
                            new_resource_type = ', '.join(valid_parts)
                        else:
                            # If no valid parts, set to a default
                            new_resource_type = 'collaboration'
                        
                        print(f"  -> Old: {profile.resource_type}")
                        print(f"  -> New: {new_resource_type}")
                        
                        profile.resource_type = new_resource_type
                        db.commit()
                        print(f"  -> Fixed!")
                    else:
                        print(f"  -> Data looks clean")
                else:
                    print(f"  -> Single value, looks clean")
        
        print("\nResource type cleanup completed!")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Fixing corrupted resource_type data...")
    fix_corrupted_resource_types()
