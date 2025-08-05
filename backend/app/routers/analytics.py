from fastapi import APIRouter, HTTPException, Query
from app.schemas import AnalyticsRequest
from typing import Optional, List
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

router = APIRouter()

# Data directory for price data
DATA_DIR = Path("d:/Projects/ProjectTrade-main/ProjectTrade-main/data/simulation_price_data_July_1-Aug_30")

def load_stock_data(symbol: str) -> pd.DataFrame:
    """Load stock data from CSV"""
    try:
        csv_path = DATA_DIR / f"simulated_{symbol}_live.csv"
        if csv_path.exists():
            df = pd.read_csv(csv_path, parse_dates=['timestamp'])
            df = df.sort_values('timestamp')
            return df
        else:
            raise FileNotFoundError(f"Data file for {symbol} not found")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not load data for {symbol}: {str(e)}")

def calculate_sma(data: pd.Series, window: int) -> pd.Series:
    """Calculate Simple Moving Average"""
    return data.rolling(window=window).mean()

def calculate_ema(data: pd.Series, window: int) -> pd.Series:
    """Calculate Exponential Moving Average"""
    return data.ewm(span=window).mean()

def calculate_rsi(data: pd.Series, window: int = 14) -> pd.Series:
    """Calculate Relative Strength Index"""
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_macd(data: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """Calculate MACD (Moving Average Convergence Divergence)"""
    ema_fast = calculate_ema(data, fast)
    ema_slow = calculate_ema(data, slow)
    macd_line = ema_fast - ema_slow
    signal_line = calculate_ema(macd_line, signal)
    histogram = macd_line - signal_line
    return {
        'macd': macd_line,
        'signal': signal_line,
        'histogram': histogram
    }

def calculate_bollinger_bands(data: pd.Series, window: int = 20, num_std: float = 2):
    """Calculate Bollinger Bands"""
    sma = calculate_sma(data, window)
    std = data.rolling(window=window).std()
    upper_band = sma + (std * num_std)
    lower_band = sma - (std * num_std)
    return {
        'upper': upper_band,
        'middle': sma,
        'lower': lower_band
    }

def calculate_volatility(data: pd.Series, window: int = 20) -> pd.Series:
    """Calculate rolling volatility"""
    returns = data.pct_change()
    return returns.rolling(window=window).std() * np.sqrt(252)  # Annualized

@router.post("/")
async def get_analytics(request: AnalyticsRequest):
    """Get technical analytics for a stock"""
    try:
        # Load data
        df = load_stock_data(request.symbol)
        
        # Filter by date range if provided
        if request.start_date:
            start = pd.to_datetime(request.start_date)
            df = df[df['timestamp'] >= start]
        if request.end_date:
            end = pd.to_datetime(request.end_date)
            df = df[df['timestamp'] <= end]
        
        if df.empty:
            raise HTTPException(status_code=400, detail="No data available for the specified date range")
        
        results = {
            "symbol": request.symbol,
            "data_points": len(df),
            "date_range": {
                "start": df['timestamp'].min().isoformat(),
                "end": df['timestamp'].max().isoformat()
            },
            "indicators": {}
        }
        
        # Calculate requested indicators
        close_prices = df['close']
        
        for indicator in request.indicators:
            indicator = indicator.upper()
            
            if indicator == "SMA":
                results["indicators"]["SMA"] = {
                    "sma_10": calculate_sma(close_prices, 10).iloc[-1] if len(df) >= 10 else None,
                    "sma_20": calculate_sma(close_prices, 20).iloc[-1] if len(df) >= 20 else None,
                    "sma_50": calculate_sma(close_prices, 50).iloc[-1] if len(df) >= 50 else None,
                    "current_price": close_prices.iloc[-1]
                }
                
            elif indicator == "EMA":
                results["indicators"]["EMA"] = {
                    "ema_10": calculate_ema(close_prices, 10).iloc[-1] if len(df) >= 10 else None,
                    "ema_20": calculate_ema(close_prices, 20).iloc[-1] if len(df) >= 20 else None,
                    "ema_50": calculate_ema(close_prices, 50).iloc[-1] if len(df) >= 50 else None,
                    "current_price": close_prices.iloc[-1]
                }
                
            elif indicator == "RSI":
                rsi_values = calculate_rsi(close_prices)
                results["indicators"]["RSI"] = {
                    "current_rsi": rsi_values.iloc[-1] if not rsi_values.empty else None,
                    "interpretation": "Overbought" if rsi_values.iloc[-1] > 70 else "Oversold" if rsi_values.iloc[-1] < 30 else "Neutral"
                }
                
            elif indicator == "MACD":
                macd_data = calculate_macd(close_prices)
                results["indicators"]["MACD"] = {
                    "macd": macd_data['macd'].iloc[-1] if not macd_data['macd'].empty else None,
                    "signal": macd_data['signal'].iloc[-1] if not macd_data['signal'].empty else None,
                    "histogram": macd_data['histogram'].iloc[-1] if not macd_data['histogram'].empty else None,
                    "trend": "Bullish" if macd_data['macd'].iloc[-1] > macd_data['signal'].iloc[-1] else "Bearish"
                }
                
            elif indicator == "BOLLINGER":
                bb_data = calculate_bollinger_bands(close_prices)
                current_price = close_prices.iloc[-1]
                upper = bb_data['upper'].iloc[-1]
                lower = bb_data['lower'].iloc[-1]
                
                results["indicators"]["BOLLINGER"] = {
                    "upper_band": upper,
                    "middle_band": bb_data['middle'].iloc[-1],
                    "lower_band": lower,
                    "current_price": current_price,
                    "position": "Above Upper" if current_price > upper else "Below Lower" if current_price < lower else "Within Bands"
                }
                
            elif indicator == "VOLATILITY":
                vol = calculate_volatility(close_prices)
                results["indicators"]["VOLATILITY"] = {
                    "annualized_volatility": vol.iloc[-1] if not vol.empty else None,
                    "interpretation": "High" if vol.iloc[-1] > 0.3 else "Low" if vol.iloc[-1] < 0.15 else "Medium"
                }
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating analytics: {str(e)}")

@router.get("/stock-list")
async def get_available_stocks():
    """Get list of stocks available for analysis"""
    stocks = [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "GOOG", "name": "Alphabet Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corporation"},
        {"symbol": "TSLA", "name": "Tesla Inc."},
        {"symbol": "WMT", "name": "Walmart Inc."},
        {"symbol": "UL", "name": "Unilever PLC"},
        {"symbol": "IBM", "name": "IBM Corporation"}
    ]
    return {"stocks": stocks}

