from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import db
import pandas as pd
import os
from pathlib import Path

router = APIRouter()

# Data directory for price data
DATA_DIR = Path("d:/Projects/ProjectTrade-main/ProjectTrade-main/data/simulation_price_data_July_1-Aug_30")

# Enhanced Pydantic models
class OrderRequest(BaseModel):
    user_id: str
    symbol: str
    side: str  # 'buy' or 'sell'
    quantity: float
    price: Optional[float] = None  # Optional for market orders
    order_type: Optional[str] = "market"  # 'market' or 'limit'

class Stock(BaseModel):
    symbol: str
    name: str
    price: float
    change: Optional[float] = 0.0
    change_percent: Optional[float] = 0.0
    volume: Optional[int] = 0
    market_cap: Optional[float] = 0.0

class Holding(BaseModel):
    symbol: str
    quantity: float
    avg_price: float
    current_price: Optional[float] = 0.0
    market_value: Optional[float] = 0.0
    unrealized_pnl: Optional[float] = 0.0
    unrealized_pnl_percent: Optional[float] = 0.0

class Portfolio(BaseModel):
    user_id: str
    cash: float
    holdings: List[Holding]
    total_value: Optional[float] = 0.0
    portfolio_value: Optional[float] = 0.0
    total_return: Optional[float] = 0.0
    total_return_percent: Optional[float] = 0.0

class OrderHistory(BaseModel):
    id: str
    user_id: str
    symbol: str
    side: str
    quantity: float
    price: float
    timestamp: datetime
    status: str
    order_type: Optional[str] = "market"
    execution_time: Optional[datetime] = None

class PerformanceMetrics(BaseModel):
    total_value: float
    cash: float
    portfolio_value: float
    realized_pnl: float
    unrealized_pnl: float
    total_pnl: float
    total_return_percent: float
    holdings_count: int
    starting_value: float

# Helper functions
def get_current_price(symbol: str) -> float:
    """Get current price from CSV data (last available price)"""
    try:
        csv_path = DATA_DIR / f"simulated_{symbol}_live.csv"
        if csv_path.exists():
            df = pd.read_csv(csv_path)
            if len(df) > 0:
                return float(df['close'].iloc[-1])
        
        # Fallback prices for symbols not in CSV
        fallback_prices = {
            'AAPL': 220.0, 'GOOG': 2800.0, 'MSFT': 420.0, 
            'TSLA': 250.0, 'WMT': 165.0, 'UL': 48.0, 'IBM': 190.0
        }
        return fallback_prices.get(symbol, 100.0)
    except Exception:
        return 100.0  # Default fallback price

def get_historical_price(symbol: str, days_back: int = 1) -> float:
    """Get historical price for calculating daily changes"""
    try:
        csv_path = DATA_DIR / f"simulated_{symbol}_live.csv"
        if csv_path.exists():
            df = pd.read_csv(csv_path)
            if len(df) > days_back:
                return float(df['close'].iloc[-(days_back + 1)])
        return get_current_price(symbol)
    except Exception:
        return get_current_price(symbol)

def calculate_portfolio_value(holdings: List[dict]) -> dict:
    """Calculate total portfolio value and individual holding values"""
    total_value = 0.0
    updated_holdings = []
    
    for holding in holdings:
        current_price = get_current_price(holding['symbol'])
        market_value = holding['quantity'] * current_price
        unrealized_pnl = (current_price - holding['avg_price']) * holding['quantity']
        unrealized_pnl_percent = (unrealized_pnl / (holding['avg_price'] * holding['quantity'])) * 100 if holding['avg_price'] > 0 else 0
        
        updated_holding = {
            **holding,
            'current_price': current_price,
            'market_value': market_value,
            'unrealized_pnl': unrealized_pnl,
            'unrealized_pnl_percent': unrealized_pnl_percent
        }
        updated_holdings.append(updated_holding)
        total_value += market_value
    
    return {
        'holdings': updated_holdings,
        'total_value': total_value
    }

def validate_order_request(order: OrderRequest, user: dict) -> Optional[str]:
    """Validate order request and return error message if invalid"""
    if order.quantity <= 0:
        return "Quantity must be positive"
    
    if order.side.lower() not in ['buy', 'sell']:
        return "Order side must be 'buy' or 'sell'"
    
    if order.order_type not in ['market', 'limit']:
        return "Order type must be 'market' or 'limit'"
    
    if order.order_type == 'limit' and (not order.price or order.price <= 0):
        return "Limit orders must have a positive price"
    
    # Additional validation for sell orders
    if order.side.lower() == 'sell':
        holdings = user.get("holdings", [])
        holding_found = None
        for holding in holdings:
            if holding["symbol"] == order.symbol:
                holding_found = holding
                break
        
        if not holding_found:
            return f"No shares of {order.symbol} to sell"
        
        if holding_found["quantity"] < order.quantity:
            return f"Not enough shares to sell. Have {holding_found['quantity']}, trying to sell {order.quantity}"
    
    return None

