from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb+srv://Divyanshi:123@tradenom.lvcxdwh.mongodb.net/"
DB_NAME = "Divyanshi"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
