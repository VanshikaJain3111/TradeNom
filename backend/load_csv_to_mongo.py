import os
import pandas as pd
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb+srv://Divyanshi:Divyanshi@tradenom.stoe9lq.mongodb.net/"
DB_NAME = "Divyanshi"
DATA_DIR = "/Users/divyanshi/Desktop/TradeNom/data"

async def load_csv_to_mongo():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.csv'):
            collection_name = filename.replace('.csv', '').lower()
            file_path = os.path.join(DATA_DIR, filename)
            print(f"Loading {file_path} into collection '{collection_name}'...")
            df = pd.read_csv(file_path)
            records = df.to_dict(orient='records')
            if records:
                await db[collection_name].delete_many({})  # Clear existing data
                await db[collection_name].insert_many(records)
                print(f"Inserted {len(records)} records into '{collection_name}' collection.")
            else:
                print(f"No records found in {filename}.")
    print("All CSVs loaded.")

if __name__ == "__main__":
    asyncio.run(load_csv_to_mongo())
