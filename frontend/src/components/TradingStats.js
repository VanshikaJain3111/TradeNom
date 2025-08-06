import React, { useState, useEffect } from "react";
import api from "../services/api";
import "./TradingStats.css";

function TradingStats() {
  const [stats, setStats] = useState(null);
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
      fetchTradingStats();

      // Update stats every 30 seconds
      const interval = setInterval(fetchTradingStats, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchTradingStats = async () => {
    try {
      const response = await api.get(`/trading/stats/${user.id}`);
      setStats(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching trading stats:", error);
      setIsLoading(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="trading-stats loading">Loading trading statistics...</div>
    );
  }

  if (!stats) {
    return (
      <div className="trading-stats error">
        Unable to load trading statistics
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
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <div className="trading-stats">
      <h3>📈 Trading Performance</h3>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-value buy">{stats.buyOrders}</div>
          <div className="stat-label">Buy Orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-value sell">{stats.sellOrders}</div>
          <div className="stat-label">Sell Orders</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{formatCurrency(stats.totalVolume)}</div>
          <div className="stat-label">Total Volume</div>
        </div>

        <div className="stat-card">
          <div
            className={`stat-value ${
              stats.totalRealizedPnL >= 0 ? "positive" : "negative"
            }`}
          >
            {formatCurrency(stats.totalRealizedPnL)}
          </div>
          <div className="stat-label">Realized P&L</div>
        </div>

        <div className="stat-card">
          <div
            className={`stat-value ${
              stats.winRate >= 50 ? "positive" : "negative"
            }`}
          >
            {formatPercentage(stats.winRate)}
          </div>
          <div className="stat-label">Win Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-value positive">{stats.winningTrades}</div>
          <div className="stat-label">Winning Trades</div>
        </div>

        <div className="stat-card">
          <div className="stat-value negative">{stats.losingTrades}</div>
          <div className="stat-label">Losing Trades</div>
        </div>

        {stats.winningTrades > 0 && (
          <div className="stat-card">
            <div className="stat-value positive">
              {formatCurrency(stats.avgWin)}
            </div>
            <div className="stat-label">Avg Win</div>
          </div>
        )}

        {stats.losingTrades > 0 && (
          <div className="stat-card">
            <div className="stat-value negative">
              {formatCurrency(Math.abs(stats.avgLoss))}
            </div>
            <div className="stat-label">Avg Loss</div>
          </div>
        )}
      </div>

      {stats.totalOrders === 0 && (
        <div className="no-trades">
          <p>
            No trades executed yet. Start trading to see your performance
            statistics!
          </p>
        </div>
      )}
    </div>
  );
}

export default TradingStats;
