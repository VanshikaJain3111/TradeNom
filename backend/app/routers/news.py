import os
import json
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter()

NEWS_DIR = "/Users/divyanshi/Desktop/TradeNom/data/simulation_news_data_July_1-Aug_30"
NEWS_FILES = ["simulated_July_news_2025.json", "simulated_August_news_2025.json"]

@router.get("/news")
def get_news(date: Optional[str] = Query(None, description="Filter news by date in YYYYMMDD format")):
    news_items = []
    try:
        print(f"Looking for news in: {NEWS_DIR}")
        for fname in NEWS_FILES:
            fpath = os.path.join(NEWS_DIR, fname)
            print(f"Checking file: {fpath}")
            if os.path.exists(fpath):
                with open(fpath, "r") as f:
                    try:
                        data = json.load(f)
                        # Flatten nested structure: {"20250701": [ ... ]}
                        if isinstance(data, list):
                            for day_obj in data:
                                if isinstance(day_obj, dict):
                                    for day, items in day_obj.items():
                                        for item in items:
                                            item['date'] = day
                                            news_items.append(item)
                        elif isinstance(data, dict):
                            for day, items in data.items():
                                for item in items:
                                    item['date'] = day
                                    news_items.append(item)
                    except Exception as e:
                        print(f"Error loading {fname}: {e}")
                        continue
            else:
                print(f"File not found: {fpath}")
        print(f"Total news items loaded: {len(news_items)}")
        if not news_items:
            raise HTTPException(status_code=404, detail="No news found")
        # Filter by date if provided
        if date:
            news_items = [item for item in news_items if item.get('date', '') == date]
        # Sort by date if available
        news_items.sort(key=lambda x: x.get('date', ''), reverse=True)
        return {"news": news_items}
    except Exception as e:
        print(f"Backend error: {e}")
        raise HTTPException(status_code=500, detail=f"Backend error: {e}")
