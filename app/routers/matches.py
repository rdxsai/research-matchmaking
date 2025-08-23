from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app import database, auth, schemas


router = APIRouter(
    prefix = "/matches",
    tags = ['Matches']
)

security = HTTPBearer()

def get_current_user_for_matches(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(database.get_db)):
    token = credentials.credentials
    email = auth.verify_access_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(database.User).filter(database.User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
@router.post("/save/{profile_id}")
def save_matches(profile_id: int, match_score: str = None, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user_for_matches)):
    existing_match = db.query(database.SavedMatch).filter(
        database.SavedMatch.user_id == current_user.id,
        database.SavedMatch.matched_profile_id == profile_id
    ).first()

    if existing_match:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Match already saved")
    new_saved_match = database.SavedMatch(user_id = current_user.id , matched_profile_id = profile_id, match_score = match_score)
    db.add(new_saved_match)
    db.commit()
    return {"message" : "Match saved successfully"}

@router.get("/saved")
def get_saved_match(db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user_for_matches)):
    saved_matches = db.query(
        database.Profile.id,
        database.Profile.name,
        database.Profile.organization,
        database.Profile.seek_share,
        database.Profile.resource_type,
        database.Profile.description,
        database.Profile.research_area,
        database.Profile.primary_text,
        database.SavedMatch.match_score
    ).join(
        database.SavedMatch, database.Profile.id == database.SavedMatch.matched_profile_id
    ).filter(
        database.SavedMatch.user_id == current_user.id
    ).all()
    
    # Convert query results to dictionaries with match_score included
    profiles = []
    for match in saved_matches:
        profile = {
            "id": match.id,  # This is Profile.id due to the JOIN, which is what we want
            "name": match.name,
            "organization": match.organization,
            "seek_share": match.seek_share,
            "resource_type": match.resource_type,
            "description": match.description,
            "research_area": match.research_area,
            "primary_text": match.primary_text,
            "match_score": match.match_score
        }
        profiles.append(profile)
    
    return profiles

@router.delete("/saved/{profile_id}")
def delete_saved_match(profile_id: int, db: Session = Depends(database.get_db), current_user: schemas.User = Depends(get_current_user_for_matches)):
    match_to_Delete = db.query(database.SavedMatch).filter(
        database.SavedMatch.user_id == current_user.id,
        database.SavedMatch.matched_profile_id == profile_id
    ).first()
    if not match_to_Delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND , detail = "Saved match not found")
    db.delete(match_to_Delete)
    db.commit()
    return {"message" : "Match deleted successfully"}