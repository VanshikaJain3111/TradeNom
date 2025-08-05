from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import pandas as pd

router = APIRouter()
DATA_DIR = Path("/Users/divyanshi/Desktop/TradeNom/data/simulation_price_data_July_1-Aug_30")
SYMBOLS = ["AAPL", "WMT", "UL", "TSLA"]

# Helper to load CSV

def load_csv(symbol):
    try:
        return pd.read_csv(DATA_DIR / f"simulated_{symbol}_live.csv", parse_dates=["timestamp"])
    except Exception:
        raise HTTPException(status_code=404, detail=f"Data for {symbol} not found")

@router.get("/stocks/list")
def list_stocks():
    return SYMBOLS

@router.get("/stocks/{symbol}/ohlc")
def get_ohlc(symbol: str):
    if symbol not in SYMBOLS:
        raise HTTPException(status_code=404, detail="Symbol not found")
    df = load_csv(symbol)
    return df.to_dict(orient="records")

@router.get("/stocks/{symbol}/summary")
def get_summary(symbol: str):
    if symbol not in SYMBOLS:
        raise HTTPException(status_code=404, detail="Symbol not found")
    df = load_csv(symbol)
    return {
        "latest_close": float(df["close"].iloc[-1]),
        "mean_close": float(df["close"].mean()),
        "volatility": float(df["close"].std()),
        "avg_volume": float(df["volume"].mean()),
        "max_drawdown": float((df["close"].cummax() - df["close"]).max())
    }

@router.get("/stocks/compare")
def compare_stocks(symbols: str = Query("AAPL,WMT")):
    syms = [s for s in symbols.split(",") if s in SYMBOLS]
    if not syms:
        raise HTTPException(status_code=400, detail="No valid symbols provided")
    dfs = [load_csv(s)[["timestamp", "close"]].rename(columns={"close": s}) for s in syms]
    df_merged = dfs[0]
    for d in dfs[1:]:
        df_merged = df_merged.merge(d, on="timestamp", how="inner")
    corr = df_merged[syms].corr().to_dict()
    return {"correlation": corr}