def fix_objectid(doc):
    """Convert MongoDB ObjectId to string"""
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

# Endpoint: List all stocks with enhanced information
@router.get("/stocks", response_model=List[Stock])
async def get_stocks():
    """Get list of available stocks with current prices and market data"""
    symbols = ['AAPL', 'GOOG', 'MSFT', 'TSLA', 'WMT', 'UL', 'IBM']
    stock_names = {
        'AAPL': 'Apple Inc.',
        'GOOG': 'Alphabet Inc.',
        'MSFT': 'Microsoft Corporation',
        'TSLA': 'Tesla Inc.',
        'WMT': 'Walmart Inc.',
        'UL': 'Unilever PLC',
        'IBM': 'IBM Corporation'
    }
    
    stocks = []
    for symbol in symbols:
        current_price = get_current_price(symbol)
        prev_price = get_historical_price(symbol, 1)
        
        # Calculate change from previous day
        change = current_price - prev_price
        change_percent = (change / prev_price) * 100 if prev_price > 0 else 0
        
        # Mock volume and market cap (in a real system, this would come from market data)
        volume = int(1000000 + (hash(symbol) % 5000000))  # Mock volume
        market_cap = current_price * volume * 100  # Mock market cap
            
        stocks.append(Stock(
            symbol=symbol,
            name=stock_names.get(symbol, symbol),
            price=current_price,
            change=change,
            change_percent=change_percent,
            volume=volume,
            market_cap=market_cap
        ))
    
    return stocks

