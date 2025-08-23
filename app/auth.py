from fastapi import HTTPException, Depends, status
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import SecretStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from fastapi.security import OAuth2PasswordBearer

from app import database, schemas

SECRET_KEY = "A_very_secret_key_xyz" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_Context = CryptContext(schemes=['bcrypt'] , deprecated = "auto", bcrypt__rounds=4)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_hashed_pass(password):
    return pwd_Context.hash(password)
def verify_hashed_pass(plain_password , hashed_password):
    return pwd_Context.verify(plain_password , hashed_password)
def create_Access_token(data : dict , expires_delta : Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp" : expire})
    encoded_JWT = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_JWT

def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None

def get_current_user(token : str = Depends(oauth2_scheme) , db : Session = Depends(database.get_db)):
    
    credential_Exception = HTTPException(
        status_code= status.HTTP_401_UNAUTHORIZED,
        detail = "Could not validate credentials",
        headers = {"WWW-Authenticate": "Bearer"}
    )

    try:
         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
         email: str = payload.get("sub")
         if email is None:
            raise credential_Exception
         token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credential_Exception
    
    user = db.query(database.User).filter(database.User.email == token_data.email).first()
    if user is None:
        raise credential_Exception
    return user