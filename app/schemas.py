from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class UserCreate(BaseModel):
    email : str
    password : str
    name : str
    organization : Optional[str] = None
    seek_share : str
    resource_type : str
    description : str
    research_area : str


class UserLogin(BaseModel):
    email : str
    password : str

class TokenData(BaseModel):
    email : Optional[str] = None

class Token(BaseModel):
    access_token : str
    token_type : str

class User(BaseModel):
    id: int
    email: str
    name: str
    organization: Optional[str] = None
    seek_share: str
    resource_type: str
    description: str
    research_area: str
    status: str = "active"
    
    model_config = ConfigDict(from_attributes=True)

class Publication(BaseModel):
    id: int
    title: str
    journal: Optional[str] = None
    year: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class Profile(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    organization: Optional[str] = None
    seek_share: Optional[str] = None
    resource_type: Optional[str] = None
    description: Optional[str] = None
    research_area: Optional[str] = None
    primary_text: Optional[str] = None
    status: Optional[str] = "active"
    # Proof of work fields
    h_index: Optional[int] = None
    citations: Optional[int] = None
    funding_summary: Optional[str] = None
    publications: List["Publication"] = []
    # Note: embedding field is excluded as it's not needed for frontend
    
    model_config = ConfigDict(from_attributes=True)

class UserProfile(BaseModel):
    id: int
    email: str
    name: str
    organization: Optional[str] = None
    seek_share: str
    resource_type: str
    description: str
    research_area: str
    status: str = "active"
    # Proof of work fields
    h_index: Optional[int] = None
    citations: Optional[int] = None
    funding_summary: Optional[str] = None
    publications: List[Publication] = []
    
    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    organization: Optional[str] = None
    seek_share: Optional[str] = None
    resource_type: Optional[str] = None
    description: Optional[str] = None
    research_area: Optional[str] = None
    status: Optional[str] = None
    # Proof of work fields
    h_index: Optional[int] = None
    citations: Optional[int] = None
    funding_summary: Optional[str] = None