# Endpoint: Get user portfolio with enhanced metrics
@router.get("/portfolio/user/{user_id}", response_model=Portfolio)
async def get_portfolio(user_id: str):
    """Get user portfolio with current market values and performance metrics"""
    try:
        # Find user to get cash and holdings
        user = await db.users.find_one({"_id": user_id})
        if not user:
            # Create new user with default cash
            default_user = {
                "_id": user_id,
                "cash": 10000.0,  # Default starting cash
                "holdings": [],
                "created_at": datetime.utcnow(),
                "starting_cash": 10000.0
            }
            await db.users.insert_one(default_user)
            return Portfolio(
                user_id=user_id,
                cash=10000.0,
                holdings=[],
                total_value=10000.0,
                portfolio_value=0.0,
                total_return=0.0,
                total_return_percent=0.0
            )
        
        cash = user.get("cash", 0.0)
        holdings_data = user.get("holdings", [])
        starting_cash = user.get("starting_cash", 10000.0)
        
        # Calculate current portfolio values
        portfolio_calc = calculate_portfolio_value(holdings_data)
        updated_holdings = portfolio_calc['holdings']
        portfolio_value = portfolio_calc['total_value']
        total_value = cash + portfolio_value
        
        # Calculate total return
        total_return = total_value - starting_cash
        total_return_percent = (total_return / starting_cash) * 100 if starting_cash > 0 else 0
        
        # Convert to Holding objects
        holdings = [
            Holding(
                symbol=h['symbol'],
                quantity=h['quantity'],
                avg_price=h['avg_price'],
                current_price=h.get('current_price', 0.0),
                market_value=h.get('market_value', 0.0),
                unrealized_pnl=h.get('unrealized_pnl', 0.0),
                unrealized_pnl_percent=h.get('unrealized_pnl_percent', 0.0)
            ) for h in updated_holdings
        ]
        
        return Portfolio(
            user_id=user_id,
            cash=cash,
            holdings=holdings,
            total_value=total_value,
            portfolio_value=portfolio_value,
            total_return=total_return,
            total_return_percent=total_return_percent
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching portfolio: {str(e)}")

# Endpoint: Place order (Direct execution - STP)
@router.post("/orders")
async def place_order(order: OrderRequest):
    """Place order with immediate execution (Straight-Through Processing)"""
    try:
        # Validate user exists
        user = await db.users.find_one({"_id": order.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get current market price if no price specified
        current_price = order.price if order.price else get_current_price(order.symbol)
        
        # Validate order
        validation_error = validate_order_request(order, user)
        if validation_error:
            raise HTTPException(status_code=400, detail=validation_error)
        
        cash = user.get("cash", 0.0)
        holdings = user.get("holdings", [])
        
        if order.side.lower() == "buy":
            # Validate sufficient cash
            total_cost = order.quantity * current_price
            if cash < total_cost:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient cash. Need ${total_cost:.2f}, have ${cash:.2f}"
                )
            
            # Deduct cash
            new_cash = cash - total_cost
            
            # Update holdings
            found = False
            for holding in holdings:
                if holding["symbol"] == order.symbol:
                    # Calculate weighted average price
                    total_qty = holding["quantity"] + order.quantity
                    total_cost_existing = holding["avg_price"] * holding["quantity"]
                    total_cost_new = current_price * order.quantity
                    new_avg_price = (total_cost_existing + total_cost_new) / total_qty
                    
                    holding["quantity"] = total_qty
                    holding["avg_price"] = new_avg_price
                    found = True
                    break
            
            if not found:
                holdings.append({
                    "symbol": order.symbol,
                    "quantity": order.quantity,
                    "avg_price": current_price
                })
            
            # Update user
            await db.users.update_one(
                {"_id": order.user_id},
                {"$set": {"cash": new_cash, "holdings": holdings}}
            )
            
        elif order.side.lower() == "sell":
            # Find holding
            holding_found = None
            holding_index = -1
            for i, holding in enumerate(holdings):
                if holding["symbol"] == order.symbol:
                    holding_found = holding
                    holding_index = i
                    break
            
            if not holding_found:
                raise HTTPException(
                    status_code=400, 
                    detail=f"No shares of {order.symbol} to sell"
                )
            
            if holding_found["quantity"] < order.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough shares to sell. Have {holding_found['quantity']}, trying to sell {order.quantity}"
                )
            
            # Calculate proceeds
            proceeds = order.quantity * current_price
            new_cash = cash + proceeds
            
            # Update holding
            holdings[holding_index]["quantity"] -= order.quantity
            
            # Remove holding if quantity becomes zero
            if holdings[holding_index]["quantity"] <= 0:
                holdings.pop(holding_index)
            
            # Update user
            await db.users.update_one(
                {"_id": order.user_id},
                {"$set": {"cash": new_cash, "holdings": holdings}}
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid order side. Use 'buy' or 'sell'")
        
        # Record order in history
        order_record = {
            "user_id": order.user_id,
            "symbol": order.symbol,
            "side": order.side.lower(),
            "quantity": order.quantity,
            "price": current_price,
            "timestamp": datetime.utcnow(),
            "status": "filled",
            "order_type": order.order_type
        }
        
        result = await db.orders.insert_one(order_record)
        order_record["id"] = str(result.inserted_id)
        order_record = fix_objectid(order_record)
        
        return {
            "message": f"Order executed successfully",
            "order": order_record,
            "executed_price": current_price,
            "total_amount": order.quantity * current_price
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order execution failed: {str(e)}")

# Endpoint: Get order history
@router.get("/orders/user/{user_id}")
async def get_order_history(user_id: str):
    """Get user's order history"""
    try:
        orders = await db.orders.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).to_list(length=100)
        
        # Fix ObjectIds
        for order in orders:
            order = fix_objectid(order)
            
        return {"orders": orders}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching orders: {str(e)}")

# Endpoint: Get portfolio performance
@router.get("/portfolio/performance/{user_id}")
async def get_portfolio_performance(user_id: str):
    """Get portfolio performance metrics"""
    try:
        user = await db.users.find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        cash = user.get("cash", 0.0)
        holdings = user.get("holdings", [])
        
        # Calculate current values
        portfolio_calc = calculate_portfolio_value(holdings)
        current_portfolio_value = portfolio_calc['total_value']
        total_value = cash + current_portfolio_value
        
        # Get order history for realized P&L calculation
        orders = await db.orders.find({"user_id": user_id}).to_list(length=1000)
        
        # Calculate realized P&L (simplified)
        realized_pnl = 0.0
        buy_values = {}
        
        for order in orders:
            symbol = order['symbol']
            if order['side'] == 'buy':
                if symbol not in buy_values:
                    buy_values[symbol] = {'total_cost': 0, 'total_qty': 0}
                buy_values[symbol]['total_cost'] += order['quantity'] * order['price']
                buy_values[symbol]['total_qty'] += order['quantity']
            elif order['side'] == 'sell':
                if symbol in buy_values and buy_values[symbol]['total_qty'] > 0:
                    avg_buy_price = buy_values[symbol]['total_cost'] / buy_values[symbol]['total_qty']
                    realized_pnl += (order['price'] - avg_buy_price) * order['quantity']
                    
                    # Update buy values
                    sold_cost = avg_buy_price * order['quantity']
                    buy_values[symbol]['total_cost'] -= sold_cost
                    buy_values[symbol]['total_qty'] -= order['quantity']
        
        # Calculate unrealized P&L
        unrealized_pnl = sum(h.get('unrealized_pnl', 0) for h in portfolio_calc['holdings'])
        
        # Starting value assumption (can be enhanced)
        starting_value = 10000.0  # Default starting cash
        total_pnl = realized_pnl + unrealized_pnl
        total_return_percent = (total_pnl / starting_value) * 100 if starting_value > 0 else 0
        
        return {
            "total_value": total_value,
            "cash": cash,
            "portfolio_value": current_portfolio_value,
            "realized_pnl": realized_pnl,
            "unrealized_pnl": unrealized_pnl,
            "total_pnl": total_pnl,
            "total_return_percent": total_return_percent,
            "holdings_count": len(holdings)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating performance: {str(e)}")
