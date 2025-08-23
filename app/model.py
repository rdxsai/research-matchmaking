from pydantic import BaseModel
from typing import Optional

class MatchRequest(BaseModel):
    seek_share : str
    description : str