@router.get("/price-data/{symbol}")
async def get_price_data(
    symbol: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: Optional[int] = Query(1000, description="Maximum number of data points")
):
    """Get historical price data for charting"""
    try:
        df = load_stock_data(symbol)
        
        # Filter by date range
        if start_date:
            start = pd.to_datetime(start_date)
            df = df[df['timestamp'] >= start]
        if end_date:
            end = pd.to_datetime(end_date)
            df = df[df['timestamp'] <= end]
        
        # Limit data points
        if len(df) > limit:
            df = df.tail(limit)
        
        # Convert to list of dictionaries
        price_data = []
        for _, row in df.iterrows():
            price_data.append({
                "timestamp": row['timestamp'].isoformat(),
                "open": float(row['open']),
                "high": float(row['high']),
                "low": float(row['low']),
                "close": float(row['close']),
                "volume": int(row['volume'])
            })
        
        return {
            "symbol": symbol,
            "data": price_data,
            "count": len(price_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching price data: {str(e)}")

@router.get("/market-summary")
async def get_market_summary():
    """Get market summary for all available stocks"""
    try:
        symbols = ["AAPL", "GOOG", "MSFT", "TSLA", "WMT", "UL", "IBM"]
        market_data = []
        
        for symbol in symbols:
            try:
                df = load_stock_data(symbol)
                if not df.empty:
                    latest = df.iloc[-1]
                    prev = df.iloc[-2] if len(df) > 1 else df.iloc[-1]
                    
                    change = latest['close'] - prev['close']
                    change_percent = (change / prev['close']) * 100 if prev['close'] > 0 else 0
                    
                    # Calculate simple volatility
                    if len(df) >= 20:
                        volatility = df['close'].tail(20).pct_change().std() * np.sqrt(252)
                    else:
                        volatility = 0
                    
                    market_data.append({
                        "symbol": symbol,
                        "price": float(latest['close']),
                        "change": float(change),
                        "change_percent": float(change_percent),
                        "volume": int(latest['volume']),
                        "volatility": float(volatility),
                        "high_52w": float(df['high'].max()),
                        "low_52w": float(df['low'].min())
                    })
            except Exception:
                # Skip stocks with missing data
                continue
        
        return {"market_summary": market_data, "last_updated": datetime.utcnow().isoformat()}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating market summary: {str(e)}")

@router.get("/correlation/{symbols}")
async def get_correlation_analysis(symbols: str):
    """Get correlation analysis between multiple stocks"""
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        
        if len(symbol_list) < 2:
            raise HTTPException(status_code=400, detail="At least 2 symbols required for correlation analysis")
        
        # Load data for all symbols
        price_data = {}
        for symbol in symbol_list:
            try:
                df = load_stock_data(symbol)
                price_data[symbol] = df[['timestamp', 'close']].set_index('timestamp')['close']
            except Exception:
                continue
        
        if len(price_data) < 2:
            raise HTTPException(status_code=400, detail="Not enough valid symbols for correlation analysis")
        
        # Create combined dataframe
        combined_df = pd.DataFrame(price_data)
        combined_df = combined_df.dropna()
        
        if combined_df.empty:
            raise HTTPException(status_code=400, detail="No overlapping data for correlation analysis")
        
        # Calculate correlation matrix
        correlation_matrix = combined_df.corr()
        
        # Calculate returns correlation
        returns_df = combined_df.pct_change().dropna()
        returns_correlation = returns_df.corr()
        
        return {
            "symbols": list(combined_df.columns),
            "price_correlation": correlation_matrix.to_dict(),
            "returns_correlation": returns_correlation.to_dict(),
            "data_points": len(combined_df),
            "analysis_date": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating correlation: {str(e)}")

@router.get("/market-dashboard")
async def get_market_dashboard():
    """Get comprehensive market dashboard data"""
    try:
        symbols = ["AAPL", "GOOG", "MSFT", "TSLA", "WMT", "UL", "IBM"]
        dashboard_data = {
            "market_overview": [],
            "top_gainers": [],
            "top_losers": [],
            "most_active": [],
            "market_stats": {
                "total_symbols": len(symbols),
                "avg_change": 0,
                "avg_volume": 0,
                "market_trend": "neutral"
            }
        }
        
        symbol_data = []
        
        for symbol in symbols:
            try:
                df = load_stock_data(symbol)
                if not df.empty:
                    latest = df.iloc[-1]
                    prev = df.iloc[-2] if len(df) > 1 else df.iloc[-1]
                    
                    change = latest['close'] - prev['close']
                    change_percent = (change / prev['close']) * 100 if prev['close'] > 0 else 0
                    
                    # Calculate volatility
                    if len(df) >= 20:
                        volatility = df['close'].tail(20).pct_change().std() * np.sqrt(252)
                    else:
                        volatility = 0
                    
                    symbol_info = {
                        "symbol": symbol,
                        "price": float(latest['close']),
                        "change": float(change),
                        "change_percent": float(change_percent),
                        "volume": int(latest['volume']),
                        "volatility": float(volatility),
                        "high_52w": float(df['high'].max()),
                        "low_52w": float(df['low'].min()),
                        "market_cap": float(latest['close'] * latest['volume']),  # Simplified
                        "timestamp": latest['timestamp'].isoformat()
                    }
                    
                    symbol_data.append(symbol_info)
                    dashboard_data["market_overview"].append(symbol_info)
            except Exception:
                continue
        
        if symbol_data:
            # Sort for top gainers/losers
            dashboard_data["top_gainers"] = sorted(
                symbol_data, key=lambda x: x['change_percent'], reverse=True
            )[:5]
            
            dashboard_data["top_losers"] = sorted(
                symbol_data, key=lambda x: x['change_percent']
            )[:5]
            
            dashboard_data["most_active"] = sorted(
                symbol_data, key=lambda x: x['volume'], reverse=True
            )[:5]
            
            # Calculate market stats
            dashboard_data["market_stats"]["avg_change"] = sum(s['change_percent'] for s in symbol_data) / len(symbol_data)
            dashboard_data["market_stats"]["avg_volume"] = sum(s['volume'] for s in symbol_data) / len(symbol_data)
            
            avg_change = dashboard_data["market_stats"]["avg_change"]
            if avg_change > 1:
                dashboard_data["market_stats"]["market_trend"] = "bullish"
            elif avg_change < -1:
                dashboard_data["market_stats"]["market_trend"] = "bearish"
            else:
                dashboard_data["market_stats"]["market_trend"] = "neutral"
        
        dashboard_data["last_updated"] = datetime.utcnow().isoformat()
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating market dashboard: {str(e)}")

@router.get("/indicator-analysis/{symbol}")
async def get_comprehensive_indicator_analysis(symbol: str):
    """Get comprehensive technical analysis for a single symbol"""
    try:
        df = load_stock_data(symbol)
        
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data available for {symbol}")
        
        close_prices = df['close']
        
        # Calculate all indicators
        analysis = {
            "symbol": symbol,
            "current_price": float(close_prices.iloc[-1]),
            "timestamp": df['timestamp'].iloc[-1].isoformat(),
            "indicators": {}
        }
        
        # Moving Averages
        sma_10 = calculate_sma(close_prices, 10)
        sma_20 = calculate_sma(close_prices, 20)
        sma_50 = calculate_sma(close_prices, 50)
        ema_12 = calculate_ema(close_prices, 12)
        ema_26 = calculate_ema(close_prices, 26)
        
        analysis["indicators"]["moving_averages"] = {
            "sma_10": float(sma_10.iloc[-1]) if not sma_10.empty else None,
            "sma_20": float(sma_20.iloc[-1]) if not sma_20.empty else None,
            "sma_50": float(sma_50.iloc[-1]) if not sma_50.empty else None,
            "ema_12": float(ema_12.iloc[-1]) if not ema_12.empty else None,
            "ema_26": float(ema_26.iloc[-1]) if not ema_26.empty else None,
        }
        
        # RSI
        rsi = calculate_rsi(close_prices)
        if not rsi.empty:
            rsi_value = float(rsi.iloc[-1])
            analysis["indicators"]["rsi"] = {
                "value": rsi_value,
                "interpretation": "Overbought" if rsi_value > 70 else "Oversold" if rsi_value < 30 else "Neutral",
                "signal": "sell" if rsi_value > 70 else "buy" if rsi_value < 30 else "hold"
            }
        
        # MACD
        macd_data = calculate_macd(close_prices)
        if not macd_data['macd'].empty:
            analysis["indicators"]["macd"] = {
                "macd_line": float(macd_data['macd'].iloc[-1]),
                "signal_line": float(macd_data['signal'].iloc[-1]),
                "histogram": float(macd_data['histogram'].iloc[-1]),
                "signal": "buy" if macd_data['macd'].iloc[-1] > macd_data['signal'].iloc[-1] else "sell"
            }
        
        # Bollinger Bands
        bb_data = calculate_bollinger_bands(close_prices)
        current_price = analysis["current_price"]
        if not bb_data['upper'].empty:
            upper = float(bb_data['upper'].iloc[-1])
            lower = float(bb_data['lower'].iloc[-1])
            middle = float(bb_data['middle'].iloc[-1])
            
            analysis["indicators"]["bollinger_bands"] = {
                "upper_band": upper,
                "middle_band": middle,
                "lower_band": lower,
                "position": "above_upper" if current_price > upper else "below_lower" if current_price < lower else "within_bands",
                "signal": "sell" if current_price > upper else "buy" if current_price < lower else "hold"
            }
        
        # Volatility
        volatility = calculate_volatility(close_prices)
        if not volatility.empty:
            vol_value = float(volatility.iloc[-1])
            analysis["indicators"]["volatility"] = {
                "value": vol_value,
                "interpretation": "High" if vol_value > 0.3 else "Low" if vol_value < 0.15 else "Medium"
            }
        
        # Overall signal calculation
        signals = []
        if "rsi" in analysis["indicators"]:
            signals.append(analysis["indicators"]["rsi"]["signal"])
        if "macd" in analysis["indicators"]:
            signals.append(analysis["indicators"]["macd"]["signal"])
        if "bollinger_bands" in analysis["indicators"]:
            signals.append(analysis["indicators"]["bollinger_bands"]["signal"])
        
        # Simple majority vote
        buy_votes = signals.count("buy")
        sell_votes = signals.count("sell")
        hold_votes = signals.count("hold")
        
        if buy_votes > sell_votes and buy_votes > hold_votes:
            overall_signal = "buy"
        elif sell_votes > buy_votes and sell_votes > hold_votes:
            overall_signal = "sell"
        else:
            overall_signal = "hold"
        
        analysis["overall_signal"] = {
            "signal": overall_signal,
            "confidence": max(buy_votes, sell_votes, hold_votes) / len(signals) * 100 if signals else 0,
            "vote_breakdown": {"buy": buy_votes, "sell": sell_votes, "hold": hold_votes}
        }
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing indicator analysis: {str(e)}")
