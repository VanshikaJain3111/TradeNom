from passlib.context import CryptContext
from datetime import datetime
from app.database import db
from app.schemas import User, UserIn, UserKYCRegistration, KYCData, KYCDocument, KYCStatus
from bson import ObjectId
import hashlib
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_user_by_email(email: str):
    user = await db.users.find_one({"email": email})
    return user

async def create_user(user_in: UserIn):
    hashed_password = pwd_context.hash(user_in.password)
    user = {
        "email": user_in.email,
        "hashed_password": hashed_password,
        "full_name": user_in.full_name,
        "created_at": datetime.utcnow(),
        "kyc_status": KYCStatus.PENDING,
        "kyc_completed_at": None
    }
    result = await db.users.insert_one(user)
    user["id"] = str(result.inserted_id)
    return user

async def create_user_with_kyc(user_kyc_data: UserKYCRegistration):
    """Create user with KYC data"""
    # Check if user already exists
    existing = await get_user_by_email(user_kyc_data.email)
    if existing:
        raise ValueError("Email already registered")
    
    # Hash password
    hashed_password = pwd_context.hash(user_kyc_data.password)
    
    # Create user document
    user_doc = {
        "email": user_kyc_data.email,
        "hashed_password": hashed_password,
        "full_name": f"{user_kyc_data.kyc_data.first_name} {user_kyc_data.kyc_data.last_name}",
        "created_at": datetime.utcnow(),
        "kyc_status": KYCStatus.IN_REVIEW,
        "kyc_completed_at": None
    }
    
    # Insert user
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)
    
    # Create KYC record
    kyc_doc = {
        "user_id": user_id,
        **user_kyc_data.kyc_data.dict(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "verification_status": "pending",
        "verification_notes": [],
        "risk_score": await calculate_risk_score(user_kyc_data.kyc_data)
    }
    
    await db.kyc_data.insert_one(kyc_doc)
    
    # Initialize verification tracking
    verification_doc = {
        "user_id": user_id,
        "identity_verified": False,
        "address_verified": False,
        "financial_verified": False,
        "compliance_verified": False,
        "overall_status": "pending",
        "verification_attempts": 0,
        "last_verification_attempt": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    await db.kyc_verification.insert_one(verification_doc)
    
    user_doc["id"] = user_id
    return user_doc

async def calculate_risk_score(kyc_data: KYCData) -> int:
    """Calculate risk score based on KYC data"""
    score = 0
    
    # Age factor (younger = higher risk)
    try:
        birth_year = int(kyc_data.date_of_birth.split('-')[0])
        age = datetime.now().year - birth_year
        if age < 21:
            score += 20
        elif age < 30:
            score += 10
        elif age > 65:
            score += 5
    except:
        score += 15
    
    # Income factor
    income_risk = {
        "0-25000": 25,
        "25000-50000": 15,
        "50000-100000": 10,
        "100000-250000": 5,
        "250000-500000": 2,
        "500000+": 0
    }
    score += income_risk.get(kyc_data.annual_income, 20)
    
    # Employment status
    employment_risk = {
        "employed": 0,
        "self_employed": 10,
        "unemployed": 30,
        "student": 15,
        "retired": 5
    }
    score += employment_risk.get(kyc_data.employment_status, 25)
    
    # Trading experience
    experience_risk = {
        "none": 30,
        "beginner": 20,
        "intermediate": 10,
        "advanced": 5,
        "professional": 0
    }
    score += experience_risk.get(kyc_data.trading_experience, 25)
    
    # Risk tolerance mismatch
    if kyc_data.risk_tolerance == "very_high" and kyc_data.trading_experience in ["none", "beginner"]:
        score += 20
    
    # PEP status
    if kyc_data.politically_exposed:
        score += 30
    
    return min(score, 100)  # Cap at 100

async def verify_identity_document(user_id: str, id_type: str, id_number: str) -> dict:
    """Simulate identity document verification"""
    # In a real implementation, this would call external APIs like:
    # - Government databases
    # - Credit bureaus
    # - Identity verification services (Jumio, Onfido, etc.)
    
    # Simulate verification logic
    verification_result = {
        "verified": True,
        "confidence_score": 0.95,
        "verification_method": "document_scan",
        "verified_at": datetime.utcnow(),
        "verification_notes": "Document successfully verified against government database"
    }
    
    # Simple validation rules
    if len(id_number) < 5:
        verification_result.update({
            "verified": False,
            "confidence_score": 0.0,
            "verification_notes": "Invalid document number format"
        })
    
    # Update KYC verification status
    await db.kyc_verification.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "identity_verified": verification_result["verified"],
                "identity_verification_details": verification_result,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return verification_result

async def verify_address(user_id: str, address_data: dict) -> dict:
    """Simulate address verification"""
    # In real implementation, would use services like:
    # - Postal address validation APIs
    # - Utility bill verification
    # - Bank statement verification
    
    verification_result = {
        "verified": True,
        "confidence_score": 0.90,
        "verification_method": "address_validation",
        "verified_at": datetime.utcnow(),
        "verification_notes": "Address verified through postal service database"
    }
    
    # Update verification status
    await db.kyc_verification.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "address_verified": verification_result["verified"],
                "address_verification_details": verification_result,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return verification_result

async def check_sanctions_and_pep(user_id: str, kyc_data: KYCData) -> dict:
    """Check against sanctions lists and PEP databases"""
    # In real implementation, would check against:
    # - OFAC sanctions lists
    # - EU sanctions lists
    # - PEP databases
    # - Adverse media screening
    
    full_name = f"{kyc_data.first_name} {kyc_data.last_name}"
    
    # Simulate screening
    screening_result = {
        "sanctions_match": False,
        "pep_match": kyc_data.politically_exposed,
        "adverse_media_match": False,
        "confidence_score": 0.98,
        "screened_at": datetime.utcnow(),
        "screening_notes": "No adverse findings in sanctions or PEP databases"
    }
    
    # Update compliance verification
    await db.kyc_verification.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "compliance_verified": not (screening_result["sanctions_match"] or 
                                          (screening_result["pep_match"] and not kyc_data.politically_exposed)),
                "compliance_screening_details": screening_result,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return screening_result

async def get_kyc_status(user_id: str) -> dict:
    """Get comprehensive KYC status for user"""
    kyc_data = await db.kyc_data.find_one({"user_id": user_id})
    verification = await db.kyc_verification.find_one({"user_id": user_id})
    
    if not kyc_data or not verification:
        return {"status": "not_found"}
    
    # Calculate overall completion
    checks = [
        verification.get("identity_verified", False),
        verification.get("address_verified", False),
        verification.get("financial_verified", False),
        verification.get("compliance_verified", False)
    ]
    
    completion_percentage = (sum(checks) / len(checks)) * 100
    
    # Determine overall status
    if completion_percentage == 100:
        overall_status = "approved"
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "kyc_status": KYCStatus.APPROVED,
                    "kyc_completed_at": datetime.utcnow()
                }
            }
        )
    elif completion_percentage > 0:
        overall_status = "in_review"
    else:
        overall_status = "pending"
    
    return {
        "status": overall_status,
        "completion_percentage": completion_percentage,
        "checks": {
            "identity_verified": verification.get("identity_verified", False),
            "address_verified": verification.get("address_verified", False),
            "financial_verified": verification.get("financial_verified", False),
            "compliance_verified": verification.get("compliance_verified", False)
        },
        "risk_score": kyc_data.get("risk_score", 0),
        "last_updated": verification.get("updated_at"),
        "verification_notes": kyc_data.get("verification_notes", [])
    }

async def authenticate_user(email: str, password: str):
    user = await get_user_by_email(email)
    if not user:
        return False
    if not pwd_context.verify(password, user["hashed_password"]):
        return False
    return user

async def upload_kyc_document(user_id: str, document_type: str, document_number: str, file_data: bytes) -> str:
    """Upload and store KYC document"""
    # Create secure file path
    file_hash = hashlib.sha256(file_data).hexdigest()
    file_extension = "pdf"  # Assume PDF for now
    file_name = f"{user_id}_{document_type}_{file_hash}.{file_extension}"
    
    # In production, upload to secure cloud storage (AWS S3, etc.)
    upload_dir = "kyc_documents"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file_name)
    
    with open(file_path, "wb") as f:
        f.write(file_data)
    
    # Store document metadata
    doc_record = {
        "user_id": user_id,
        "document_type": document_type,
        "document_number": document_number,
        "file_path": file_path,
        "file_hash": file_hash,
        "uploaded_at": datetime.utcnow(),
        "verified": False,
        "verification_notes": None
    }
    
    result = await db.kyc_documents.insert_one(doc_record)
    return str(result.inserted_id)
