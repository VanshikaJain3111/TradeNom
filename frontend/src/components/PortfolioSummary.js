import React, { useState, useEffect } from "react";
import api from "../services/api";
import syntheticDataService from "../services/syntheticDataService";
import "./PortfolioSummary.css";

function PortfolioSummary() {
  const [portfolio, setPortfolio] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [currentPrices, setCurrentPrices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (user) {
      fetchPortfolioData();

      // Subscribe to price updates
      const unsubscribe = syntheticDataService.onPriceUpdate((prices) => {
        setCurrentPrices(prices);
        refreshPortfolioData();
      });

      return unsubscribe;
    }
  }, [user]);

  const fetchPortfolioData = async () => {
    try {
      const [portfolioRes, performanceRes] = await Promise.all([
        api.get(`/portfolio/user/${user.id}`),
        api.get(`/trading/portfolio/performance/${user.id}`),
      ]);

      setPortfolio(portfolioRes.data);
      setPerformance(performanceRes.data);
      setCurrentPrices(syntheticDataService.getAllCurrentPrices());
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching portfolio data:", error);
      setIsLoading(false);
    }
  };

  const refreshPortfolioData = async () => {
    try {
      const portfolioRes = await api.get(`/portfolio/user/${user.id}`);
      setPortfolio(portfolioRes.data);
    } catch (error) {
      console.error("Error refreshing portfolio:", error);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="portfolio-summary loading">Loading portfolio...</div>
    );
  }

  if (!portfolio) {
    return (
      <div className="portfolio-summary error">
        Unable to load portfolio data
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (percentage) => {
    return `${percentage.toFixed(2)}%`;
  };

  const getTotalValue = () => {
    return portfolio.cash + (portfolio.portfolio_value || 0);
  };

  const getTotalReturn = () => {
    return portfolio.total_return || 0;
  };

  const getTotalReturnPercent = () => {
    return portfolio.total_return_percent || 0;
  };

  const getAssetAllocation = () => {
    const totalValue = getTotalValue();
    const cashPercent =
      totalValue > 0 ? (portfolio.cash / totalValue) * 100 : 100;
    const stocksPercent =
      totalValue > 0
        ? ((portfolio.portfolio_value || 0) / totalValue) * 100
        : 0;

    return { cashPercent, stocksPercent };
  };

  const { cashPercent, stocksPercent } = getAssetAllocation();

  return (
    <div className="portfolio-summary">
      <h3>💼 Portfolio Summary</h3>

      <div className="summary-grid">
        <div className="summary-card total-value">
          <div className="card-header">
            <h4>Total Portfolio Value</h4>
          </div>
          <div className="card-value">{formatCurrency(getTotalValue())}</div>
          <div className="card-details">
            <div className="detail-row">
              <span>Cash:</span>
              <span>{formatCurrency(portfolio.cash)}</span>
            </div>
            <div className="detail-row">
              <span>Investments:</span>
              <span>{formatCurrency(portfolio.portfolio_value || 0)}</span>
            </div>
          </div>
        </div>

        <div className="summary-card performance">
          <div className="card-header">
            <h4>Performance</h4>
          </div>
          <div
            className={`card-value ${
              getTotalReturn() >= 0 ? "positive" : "negative"
            }`}
          >
            {formatCurrency(getTotalReturn())}
          </div>
          <div
            className={`percentage ${
              getTotalReturnPercent() >= 0 ? "positive" : "negative"
            }`}
          >
            {getTotalReturnPercent() >= 0 ? "+" : ""}
            {formatPercentage(getTotalReturnPercent())}
          </div>
        </div>

        <div className="summary-card allocation">
          <div className="card-header">
            <h4>Asset Allocation</h4>
          </div>
          <div className="allocation-chart">
            <div
              className="allocation-bar cash"
              style={{ width: `${cashPercent}%` }}
              title={`Cash: ${cashPercent.toFixed(1)}%`}
            ></div>
            <div
              className="allocation-bar stocks"
              style={{ width: `${stocksPercent}%` }}
              title={`Stocks: ${stocksPercent.toFixed(1)}%`}
            ></div>
          </div>
          <div className="allocation-labels">
            <div className="allocation-label">
              <span className="color-indicator cash"></span>
              Cash ({formatPercentage(cashPercent)})
            </div>
            <div className="allocation-label">
              <span className="color-indicator stocks"></span>
              Stocks ({formatPercentage(stocksPercent)})
            </div>
          </div>
        </div>

        {performance && (
          <div className="summary-card stats">
            <div className="card-header">
              <h4>Trading Stats</h4>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Trades:</span>
                <span className="stat-value">
                  {performance.total_trades || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Winning Trades:</span>
                <span className="stat-value positive">
                  {performance.winning_trades || 0}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Volume:</span>
                <span className="stat-value">
                  {formatCurrency(performance.total_volume || 0)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Realized P&L:</span>
                <span
                  className={`stat-value ${
                    (performance.realized_pnl || 0) >= 0
                      ? "positive"
                      : "negative"
                  }`}
                >
                  {formatCurrency(performance.realized_pnl || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {portfolio.holdings && portfolio.holdings.length > 0 && (
        <div className="holdings-preview">
          <h4>Current Holdings ({portfolio.holdings.length})</h4>
          <div className="holdings-list">
            {portfolio.holdings.slice(0, 3).map((holding, index) => {
              const currentPrice = currentPrices.find(
                (p) => p.symbol === holding.symbol
              );
              const realTimeValue = currentPrice
                ? holding.quantity * currentPrice.price
                : holding.market_value;
              const unrealizedPnL = realTimeValue - holding.cost_basis;

              return (
                <div key={index} className="holding-preview">
                  <div className="holding-header">
                    <span className="symbol">{holding.symbol}</span>
                    <span className="quantity">{holding.quantity} shares</span>
                  </div>
                  <div className="holding-values">
                    <span className="market-value">
                      {formatCurrency(realTimeValue)}
                    </span>
                    <span
                      className={`pnl ${
                        unrealizedPnL >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {unrealizedPnL >= 0 ? "+" : ""}
                      {formatCurrency(unrealizedPnL)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {portfolio.holdings.length > 3 && (
            <div className="view-all-holdings">
              +{portfolio.holdings.length - 3} more holdings
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PortfolioSummary;
