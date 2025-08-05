from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

MONGO_URL = "mongodb+srv://Divyanshi:Divyanshi@tradenom.stoe9lq.mongodb.net/"
DB_NAME = "Divyanshi"
USER_ID = "689194691d8e23020b9725f2"  # Replace with your actual user id if needed

dummy_holdings = [
    {"symbol": "AAPL", "quantity": 20, "avg_price": 170.25, "market_value": 3405.00},
    {"symbol": "GOOGL", "quantity": 5, "avg_price": 2800.00, "market_value": 14000.00},
    {"symbol": "TSLA", "quantity": 10, "avg_price": 700.00, "market_value": 7200.00},
]

async def insert_dummy_portfolio():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    await db.portfolios.update_one(
        {"user_id": USER_ID},
        {
            "$set": {
                "holdings": dummy_holdings,
                "updated_at": "2024-06-01T12:00:00"
            }
        },
        upsert=True
    )
    print("Dummy portfolio inserted.")

if __name__ == "__main__":
    asyncio.run(insert_dummy_portfolio())
