from sqlalchemy.orm import Session
from fastapi import APIRouter, HTTPException ,status, Depends
from app import schemas, auth, database
from app.database import Profile
import time

router = APIRouter(
    prefix = "/auth",
    tags = ["Authentication"]
)

@router.post("/register")

def register_user(user : schemas.UserCreate , db:Session = Depends(database.get_db)):
    start_time = time.time()
    print(f"Registration started for {user.email}")
    
    # Check existing user
    check_start = time.time()
    db_user = db.query(database.User).filter(database.User.email == user.email).first()
    print(f"DB check took: {time.time() - check_start:.2f}s")
    
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,  detail = "Email already registerd")
    
    # Hash password
    hash_start = time.time()
    hashed_password = auth.get_hashed_pass(user.password)
    print(f"Password hashing took: {time.time() - hash_start:.2f}s")

    new_user = database.User(
        email=user.email,
        hashed_password=hashed_password,
        name=user.name,
        organization=user.organization,
        seek_share=user.seek_share,
        resource_type=user.resource_type,
        description=user.description,
        research_area=user.research_area,
        status="active"  # Default to active status
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Immediately create a corresponding profile for the new user
    new_profile = Profile(
        name=new_user.name,
        email=new_user.email,
        organization=new_user.organization,
        seek_share=new_user.seek_share,
        resource_type=new_user.resource_type,
        description=new_user.description,
        research_area=new_user.research_area,
        primary_text=f"{new_user.description} {new_user.research_area}",
        status="active"  # Default to active status
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    print(f"User and Profile created for {new_user.email} (User ID: {new_user.id}, Profile ID: {new_profile.id})")

    # Explicitly enqueue embedding task for the new profile
    # This ensures embedding computation happens even if SQLAlchemy hooks fail
    try:
        from app.hooks.profile_hooks import enqueue_embedding_task
        enqueue_embedding_task(new_profile.id)
        print(f"Embedding task enqueued for new profile {new_profile.id}")
    except Exception as e:
        print(f"Warning: Failed to enqueue embedding task for profile {new_profile.id}: {e}")
        # Don't fail registration if embedding task fails - it can be computed later

    return {"message": "User registered successfully."}


@router.post("/login" , response_model = schemas.Token)
def login_Access_token(user_credentials : schemas.UserLogin , db:Session = Depends(database.get_db)):
    start_time = time.time()
    print(f"Login started for {user_credentials.email}")
    
    # Find user
    db_start = time.time()
    user = db.query(database.User).filter(database.User.email == user_credentials.email).first()
    print(f"DB lookup took: {time.time() - db_start:.2f}s")
    
    # Verify password
    verify_start = time.time()
    password_valid = user and auth.verify_hashed_pass(user_credentials.password , user.hashed_password)
    print(f"Password verification took: {time.time() - verify_start:.2f}s")
    
    if not password_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST , detail = "Invalid credentials" , headers={"WWW-Authenticate": "Bearer"})
    
    # Create token
    token_start = time.time()
    access_token = auth.create_Access_token(data = {"sub" : user.email})
    print(f"Token creation took: {time.time() - token_start:.2f}s")
    print(f"Total login time: {time.time() - start_time:.2f}s")
    
    return {"access_token" : access_token , "token_type" : "bearer"}
