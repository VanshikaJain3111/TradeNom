from fastapi import APIRouter, HTTPException, Depends
from app.database import db
from app.schemas import Order
from typing import List
from datetime import datetime

router = APIRouter()

@router.post("/")
async def place_order(order: Order):
    order_dict = order.dict()
    order_dict["created_at"] = datetime.utcnow()
    order_dict["status"] = "open"
    result = await db.orders.insert_one(order_dict)
    order_dict["id"] = str(result.inserted_id)
    return {"msg": "Order placed", "order": order_dict}

@router.get("/user/{user_id}", response_model=List[Order])
async def get_orders(user_id: str):
    orders = await db.orders.find({"user_id": user_id}).to_list(100)
    return orders

@router.post("/cancel/{order_id}")
async def cancel_order(order_id: str):
    result = await db.orders.update_one({"_id": order_id}, {"$set": {"status": "cancelled"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"msg": "Order cancelled"}
