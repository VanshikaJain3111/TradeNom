import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import db

# Sample stocks to seed
stocks = [
    {"symbol": "AAPL", "name": "Apple Inc.", "price": 195.5},
    {"symbol": "GOOG", "name": "Alphabet Inc.", "price": 2850.0},
    {"symbol": "MSFT", "name": "Microsoft Corp.", "price": 340.0},
    {"symbol": "TSLA", "name": "Tesla Inc.", "price": 700.0},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "price": 130.0},
    {"symbol": "NFLX", "name": "Netflix Inc.", "price": 420.0},
    {"symbol": "NVDA", "name": "NVIDIA Corp.", "price": 950.0},
    {"symbol": "META", "name": "Meta Platforms Inc.", "price": 320.0}
]
db.stocks.delete_many({})
db.stocks.insert_many(stocks)

# Seed a test user
user = {
    "_id": "testuser1",
    "name": "Test User",
    "cash": 10000.0,
    "holdings": [
        {"symbol": "AAPL", "quantity": 10, "avg_price": 190.0},
        {"symbol": "GOOG", "quantity": 2, "avg_price": 2800.0}
    ]
}
db.users.delete_many({"_id": user["_id"]})
db.users.insert_one(user)

print("Seeded sample stocks and test user with holdings.")
