from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.routers import auth_route
from app.routers import matches
from app.routers import profile
from app.routers import admin
from app.hooks.profile_hooks import register_profile_hooks
from app import database, schemas, auth
from app.model import MatchRequest
from app.alogirithm import find_db_matches

database.Base.metadata.create_all(bind = database.engine)


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:3000"],
    allow_credentials = True,
    allow_headers = ["*"],
    allow_methods = ["*"]
)
app.include_router(auth_route.router)
app.include_router(matches.router)
app.include_router(profile.router)
app.include_router(admin.router)

# Register database hooks for automatic embedding processing
register_profile_hooks()

security = HTTPBearer()

def get_current_user_email(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    email = auth.verify_access_token(token)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return email

@app.post("/api/match")
def request_match(request : MatchRequest, current_user: database.User = Depends(auth.get_current_user)):
    # Get the current user's profile ID for intelligent self-exclusion
    user_profile = database.get_db().__next__().query(database.Profile).filter(
        database.Profile.email == current_user.email
    ).first()
    
    current_user_profile_id = user_profile.id if user_profile else None
    
    # Find matches with intelligent self-exclusion
    matches = find_db_matches(
        user_intent=request.seek_share,
        user_query= request.description,
        user_wants_resource_type= None,
        current_user_id=current_user_profile_id
    )
    return {"matches": matches}