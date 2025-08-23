from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException, status, Depends
from app import schemas, auth, database

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

@router.get("/me", response_model=schemas.UserProfile)
def get_current_user_profile(
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get current user's profile information"""
    # Get the profile with publications
    profile = db.query(database.Profile).filter(database.Profile.email == current_user.email).first()
    
    # If no profile exists, use User data (fallback)
    if not profile:
        return {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "organization": current_user.organization,
            "seek_share": current_user.seek_share,
            "resource_type": current_user.resource_type,
            "description": current_user.description,
            "research_area": current_user.research_area,
            "status": getattr(current_user, 'status', 'active'),
            "h_index": None,
            "citations": None,
            "funding_summary": None,
            "publications": []
        }
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "organization": current_user.organization,
        "seek_share": current_user.seek_share,
        "resource_type": current_user.resource_type,
        "description": current_user.description,
        "research_area": current_user.research_area,
        "status": getattr(current_user, 'status', 'active'),
        "h_index": profile.h_index,
        "citations": profile.citations,
        "funding_summary": profile.funding_summary,
        "publications": profile.publications
    }

@router.get("/{profile_id}", response_model=schemas.UserProfile)
def get_user_profile_by_id(
    profile_id: int,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Get any user's profile information by Profile ID (read-only)"""
    # First try to find by Profile ID (for saved matches)
    profile = db.query(database.Profile).filter(database.Profile.id == profile_id).first()
    if profile:
        return {
            "id": profile.id,
            "email": profile.email,
            "name": profile.name,
            "organization": profile.organization,
            "seek_share": profile.seek_share,
            "resource_type": profile.resource_type,
            "description": profile.description,
            "research_area": profile.research_area,
            "status": getattr(profile, 'status', 'active'),
            "h_index": profile.h_index,
            "citations": profile.citations,
            "funding_summary": profile.funding_summary,
            "publications": profile.publications
        }
    
    # If not found in Profile table, try User table (fallback)
    user = db.query(database.User).filter(database.User.id == profile_id).first()
    if user:
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "organization": user.organization,
            "seek_share": user.seek_share,
            "resource_type": user.resource_type,
            "description": user.description,
            "research_area": user.research_area,
            "status": getattr(user, 'status', 'active'),
            "h_index": None,
            "citations": None,
            "funding_summary": None,
            "publications": []
        }
    
    # If not found in either table
    raise HTTPException(status_code=404, detail="Profile not found")

@router.put("/me", response_model=schemas.UserProfile)
def update_current_user_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """Update current user's profile information"""
    
    # Check if email is being changed and if it's already taken
    if profile_update.email and profile_update.email != current_user.email:
        existing_user = db.query(database.User).filter(
            database.User.email == profile_update.email,
            database.User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Update user fields
    update_data = profile_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    # Also update the corresponding profile if it exists
    profile = db.query(database.Profile).filter(database.Profile.email == current_user.email).first()
    if profile:
        # Update profile fields that match user fields
        profile.name = current_user.name
        profile.email = current_user.email
        profile.organization = current_user.organization
        profile.seek_share = current_user.seek_share
        profile.resource_type = current_user.resource_type
        profile.description = current_user.description
        profile.research_area = current_user.research_area
        profile.status = getattr(current_user, 'status', 'active')  # Sync status field
        
        # Update proof of work fields if provided
        if hasattr(profile_update, 'h_index') and profile_update.h_index is not None:
            profile.h_index = profile_update.h_index
        if hasattr(profile_update, 'citations') and profile_update.citations is not None:
            profile.citations = profile_update.citations
        if hasattr(profile_update, 'funding_summary') and profile_update.funding_summary is not None:
            profile.funding_summary = profile_update.funding_summary
        
        # Update primary_text for search
        profile.primary_text = f"{current_user.name} {current_user.organization} {current_user.research_area} {current_user.description}"
        
        db.commit()
        db.refresh(profile)
        
        # Explicitly enqueue embedding task for the updated profile
        # This ensures embedding recomputation happens even if SQLAlchemy hooks fail
        try:
            from app.hooks.profile_hooks import enqueue_embedding_task
            enqueue_embedding_task(profile.id)
            print(f"Embedding task enqueued for updated profile {profile.id}")
        except Exception as e:
            print(f"Warning: Failed to enqueue embedding task for profile {profile.id}: {e}")
            # Don't fail update if embedding task fails - it can be computed later
    
    # Get updated profile data to return
    updated_profile = db.query(database.Profile).filter(database.Profile.email == current_user.email).first()
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "organization": current_user.organization,
        "seek_share": current_user.seek_share,
        "resource_type": current_user.resource_type,
        "description": current_user.description,
        "research_area": current_user.research_area,
        "status": getattr(current_user, 'status', 'active'),
        "h_index": updated_profile.h_index if updated_profile else None,
        "citations": updated_profile.citations if updated_profile else None,
        "funding_summary": updated_profile.funding_summary if updated_profile else None,
        "publications": updated_profile.publications if updated_profile else []
    }
