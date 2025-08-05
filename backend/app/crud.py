from passlib.context import CryptContext
from datetime import datetime
from app.database import db
from app.schemas import User, UserIn
from bson import ObjectId

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
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user)
    user["id"] = str(result.inserted_id)
    return user

async def authenticate_user(email: str, password: str):
    user = await get_user_by_email(email)
    if not user:
        return False
    if not pwd_context.verify(password, user["hashed_password"]):
        return False
    return user
