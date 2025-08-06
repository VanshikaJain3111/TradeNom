from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class User(BaseModel):
    id: Optional[str]
    email: EmailStr
    hashed_password: str
    full_name: Optional[str]
    created_at: Optional[datetime]

class UserIn(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str]

class Order(BaseModel):
    id: Optional[str]
    user_id: str
    symbol: str
    side: str  # buy/sell
    quantity: float
    price: float
    status: str  # open, filled, cancelled
    created_at: Optional[datetime]

class Portfolio(BaseModel):
    id: Optional[str]
    user_id: str
    holdings: List[dict]
    updated_at: Optional[datetime]

class Report(BaseModel):
    id: Optional[str]
    user_id: str
    report_type: str
    data: dict
    created_at: Optional[datetime]

class AnalyticsRequest(BaseModel):
    symbol: str
    indicators: List[str]
    start_date: str
    end_date: str

class TestTrade(BaseModel):
    id: Optional[str]
    user_id: str
    symbol: str
    side: str
    quantity: float
    price: float
    status: str
    created_at: Optional[datetime]
