import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './OrderForm.css';

function OrderForm() {
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState({ cash: 0, holdings: [], total_value: 0 });
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState('buy');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState('market'); // market or limit
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    async function fetchData() {
      try {
        const [stocksRes, portfolioRes, ordersRes] = await Promise.all([
          api.get('/trading/stocks'),
          api.get(`/trading/portfolio/user/${user.id}`),
          api.get(`/trading/orders/user/${user.id}`)
        ]);
        setStocks(stocksRes.data);
        setPortfolio(portfolioRes.data);
        setOrderHistory(ordersRes.data.orders || []);
        if (stocksRes.data.length > 0) {
          setSymbol(stocksRes.data[0].symbol);
          setPrice(stocksRes.data[0].price);
        }
        setLoading(false);
      } catch (err) {
        setMessage('Failed to load stocks or portfolio');
        setLoading(false);
      }
    }
    fetchData();
  }, [user.id]);

  useEffect(() => {
    // Update price when symbol changes
    const stock = stocks.find(s => s.symbol === symbol);
    if (stock) {
      setPrice(stock.price);
    }
  }, [symbol, stocks]);

  useEffect(() => {
    // Calculate estimated cost
    if (orderType === 'market') {
      const stock = stocks.find(s => s.symbol === symbol);
      if (stock) {
        setEstimatedCost(quantity * stock.price);
      }
    } else {
      setEstimatedCost(quantity * price);
    }
  }, [quantity, price, orderType, symbol, stocks]);

  const getHoldingQty = (sym) => {
    const holding = portfolio.holdings.find(h => h.symbol === sym);
    return holding ? holding.quantity : 0;
  };

  const getCurrentValue = (sym) => {
    const holding = portfolio.holdings.find(h => h.symbol === sym);
    return holding ? holding.market_value : 0;
  };

  const getUnrealizedPnL = (sym) => {
    const holding = portfolio.holdings.find(h => h.symbol === sym);
    return holding ? holding.unrealized_pnl : 0;
  };

  const validateOrder = () => {
    if (!symbol || quantity <= 0) {
      return "Please select a valid symbol and quantity";
    }

    if (side === 'buy' && estimatedCost > portfolio.cash) {
      return `Insufficient cash. Need $${estimatedCost.toFixed(2)}, have $${portfolio.cash.toFixed(2)}`;
    }

    if (side === 'sell' && quantity > getHoldingQty(symbol)) {
      return `Not enough shares to sell. Have ${getHoldingQty(symbol)}, trying to sell ${quantity}`;
    }

    if (orderType === 'limit' && (!price || price <= 0)) {
      return "Limit orders must have a positive price";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    const validation = validateOrder();
    if (validation) {
      setMessage(validation);
      return;
    }

    try {
      const orderData = {
        user_id: user.id,
        symbol,
        side,
        quantity: parseFloat(quantity),
        order_type: orderType
      };

      // Add price for limit orders
      if (orderType === 'limit') {
        orderData.price = parseFloat(price);
      }

      const response = await api.post('/trading/orders', orderData);
      
      setMessage(
        `Order executed successfully! ` +
        `${side.toUpperCase()} ${quantity} ${symbol} at $${response.data.executed_price.toFixed(2)} ` +
        `(Total: $${response.data.total_amount.toFixed(2)}) ` +
        `[Execution time: ${response.data.execution_time_ms?.toFixed(1) || 'N/A'}ms]`
      );
      
      // Reset form
      setQuantity(1);
      
      // Refresh portfolio and order history
      const [portfolioRes, ordersRes] = await Promise.all([
        api.get(`/trading/portfolio/user/${user.id}`),
        api.get(`/trading/orders/user/${user.id}`)
      ]);
      setPortfolio(portfolioRes.data);
      setOrderHistory(ordersRes.data.orders || []);
      
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Order failed';
      setMessage(errorMsg);
    }
  };

  const getMaxSellQuantity = () => {
    return getHoldingQty(symbol);
  };

  const getStock = (sym) => {
    return stocks.find(s => s.symbol === sym);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) return <div className="loading">Loading...</div>;

  const selectedStock = getStock(symbol);
  const currentHolding = getHoldingQty(symbol);
  const currentValue = getCurrentValue(symbol);
  const unrealizedPnL = getUnrealizedPnL(symbol);

  return (
    <div className="order-form-container">
      <h2>Place Order</h2>
      
      {/* Portfolio Summary */}
      <div className="portfolio-summary">
        <div className="summary-card">
          <h3>Portfolio Overview</h3>
          <div className="summary-row">
            <span>Available Cash:</span>
            <span className="cash-amount">${portfolio.cash?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="summary-row">
            <span>Portfolio Value:</span>
            <span className="portfolio-amount">${portfolio.portfolio_value?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="summary-row">
            <span>Total Value:</span>
            <span className="total-amount">${portfolio.total_value?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="summary-row">
            <span>Total Return:</span>
            <span className={`return-amount ${(portfolio.total_return || 0) >= 0 ? 'positive' : 'negative'}`}>
              ${portfolio.total_return?.toFixed(2) || '0.00'} ({portfolio.total_return_percent?.toFixed(2) || '0.00'}%)
            </span>
          </div>
        </div>
      </div>

      {/* Stock Information */}
      {selectedStock && (
        <div className="stock-info">
          <h3>{selectedStock.name} ({selectedStock.symbol})</h3>
          <div className="stock-details">
            <div>Current Price: <strong>${selectedStock.price.toFixed(2)}</strong></div>
            <div className={`price-change ${selectedStock.change >= 0 ? 'positive' : 'negative'}`}>
              Change: {selectedStock.change >= 0 ? '+' : ''}${selectedStock.change?.toFixed(2)} 
              ({selectedStock.change_percent?.toFixed(2)}%)
            </div>
            {currentHolding > 0 && (
              <div className="holding-info">
                <div>Your Holdings: <strong>{currentHolding} shares</strong></div>
                <div>Current Value: <strong>${currentValue.toFixed(2)}</strong></div>
                <div className={`unrealized-pnl ${unrealizedPnL >= 0 ? 'positive' : 'negative'}`}>
                  Unrealized P&L: <strong>{unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="order-form">
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
              <option value="market">Market Order (Execute Immediately)</option>
              <option value="limit">Limit Order (Specify Price)</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>Quantity:
            <input 
              type="number" 
              min="1" 
              step="1"
              max={side === 'sell' ? getMaxSellQuantity() : undefined}
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              required 
            />
          </label>
          {side === 'sell' && (
            <small>Max available: {getMaxSellQuantity()} shares</small>
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
          {orderType === 'market' && (
            <small>Market orders execute at current market price</small>
          )}
          {orderType === 'limit' && (
            <small>Limit orders execute only if market price reaches your specified price</small>
          )}
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <h4>Order Summary</h4>
          <div className="summary-line">
            <span>Action:</span>
            <span>{side.toUpperCase()} {quantity} shares of {symbol}</span>
          </div>
          <div className="summary-line">
            <span>Order Type:</span>
            <span>{orderType.toUpperCase()}</span>
          </div>
          <div className="summary-line">
            <span>Price:</span>
            <span>${price.toFixed(2)} per share</span>
          </div>
          <div className="summary-line total">
            <span>Estimated {side === 'buy' ? 'Cost' : 'Proceeds'}:</span>
            <span>${estimatedCost.toFixed(2)}</span>
          </div>
          {side === 'buy' && (
            <div className="summary-line">
              <span>Remaining Cash:</span>
              <span className={portfolio.cash - estimatedCost >= 0 ? 'positive' : 'negative'}>
                ${(portfolio.cash - estimatedCost).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className={`order-btn ${side}-btn`}
          disabled={!!validateOrder()}
        >
          {side === 'buy' ? 'Buy Shares' : 'Sell Shares'}
        </button>
      </form>

      {message && (
        <div className={`order-message ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Order History Section */}
      <div className="order-history-section">
        <div className="section-header">
          <h3>Recent Orders</h3>
          <button 
            type="button" 
            className="toggle-btn"
            onClick={() => setShowOrderHistory(!showOrderHistory)}
          >
            {showOrderHistory ? 'Hide' : 'Show'} Order History
          </button>
        </div>
        
        {showOrderHistory && (
          <div className="order-history">
            {orderHistory.length > 0 ? (
              <div className="orders-table">
                <div className="table-header">
                  <div>Date/Time</div>
                  <div>Symbol</div>
                  <div>Side</div>
                  <div>Quantity</div>
                  <div>Price</div>
                  <div>Total</div>
                  <div>Status</div>
                </div>
                {orderHistory.slice(0, 10).map((order, index) => (
                  <div key={order.id || index} className="table-row">
                    <div>{formatDateTime(order.timestamp)}</div>
                    <div>{order.symbol}</div>
                    <div className={`side-${order.side}`}>{order.side.toUpperCase()}</div>
                    <div>{order.quantity}</div>
                    <div>${order.price.toFixed(2)}</div>
                    <div>${(order.quantity * order.price).toFixed(2)}</div>
                    <div className={`status-${order.status}`}>{order.status.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-orders">No orders found. Start trading to see your order history here.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderForm;
