from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas import UserIn
from app import crud
from app.database import db
from fastapi.security import OAuth2PasswordRequestForm

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

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await crud.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user = fix_objectid(user)
    return {"msg": "Login successful", "user": user}
