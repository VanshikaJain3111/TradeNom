from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class KYCStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review" 
    APPROVED = "approved"
    REJECTED = "rejected"
    INCOMPLETE = "incomplete"

class IDType(str, Enum):
    PASSPORT = "passport"
    DRIVERS_LICENSE = "drivers_license"
    NATIONAL_ID = "national_id"
    VOTER_ID = "voter_id"

class User(BaseModel):
    id: Optional[str]
    email: EmailStr
    hashed_password: str
    full_name: Optional[str]
    created_at: Optional[datetime]
    kyc_status: Optional[KYCStatus] = KYCStatus.PENDING
    kyc_completed_at: Optional[datetime] = None

class KYCDocument(BaseModel):
    id: Optional[str]
    user_id: str
    document_type: str
    document_number: str
    file_path: Optional[str]
    uploaded_at: Optional[datetime]
    verified: Optional[bool] = False
    verification_notes: Optional[str] = None

class KYCData(BaseModel):
    # Personal Information
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    date_of_birth: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    nationality: str = Field(..., min_length=2, max_length=50)
    gender: Optional[str] = Field(None, pattern=r'^(male|female|other)$')
    
    # Contact Information  
    phone_number: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')
    alternate_phone: Optional[str] = Field(None, pattern=r'^\+?[1-9]\d{1,14}$')
    
    # Address Information
    street_address: str = Field(..., min_length=5, max_length=200)
    city: str = Field(..., min_length=2, max_length=50)
    state_province: str = Field(..., min_length=2, max_length=50)
    postal_code: str = Field(..., min_length=3, max_length=20)
    country: str = Field(..., min_length=2, max_length=50)
    
    # Identity Documents
    primary_id_type: IDType
    primary_id_number: str = Field(..., min_length=5, max_length=50)
    primary_id_expiry: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    
    # Secondary ID (optional)
    secondary_id_type: Optional[IDType] = None
    secondary_id_number: Optional[str] = Field(None, min_length=5, max_length=50)
    
    # Financial Information
    annual_income: str = Field(..., pattern=r'^(0-25000|25000-50000|50000-100000|100000-250000|250000-500000|500000+)$')
    employment_status: str = Field(..., pattern=r'^(employed|self_employed|unemployed|student|retired)$')
    employer_name: Optional[str] = Field(None, max_length=100)
    occupation: Optional[str] = Field(None, max_length=100)
    
    # Trading Experience
    trading_experience: str = Field(..., pattern=r'^(none|beginner|intermediate|advanced|professional)$')
    investment_goals: str = Field(..., pattern=r'^(capital_growth|income|speculation|hedging|diversification)$')
    risk_tolerance: str = Field(..., pattern=r'^(low|moderate|high|very_high)$')
    
    # Compliance
    politically_exposed: bool = False
    source_of_funds: str = Field(..., pattern=r'^(salary|business|investments|inheritance|other)$')
    
    # Agreement and Consent
    terms_accepted: bool = Field(..., description="User must accept terms and conditions")
    privacy_consent: bool = Field(..., description="User must consent to privacy policy")
    marketing_consent: Optional[bool] = False

class UserIn(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str]

class UserKYCRegistration(BaseModel):
    email: EmailStr
    password: str
    kyc_data: KYCData

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
