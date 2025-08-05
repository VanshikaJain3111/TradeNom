from fastapi import APIRouter, HTTPException
from app.database import db
from app.schemas import Portfolio
from datetime import datetime

router = APIRouter()

def fix_objectid(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

@router.get("/user/{user_id}")
async def get_portfolio(user_id: str):
    portfolio = await db.portfolios.find_one({"user_id": user_id})
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio = fix_objectid(portfolio)
    return portfolio

@router.post("/update")
async def update_portfolio(portfolio: Portfolio):
    portfolio_dict = portfolio.dict()
    portfolio_dict["updated_at"] = datetime.utcnow()
    await db.portfolios.update_one({"user_id": portfolio.user_id}, {"$set": portfolio_dict}, upsert=True)
    return {"msg": "Portfolio updated"}
