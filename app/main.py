import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Configure CORS for production
origins = [
    "http://localhost:3000",  # Development
    "https://*.railway.app",  # Railway production
    os.getenv("FRONTEND_URL", "http://localhost:3000")  # Custom production URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"]
)

# Serve static files (React build)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # Serve React app for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # If it's an API route, let FastAPI handle it
        if full_path.startswith("api/") or full_path.startswith("auth/") or full_path.startswith("matches/") or full_path.startswith("profile/") or full_path.startswith("admin/"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Serve React index.html for all other routes
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        else:
            raise HTTPException(status_code=404, detail="Frontend not built")
app.include_router(auth_route.router)
app.include_router(matches.router)
app.include_router(profile.router)
app.include_router(admin.router)

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