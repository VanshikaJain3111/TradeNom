// Enhanced Synthetic Data Service - Handles real-time data from JSON files based on device time
class SyntheticDataService {
  constructor() {
    this.stockSymbols = [
      "AAPL",
      "AMD",
      "BAC",
      "CRM",
      "DOW",
      "GOOG",
      "GS",
      "IBM",
      "INTC",
      "JPM",
      "META",
      "MSFT",
      "NASDAQ",
      "NKE",
      "NVDA",
      "ORCL",
      "PYPL",
      "SPY",
      "TSLA",
      "UL",
      "VISA",
      "WMT",
    ];
    this.stockData = {};
    this.loadedData = {};
    this.updateCallbacks = [];
    this.isInitialized = false;
    this.simulationStartTime = null; // When the simulation started
    this.dataStartTime = null; // First timestamp in the data
    this.currentSimulationTime = null; // Current simulation time
    this.updateInterval = null;
    this.isRealTimeMode = true; // Use device time to update prices
    this.lastNotificationTime = 0; // Throttling for notifications
    this.notificationThrottle = 500; // Minimum 500ms between notifications
  }

  // Initialize the service by loading all stock data
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing synthetic data service...");
      await Promise.all(
        this.stockSymbols.map((symbol) => this.loadStockData(symbol))
      );

      // Set the data start time from the first data point
      const firstStock = this.stockData[this.stockSymbols[0]];
      if (firstStock && firstStock.data.length > 0) {
        this.dataStartTime = firstStock.data[0].time;
        this.simulationStartTime = Date.now();
        console.log("Simulation initialized successfully");
        console.log(
          "Simulation started at:",
          new Date(this.simulationStartTime)
        );
        console.log("Data starts at:", new Date(this.dataStartTime * 1000));
        console.log(
          "Loaded",
          this.stockSymbols.length,
          "stocks with",
          firstStock.data.length,
          "data points each"
        );

        // Update all prices to current simulation time immediately
        this.stockSymbols.forEach((symbol) => {
          this.updateCurrentPrice(symbol);
        });
      }

