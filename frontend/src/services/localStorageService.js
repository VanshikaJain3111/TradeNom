// Local Storage Service - Handles all data persistence in browser storage
class LocalStorageService {
  constructor() {
    this.initializeDefaultData();
  }

  // Initialize default data structure if not exists
  initializeDefaultData() {
    if (!this.getItem("portfolios")) {
      this.setItem("portfolios", {});
    }
    if (!this.getItem("orders")) {
      this.setItem("orders", {});
    }
    if (!this.getItem("testTrades")) {
      this.setItem("testTrades", {});
    }
    if (!this.getItem("realizedPnL")) {
      this.setItem("realizedPnL", {});
    }
    if (!this.getItem("users")) {
      this.setItem("users", {});
    }
    if (!this.getItem("nextOrderId")) {
      this.setItem("nextOrderId", 1);
    }
    if (!this.getItem("nextTestTradeId")) {
      this.setItem("nextTestTradeId", 1);
    }
  }

  // Generic get/set methods
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  }

  // User management
  getUser(userId) {
    const users = this.getItem("users") || {};
    return users[userId] || null;
  }

  saveUser(user) {
    const users = this.getItem("users") || {};
    users[user.id] = user;
    this.setItem("users", users);
  }

  // Portfolio management
  getPortfolio(userId) {
    const portfolios = this.getItem("portfolios") || {};
    return portfolios[userId] || this.createDefaultPortfolio(userId);
  }

  savePortfolio(userId, portfolio) {
    const portfolios = this.getItem("portfolios") || {};
    portfolios[userId] = {
      ...portfolio,
      lastUpdate: Date.now(),
    };
    this.setItem("portfolios", portfolios);
  }

  createDefaultPortfolio(userId) {
    const defaultPortfolio = {
      user_id: userId,
      cash: 10000.0,
      holdings: [],
      total_value: 10000.0,
      portfolio_value: 0.0,
      total_return: 0.0,
      total_return_percent: 0.0,
      lastUpdate: Date.now(),
    };
    this.savePortfolio(userId, defaultPortfolio);
    return defaultPortfolio;
  }

  // Update portfolio with current market prices
  updatePortfolioValues(userId, currentPrices) {
    const portfolio = this.getPortfolio(userId);
    let portfolioValue = 0;
    let totalCostBasis = 0;

    // Update holdings with current market values
    portfolio.holdings = portfolio.holdings.map((holding) => {
      const currentPrice = currentPrices.find(
        (p) => p.symbol === holding.symbol
      );
      if (currentPrice) {
        const marketValue = holding.quantity * currentPrice.price;
        portfolioValue += marketValue;
        totalCostBasis += holding.cost_basis;

        return {
          ...holding,
          current_price: currentPrice.price,
          market_value: marketValue,
          unrealized_pnl: marketValue - holding.cost_basis,
          unrealized_pnl_percent:
            holding.cost_basis > 0
              ? ((marketValue - holding.cost_basis) / holding.cost_basis) * 100
              : 0,
        };
      }
      return holding;
    });

    // Update portfolio totals
    portfolio.portfolio_value = portfolioValue;
    portfolio.total_value = portfolio.cash + portfolioValue;
    portfolio.total_return = portfolioValue - totalCostBasis;
    portfolio.total_return_percent =
      totalCostBasis > 0 ? (portfolio.total_return / totalCostBasis) * 100 : 0;

    this.savePortfolio(userId, portfolio);
    return portfolio;
  }

  // Execute a trade (buy/sell) with enhanced validation and logging
  executeTrade(userId, order, currentPrice) {
    const portfolio = this.getPortfolio(userId);
    const { symbol, side, quantity, price, order_type } = order;
    const tradePrice = order_type === "market" ? currentPrice.price : price;
    const totalCost = quantity * tradePrice;

    console.log(
      `Executing ${side} order for ${quantity} shares of ${symbol} at $${tradePrice}`
    );

    if (side === "buy") {
      // Check if user has enough cash
      if (portfolio.cash < totalCost) {
        throw new Error(
          `Insufficient funds. Required: $${totalCost.toFixed(
            2
          )}, Available: $${portfolio.cash.toFixed(2)}`
        );
      }

      // Deduct cash
      portfolio.cash -= totalCost;

      // Add or update holding
      const existingHolding = portfolio.holdings.find(
        (h) => h.symbol === symbol
      );
      if (existingHolding) {
        const newQuantity = existingHolding.quantity + quantity;
        const newCostBasis = existingHolding.cost_basis + totalCost;
        existingHolding.quantity = newQuantity;
        existingHolding.cost_basis = newCostBasis;
        existingHolding.average_price = newCostBasis / newQuantity;
        console.log(
          `Updated holding for ${symbol}: ${newQuantity} shares at avg $${existingHolding.average_price.toFixed(
            2
          )}`
        );
      } else {
        const newHolding = {
          symbol: symbol,
          quantity: quantity,
          cost_basis: totalCost,
          average_price: tradePrice,
          current_price: currentPrice.price,
          market_value: quantity * currentPrice.price,
          purchase_date: new Date().toISOString(),
        };
        portfolio.holdings.push(newHolding);
        console.log(
          `Created new holding for ${symbol}: ${quantity} shares at $${tradePrice}`
        );
      }
    } else {
      // sell
      const holding = portfolio.holdings.find((h) => h.symbol === symbol);
      if (!holding) {
        throw new Error(`No holdings found for ${symbol}`);
      }
      if (holding.quantity < quantity) {
        throw new Error(
          `Insufficient shares to sell. Available: ${holding.quantity}, Requested: ${quantity}`
        );
      }

      // Calculate realized P&L
      const costBasisPerShare = holding.cost_basis / holding.quantity;
      const realizedPnL = (tradePrice - costBasisPerShare) * quantity;

      // Add cash from sale
      portfolio.cash += totalCost;

      // Update or remove holding
      if (holding.quantity === quantity) {
        portfolio.holdings = portfolio.holdings.filter(
          (h) => h.symbol !== symbol
        );
        console.log(
          `Sold all ${quantity} shares of ${symbol} for $${totalCost.toFixed(
            2
          )}. Realized P&L: $${realizedPnL.toFixed(2)}`
        );
      } else {
        const remainingQuantity = holding.quantity - quantity;
        holding.quantity = remainingQuantity;
        holding.cost_basis = remainingQuantity * costBasisPerShare;
        console.log(
          `Sold ${quantity} shares of ${symbol}. Remaining: ${remainingQuantity} shares. Realized P&L: $${realizedPnL.toFixed(
            2
          )}`
        );
      }

      // Store realized P&L for performance tracking
      this.addRealizedPnL(userId, {
        symbol,
        quantity,
        buyPrice: costBasisPerShare,
        sellPrice: tradePrice,
        realizedPnL,
        date: new Date().toISOString(),
      });
    }

    this.savePortfolio(userId, portfolio);
    console.log(
      `Portfolio updated. Cash: $${portfolio.cash.toFixed(2)}, Holdings: ${
        portfolio.holdings.length
      }`
    );
    return portfolio;
  }

  // Order management
  getUserOrders(userId) {
    const orders = this.getItem("orders") || {};
    return orders[userId] || [];
  }

  saveOrder(userId, order) {
    const orders = this.getItem("orders") || {};
    if (!orders[userId]) {
      orders[userId] = [];
    }

    const orderWithId = {
      ...order,
      id: this.getNextOrderId(),
      timestamp: new Date().toISOString(),
      status: "executed", // Since we're executing immediately
    };

    orders[userId].unshift(orderWithId); // Add to beginning for latest first
    this.setItem("orders", orders);

    return orderWithId;
  }

  getNextOrderId() {
    const nextId = this.getItem("nextOrderId") || 1;
    this.setItem("nextOrderId", nextId + 1);
    return nextId;
  }

  // Test trading management
  getUserTestTrades(userId) {
    const testTrades = this.getItem("testTrades") || {};
    return testTrades[userId] || [];
  }

  saveTestTrade(userId, trade) {
    const testTrades = this.getItem("testTrades") || {};
    if (!testTrades[userId]) {
      testTrades[userId] = [];
    }

    const tradeWithId = {
      ...trade,
      id: this.getNextTestTradeId(),
      timestamp: new Date().toISOString(),
    };

    testTrades[userId].unshift(tradeWithId); // Add to beginning for latest first
    this.setItem("testTrades", testTrades);

    return tradeWithId;
  }

  getNextTestTradeId() {
    const nextId = this.getItem("nextTestTradeId") || 1;
    this.setItem("nextTestTradeId", nextId + 1);
    return nextId;
  }

  // Portfolio performance calculation
  getPortfolioPerformance(userId) {
    const portfolio = this.getPortfolio(userId);
    const orders = this.getUserOrders(userId);
    const realizedPnLHistory = this.getRealizedPnLHistory(userId);

    // Calculate total realized P&L
    const totalRealizedPnL = realizedPnLHistory.reduce(
      (sum, trade) => sum + trade.realizedPnL,
      0
    );

    // Calculate daily performance (simplified)
    const performance = {
      daily_return: portfolio.total_return + totalRealizedPnL,
      daily_return_percent: portfolio.total_return_percent,
      total_trades: orders.length,
      winning_trades: orders.filter((o) => {
        // For buy orders, we consider them winning if current price > buy price
        // For sell orders, we consider them winning if sell price > average cost
        return true; // Simplified for now
      }).length,
      total_volume: orders.reduce((sum, o) => sum + o.quantity * o.price, 0),
      realized_pnl: totalRealizedPnL,
      unrealized_pnl: portfolio.total_return,
      total_pnl: portfolio.total_return + totalRealizedPnL,
    };

    return performance;
  }

  // Add realized P&L record
  addRealizedPnL(userId, trade) {
    const pnlHistory = this.getItem("realizedPnL") || {};
    if (!pnlHistory[userId]) {
      pnlHistory[userId] = [];
    }
    pnlHistory[userId].push(trade);
    this.setItem("realizedPnL", pnlHistory);
  }

  // Get realized P&L history
  getRealizedPnLHistory(userId) {
    const pnlHistory = this.getItem("realizedPnL") || {};
    return pnlHistory[userId] || [];
  }

  // Clear all data (for reset/testing)
  clearAllData() {
    localStorage.removeItem("portfolios");
    localStorage.removeItem("orders");
    localStorage.removeItem("testTrades");
    localStorage.removeItem("realizedPnL");
    localStorage.removeItem("nextOrderId");
    localStorage.removeItem("nextTestTradeId");
    this.initializeDefaultData();
  }

  // Export/Import data
  exportData() {
    return {
      portfolios: this.getItem("portfolios"),
      orders: this.getItem("orders"),
      testTrades: this.getItem("testTrades"),
      realizedPnL: this.getItem("realizedPnL"),
      users: this.getItem("users"),
      timestamp: Date.now(),
    };
  }

  importData(data) {
    if (data.portfolios) this.setItem("portfolios", data.portfolios);
    if (data.orders) this.setItem("orders", data.orders);
    if (data.testTrades) this.setItem("testTrades", data.testTrades);
    if (data.realizedPnL) this.setItem("realizedPnL", data.realizedPnL);
    if (data.users) this.setItem("users", data.users);
  }

  // Get trading statistics
  getTradingStats(userId) {
    const orders = this.getUserOrders(userId);
    const realizedPnL = this.getRealizedPnLHistory(userId);

    const buyOrders = orders.filter((o) => o.side === "buy");
    const sellOrders = orders.filter((o) => o.side === "sell");

    const totalBuyVolume = buyOrders.reduce(
      (sum, o) => sum + o.quantity * o.price,
      0
    );
    const totalSellVolume = sellOrders.reduce(
      (sum, o) => sum + o.quantity * o.price,
      0
    );

    const winningTrades = realizedPnL.filter((t) => t.realizedPnL > 0);
    const losingTrades = realizedPnL.filter((t) => t.realizedPnL < 0);

    return {
      totalOrders: orders.length,
      buyOrders: buyOrders.length,
      sellOrders: sellOrders.length,
      totalBuyVolume,
      totalSellVolume,
      totalVolume: totalBuyVolume + totalSellVolume,
      totalRealizedPnL: realizedPnL.reduce((sum, t) => sum + t.realizedPnL, 0),
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        realizedPnL.length > 0
          ? (winningTrades.length / realizedPnL.length) * 100
          : 0,
      avgWin:
        winningTrades.length > 0
          ? winningTrades.reduce((sum, t) => sum + t.realizedPnL, 0) /
            winningTrades.length
          : 0,
      avgLoss:
        losingTrades.length > 0
          ? losingTrades.reduce((sum, t) => sum + t.realizedPnL, 0) /
            losingTrades.length
          : 0,
    };
  }
}

// Create singleton instance
const localStorageService = new LocalStorageService();

export default localStorageService;
