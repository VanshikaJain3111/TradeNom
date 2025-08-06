import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import syntheticDataService from "../services/syntheticDataService";
import "./TestTrading.css";

function TestTrading() {
  const [stocks, setStocks] = useState([]);
  const [testPortfolio, setTestPortfolio] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("buy");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [message, setMessage] = useState("");
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderType, setOrderType] = useState("market");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [currentPrices, setCurrentPrices] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const priceUpdateUnsubscribe = useRef(null);
  const user = JSON.parse(localStorage.getItem("user")) || { id: "demo-user" };

  useEffect(() => {
    fetchTestData();

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
      }
    );

    return () => {
      if (priceUpdateUnsubscribe.current) {
        priceUpdateUnsubscribe.current();
      }
    };
  }, [user.id]);

  async function fetchTestData() {
    setLoading(true);
    try {
      // Initialize synthetic data service
      await syntheticDataService.initialize();

      // Get stocks from synthetic data service
      const stockList = syntheticDataService.getStockList();
      const currentPricesList = syntheticDataService.getAllCurrentPrices();

      setStocks(stockList);
      setCurrentPrices(currentPricesList);

      // Get test trades from local storage via API
      const tradesRes = await api.get(`/test/user/${user.id}`);
      const tradesData = tradesRes.data || [];
      // Ensure all trades have required properties
      const safeTrades = tradesData.map(trade => ({
        ...trade,
        side: trade.side || 'unknown',
        status: trade.status || 'unknown',
        symbol: trade.symbol || 'N/A',
        quantity: trade.quantity || 0,
        price: trade.price || 0,
        executed_price: trade.executed_price || trade.price || 0
      }));
      setTrades(safeTrades);

      // Set up default test portfolio and performance
      setTestPortfolio(getDefaultPortfolio(user.id));
      setPerformance(getDefaultPerformance());

      if (stockList.length > 0) {
        setSymbol(stockList[0].symbol);
        const firstStockPrice = currentPricesList.find(
          (p) => p.symbol === stockList[0].symbol
        );
        setPrice(firstStockPrice?.price || stockList[0].price);
      }
    } catch (error) {
      console.error("Error fetching test data:", error);
      setMessage("Failed to load test trading data");

      // Fallback to default data
      setStocks(getDefaultStocks());
      setTestPortfolio(getDefaultPortfolio(user.id));
      setPerformance(getDefaultPerformance());
    }
    setLoading(false);
  }
  //         stocksRes.data.length > 0 ? stocksRes.data : getDefaultStocks();
  //       setStocks(stocksData);
  //       setTestPortfolio(portfolioRes.data);
  //       setTrades(tradesRes.data.trades || []);
  //       setPerformance(performanceRes.data);

  //       if (stocksData.length > 0) {
  //         setSymbol(stocksData[0].symbol);
  //         setPrice(stocksData[0].price);
  //       }
  //     } catch (err) {
  //       console.error("Error fetching test data:", err);
  //       setMessage("Failed to load some data. Using demo mode.");

  //       // Set default data if API fails
  //       setStocks(getDefaultStocks());
  //       setTestPortfolio(getDefaultPortfolio(user.id));
  //       setTrades([]);
  //       setPerformance(getDefaultPerformance());

  //       // Set default symbol and price
  //       const defaultStocks = getDefaultStocks();
  //       if (defaultStocks.length > 0) {
  //         setSymbol(defaultStocks[0].symbol);
  //         setPrice(defaultStocks[0].price);
  //       }
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  //   fetchTestData();
  // }, [user?.id]);

  // Function to generate default stocks if API fails
  function getDefaultStocks() {
    return [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 228.08,
        change: 2.55,
        change_percent: 1.12,
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corporation",
        price: 420.35,
        change: 3.22,
        change_percent: 0.78,
      },
      {
        symbol: "GOOG",
        name: "Alphabet Inc.",
        price: 2805.62,
        change: -15.3,
        change_percent: -0.54,
      },
      {
        symbol: "TSLA",
        name: "Tesla, Inc.",
        price: 250.22,
        change: 12.48,
        change_percent: 5.25,
      },
      {
        symbol: "WMT",
        name: "Walmart Inc.",
        price: 164.89,
        change: 0.56,
        change_percent: 0.34,
      },
    ];
  }

  // Function to generate default portfolio if API fails
  function getDefaultPortfolio(userId) {
    return {
      user_id: userId,
      cash: 100000.0,
      holdings: [],
      portfolio_value: 0,
      total_value: 100000.0,
      is_test_portfolio: true,
    };
  }

  // Function to generate default performance if API fails
  function getDefaultPerformance() {
    return {
      total_value: 100000.0,
      starting_value: 100000.0,
      total_return: 0.0,
      total_return_percent: 0.0,
      realized_pnl: 0.0,
      unrealized_pnl: 0.0,
      cash: 100000.0,
      portfolio_value: 0,
      number_of_trades: 0,
      holdings_count: 0,
    };
  }

  useEffect(() => {
    // Update price when symbol changes
    if (symbol) {
      const currentStock = currentPrices.find((p) => p.symbol === symbol);
      if (currentStock && orderType === "market") {
        setPrice(currentStock.price);
      } else {
        // Fallback to stocks data if currentPrices doesn't have the symbol yet
        const stock = stocks.find((s) => s.symbol === symbol);
        if (stock) {
          setPrice(stock.price);
        }
      }
    }
  }, [symbol, orderType]); // Removed stocks from dependencies to prevent infinite loop

  const getHoldingQty = (sym) => {
    if (!testPortfolio || !testPortfolio.holdings) return 0;
    const holding = testPortfolio.holdings.find((h) => h.symbol === sym);
    return holding ? holding.quantity : 0;
  };

  const validateTestOrder = () => {
    // Reset previous validation error
    let validationMessage = "";

    if (!symbol || !symbol.trim()) {
      validationMessage = "Please select a valid stock symbol";
    } else {
      const numQuantity = parseFloat(quantity);
      if (
        isNaN(numQuantity) ||
        numQuantity <= 0 ||
        !Number.isInteger(numQuantity)
      ) {
        validationMessage =
          "Please enter a valid whole number quantity greater than 0";
      } else {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice <= 0) {
          validationMessage = "Please enter a valid price greater than 0";
        } else {
          const estimatedCost = numQuantity * numPrice;

          if (
            side === "buy" &&
            testPortfolio &&
            estimatedCost > testPortfolio.cash
          ) {
            validationMessage = `Insufficient virtual cash. Need $${estimatedCost.toFixed(
              2
            )}, have $${testPortfolio.cash.toFixed(2)}`;
          } else if (side === "sell" && numQuantity > getHoldingQty(symbol)) {
            validationMessage = `Not enough shares to sell. Have ${getHoldingQty(
              symbol
            )}, trying to sell ${numQuantity}`;
          }
        }
      }
    }

    // Update the validation error state
    if (validationMessage) {
      setValidationError(validationMessage);
    }

    return validationMessage;
  };

  const formatErrorMessage = (error) => {
    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object") {
      // Handle different error object structures
      if (error.message) {
        return error.message;
      }

      if (error.detail) {
        if (typeof error.detail === "string") {
          return error.detail;
        }

        if (Array.isArray(error.detail)) {
          return error.detail
            .map((item) => {
              if (typeof item === "string") return item;
              if (item.msg) return item.msg;
              if (item.message) return item.message;
              return "Validation error";
            })
            .join(", ");
        }

        if (error.detail.msg) {
          return error.detail.msg;
        }
      }

      if (error.msg) {
        return error.msg;
      }

      if (error.error) {
        return formatErrorMessage(error.error);
      }

      // Last resort: stringify the object
      return JSON.stringify(error);
    }

    return "An unknown error occurred";
  };

  // Generate client-side trade response if backend fails
  const generateMockTradeResponse = (tradeData) => {
    const executedPrice =
      tradeData.order_type === "market"
        ? stocks.find((s) => s.symbol === tradeData.symbol)?.price ||
          parseFloat(price)
        : parseFloat(tradeData.price);

    const totalAmount = executedPrice * tradeData.quantity;

    return {
      data: {
        msg: "Test trade executed successfully",
        trade: {
          ...tradeData,
          executed_price: executedPrice,
          id: `mock-${Date.now()}`,
          created_at: new Date().toISOString(),
          status: "filled",
        },
        executed_price: executedPrice,
        total_amount: totalAmount,
      },
    };
  };

  // Update portfolio locally after a trade
  const updatePortfolioAfterTrade = (tradeData, executedPrice) => {
    if (!testPortfolio) return;

    const totalAmount = executedPrice * tradeData.quantity;
    let updatedPortfolio = { ...testPortfolio };
    let updatedPerformance = { ...performance };
    let updatedHoldings = [...(testPortfolio.holdings || [])];

    if (tradeData.side === "buy") {
      // Update cash
      updatedPortfolio.cash -= totalAmount;

      // Find or add holding
      const existingHoldingIndex = updatedHoldings.findIndex(
        (h) => h.symbol === tradeData.symbol
      );

      if (existingHoldingIndex >= 0) {
        // Update existing holding
        const existingHolding = updatedHoldings[existingHoldingIndex];
        const newQuantity = existingHolding.quantity + tradeData.quantity;
        const existingValue =
          existingHolding.quantity * existingHolding.avg_price;
        const newValue = tradeData.quantity * executedPrice;
        const newAvgPrice = (existingValue + newValue) / newQuantity;

        updatedHoldings[existingHoldingIndex] = {
          ...existingHolding,
          quantity: newQuantity,
          avg_price: newAvgPrice,
          current_price: executedPrice,
          market_value: newQuantity * executedPrice,
          unrealized_pnl: (executedPrice - newAvgPrice) * newQuantity,
        };
      } else {
        // Add new holding
        updatedHoldings.push({
          symbol: tradeData.symbol,
          quantity: tradeData.quantity,
          avg_price: executedPrice,
          current_price: executedPrice,
          market_value: tradeData.quantity * executedPrice,
          unrealized_pnl: 0,
        });
      }
    } else if (tradeData.side === "sell") {
      // Update cash
      updatedPortfolio.cash += totalAmount;

      // Find and update holding
      const existingHoldingIndex = updatedHoldings.findIndex(
        (h) => h.symbol === tradeData.symbol
      );

      if (existingHoldingIndex >= 0) {
        const existingHolding = updatedHoldings[existingHoldingIndex];
        const newQuantity = existingHolding.quantity - tradeData.quantity;

        // Calculate realized PnL
        const realizedProfit =
          (executedPrice - existingHolding.avg_price) * tradeData.quantity;
        updatedPerformance.realized_pnl =
          (updatedPerformance.realized_pnl || 0) + realizedProfit;

        if (newQuantity <= 0) {
          // Remove holding if sold all shares
          updatedHoldings.splice(existingHoldingIndex, 1);
        } else {
          // Update existing holding
          updatedHoldings[existingHoldingIndex] = {
            ...existingHolding,
            quantity: newQuantity,
            current_price: executedPrice,
            market_value: newQuantity * executedPrice,
            unrealized_pnl:
              (executedPrice - existingHolding.avg_price) * newQuantity,
          };
        }
      }
    }

    // Recalculate portfolio value and total value
    const portfolioValue = updatedHoldings.reduce(
      (sum, holding) => sum + holding.quantity * holding.current_price,
      0
    );

    updatedPortfolio.holdings = updatedHoldings;
    updatedPortfolio.portfolio_value = portfolioValue;
    updatedPortfolio.total_value = updatedPortfolio.cash + portfolioValue;

    // Update performance
    updatedPerformance.cash = updatedPortfolio.cash;
    updatedPerformance.portfolio_value = portfolioValue;
    updatedPerformance.total_value = updatedPortfolio.total_value;
    updatedPerformance.total_return =
      updatedPortfolio.total_value - updatedPerformance.starting_value;
    updatedPerformance.total_return_percent =
      (updatedPerformance.total_return / updatedPerformance.starting_value) *
      100;
    updatedPerformance.holdings_count = updatedHoldings.length;
    updatedPerformance.number_of_trades =
      (updatedPerformance.number_of_trades || 0) + 1;

    // Calculate unrealized PnL
    updatedPerformance.unrealized_pnl = updatedHoldings.reduce(
      (sum, holding) =>
        sum + (holding.current_price - holding.avg_price) * holding.quantity,
      0
    );

    setTestPortfolio(updatedPortfolio);
    setPerformance(updatedPerformance);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setMessage("");
    setValidationError("");
    setIsSubmitting(true);

    try {
      const validation = validateTestOrder();
      if (validation) {
        setIsSubmitting(false);
        return;
      }

      const tradeData = {
        user_id: user.id,
        symbol: symbol.trim(),
        side,
        quantity: parseFloat(quantity),
        order_type: orderType,
        price: parseFloat(price),
      };

      console.log("Submitting trade data:", tradeData);

      // Try to submit to API, fallback to client-side mock if fails
      let response;
      try {
        response = await api.post("/test", tradeData);
      } catch (apiError) {
        console.warn("API error, using mock response:", apiError);
        response = generateMockTradeResponse(tradeData);
      }

      console.log("Trade response:", response.data);

      // Get executed price from response or use input price as fallback
      const executedPrice =
        response.data.executed_price ||
        response.data.trade?.executed_price ||
        parseFloat(price);
      const totalAmount = executedPrice * parseFloat(quantity);

      // Update portfolio data locally
      updatePortfolioAfterTrade(tradeData, executedPrice);

      // Add the trade to trade history
      const newTrade = {
        ...(response.data.trade || {}),
        symbol: symbol,
        side: side,
        quantity: parseFloat(quantity),
        timestamp: response.data.trade?.created_at || new Date().toISOString(),
        executed_price: executedPrice,
        price: parseFloat(price),
        status: "filled",
      };

      setTrades((prevTrades) => [newTrade, ...prevTrades]);

      // Show success message
      setMessage(
        `Test trade executed successfully! ` +
          `${side.toUpperCase()} ${quantity} ${symbol} at $${executedPrice.toFixed(
            2
          )} ` +
          `(Total: $${totalAmount.toFixed(2)})`
      );

      // Reset form quantity safely
      const holdingQty = getHoldingQty(symbol);
      if (side === "sell" && holdingQty === 0) {
        setQuantity("");
      } else {
        setQuantity(1);
      }
    } catch (err) {
      console.error("Trade submission error:", err);

      let errorMsg = "Test trade failed";

      if (err.response) {
        console.error("Error response:", err.response.data);
        errorMsg = formatErrorMessage(err.response.data);
      } else if (err.message) {
        errorMsg = err.message;
      }

      setMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString) => {
    try {
      if (!dateString) return "No date";
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString || "Invalid date";
    }
  };

  if (loading) return <div className="loading">Loading test trading...</div>;

  const selectedStock = stocks.find((s) => s.symbol === symbol);
  const currentHolding = getHoldingQty(symbol);
  const estimatedCost = parseFloat(quantity || 0) * parseFloat(price || 0);

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
              <value>${testPortfolio.cash?.toFixed(2) || "0.00"}</value>
            </div>
            <div className="metric">
              <label>Portfolio Value:</label>
              <value>
                ${testPortfolio.portfolio_value?.toFixed(2) || "0.00"}
              </value>
            </div>
            <div className="metric">
              <label>Total Value:</label>
              <value>${testPortfolio.total_value?.toFixed(2) || "0.00"}</value>
            </div>
            <div className="metric">
              <label>Total Return:</label>
              <value
                className={`${
                  performance.total_return >= 0 ? "positive" : "negative"
                }`}
              >
                {performance.total_return >= 0 ? "+" : ""}$
                {performance.total_return?.toFixed(2) || "0.00"}(
                {performance.total_return_percent?.toFixed(2) || "0.00"}%)
              </value>
            </div>
            <div className="metric">
              <label>Realized P&L:</label>
              <value
                className={`${
                  performance.realized_pnl >= 0 ? "positive" : "negative"
                }`}
              >
                {performance.realized_pnl >= 0 ? "+" : ""}$
                {performance.realized_pnl?.toFixed(2) || "0.00"}
              </value>
            </div>
            <div className="metric">
              <label>Unrealized P&L:</label>
              <value
                className={`${
                  performance.unrealized_pnl >= 0 ? "positive" : "negative"
                }`}
              >
                {performance.unrealized_pnl >= 0 ? "+" : ""}$
                {performance.unrealized_pnl?.toFixed(2) || "0.00"}
              </value>
            </div>
          </div>
        </div>
      )}

      {/* Stock Information */}
      {selectedStock && (
        <div className="stock-info">
          <h3>
            {selectedStock.name} ({selectedStock.symbol})
          </h3>
          <div className="stock-price">
            <span>
              Current Price: <strong>${selectedStock.price.toFixed(2)}</strong>
            </span>
            <span
              className={`price-change ${
                selectedStock.change >= 0 ? "positive" : "negative"
              }`}
            >
              {selectedStock.change >= 0 ? "+" : ""}$
              {selectedStock.change?.toFixed(2)}(
              {selectedStock.change_percent?.toFixed(2)}%)
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
          <label>
            Stock:
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
              disabled={isSubmitting}
            >
              <option value="">Select a stock...</option>
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
            <select
              value={side}
              onChange={(e) => setSide(e.target.value)}
              disabled={isSubmitting}
            >
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
              disabled={isSubmitting}
            >
              <option value="market">Market Order</option>
              <option value="limit">Limit Order</option>
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
              max={side === "sell" ? getHoldingQty(symbol) : undefined}
              value={quantity === 0 ? "" : quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setQuantity(isNaN(val) || val <= 0 ? "" : val);
              }}
              required
              disabled={isSubmitting}
            />
          </label>
          {side === "sell" && (
            <small>Max available: {getHoldingQty(symbol)} shares</small>
          )}
        </div>

        <div className="form-row">
          <label>
            Price:
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              readOnly={orderType === "market"}
              className={orderType === "market" ? "readonly-input" : ""}
              disabled={isSubmitting}
            />
          </label>
          {orderType === "market" && (
            <small>Market orders execute at current price</small>
          )}
        </div>

        {validationError && (
          <div className="validation-error">{validationError}</div>
        )}

        <div className="test-order-summary">
          <h4>Test Order Summary</h4>
          <div className="summary-line">
            <span>Action:</span>
            <span>
              {side.toUpperCase()} {quantity} shares of {symbol}
            </span>
          </div>
          <div className="summary-line">
            <span>Estimated {side === "buy" ? "Cost" : "Proceeds"}:</span>
            <span>${estimatedCost.toFixed(2)}</span>
          </div>
          {side === "buy" && testPortfolio && (
            <div className="summary-line">
              <span>Remaining Virtual Cash:</span>
              <span>${(testPortfolio.cash - estimatedCost).toFixed(2)}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`test-order-btn ${side}-btn`}
          disabled={!!validateTestOrder() || isSubmitting}
        >
          {isSubmitting
            ? "Processing..."
            : `Place Test ${side === "buy" ? "Buy" : "Sell"} Order`}
        </button>
      </form>

      {message && (
        <div
          className={`test-message ${
            message.includes("successfully") ? "success" : "error"
          }`}
        >
          {message}
        </div>
      )}

      {/* Test Holdings */}
      {testPortfolio &&
        testPortfolio.holdings &&
        testPortfolio.holdings.length > 0 && (
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
                  <div>${holding.avg_price?.toFixed(2) || "-"}</div>
                  <div>${holding.current_price?.toFixed(2) || "-"}</div>
                  <div>${holding.market_value?.toFixed(2) || "-"}</div>
                  <div
                    className={`pnl ${
                      (holding.unrealized_pnl || 0) >= 0
                        ? "positive"
                        : "negative"
                    }`}
                  >
                    {(holding.unrealized_pnl || 0) >= 0 ? "+" : ""}$
                    {holding.unrealized_pnl?.toFixed(2) || "0.00"}
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
                <div>{trade.symbol || 'N/A'}</div>
                <div className={`side-${trade.side || 'unknown'}`}>
                  {(trade.side || 'unknown').toUpperCase()}
                </div>
                <div>{trade.quantity || 0}</div>
                <div>${(trade.executed_price || trade.price || 0).toFixed(2)}</div>
                <div>
                  $
                  {(
                    (trade.quantity || 0) * (trade.executed_price || trade.price || 0)
                  ).toFixed(2)}
                </div>
                <div className={`status-${trade.status || 'unknown'}`}>
                  {(trade.status || 'unknown').toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-trades">
            No test trades yet. Start paper trading to see your history here.
          </div>
        )}
      </div>
    </div>
  );
}

export default TestTrading;
