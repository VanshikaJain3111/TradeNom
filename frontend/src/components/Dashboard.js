import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Plot from 'react-plotly.js';
import api from "../services/api";
import syntheticDataService from "../services/syntheticDataService";
import StockTicker from "./StockTicker";
import SimulationControl from "./SimulationControl";
import TradingStats from "./TradingStats";
import LiveMarketData from "./LiveMarketData";
import LiveStockChart from "./LiveStockChart";
import PortfolioSummary from "./PortfolioSummary";
import SystemStatus from "./SystemStatus";
import newsData from "../data/newsData.json";
import "./Dashboard.css";
import Navbar from "./Navbar";

function Dashboard({ setPortfolio, setOrders }) {
  const [portfolioData, setPortfolioData] = useState(null);
  const [ordersData, setOrdersData] = useState([]);
  const [testTrades, setTestTrades] = useState([]);
  const [news, setNews] = useState([]);
  const [personalizedNews, setPersonalizedNews] = useState([]);
  const [newsPage, setNewsPage] = useState(0);
  const [currentPrices, setCurrentPrices] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  
  const newsIntervalRef = useRef(null);
  const priceUpdateUnsubscribe = useRef(null);
  const portfolioRefreshTimer = useRef(null);

  const user = (() => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData || userData === "undefined" || userData === "null") {
        return null;
      }
      return JSON.parse(userData);
    } catch {
      return null;
    }
  })();
  const navigate = useNavigate();

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized) return;

    // Initialize synthetic data service only once
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize synthetic data service if not already done
        if (!syntheticDataService.isInitialized) {
          console.log("Initializing synthetic data service...");
          await syntheticDataService.initialize();
        }

        // Wait a bit for service to be fully ready
        await new Promise((resolve) => setTimeout(resolve, 500));

        await fetchData();

        setIsInitialized(true);
        setIsLoading(false);
        console.log("Dashboard initialization complete");
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        setError("Failed to load dashboard data. Please refresh the page.");
        setIsLoading(false);
      }
    };

    initializeData();

    // Subscribe to price updates with throttling
    priceUpdateUnsubscribe.current = syntheticDataService.onPriceUpdate(
      (prices) => {
        if (prices && Array.isArray(prices)) {
          setCurrentPrices(prices);
          setLastUpdate(Date.now());

          // Throttle portfolio refreshes to prevent flickering
          if (portfolioRefreshTimer.current) {
            clearTimeout(portfolioRefreshTimer.current);
          }
          portfolioRefreshTimer.current = setTimeout(() => {
            refreshPortfolioData();
          }, 1000); // Refresh portfolio max once per second
        }
      }
    );

    return () => {
      if (priceUpdateUnsubscribe.current) {
        priceUpdateUnsubscribe.current();
      }
      if (portfolioRefreshTimer.current) {
        clearTimeout(portfolioRefreshTimer.current);
      }
    };
  }, [isInitialized]); // Remove user and navigate from dependencies

  async function fetchData() {
    try {
      const [portfolioRes, ordersRes, testRes, newsRes] = await Promise.all([
        api.get(`/portfolio/user/${user.id}`),
        api.get(`/orders/user/${user.id}`),
        api.get(`/test/user/${user.id}`),
        api.get("/news"),
      ]);

      setPortfolio(portfolioRes.data || null);
      setOrders((ordersRes.data || []).slice(0, 5));
      setTestTrades((testRes.data || []).slice(0, 5));
      setNews(newsRes.data?.news || []);

      // Get current prices
      const prices = syntheticDataService.getAllCurrentPrices();
      setCurrentPrices(prices || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error loading dashboard data");

      // Fallback to local news data
      try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const todaysNews = newsData[today] || [];
        setNews(todaysNews);

        // Still try to get current prices
        const prices = syntheticDataService.getAllCurrentPrices();
        setCurrentPrices(prices || []);
      } catch (fallbackError) {
        console.error("Fallback data loading failed:", fallbackError);
      }
    }
  }

  async function refreshPortfolioData() {
    try {
      const portfolioRes = await api.get(`/portfolio/user/${user.id}`);
      setPortfolio(portfolioRes.data);
    } catch (err) {
      console.error("Error refreshing portfolio:", err);
    }
  }

  // Filter news for user's holdings
  useEffect(() => {
    if (portfolioData && portfolioData.holdings && news.length > 0) {
      const holdings = portfolioData.holdings.map((h) => h.symbol?.toUpperCase());
      const relevantNews = news
        .filter((article) =>
          article.ticker_sentiment?.some((ticker) =>
            holdings.includes(ticker.ticker)
          )
        )
        .slice(0, 5);
      setPersonalizedNews(relevantNews);
    }
  }, [portfolioData, news]);

  // News carousel effect
  useEffect(() => {
    if (news.length <= 5) return;
    newsIntervalRef.current = setInterval(() => {
      setNewsPage((prev) => (prev + 1) % Math.ceil(news.length / 5));
    }, 120000); // 2 minutes
    return () => clearInterval(newsIntervalRef.current);
  }, [news]);

  if (!user) {
    return (
      <div className="dashboard-container pro-dashboard">
        <div className="dashboard-error">
          <h2>Authentication Required</h2>
          <p>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="dashboard-container pro-dashboard">
        <div className="dashboard-loading">
          <h2>Loading Dashboard...</h2>
          <div className="loading-spinner"></div>
          <p>Initializing market data and portfolio information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container pro-dashboard">
        <div className="dashboard-error">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalValue =
    portfolioData && portfolioData.holdings
      ? portfolioData.holdings
          .reduce((sum, h) => sum + (h.market_value || 0), 0)
          .toFixed(2)
      : "0.00";

  const totalGainLoss =
    portfolioData && portfolioData.holdings
      ? portfolioData.holdings
          .reduce(
            (sum, h) => sum + ((h.market_value || 0) - (h.cost_basis || 0)),
            0
          )
          .toFixed(2)
      : "0.00";

  // Get current 5 news items
  const startIdx = newsPage * 5;
  const currentNews = news.slice(startIdx, startIdx + 5);

  return (
    <div
      className={`dashboard-container pro-dashboard ${
        isLoading ? "loading" : ""
      }`}
    >
      <h1 className="dashboard-title">
        Dashboard
        <span className="last-update">
          Last Update: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </h1>

      {/* Stock Ticker */}
      <StockTicker
        selectedSymbols={
          portfolioData?.holdings?.map((h) => h.symbol) || [
            "AAPL",
            "MSFT",
            "GOOG",
            "TSLA",
            "NVDA",
            "META",
          ]
        }
        maxSymbols={8}
      />

      {/* Portfolio Summary */}
      <PortfolioSummary />

      {/* Trading Statistics */}
      <TradingStats />

      {/* Live Market Data */}
      <LiveMarketData
        symbols={portfolioData?.holdings?.map((h) => h.symbol) || []}
        maxSymbols={6}
      />

      <div className="dashboard-grid">
        {/* Portfolio Section */}
        <div className="dashboard-card portfolio-section">
          <h2>Portfolio Overview</h2>
          <div className="portfolio-value">${totalValue}</div>
          <div
            className={`portfolio-gain-loss ${
              parseFloat(totalGainLoss) >= 0 ? "positive" : "negative"
            }`}
          >
            {parseFloat(totalGainLoss) >= 0 ? "+" : ""}${totalGainLoss} Total
            Gain/Loss
          </div>
          {portfolioData && portfolioData.holdings && portfolioData.holdings.length > 0 && (
            <div className="holdings-summary">
              <h3>Top Holdings</h3>
              {portfolioData.holdings.slice(0, 3).map((holding, idx) => {
                const currentPrice = currentPrices.find(
                  (p) => p.symbol === holding.symbol
                );
                const realTimeValue = currentPrice
                  ? holding.quantity * currentPrice.price
                  : holding.market_value;
                const priceChange = currentPrice ? currentPrice.change : 0;

                return (
                  <div key={idx} className="holding-item">
                    <div className="holding-info">
                      <span className="holding-symbol">{holding.symbol}</span>
                      <span className="holding-price">
                        ${currentPrice?.price?.toFixed(2) || "0.00"}
                        <span
                          className={`price-change ${
                            priceChange >= 0 ? "positive" : "negative"
                          }`}
                        >
                          {priceChange >= 0 ? "+" : ""}
                          {priceChange?.toFixed(2)}
                        </span>
                      </span>
                    </div>
                    <span className="holding-value">
                      ${realTimeValue?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                );
              })}
              <Link to="/portfolio" className="view-all-link">
                View All Holdings →
              </Link>
            </div>
          )}
        </div>

        {/* Recent Orders Section */}
        <div className="dashboard-card orders-section">
          <h2>Recent Orders</h2>
          {ordersData.length > 0 ? (
            <div className="orders-list">
              {ordersData.map((order, idx) => (
                <div key={idx} className="order-item">
                  <div className="order-info">
                    <span className="order-symbol">{order.symbol}</span>
                    <span
                      className={`order-type ${order.order_type?.toLowerCase()}`}
                    >
                      {order.order_type} {order.quantity} @ ${order.price}
                    </span>
                  </div>
                  <span
                    className={`order-status ${order.status?.toLowerCase()}`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
              <Link to="/order" className="view-all-link">
                View All Orders →
              </Link>
            </div>
          ) : (
            <p className="no-data">No recent orders</p>
          )}
        </div>

        {/* Test Trades Section */}
        <div className="dashboard-card testtrades-section">
          <h2>Recent Test Trades</h2>
          {testTrades.length > 0 ? (
            <div className="test-trades-list">
              {testTrades.map((trade, idx) => (
                <div key={idx} className="test-trade-item">
                  <div className="trade-info">
                    <span className="trade-symbol">{trade.symbol}</span>
                    <span className="trade-details">
                      {trade.action} {trade.quantity} @ ${trade.price}
                    </span>
                  </div>
                  <span
                    className={`trade-pnl ${
                      trade.pnl >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {trade.pnl >= 0 ? "+" : ""}$
                    {trade.pnl?.toFixed(2) || "0.00"}
                  </span>
                </div>
              ))}
              <Link to="/test-trading" className="view-all-link">
                View All Test Trades →
              </Link>
            </div>
          ) : (
            <p className="no-data">No recent test trades</p>
          )}
        </div>
      </div>

      {/* Personalized News for Holdings */}
      {personalizedNews.length > 0 && (
        <div className="dashboard-card news-section personalized-news">
          <h2>News for Your Holdings</h2>
          <div className="news-list">
            {personalizedNews.map((item, idx) => (
              <div key={idx} className="news-item news-card">
                <div className="news-header">
                  <div className="news-title">{item.title || "No Title"}</div>
                  <div className="news-tickers">
                    {item.ticker_sentiment?.map((ticker, tidx) => (
                      <span
                        key={tidx}
                        className={`ticker-tag ${ticker.ticker_sentiment_label
                          ?.toLowerCase()
                          .replace("-", "_")}`}
                      >
                        {ticker.ticker}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="news-date">
                  {new Date(item.time_published).toLocaleDateString()}
                </div>
                <div className="news-summary">
                  {item.summary || "Click to read more..."}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General Market News */}
      <div className="dashboard-card news-section news-carousel">
        <h2>Latest Market News</h2>
        {currentNews.length === 0 ? (
          <div className="no-news">No news found.</div>
        ) : (
          <ul className="news-list">
            {currentNews.map((item, idx) => (
              <li key={idx} className="news-item news-card">
                <div className="news-title">{item.title || "No Title"}</div>
                <div className="news-date">
                  {new Date(item.time_published).toLocaleDateString()}
                </div>
                <div className="news-summary">
                  {item.summary || item.content || ""}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link to="/news" className="view-all-link">
          View All News →
        </Link>
      </div>

      {/* System Status */}
      <SystemStatus />
    </div>
  );
}

export default Dashboard;