      this.isInitialized = true;
      this.startRealTimeUpdates();
    } catch (error) {
      console.error("Failed to initialize synthetic data service:", error);
    }
  }

  // Load stock data from JSON file
  async loadStockData(symbol) {
    try {
      const response = await fetch(`/${symbol}.json`);
      const data = await response.json();
      this.loadedData[symbol] = data;
      this.stockData[symbol] = {
        symbol: data.symbol,
        company: data.company,
        data: data.data,
        currentIndex: 0,
        currentPrice: null,
      };

      // Set initial current price based on first data point
      this.updateCurrentPriceFromData(symbol, 0);
    } catch (error) {
      console.error(`Failed to load data for ${symbol}:`, error);
    }
  }

  // Update current price based on device time and data timestamps
  updateCurrentPrice(symbol) {
    const stockInfo = this.stockData[symbol];
    if (!stockInfo || !stockInfo.data.length) return;

    // Calculate current simulation time based on device time
    const deviceTime = Date.now();
    const elapsedRealTime = deviceTime - this.simulationStartTime; // milliseconds
    const elapsedSimulationTime = Math.floor(elapsedRealTime / 1000); // seconds

    // Calculate the target data timestamp
    const targetTime = this.dataStartTime + elapsedSimulationTime;

    // Find the closest data point to target time
    let closestIndex = 0;
    let minDiff = Math.abs(stockInfo.data[0].time - targetTime);

    for (let i = 1; i < stockInfo.data.length; i++) {
      const diff = Math.abs(stockInfo.data[i].time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    // Update to the closest index
    this.updateCurrentPriceFromData(symbol, closestIndex);
  }

  // Update current price from specific data index
  updateCurrentPriceFromData(symbol, dataIndex) {
    const stockInfo = this.stockData[symbol];
    if (
      !stockInfo ||
      !stockInfo.data.length ||
      dataIndex >= stockInfo.data.length ||
      dataIndex < 0
    ) {
      return;
    }

    stockInfo.currentIndex = dataIndex;
    const currentData = stockInfo.data[dataIndex];

    // Ensure we have valid data
    if (!currentData || typeof currentData.close !== "number") {
      console.warn(
        `Invalid data for ${symbol} at index ${dataIndex}:`,
        currentData
      );
      return;
    }

    // Calculate price change from previous data point
    const prevData =
      dataIndex > 0 ? stockInfo.data[dataIndex - 1] : currentData;
    const prevClose =
      prevData && typeof prevData.close === "number"
        ? prevData.close
        : currentData.close;

    const change = currentData.close - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    // Store current market data with validation
    stockInfo.currentPrice = {
      symbol: symbol,
      name: stockInfo.company || `${symbol} Inc.`,
      price: currentData.close || 0,
      open: currentData.open || currentData.close || 0,
      high: currentData.high || currentData.close || 0,
      low: currentData.low || currentData.close || 0,
      volume: currentData.volume || 0,
      change: change || 0,
      change_percent: changePercent || 0,
      timestamp: currentData.time || Math.floor(Date.now() / 1000),
      lastUpdate: Date.now(),
    };
  }

  // Get current price for a specific stock
  getCurrentPrice(symbol) {
    const stockInfo = this.stockData[symbol];
    if (!stockInfo || !stockInfo.currentPrice) {
      return {
        symbol: symbol,
        name: `${symbol} Inc.`,
        price: 100,
        open: 100,
        high: 100,
        low: 100,
        volume: 0,
        change: 0,
        change_percent: 0,
        timestamp: Math.floor(Date.now() / 1000),
        lastUpdate: Date.now(),
      };
    }

    // Ensure all required properties exist
    const currentPrice = stockInfo.currentPrice;
    return {
      symbol: currentPrice.symbol || symbol,
      name: currentPrice.name || stockInfo.company || `${symbol} Inc.`,
      price: currentPrice.price || 100,
      open: currentPrice.open || currentPrice.price || 100,
      high: currentPrice.high || currentPrice.price || 100,
      low: currentPrice.low || currentPrice.price || 100,
      volume: currentPrice.volume || 0,
      change: currentPrice.change || 0,
      change_percent: currentPrice.change_percent || 0,
      timestamp: currentPrice.timestamp || Math.floor(Date.now() / 1000),
      lastUpdate: currentPrice.lastUpdate || Date.now(),
    };
  }

  // Get all current stock prices
  getAllCurrentPrices() {
    const prices = [];
    this.stockSymbols.forEach((symbol) => {
      prices.push(this.getCurrentPrice(symbol));
    });
    return prices;
  }

  // Get historical data for a stock
  getHistoricalData(symbol, period = "1M") {
    const stockInfo = this.stockData[symbol];
    if (!stockInfo || !stockInfo.data.length) return [];

    const currentTime = Math.floor(Date.now() / 1000);
    let startTime;

    // Calculate start time based on period
    switch (period) {
      case "1W":
        startTime = currentTime - 7 * 24 * 60 * 60;
        break;
      case "1M":
        startTime = currentTime - 30 * 24 * 60 * 60;
        break;
      case "3M":
        startTime = currentTime - 90 * 24 * 60 * 60;
        break;
      case "6M":
        startTime = currentTime - 180 * 24 * 60 * 60;
        break;
      case "1Y":
        startTime = currentTime - 365 * 24 * 60 * 60;
        break;
      default:
        startTime = currentTime - 30 * 24 * 60 * 60;
    }

    return stockInfo.data
      .filter((item) => item.time >= startTime && item.time <= currentTime)
      .map((item) => ({
        timestamp: new Date(item.time * 1000).toISOString(),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }));
  }

  // Start real-time updates every 2 minutes (more realistic)
  startRealTimeUpdates() {
    // Update immediately
    this.updateAllPrices();

    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 2 minutes (120 seconds) for smoother performance
    this.updateInterval = setInterval(() => {
      this.updateAllPrices();
      console.log("Price update at:", new Date().toLocaleTimeString());
    }, 120000); // 2 minutes to reduce flickering while maintaining real-time feel
  }

  // Update all stock prices based on current device time
  updateAllPrices() {
    if (!this.simulationStartTime || !this.dataStartTime) {
      console.warn("Simulation not properly initialized");
      return;
    }

    this.stockSymbols.forEach((symbol) => {
      this.updateCurrentPrice(symbol);
    });

    // Notify all subscribers
    this.notifyUpdateCallbacks();
  }

  // Move to next data point for a stock (manual progression)
  moveToNextDataPoint(symbol) {
    const stockInfo = this.stockData[symbol];
    if (!stockInfo || !stockInfo.data.length) return;

    const currentIndex = stockInfo.currentIndex;
    const nextIndex = Math.min(currentIndex + 1, stockInfo.data.length - 1);

    this.updateCurrentPriceFromData(symbol, nextIndex);
  }

  // Move to previous data point for a stock (manual regression)
  moveToPreviousDataPoint(symbol) {
    const stockInfo = this.stockData[symbol];
    if (!stockInfo || !stockInfo.data.length) return;

    const currentIndex = stockInfo.currentIndex;
    const prevIndex = Math.max(currentIndex - 1, 0);

    this.updateCurrentPriceFromData(symbol, prevIndex);
  }

  // Get simulation status information
  getSimulationStatus() {
    if (!this.simulationStartTime || !this.dataStartTime) {
      return {
        isActive: false,
        message: "Simulation not initialized",
      };
    }

    const deviceTime = Date.now();
    const elapsedRealTime = deviceTime - this.simulationStartTime;
    const elapsedSimulationTime = Math.floor(elapsedRealTime / 1000);
    const currentSimulationTimestamp =
      this.dataStartTime + elapsedSimulationTime;

    return {
      isActive: true,
      simulationStartTime: new Date(this.simulationStartTime),
      dataStartTime: new Date(this.dataStartTime * 1000),
      currentSimulationTime: new Date(currentSimulationTimestamp * 1000),
      elapsedRealTime: elapsedRealTime,
      elapsedSimulationTime: elapsedSimulationTime,
    };
  }

  // Subscribe to price updates
  onPriceUpdate(callback) {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  // Notify all update callbacks with throttling
  notifyUpdateCallbacks() {
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationThrottle) {
      return; // Skip if too soon since last notification
    }

    this.lastNotificationTime = now;
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(this.getAllCurrentPrices());
      } catch (error) {
        console.error("Error in price update callback:", error);
      }
    });
  }

  // Get stock list for dropdowns
  getStockList() {
    return this.stockSymbols.map((symbol) => ({
      symbol: symbol,
      name: this.stockData[symbol]?.company || `${symbol} Inc.`,
      price: this.getCurrentPrice(symbol).price,
    }));
  }

  // Stop real-time updates
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Reset simulation to start
  resetSimulation() {
    this.simulationStartTime = Date.now();
    this.stockSymbols.forEach((symbol) => {
      this.updateCurrentPriceFromData(symbol, 0);
    });
    this.notifyUpdateCallbacks();
  }

  // Set simulation speed (multiplier for real time)
  setSimulationSpeed(multiplier = 1) {
    this.stopRealTimeUpdates();

    const updateInterval = Math.max(1000, 60000 / multiplier); // Minimum 1 second intervals

    this.updateInterval = setInterval(() => {
      this.updateAllPrices();
    }, updateInterval);
  }
}

// Create singleton instance
const syntheticDataService = new SyntheticDataService();

export default syntheticDataService;
