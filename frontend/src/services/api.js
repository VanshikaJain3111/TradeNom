import axios from "axios";
import syntheticDataService from "./syntheticDataService";
import localStorageService from "./localStorageService";

const api = axios.create({
  baseURL: "http://localhost:8000", // Change if backend is hosted elsewhere
  headers: {
    "Content-Type": "application/json",
  },
});

// Enhanced API service that can work with both backend and local storage
class ApiService {
  constructor() {
    this.useLocalStorage = true; // Always use local storage as requested
    this.syntheticDataService = syntheticDataService;
    this.localStorageService = localStorageService;
    this.initialize();
  }

  async initialize() {
    console.log("Initializing API service with local storage mode");
    if (this.useLocalStorage) {
      await this.syntheticDataService.initialize();
      console.log("Synthetic data service initialized");
    }
  }

  // Generic request method
  async request(method, url, data = null) {
    console.log(`API Request: ${method} ${url}`, data);

    if (this.useLocalStorage) {
      const result = await this.handleLocalRequest(method, url, data);
      console.log(`API Response:`, result);
      return result;
    } else {
      // Use original axios API (fallback, not used in current implementation)
      const config = { method, url };
      if (data) config.data = data;
      return api(config);
    }
  }

  // Handle local storage requests
  async handleLocalRequest(method, url, data) {
    const urlParts = url.split("/").filter(Boolean);

    try {
      // Authentication endpoints
      if (url.includes("/auth/login") && method === "POST") {
        let username, password;
        
        // Handle both JSON and URLSearchParams data
        if (data instanceof URLSearchParams) {
          username = data.get('username');
          password = data.get('password');
        } else {
          username = data.username;
          password = data.password;
        }
        
        // Simple demo authentication - accept any email/password
        if (username && password) {
          const user = {
            id: `user_${username.replace('@', '_').replace('.', '_')}`,
            email: username,
            name: username.split('@')[0],
            created_at: new Date().toISOString()
          };
          
          console.log("Login successful for:", username);
          return { data: { user } };
        } else {
          throw new Error("Invalid credentials");
        }
      }

      if (url.includes("/auth/register") && method === "POST") {
        const { email, password, name } = data;
        
        if (email && password) {
          const user = {
            id: `user_${email.replace('@', '_').replace('.', '_')}`,
            email: email,
            name: name || email.split('@')[0],
            created_at: new Date().toISOString()
          };
          
          console.log("Registration successful for:", email);
          return { data: { user } };
        } else {
          throw new Error("Invalid registration data");
        }
      }

      if (url.includes("/portfolio/user/")) {
        const userId = urlParts[urlParts.length - 1];
        if (method === "GET") {
          const currentPrices = this.syntheticDataService.getAllCurrentPrices();
          const portfolio = this.localStorageService.updatePortfolioValues(
            userId,
            currentPrices
          );
          return { data: portfolio };
        }
      }

      if (url.includes("/trading/portfolio/user/")) {
        const userId = urlParts[urlParts.length - 1];
        if (method === "GET") {
          const currentPrices = this.syntheticDataService.getAllCurrentPrices();
          const portfolio = this.localStorageService.updatePortfolioValues(
            userId,
            currentPrices
          );
          return { data: portfolio };
        }
      }

      if (url.includes("/trading/portfolio/performance/")) {
        const userId = urlParts[urlParts.length - 1];
        if (method === "GET") {
          const performance =
            this.localStorageService.getPortfolioPerformance(userId);
          return { data: performance };
        }
      }

      if (url.includes("/orders/user/")) {
        const userId = urlParts[urlParts.length - 1];
        if (method === "GET") {
          const orders = this.localStorageService.getUserOrders(userId);
          return { data: orders };
        }
      }

      if (url.includes("/orders") && method === "POST") {
        const { user_id, symbol, side, quantity, order_type } = data;
        const currentPrice = this.syntheticDataService.getCurrentPrice(symbol);
        const price = order_type === "market" ? currentPrice.price : data.price;

        console.log(
          `Processing ${side} order: ${quantity} shares of ${symbol} at $${price}`
        );

        const order = {
          user_id,
          symbol,
          side,
          quantity,
          price,
          order_type,
          total_value: quantity * price,
        };

        // Execute trade
        try {
          this.localStorageService.executeTrade(user_id, order, currentPrice);
          const savedOrder = this.localStorageService.saveOrder(user_id, order);
          console.log("Order executed successfully:", savedOrder);
          return { data: savedOrder };
        } catch (error) {
          console.error("Order execution failed:", error.message);
          throw new Error(error.message);
        }
      }

      if (url.includes("/test/user/")) {
        const userId = urlParts[urlParts.length - 1];
        if (method === "GET") {
          const testTrades = this.localStorageService.getUserTestTrades(userId);
          return { data: testTrades };
        }
      }

      if (url.includes("/test") && method === "POST") {
        const { user_id, symbol, action, quantity, entry_price, exit_price } =
          data;
        const pnl =
          action === "sell" ? (exit_price - entry_price) * quantity : 0;

        const testTrade = {
          user_id,
          symbol,
          action,
          quantity,
          price: exit_price || entry_price,
          entry_price,
          exit_price,
          pnl,
        };

        const savedTrade = this.localStorageService.saveTestTrade(
          user_id,
          testTrade
        );
        return { data: savedTrade };
      }

      if (url.includes("/trading/stocks")) {
        if (method === "GET") {
          const stocks = this.syntheticDataService.getStockList();
          return { data: stocks };
        }
      }

      if (url.includes("/trading/stats/")) {
        const userId = urlParts[urlParts.length - 1];
        if (method === "GET") {
          const stats = this.localStorageService.getTradingStats(userId);
          return { data: stats };
        }
      }

      if (url.includes("/trading/simulation/status")) {
        if (method === "GET") {
          const status = this.syntheticDataService.getSimulationStatus();
          return { data: status };
        }
      }

      if (url.includes("/news")) {
        if (method === "GET") {
          // Return mock news data
          return {
            data: {
              news: [
                {
                  title: "Market Update: Tech Stocks Rise",
                  summary:
                    "Technology stocks showed strong performance today...",
                  time_published: new Date().toISOString(),
                  ticker_sentiment: [
                    { ticker: "AAPL", ticker_sentiment_label: "bullish" },
                    { ticker: "MSFT", ticker_sentiment_label: "bullish" },
                  ],
                },
              ],
            },
          };
        }
      }

      if (url.includes("/analytics/price-data/")) {
        const symbol = urlParts[urlParts.length - 1];
        const period = data?.period || "1M";
        const historicalData = this.syntheticDataService.getHistoricalData(
          symbol,
          period
        );
        return { data: { data: historicalData } };
      }

      if (url.includes("/analytics/correlation/")) {
        const symbolsParam = urlParts[urlParts.length - 1];
        const requestedSymbols = symbolsParam.split(",");

        // Generate mock correlation data
        const correlationMatrix = {};
        requestedSymbols.forEach((symbol1) => {
          correlationMatrix[symbol1] = {};
          requestedSymbols.forEach((symbol2) => {
            if (symbol1 === symbol2) {
              correlationMatrix[symbol1][symbol2] = 1.0;
            } else {
              // Generate random correlation between -0.8 and 0.8
              correlationMatrix[symbol1][symbol2] = (Math.random() - 0.5) * 1.6;
            }
          });
        });

        return {
          data: {
            symbols: requestedSymbols,
            returns_correlation: correlationMatrix,
          },
        };
      }

      if (url.includes("/analytics/") && method === "GET") {
        // Generic analytics endpoint
        return {
          data: {
            message: "Analytics data not available in local storage mode",
          },
        };
      }

      // Default fallback
      return { data: {} };
    } catch (error) {
      console.error("Local storage request error:", error);
      throw error;
    }
  }

  // Convenience methods
  get(url, config = {}) {
    return this.request("GET", url);
  }

  post(url, data, config = {}) {
    return this.request("POST", url, data);
  }

  put(url, data, config = {}) {
    return this.request("PUT", url, data);
  }

  delete(url, config = {}) {
    return this.request("DELETE", url);
  }
}

// Create enhanced API service instance
const enhancedApi = new ApiService();

export default enhancedApi;
