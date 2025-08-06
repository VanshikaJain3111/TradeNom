from fastapi import APIRouter, HTTPException, Query
from app.database import db
from app.schemas import Report
from datetime import datetime, timedelta
from typing import Optional, List
import pandas as pd
from pathlib import Path
from fastapi.responses import StreamingResponse
import io
import csv
from bson import ObjectId

router = APIRouter()

DATA_DIR = Path("d:/Projects/ProjectTrade-main/ProjectTrade-main/data/simulation_price_data_July_1-Aug_30")

def get_current_price(symbol: str) -> float:
    """Get current price from CSV data"""
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

def get_user_by_id(user_id: str):
    """Try to find user by both ObjectId and string formats"""
    try:
        # Try as ObjectId first
        return db.users.find_one({"_id": ObjectId(user_id)})
    except:
        # If that fails, try as string
        return db.users.find_one({"_id": user_id})

@router.get("/user/{user_id}")
async def get_reports(user_id: str):
    """Get user's saved reports"""
    try:
        reports = await db.reports.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
        for report in reports:
            report = fix_objectid(report)
        return {"reports": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reports: {str(e)}")

@router.post("/")
async def create_report(report: Report):
    """Create a new report"""
    try:
        report_dict = report.dict()
        report_dict["created_at"] = datetime.utcnow()
        result = await db.reports.insert_one(report_dict)
        report_dict["id"] = str(result.inserted_id)
        report_dict = fix_objectid(report_dict)
        return {"msg": "Report created", "report": report_dict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating report: {str(e)}")

@router.get("/trade-history/{user_id}")
async def get_trade_history_report(
    user_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    symbol: Optional[str] = Query(None, description="Filter by symbol")
):
    """Generate trade history report"""
    try:
        # Build query
        query = {"user_id": user_id}
        
        # Add date filter
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = datetime.fromisoformat(start_date)
            if end_date:
                date_filter["$lte"] = datetime.fromisoformat(end_date + "T23:59:59")
            # Check both timestamp and created_at fields since orders might use either
            query["$or"] = [
                {"timestamp": date_filter},
                {"created_at": date_filter}
            ]
        
        # Add symbol filter
        if symbol:
            query["symbol"] = symbol.upper()
        
        # Get orders
        orders = await db.orders.find(query).sort("timestamp", -1).to_list(1000)
        
        # Process orders for report
        trade_history = []
        total_buy_value = 0.0
        total_sell_value = 0.0
        
        for order in orders:
            order = fix_objectid(order)
            trade_value = order['quantity'] * order['price']
            
            # Get timestamp - check both possible fields
            timestamp = order.get('timestamp') or order.get('created_at')
            
            if order['side'] == 'buy':
                total_buy_value += trade_value
            else:
                total_sell_value += trade_value
            
            trade_history.append({
                "id": order.get('id'),
                "timestamp": timestamp,
                "symbol": order['symbol'],
                "side": order['side'],
                "quantity": order['quantity'],
                "price": order['price'],
                "total_value": trade_value,
                "status": order.get('status', 'filled')
            })
        
        summary = {
            "total_trades": len(trade_history),
            "total_buy_value": total_buy_value,
            "total_sell_value": total_sell_value,
            "net_trading_value": total_buy_value - total_sell_value,
            "symbols_traded": len(set(order['symbol'] for order in orders)),
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }
        
        return {
            "trade_history": trade_history,
            "summary": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trade history: {str(e)}")

@router.get("/portfolio-performance/{user_id}")
async def get_portfolio_performance_report(user_id: str):
    """Generate comprehensive portfolio performance report"""
    try:
        # Get current portfolio
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        cash = user.get("cash", 0.0)
        holdings = user.get("holdings", [])
        
        # Calculate current values
        portfolio_positions = []
        total_current_value = 0.0
        total_unrealized_pnl = 0.0
        
        for holding in holdings:
            current_price = get_current_price(holding['symbol'])
            market_value = holding['quantity'] * current_price
            cost_basis = holding['quantity'] * holding['avg_price']
            unrealized_pnl = market_value - cost_basis
            unrealized_pnl_percent = (unrealized_pnl / cost_basis) * 100 if cost_basis > 0 else 0
            
            portfolio_positions.append({
                "symbol": holding['symbol'],
                "quantity": holding['quantity'],
                "avg_price": holding['avg_price'],
                "current_price": current_price,
                "cost_basis": cost_basis,
                "market_value": market_value,
                "unrealized_pnl": unrealized_pnl,
                "unrealized_pnl_percent": unrealized_pnl_percent,
                "weight_percent": 0  # Will calculate after total
            })
            
            total_current_value += market_value
            total_unrealized_pnl += unrealized_pnl
        
        # Calculate position weights
        for position in portfolio_positions:
            if total_current_value > 0:
                position["weight_percent"] = (position["market_value"] / total_current_value) * 100
        
        # Get order history for realized P&L
        orders = await db.orders.find({"user_id": user_id}).to_list(1000)
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
                    
                    sold_cost = avg_buy_price * order['quantity']
                    buy_values[symbol]['total_cost'] -= sold_cost
                    buy_values[symbol]['total_qty'] -= order['quantity']
        
        # Calculate overall performance
        total_value = cash + total_current_value
        starting_value = 10000.0  # Default starting cash
        total_return = total_value - starting_value
        total_return_percent = (total_return / starting_value) * 100 if starting_value > 0 else 0
        
        performance_summary = {
            "total_value": total_value,
            "cash": cash,
            "portfolio_value": total_current_value,
            "starting_value": starting_value,
            "total_return": total_return,
            "total_return_percent": total_return_percent,
            "realized_pnl": realized_pnl,
            "unrealized_pnl": total_unrealized_pnl,
            "total_pnl": realized_pnl + total_unrealized_pnl,
            "number_of_positions": len(portfolio_positions),
            "largest_position": max(portfolio_positions, key=lambda x: x['market_value']) if portfolio_positions else None,
            "best_performer": max(portfolio_positions, key=lambda x: x['unrealized_pnl_percent']) if portfolio_positions else None,
            "worst_performer": min(portfolio_positions, key=lambda x: x['unrealized_pnl_percent']) if portfolio_positions else None
        }
        
        return {
            "performance_summary": performance_summary,
            "portfolio_positions": portfolio_positions,
            "generation_time": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating performance report: {str(e)}")

@router.get("/pnl-statement/{user_id}")
async def get_pnl_statement(
    user_id: str,
    period: str = Query("month", description="Period: week, month, quarter, year")
):
    """Generate P&L statement for specified period"""
    try:
        # Calculate date range based on period
        end_date = datetime.utcnow()
        if period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)  # Default to month
        
        # Get orders in period - handle both timestamp and created_at fields
        orders = await db.orders.find({
            "user_id": user_id,
            "$or": [
                {"timestamp": {"$gte": start_date, "$lte": end_date}},
                {"created_at": {"$gte": start_date, "$lte": end_date}}
            ]
        }).to_list(1000)
        
        # Calculate realized P&L for the period
        realized_trades = []
        period_realized_pnl = 0.0
        buy_values = {}
        
        # Get all orders to build cost basis - handle both timestamp fields
        all_orders = await db.orders.find({"user_id": user_id}).to_list(5000)
        
        for order in all_orders:
            symbol = order['symbol']
            # Get order date - check both possible fields
            order_date = order.get('timestamp') or order.get('created_at')
            
            if order['side'] == 'buy':
                if symbol not in buy_values:
                    buy_values[symbol] = {'total_cost': 0, 'total_qty': 0}
                buy_values[symbol]['total_cost'] += order['quantity'] * order['price']
                buy_values[symbol]['total_qty'] += order['quantity']
                
            elif order['side'] == 'sell':
                if symbol in buy_values and buy_values[symbol]['total_qty'] > 0:
                    avg_buy_price = buy_values[symbol]['total_cost'] / buy_values[symbol]['total_qty']
                    trade_pnl = (order['price'] - avg_buy_price) * order['quantity']
                    
                    # Only include in period P&L if sell was in the period
                    if order_date >= start_date:
                        period_realized_pnl += trade_pnl
                        realized_trades.append({
                            "symbol": symbol,
                            "quantity": order['quantity'],
                            "sell_price": order['price'],
                            "avg_buy_price": avg_buy_price,
                            "pnl": trade_pnl,
                            "timestamp": order_date
                        })
                    
                    # Update buy values
                    sold_cost = avg_buy_price * order['quantity']
                    buy_values[symbol]['total_cost'] -= sold_cost
                    buy_values[symbol]['total_qty'] -= order['quantity']
        
        # Get current unrealized P&L
        user = await get_user_by_id(user_id)
        holdings = user.get("holdings", []) if user else []
        
        unrealized_pnl = 0.0
        unrealized_positions = []
        
        for holding in holdings:
            current_price = get_current_price(holding['symbol'])
            position_pnl = (current_price - holding['avg_price']) * holding['quantity']
            unrealized_pnl += position_pnl
            
            unrealized_positions.append({
                "symbol": holding['symbol'],
                "quantity": holding['quantity'],
                "avg_price": holding['avg_price'],
                "current_price": current_price,
                "unrealized_pnl": position_pnl
            })
        
        # Calculate trading metrics for the period
        period_orders = [o for o in orders]
        trading_volume = sum(o['quantity'] * o['price'] for o in period_orders)
        buy_volume = sum(o['quantity'] * o['price'] for o in period_orders if o['side'] == 'buy')
        sell_volume = sum(o['quantity'] * o['price'] for o in period_orders if o['side'] == 'sell')
        
        # Create symbol breakdown for P&L
        symbol_breakdown = []
        symbol_pnl = {}
        
        # Add realized P&L by symbol
        for trade in realized_trades:
            symbol = trade['symbol']
            if symbol not in symbol_pnl:
                symbol_pnl[symbol] = {'realized_pnl': 0, 'unrealized_pnl': 0, 'trades_count': 0}
            symbol_pnl[symbol]['realized_pnl'] += trade['pnl']
            symbol_pnl[symbol]['trades_count'] += 1
        
        # Add unrealized P&L by symbol
        for position in unrealized_positions:
            symbol = position['symbol']
            if symbol not in symbol_pnl:
                symbol_pnl[symbol] = {'realized_pnl': 0, 'unrealized_pnl': 0, 'trades_count': 0}
            symbol_pnl[symbol]['unrealized_pnl'] += position['unrealized_pnl']
        
        # Convert to list format
        for symbol, pnl_data in symbol_pnl.items():
            symbol_breakdown.append({
                'symbol': symbol,
                'realized_pnl': pnl_data['realized_pnl'],
                'unrealized_pnl': pnl_data['unrealized_pnl'],
                'total_pnl': pnl_data['realized_pnl'] + pnl_data['unrealized_pnl'],
                'trades_count': pnl_data['trades_count']
            })
        
        pnl_statement = {
            "period": period,
            "start_date": start_date,
            "end_date": end_date,
            "realized_pnl": period_realized_pnl,
            "unrealized_pnl": unrealized_pnl,
            "total_pnl": period_realized_pnl + unrealized_pnl,
            "trading_metrics": {
                "total_trades": len(period_orders),
                "trading_volume": trading_volume,
                "buy_volume": buy_volume,
                "sell_volume": sell_volume,
                "net_flow": buy_volume - sell_volume
            },
            "realized_trades": realized_trades,
            "unrealized_positions": unrealized_positions,
            "symbol_breakdown": symbol_breakdown
        }
        
        return pnl_statement
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating P&L statement: {str(e)}")

@router.get("/export/trade-history/{user_id}")
async def export_trade_history_csv(user_id: str):
    """Export trade history as CSV"""
    try:
        orders = await db.orders.find({"user_id": user_id}).to_list(5000)
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'Date', 'Time', 'Symbol', 'Side', 'Quantity', 'Price', 'Total Value', 'Status'
        ])
        
        # Data rows
        for order in orders:
            # Get timestamp - check both possible fields
            timestamp = order.get('timestamp') or order.get('created_at')
            if timestamp:
                total_value = order['quantity'] * order['price']
                writer.writerow([
                    timestamp.strftime('%Y-%m-%d'),
                    timestamp.strftime('%H:%M:%S'),
                    order['symbol'],
                    order['side'].upper(),
                    order['quantity'],
                    f"${order['price']:.2f}",
                    f"${total_value:.2f}",
                    order.get('status', 'filled').upper()
                ])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=trade_history_{user_id}_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting trade history: {str(e)}")

@router.get("/export/portfolio-performance/{user_id}")
async def export_portfolio_performance_csv(user_id: str):
    """Export portfolio performance as CSV"""
    try:
        # Get portfolio performance data
        performance_data = await get_portfolio_performance_report(user_id)
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header for summary
        writer.writerow(['Portfolio Performance Summary'])
        writer.writerow(['Metric', 'Value'])
        
        summary = performance_data['performance_summary']
        writer.writerow(['Total Value', f"${summary['total_value']:.2f}"])
        writer.writerow(['Cash', f"${summary['cash']:.2f}"])
        writer.writerow(['Portfolio Value', f"${summary['portfolio_value']:.2f}"])
        writer.writerow(['Total Return', f"${summary['total_return']:.2f}"])
        writer.writerow(['Total Return %', f"{summary['total_return_percent']:.2f}%"])
        writer.writerow(['Realized P&L', f"${summary['realized_pnl']:.2f}"])
        writer.writerow(['Unrealized P&L', f"${summary['unrealized_pnl']:.2f}"])
        writer.writerow(['Total P&L', f"${summary['total_pnl']:.2f}"])
        writer.writerow([])  # Empty row
        
        # Header for positions
        writer.writerow(['Current Positions'])
        writer.writerow([
            'Symbol', 'Quantity', 'Avg Price', 'Current Price', 
            'Cost Basis', 'Market Value', 'Unrealized P&L', 'Return %', 'Weight %'
        ])
        
        # Position rows
        for position in performance_data['portfolio_positions']:
            writer.writerow([
                position['symbol'],
                position['quantity'],
                f"${position['avg_price']:.2f}",
                f"${position['current_price']:.2f}",
                f"${position['cost_basis']:.2f}",
                f"${position['market_value']:.2f}",
                f"${position['unrealized_pnl']:.2f}",
                f"{position['unrealized_pnl_percent']:.2f}%",
                f"{position['weight_percent']:.2f}%"
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=portfolio_performance_{user_id}_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting portfolio performance: {str(e)}")

@router.get("/export/pnl-statement/{user_id}")
async def export_pnl_statement_csv(
    user_id: str,
    period: str = Query("month", description="Period: week, month, quarter, year")
):
    """Export P&L statement as CSV"""
    try:
        # Get P&L statement data
        pnl_data = await get_pnl_statement(user_id, period)
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([f'P&L Statement - {period.title()}'])
        writer.writerow(['Period', f"{pnl_data['start_date'].strftime('%Y-%m-%d')} to {pnl_data['end_date'].strftime('%Y-%m-%d')}"])
        writer.writerow([])
        
        # Summary
        writer.writerow(['Summary'])
        writer.writerow(['Metric', 'Value'])
        writer.writerow(['Realized P&L', f"${pnl_data['realized_pnl']:.2f}"])
        writer.writerow(['Unrealized P&L', f"${pnl_data['unrealized_pnl']:.2f}"])
        writer.writerow(['Total P&L', f"${pnl_data['total_pnl']:.2f}"])
        writer.writerow([])
        
        # Trading metrics
        metrics = pnl_data['trading_metrics']
        writer.writerow(['Trading Metrics'])
        writer.writerow(['Total Trades', metrics['total_trades']])
        writer.writerow(['Trading Volume', f"${metrics['trading_volume']:.2f}"])
        writer.writerow(['Buy Volume', f"${metrics['buy_volume']:.2f}"])
        writer.writerow(['Sell Volume', f"${metrics['sell_volume']:.2f}"])
        writer.writerow(['Net Flow', f"${metrics['net_flow']:.2f}"])
        writer.writerow([])
        
        # Realized trades
        if pnl_data['realized_trades']:
            writer.writerow(['Realized Trades'])
            writer.writerow(['Date', 'Symbol', 'Quantity', 'Sell Price', 'Avg Buy Price', 'P&L'])
            for trade in pnl_data['realized_trades']:
                writer.writerow([
                    trade['timestamp'].strftime('%Y-%m-%d'),
                    trade['symbol'],
                    trade['quantity'],
                    f"${trade['sell_price']:.2f}",
                    f"${trade['avg_buy_price']:.2f}",
                    f"${trade['pnl']:.2f}"
                ])
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=pnl_statement_{period}_{user_id}_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting P&L statement: {str(e)}")
