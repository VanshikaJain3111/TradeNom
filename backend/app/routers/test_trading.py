from fastapi import APIRouter, HTTPException
from app.database import db
from app.schemas import TestTrade
from datetime import datetime
from typing import Optional
import pandas as pd
from pathlib import Path

router = APIRouter()

# Data directory for price data
DATA_DIR = Path("d:/Projects/ProjectTrade-main/ProjectTrade-main/data/simulation_price_data_July_1-Aug_30")

def get_current_price(symbol: str) -> float:
    """Get current price from CSV data (last available price)"""
    try:
        csv_path = DATA_DIR / f"simulated_{symbol}_live.csv"
        if csv_path.exists():
            df = pd.read_csv(csv_path)
            return float(df['close'].iloc[-1])
        else:
            fallback_prices = {
                'AAPL': 220.0, 'GOOG': 2800.0, 'MSFT': 420.0, 
                'TSLA': 250.0, 'WMT': 165.0, 'UL': 48.0, 'IBM': 190.0
            }
            return fallback_prices.get(symbol, 100.0)
    except Exception:
        return 100.0

def fix_objectid(doc):
    if doc and '_id' in doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
    return doc

@router.post("/")
async def place_test_trade(trade: TestTrade):
    """Place a test trade (paper trading)"""
    try:
        # Get current price
        current_price = get_current_price(trade.symbol)
        
        # Get or create test portfolio
        test_portfolio = await db.test_portfolios.find_one({"user_id": trade.user_id})
        if not test_portfolio:
            # Create new test portfolio with virtual cash
            test_portfolio = {
                "user_id": trade.user_id,
                "cash": 100000.0,  # Virtual starting cash
                "holdings": [],
                "created_at": datetime.utcnow()
            }
            await db.test_portfolios.insert_one(test_portfolio)
        
        cash = test_portfolio.get("cash", 0.0)
        holdings = test_portfolio.get("holdings", [])
        
        if trade.side.lower() == "buy":
            total_cost = trade.quantity * current_price
            if cash < total_cost:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient virtual cash. Need ${total_cost:.2f}, have ${cash:.2f}"
                )
            
            # Deduct cash
            new_cash = cash - total_cost
            
            # Update holdings
            found = False
            for holding in holdings:
                if holding["symbol"] == trade.symbol:
                    total_qty = holding["quantity"] + trade.quantity
                    total_cost_existing = holding["avg_price"] * holding["quantity"]
                    total_cost_new = current_price * trade.quantity
                    new_avg_price = (total_cost_existing + total_cost_new) / total_qty
                    
                    holding["quantity"] = total_qty
                    holding["avg_price"] = new_avg_price
                    found = True
                    break
            
            if not found:
                holdings.append({
                    "symbol": trade.symbol,
                    "quantity": trade.quantity,
                    "avg_price": current_price
                })
            
            await db.test_portfolios.update_one(
                {"user_id": trade.user_id},
                {"$set": {"cash": new_cash, "holdings": holdings}}
            )
            
        elif trade.side.lower() == "sell":
            # Find holding
            holding_found = None
            holding_index = -1
            for i, holding in enumerate(holdings):
                if holding["symbol"] == trade.symbol:
                    holding_found = holding
                    holding_index = i
                    break
            
            if not holding_found:
                raise HTTPException(
                    status_code=400, 
                    detail=f"No virtual shares of {trade.symbol} to sell"
                )
            
            if holding_found["quantity"] < trade.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Not enough virtual shares to sell. Have {holding_found['quantity']}, trying to sell {trade.quantity}"
                )
            
            proceeds = trade.quantity * current_price
            new_cash = cash + proceeds
            
            holdings[holding_index]["quantity"] -= trade.quantity
            
            if holdings[holding_index]["quantity"] <= 0:
                holdings.pop(holding_index)
            
            await db.test_portfolios.update_one(
                {"user_id": trade.user_id},
                {"$set": {"cash": new_cash, "holdings": holdings}}
            )
        
        # Record test trade
        trade_dict = trade.dict()
        trade_dict["created_at"] = datetime.utcnow()
        trade_dict["status"] = "filled"
        trade_dict["executed_price"] = current_price
        
        result = await db.test_trades.insert_one(trade_dict)
        trade_dict["id"] = str(result.inserted_id)
        trade_dict = fix_objectid(trade_dict)
        
        return {
            "msg": "Test trade executed successfully", 
            "trade": trade_dict,
            "executed_price": current_price
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test trade execution failed: {str(e)}")

@router.get("/user/{user_id}")
async def get_test_trades(user_id: str):
    """Get user's test trading history"""
    try:
        trades = await db.test_trades.find(
            {"user_id": user_id}
        ).sort("created_at", -1).to_list(100)
        
        for trade in trades:
            trade = fix_objectid(trade)
            
        return {"trades": trades}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching test trades: {str(e)}")

@router.get("/portfolio/{user_id}")
async def get_test_portfolio(user_id: str):
    """Get user's test portfolio with current values"""
    try:
        test_portfolio = await db.test_portfolios.find_one({"user_id": user_id})
        if not test_portfolio:
            # Create default test portfolio
            test_portfolio = {
                "user_id": user_id,
                "cash": 100000.0,
                "holdings": [],
                "created_at": datetime.utcnow()
            }
            await db.test_portfolios.insert_one(test_portfolio)
        
        cash = test_portfolio.get("cash", 100000.0)
        holdings = test_portfolio.get("holdings", [])
        
        # Calculate current values
        total_portfolio_value = 0.0
        updated_holdings = []
        
        for holding in holdings:
            current_price = get_current_price(holding['symbol'])
            market_value = holding['quantity'] * current_price
            unrealized_pnl = (current_price - holding['avg_price']) * holding['quantity']
            
            updated_holding = {
                **holding,
                'current_price': current_price,
                'market_value': market_value,
                'unrealized_pnl': unrealized_pnl
            }
            updated_holdings.append(updated_holding)
            total_portfolio_value += market_value
        
        total_value = cash + total_portfolio_value
        
        return {
            "user_id": user_id,
            "cash": cash,
            "holdings": updated_holdings,
            "portfolio_value": total_portfolio_value,
            "total_value": total_value,
            "is_test_portfolio": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching test portfolio: {str(e)}")

@router.get("/performance/{user_id}")
async def get_test_performance(user_id: str):
    """Get test portfolio performance metrics"""
    try:
        test_portfolio = await db.test_portfolios.find_one({"user_id": user_id})
        if not test_portfolio:
            return {
                "total_value": 100000.0,
                "starting_value": 100000.0,
                "total_return": 0.0,
                "total_return_percent": 0.0,
                "realized_pnl": 0.0,
                "unrealized_pnl": 0.0
            }
        
        cash = test_portfolio.get("cash", 100000.0)
        holdings = test_portfolio.get("holdings", [])
        
        # Calculate current portfolio value
        total_portfolio_value = 0.0
        unrealized_pnl = 0.0
        
        for holding in holdings:
            current_price = get_current_price(holding['symbol'])
            market_value = holding['quantity'] * current_price
            holding_pnl = (current_price - holding['avg_price']) * holding['quantity']
            
            total_portfolio_value += market_value
            unrealized_pnl += holding_pnl
        
        total_value = cash + total_portfolio_value
        starting_value = 100000.0  # Virtual starting cash
        total_return = total_value - starting_value
        total_return_percent = (total_return / starting_value) * 100
        
        # Calculate realized P&L from trade history
        trades = await db.test_trades.find({"user_id": user_id}).to_list(1000)
        realized_pnl = 0.0
        buy_values = {}
        
        for trade in trades:
            symbol = trade['symbol']
            if trade['side'] == 'buy':
                if symbol not in buy_values:
                    buy_values[symbol] = {'total_cost': 0, 'total_qty': 0}
                price = trade.get('executed_price', trade.get('price', 0))
                buy_values[symbol]['total_cost'] += trade['quantity'] * price
                buy_values[symbol]['total_qty'] += trade['quantity']
            elif trade['side'] == 'sell':
                if symbol in buy_values and buy_values[symbol]['total_qty'] > 0:
                    avg_buy_price = buy_values[symbol]['total_cost'] / buy_values[symbol]['total_qty']
                    price = trade.get('executed_price', trade.get('price', 0))
                    realized_pnl += (price - avg_buy_price) * trade['quantity']
                    
                    sold_cost = avg_buy_price * trade['quantity']
                    buy_values[symbol]['total_cost'] -= sold_cost
                    buy_values[symbol]['total_qty'] -= trade['quantity']
        
        return {
            "total_value": total_value,
            "starting_value": starting_value,
            "total_return": total_return,
            "total_return_percent": total_return_percent,
            "realized_pnl": realized_pnl,
            "unrealized_pnl": unrealized_pnl,
            "cash": cash,
            "portfolio_value": total_portfolio_value,
            "number_of_trades": len(trades),
            "holdings_count": len(holdings)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating test performance: {str(e)}")
