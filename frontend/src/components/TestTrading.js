import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './TestTrading.css';

function TestTrading() {
  const [stocks, setStocks] = useState([]);
  const [testPortfolio, setTestPortfolio] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState('buy');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [message, setMessage] = useState('');
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState('market');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    async function fetchTestData() {
      try {
        const [stocksRes, portfolioRes, tradesRes, performanceRes] = await Promise.all([
          api.get('/trading/stocks'),
          api.get(`/test/portfolio/${user.id}`),
          api.get(`/test/user/${user.id}`),
          api.get(`/test/performance/${user.id}`)
        ]);
        
        setStocks(stocksRes.data);
        setTestPortfolio(portfolioRes.data);
        setTrades(tradesRes.data.trades || []);
        setPerformance(performanceRes.data);
        
        if (stocksRes.data.length > 0) {
          setSymbol(stocksRes.data[0].symbol);
          setPrice(stocksRes.data[0].price);
        }
        setLoading(false);
      } catch (err) {
        setMessage('Failed to load test trading data');
        setLoading(false);
      }
    }
    fetchTestData();
  }, [user.id]);

  useEffect(() => {
    // Update price when symbol changes
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
      setPrice(stock.price);
    }
  }, [symbol, stocks]);

  const getHoldingQty = (sym) => {
    if (!testPortfolio || !testPortfolio.holdings) return 0;
    const holding = testPortfolio.holdings.find(h => h.symbol === sym);
    return holding ? holding.quantity : 0;
  };

  const validateTestOrder = () => {
    if (!symbol || quantity <= 0) {
      return "Please select a valid symbol and quantity";
    }

    const estimatedCost = quantity * price;
    
    if (side === 'buy' && testPortfolio && estimatedCost > testPortfolio.cash) {
      return `Insufficient virtual cash. Need $${estimatedCost.toFixed(2)}, have $${testPortfolio.cash.toFixed(2)}`;
    }

    if (side === 'sell' && quantity > getHoldingQty(symbol)) {
      return `Not enough shares to sell. Have ${getHoldingQty(symbol)}, trying to sell ${quantity}`;
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    const validation = validateTestOrder();
    if (validation) {
      setMessage(validation);
      return;
    }

    try {
      const tradeData = {
        user_id: user.id,
        symbol,
        side,
        quantity: parseFloat(quantity),
        order_type: orderType
      };

      if (orderType === 'limit') {
        tradeData.price = parseFloat(price);
      }

      const response = await api.post('/test', tradeData);
      
      setMessage(
        `Test trade executed successfully! ` +
        `${side.toUpperCase()} ${quantity} ${symbol} at $${response.data.executed_price.toFixed(2)} ` +
        `(Total: $${response.data.total_amount.toFixed(2)})`
      );
      
      // Reset form
      setQuantity(1);
      
      // Refresh test data
      const [portfolioRes, tradesRes, performanceRes] = await Promise.all([
        api.get(`/test/portfolio/${user.id}`),
        api.get(`/test/user/${user.id}`),
        api.get(`/test/performance/${user.id}`)
      ]);
      
      setTestPortfolio(portfolioRes.data);
      setTrades(tradesRes.data.trades || []);
      setPerformance(performanceRes.data);
      
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Test trade failed';
      setMessage(errorMsg);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div className="loading">Loading test trading...</div>;

  const selectedStock = stocks.find(s => s.symbol === symbol);
  const currentHolding = getHoldingQty(symbol);
  const estimatedCost = quantity * price;

  return (
    <div className="test-trading-container">
      <div className="test-header">
        <h2>Paper Trading (Test Environment)</h2>
        <div className="test-badge">VIRTUAL MONEY - NO REAL TRADES</div>
      </div>

      {/* Test Portfolio Summary */}
      {testPortfolio && performance && (
        <div className="test-portfolio-summary">
          <h3>Virtual Portfolio Performance</h3>
          <div className="test-metrics">
            <div className="metric">
              <label>Virtual Cash:</label>
              <value>${testPortfolio.cash?.toFixed(2) || '0.00'}</value>
            </div>
            <div className="metric">
              <label>Portfolio Value:</label>
              <value>${testPortfolio.portfolio_value?.toFixed(2) || '0.00'}</value>
            </div>
            <div className="metric">
              <label>Total Value:</label>
              <value>${testPortfolio.total_value?.toFixed(2) || '0.00'}</value>
            </div>
            <div className="metric">
              <label>Total Return:</label>
              <value className={`${performance.total_return >= 0 ? 'positive' : 'negative'}`}>
                {performance.total_return >= 0 ? '+' : ''}${performance.total_return?.toFixed(2) || '0.00'}
                ({performance.total_return_percent?.toFixed(2) || '0.00'}%)
              </value>
            </div>
            <div className="metric">
              <label>Realized P&L:</label>
              <value className={`${performance.realized_pnl >= 0 ? 'positive' : 'negative'}`}>
                {performance.realized_pnl >= 0 ? '+' : ''}${performance.realized_pnl?.toFixed(2) || '0.00'}
              </value>
            </div>
            <div className="metric">
              <label>Unrealized P&L:</label>
              <value className={`${performance.unrealized_pnl >= 0 ? 'positive' : 'negative'}`}>
                {performance.unrealized_pnl >= 0 ? '+' : ''}${performance.unrealized_pnl?.toFixed(2) || '0.00'}
              </value>
            </div>
          </div>
        </div>
      )}

      {/* Stock Information */}
      {selectedStock && (
        <div className="stock-info">
          <h3>{selectedStock.name} ({selectedStock.symbol})</h3>
          <div className="stock-price">
            <span>Current Price: <strong>${selectedStock.price.toFixed(2)}</strong></span>
            <span className={`price-change ${selectedStock.change >= 0 ? 'positive' : 'negative'}`}>
              {selectedStock.change >= 0 ? '+' : ''}${selectedStock.change?.toFixed(2)} 
              ({selectedStock.change_percent?.toFixed(2)}%)
            </span>
          </div>
          {currentHolding > 0 && (
            <div className="current-holding">
              Virtual Holdings: <strong>{currentHolding} shares</strong>
            </div>
          )}
        </div>
      )}

      {/* Test Trading Form */}
      <form onSubmit={handleSubmit} className="test-order-form">
        <h3>Place Test Order</h3>
        
        <div className="form-row">
          <label>Stock:
            <select value={symbol} onChange={e => setSymbol(e.target.value)} required>
              {stocks.map(s => (
                <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>Order Type:
            <select value={side} onChange={e => setSide(e.target.value)}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>Execution Type:
            <select value={orderType} onChange={e => setOrderType(e.target.value)}>
              <option value="market">Market Order</option>
              <option value="limit">Limit Order</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>Quantity:
            <input 
              type="number" 
              min="1" 
              step="1"
              max={side === 'sell' ? getHoldingQty(symbol) : undefined}
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              required 
            />
          </label>
          {side === 'sell' && (
            <small>Max available: {getHoldingQty(symbol)} shares</small>
          )}
        </div>

        <div className="form-row">
          <label>Price:
            <input 
              type="number" 
              step="0.01"
              value={price.toFixed(2)} 
              onChange={e => setPrice(parseFloat(e.target.value) || 0)}
              readOnly={orderType === 'market'}
              className={orderType === 'market' ? 'readonly-input' : ''}
            />
          </label>
        </div>

        <div className="test-order-summary">
          <h4>Test Order Summary</h4>
          <div className="summary-line">
            <span>Action:</span>
            <span>{side.toUpperCase()} {quantity} shares of {symbol}</span>
          </div>
          <div className="summary-line">
            <span>Estimated {side === 'buy' ? 'Cost' : 'Proceeds'}:</span>
            <span>${estimatedCost.toFixed(2)}</span>
          </div>
          {side === 'buy' && testPortfolio && (
            <div className="summary-line">
              <span>Remaining Virtual Cash:</span>
              <span>${(testPortfolio.cash - estimatedCost).toFixed(2)}</span>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className={`test-order-btn ${side}-btn`}
          disabled={!!validateTestOrder()}
        >
          Place Test {side === 'buy' ? 'Buy' : 'Sell'} Order
        </button>
      </form>

      {message && (
        <div className={`test-message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Test Holdings */}
      {testPortfolio && testPortfolio.holdings && testPortfolio.holdings.length > 0 && (
        <div className="test-holdings">
          <h3>Virtual Holdings</h3>
          <div className="holdings-table">
            <div className="table-header">
              <div>Symbol</div>
              <div>Quantity</div>
              <div>Avg. Price</div>
              <div>Current Price</div>
              <div>Market Value</div>
              <div>Unrealized P&L</div>
            </div>
            {testPortfolio.holdings.map((holding, i) => (
              <div key={i} className="table-row">
                <div>{holding.symbol}</div>
                <div>{holding.quantity}</div>
                <div>${holding.avg_price?.toFixed(2) || '-'}</div>
                <div>${holding.current_price?.toFixed(2) || '-'}</div>
                <div>${holding.market_value?.toFixed(2) || '-'}</div>
                <div className={`pnl ${(holding.unrealized_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {(holding.unrealized_pnl || 0) >= 0 ? '+' : ''}${holding.unrealized_pnl?.toFixed(2) || '0.00'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Trade History */}
      <div className="test-trade-history">
        <h3>Test Trade History</h3>
        {trades.length > 0 ? (
          <div className="trades-table">
            <div className="table-header">
              <div>Date/Time</div>
              <div>Symbol</div>
              <div>Side</div>
              <div>Quantity</div>
              <div>Price</div>
              <div>Total</div>
              <div>Status</div>
            </div>
            {trades.slice(0, 10).map((trade, i) => (
              <div key={i} className="table-row">
                <div>{formatDateTime(trade.timestamp)}</div>
                <div>{trade.symbol}</div>
                <div className={`side-${trade.side}`}>{trade.side.toUpperCase()}</div>
                <div>{trade.quantity}</div>
                <div>${(trade.executed_price || trade.price).toFixed(2)}</div>
                <div>${(trade.quantity * (trade.executed_price || trade.price)).toFixed(2)}</div>
                <div className={`status-${trade.status}`}>{trade.status.toUpperCase()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-trades">No test trades yet. Start paper trading to see your history here.</div>
        )}
      </div>
    </div>
  );
}

export default TestTrading;
