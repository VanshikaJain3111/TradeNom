from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, orders, portfolio, reports, analytics, test_trading, news, trading
from app.routers import reports_analytics
from app.database import db

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set this to your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(test_trading.router, prefix="/test", tags=["test_trading"])
app.include_router(news.router, prefix="", tags=["news"])
app.include_router(trading.router, prefix="/trading", tags=["trading"])
app.include_router(reports_analytics.router, prefix="/reports-analytics", tags=["reports-analytics"])

@app.get("/")
def root():
    return {"message": "Welcome to the Next-Gen Trading Platform API"}

@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "ok", "message": "MongoDB connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MongoDB connection failed: {str(e)}")
