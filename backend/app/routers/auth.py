from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from app.schemas import UserIn, UserKYCRegistration, KYCStatus
from app import crud
from app.database import db
from fastapi.security import OAuth2PasswordRequestForm
import json
from typing import Optional

router = APIRouter()

def fix_objectid(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

@router.post("/register")
async def register(user_in: UserIn):
    existing = await crud.get_user_by_email(user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await crud.create_user(user_in)
    user = fix_objectid(user)
    # Create empty portfolio for new user
    await db.portfolios.insert_one({"user_id": user["id"], "holdings": [], "updated_at": None})
    return {"msg": "User registered", "user": user}

@router.post("/register-kyc")
async def register_with_kyc(user_kyc_data: UserKYCRegistration):
    """Register user with complete KYC information"""
    try:
        user = await crud.create_user_with_kyc(user_kyc_data)
        user = fix_objectid(user)
        
        # Create empty portfolio for new user
        await db.portfolios.insert_one({
            "user_id": user["id"], 
            "holdings": [], 
            "updated_at": None
        })
        
        # Start verification process
        await start_kyc_verification(user["id"], user_kyc_data.kyc_data)
        
        return {
            "msg": "User registered with KYC data", 
            "user": user,
            "kyc_status": "in_review",
            "next_steps": [
                "Identity document verification in progress",
                "Address verification will follow",
                "Account will be activated upon completion"
            ]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Registration failed")

async def start_kyc_verification(user_id: str, kyc_data):
    """Start the KYC verification process"""
    # Verify identity document
    identity_result = await crud.verify_identity_document(
        user_id, 
        kyc_data.primary_id_type, 
        kyc_data.primary_id_number
    )
    
    # Verify address
    address_data = {
        "street_address": kyc_data.street_address,
        "city": kyc_data.city,
        "state_province": kyc_data.state_province,
        "postal_code": kyc_data.postal_code,
        "country": kyc_data.country
    }
    address_result = await crud.verify_address(user_id, address_data)
    
    # Compliance screening
    compliance_result = await crud.check_sanctions_and_pep(user_id, kyc_data)
    
    # Mark financial verification as complete (basic info provided)
    await db.kyc_verification.update_one(
        {"user_id": user_id},
        {"$set": {"financial_verified": True}}
    )

@router.post("/upload-kyc-document")
async def upload_kyc_document(
    user_id: str = Form(...),
    document_type: str = Form(...),
    document_number: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload KYC document for verification"""
    try:
        # Validate file type
        allowed_types = ["application/pdf", "image/jpeg", "image/png"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail="Only PDF, JPEG, and PNG files are allowed"
            )
        
        # Read file data
        file_data = await file.read()
        
        # Upload and store document
        document_id = await crud.upload_kyc_document(
            user_id, document_type, document_number, file_data
        )
        
        return {
            "msg": "Document uploaded successfully",
            "document_id": document_id,
            "status": "pending_verification"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/kyc-status/{user_id}")
async def get_kyc_status(user_id: str):
    """Get KYC verification status for user"""
    try:
        status_info = await crud.get_kyc_status(user_id)
        return status_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-kyc-step")
async def verify_kyc_step(
    user_id: str = Form(...),
    verification_type: str = Form(...),
    verification_data: str = Form(...)
):
    """Manual verification step for KYC process"""
    try:
        data = json.loads(verification_data)
        
        if verification_type == "identity":
            result = await crud.verify_identity_document(
                user_id, data.get("id_type"), data.get("id_number")
            )
        elif verification_type == "address":
            result = await crud.verify_address(user_id, data)
        elif verification_type == "compliance":
            # Get KYC data for compliance check
            kyc_data = await db.kyc_data.find_one({"user_id": user_id})
            if kyc_data:
                from app.schemas import KYCData
                kyc_obj = KYCData(**kyc_data)
                result = await crud.check_sanctions_and_pep(user_id, kyc_obj)
            else:
                raise HTTPException(status_code=404, detail="KYC data not found")
        else:
            raise HTTPException(status_code=400, detail="Invalid verification type")
        
        return {"msg": "Verification completed", "result": result}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid verification data")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await crud.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    user = fix_objectid(user)
    
    # Get KYC status for the user
    kyc_status_info = await crud.get_kyc_status(user["id"])
    user["kyc_info"] = kyc_status_info
    
    return {"msg": "Login successful", "user": user}

@router.get("/kyc-requirements")
async def get_kyc_requirements():
    """Get KYC requirements and guidelines"""
    return {
        "required_documents": [
            {
                "type": "primary_id",
                "name": "Government-issued Photo ID",
                "options": ["passport", "drivers_license", "national_id", "voter_id"],
                "requirements": "Must be valid and not expired"
            },
            {
                "type": "address_proof",
                "name": "Proof of Address",
                "options": ["utility_bill", "bank_statement", "rental_agreement"],
                "requirements": "Document must be dated within last 3 months"
            }
        ],
        "personal_information": [
            "Full legal name",
            "Date of birth",
            "Nationality",
            "Contact information",
            "Residential address"
        ],
        "financial_information": [
            "Annual income range",
            "Employment status",
            "Source of funds",
            "Investment experience",
            "Risk tolerance"
        ],
        "compliance_checks": [
            "Identity verification",
            "Address verification", 
            "Sanctions screening",
            "PEP (Politically Exposed Person) check",
            "Adverse media screening"
        ],
        "processing_time": "1-3 business days",
        "security_notice": "All information is encrypted and stored securely in compliance with financial regulations"
    }
