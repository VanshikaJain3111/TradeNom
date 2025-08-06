import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import syntheticDataService from "../services/syntheticDataService";
import SpreadDisplay from "./SpreadDisplay";
import "./OrderForm.css";

function OrderForm() {
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState({
    cash: 0,
    holdings: [],
    total_value: 0,
  });
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("buy");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState("market"); // market or limit
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [currentPrices, setCurrentPrices] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const priceUpdateUnsubscribe = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    async function fetchData() {
      try {
        // Initialize synthetic data service
        await syntheticDataService.initialize();

        const [portfolioRes, ordersRes] = await Promise.all([
          api.get(`/portfolio/user/${user.id}`),
          api.get(`/orders/user/${user.id}`),
        ]);

        // Get stocks from synthetic data service
        const stockList = syntheticDataService.getStockList();
        const currentPricesList = syntheticDataService.getAllCurrentPrices();

        setStocks(stockList);
        setCurrentPrices(currentPricesList);
        setPortfolio(portfolioRes.data);
        setOrderHistory(ordersRes.data || []);

        if (stockList.length > 0) {
          setSymbol(stockList[0].symbol);
          const firstStockPrice = currentPricesList.find(
            (p) => p.symbol === stockList[0].symbol
          );
          setPrice(firstStockPrice?.price || stockList[0].price);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setMessage("Failed to load data");
        setLoading(false);
      }
    }

    fetchData();

    // Subscribe to price updates
    priceUpdateUnsubscribe.current = syntheticDataService.onPriceUpdate(
      (prices) => {
        setCurrentPrices(prices);
        setLastUpdate(Date.now());

        // Update current stock price if it's the selected symbol
        const currentStock = prices.find((p) => p.symbol === symbol);
        if (currentStock && orderType === "market") {
          setPrice(currentStock.price);
        }

        // Refresh portfolio with new prices
        refreshPortfolio();
      }
    );

    return () => {
      if (priceUpdateUnsubscribe.current) {
        priceUpdateUnsubscribe.current();
      }
    };
  }, [user.id]);

  const refreshPortfolio = async () => {
    try {
      const portfolioRes = await api.get(`/portfolio/user/${user.id}`);
      setPortfolio(portfolioRes.data);
    } catch (err) {
      console.error("Error refreshing portfolio:", err);
    }
  };

  useEffect(() => {
    // Update price when symbol changes
    const currentPrice = currentPrices.find((p) => p.symbol === symbol);
    if (currentPrice && orderType === "market") {
      setPrice(currentPrice.price);
    }
  }, [symbol, currentPrices, orderType]);

  useEffect(() => {
    // Calculate estimated cost
    const currentPrice = currentPrices.find((p) => p.symbol === symbol);
    const realTimePrice = currentPrice ? currentPrice.price : price;

    if (orderType === "market") {
      setEstimatedCost(quantity * realTimePrice);
    } else {
      setEstimatedCost(quantity * price);
    }
  }, [quantity, price, orderType, symbol, currentPrices]);

  const getHoldingQty = (sym) => {
    const holding = portfolio.holdings.find((h) => h.symbol === sym);
    return holding ? holding.quantity : 0;
  };

  const getCurrentValue = (sym) => {
    const holding = portfolio.holdings.find((h) => h.symbol === sym);
    return holding ? holding.market_value : 0;
  };

  const getUnrealizedPnL = (sym) => {
    const holding = portfolio.holdings.find((h) => h.symbol === sym);
    return holding ? holding.unrealized_pnl : 0;
  };

  const validateOrder = () => {
    if (!symbol || quantity <= 0) {
      return "Please select a valid symbol and quantity";
    }

    if (side === "buy" && estimatedCost > portfolio.cash) {
      return `Insufficient cash. Need $${estimatedCost.toFixed(
        2
      )}, have $${portfolio.cash.toFixed(2)}`;
    }

    if (side === "sell" && quantity > getHoldingQty(symbol)) {
      return `Not enough shares to sell. Have ${getHoldingQty(
        symbol
      )}, trying to sell ${quantity}`;
    }

    if (orderType === "limit" && (!price || price <= 0)) {
      return "Limit orders must have a positive price";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

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
        order_type: orderType,
      };

      // Add price for limit orders
      if (orderType === "limit") {
        orderData.price = parseFloat(price);
      }

      const response = await api.post("/orders", orderData);

      setMessage(
        `Order executed successfully! ` +
          `${side.toUpperCase()} ${quantity} ${symbol} at $${response.data.price.toFixed(
            2
          )} ` +
          `(Total: $${response.data.total_value.toFixed(2)})`
      );

      // Reset form
      setQuantity(1);

      // Refresh portfolio and order history
      const [portfolioRes, ordersRes] = await Promise.all([
        api.get(`/portfolio/user/${user.id}`),
        api.get(`/orders/user/${user.id}`),
      ]);
      setPortfolio(portfolioRes.data);
      setOrderHistory(ordersRes.data || []);
    } catch (err) {
      const errorMsg = err.message || "Order failed";
      setMessage(errorMsg);
    }
  };

  const getMaxSellQuantity = () => {
    return getHoldingQty(symbol);
  };

  const getStock = (sym) => {
    const stock = stocks.find((s) => s.symbol === sym);
    const currentPrice = currentPrices.find((p) => p.symbol === sym);

    if (stock && currentPrice) {
      return {
        ...stock,
        price: currentPrice.price,
        change: currentPrice.change,
        change_percent: currentPrice.change_percent,
        volume: currentPrice.volume,
        lastUpdate: currentPrice.lastUpdate,
      };
    }
    return stock;
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
      <h2>
        Place Order
        <span className="last-update">
          Last Update: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </h2>

      {/* Stock Information */}
      {selectedStock && (
        <div className="stock-info">
          <h3>
            {selectedStock.name} ({selectedStock.symbol})
          </h3>
          <div className="stock-details">
            <div>
              Current Price:{" "}
              <strong>${selectedStock.price?.toFixed(2) || "0.00"}</strong>
            </div>
            <div
              className={`price-change ${
                (selectedStock.change || 0) >= 0 ? "positive" : "negative"
              }`}
            >
              Change: {(selectedStock.change || 0) >= 0 ? "+" : ""}$
              {selectedStock.change?.toFixed(2) || "0.00"}(
              {selectedStock.change_percent?.toFixed(2)}%)
            </div>
            {currentHolding > 0 && (
              <div className="holding-info">
                <div>
                  Your Holdings: <strong>{currentHolding} shares</strong>
                </div>
                <div>
                  Current Value: <strong>${currentValue.toFixed(2)}</strong>
                </div>
                <div
                  className={`unrealized-pnl ${
                    unrealizedPnL >= 0 ? "positive" : "negative"
                  }`}
                >
                  Unrealized P&L:{" "}
                  <strong>
                    {unrealizedPnL >= 0 ? "+" : ""}${unrealizedPnL.toFixed(2)}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time Spread Display */}
      <SpreadDisplay symbol={symbol} className="compact" />

      <form onSubmit={handleSubmit} className="order-form">
        <div className="form-row">
          <label>
            Stock:
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            >
              {stocks.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} - {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Order Type:
            <select value={side} onChange={(e) => setSide(e.target.value)}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Execution Type:
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <option value="market">Market Order (Execute Immediately)</option>
              <option value="limit">Limit Order (Specify Price)</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Quantity:
            <input
              type="number"
              min="1"
              step="1"
              max={side === "sell" ? getMaxSellQuantity() : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </label>
          {side === "sell" && (
            <small>Max available: {getMaxSellQuantity()} shares</small>
          )}
        </div>

        <div className="form-row">
          <label>
            Price:
            <input
              type="number"
              step="0.01"
              value={price.toFixed(2)}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              readOnly={orderType === "market"}
              className={orderType === "market" ? "readonly-input" : ""}
            />
          </label>
          {orderType === "market" && (
            <small>Market orders execute at current market price</small>
          )}
          {orderType === "limit" && (
            <small>
              Limit orders execute only if market price reaches your specified
              price
            </small>
          )}
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <h4>Order Summary</h4>
          <div className="summary-line">
            <span>Action:</span>
            <span>
              {side.toUpperCase()} {quantity} shares of {symbol}
            </span>
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
            <span>Estimated {side === "buy" ? "Cost" : "Proceeds"}:</span>
            <span>${estimatedCost.toFixed(2)}</span>
          </div>
          {side === "buy" && (
            <div className="summary-line">
              <span>Remaining Cash:</span>
              <span
                className={
                  portfolio.cash - estimatedCost >= 0 ? "positive" : "negative"
                }
              >
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
          {side === "buy" ? "Buy Shares" : "Sell Shares"}
        </button>
      </form>

      {message && (
        <div
          className={`order-message ${
            message.includes("successfully") ? "success" : "error"
          }`}
        >
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
            {showOrderHistory ? "Hide" : "Show"} Order History
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
                    <div className={`side-${order.side}`}>
                      {order.side.toUpperCase()}
                    </div>
                    <div>{order.quantity}</div>
                    <div>${order.price.toFixed(2)}</div>
                    <div>${(order.quantity * order.price).toFixed(2)}</div>
                    <div className={`status-${order.status}`}>
                      {order.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-orders">
                No orders found. Start trading to see your order history here.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderForm;
