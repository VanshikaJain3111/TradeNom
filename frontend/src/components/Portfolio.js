import React, { useEffect, useState } from 'react';
import api from '../services/api';
import PortfolioChart from './PortfolioChart';
import './Portfolio.css';

function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    async function fetchPortfolioData() {
      try {
        const [portfolioRes, performanceRes] = await Promise.all([
          api.get(`/trading/portfolio/user/${user.id}`),
          api.get(`/trading/portfolio/performance/${user.id}`)
        ]);
        setPortfolio(portfolioRes.data);
        setPerformance(performanceRes.data);
        setLoading(false);
      } catch (err) {
        setError('Error loading portfolio data.');
        setLoading(false);
      }
    }
    fetchPortfolioData();
  }, [user.id]);

  const refreshPortfolio = async () => {
    setLoading(true);
    try {
      const [portfolioRes, performanceRes] = await Promise.all([
        api.get(`/trading/portfolio/user/${user.id}`),
        api.get(`/trading/portfolio/performance/${user.id}`)
      ]);
      setPortfolio(portfolioRes.data);
      setPerformance(performanceRes.data);
      setError('');
    } catch (err) {
      setError('Error refreshing portfolio data.');
    }
    setLoading(false);
  };

  if (loading) return <div className="loading">Loading portfolio...</div>;

  return (
    <div className="portfolio-bg">
      <div className="portfolio-card">
        <div className="portfolio-header">
          <h2 className="portfolio-title">My Portfolio</h2>
          <button onClick={refreshPortfolio} className="refresh-btn">
            Refresh
          </button>
        </div>
        
        {error && <p className="portfolio-error">{error}</p>}
        
        {portfolio && performance ? (
          <>
            {/* Portfolio Summary */}
            <div className="portfolio-summary">
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Total Value</label>
                  <value className="total-value">${portfolio.total_value?.toFixed(2) || '0.00'}</value>
                </div>
                <div className="summary-item">
                  <label>Cash</label>
                  <value className="cash-value">${portfolio.cash?.toFixed(2) || '0.00'}</value>
                </div>
                <div className="summary-item">
                  <label>Portfolio Value</label>
                  <value className="portfolio-value">${portfolio.portfolio_value?.toFixed(2) || '0.00'}</value>
                </div>
                <div className="summary-item">
                  <label>Total Return</label>
                  <value className={`return-value ${(portfolio.total_return || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(portfolio.total_return || 0) >= 0 ? '+' : ''}${portfolio.total_return?.toFixed(2) || '0.00'}
                    ({portfolio.total_return_percent?.toFixed(2) || '0.00'}%)
                  </value>
                </div>
              </div>
            </div>

            {/* Portfolio Performance Chart */}
            <div className="chart-section">
              <h3>Portfolio Performance</h3>
              <PortfolioChart userId={user.id} />
            </div>

            {/* Performance Metrics */}
            <div className="performance-section">
              <h3>Performance Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-item">
                  <label>Realized P&L</label>
                  <value className={`${performance.realized_pnl >= 0 ? 'positive' : 'negative'}`}>
                    {performance.realized_pnl >= 0 ? '+' : ''}${performance.realized_pnl?.toFixed(2) || '0.00'}
                  </value>
                </div>
                <div className="metric-item">
                  <label>Unrealized P&L</label>
                  <value className={`${performance.unrealized_pnl >= 0 ? 'positive' : 'negative'}`}>
                    {performance.unrealized_pnl >= 0 ? '+' : ''}${performance.unrealized_pnl?.toFixed(2) || '0.00'}
                  </value>
                </div>
                <div className="metric-item">
                  <label>Total P&L</label>
                  <value className={`${performance.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                    {performance.total_pnl >= 0 ? '+' : ''}${performance.total_pnl?.toFixed(2) || '0.00'}
                  </value>
                </div>
                <div className="metric-item">
                  <label>Holdings Count</label>
                  <value>{performance.holdings_count || 0}</value>
                </div>
              </div>
            </div>

            {/* Holdings Table */}
            {portfolio.holdings && portfolio.holdings.length > 0 ? (
              <div className="holdings-section">
                <h3>Current Holdings</h3>
                <div className="holdings-table">
                  <div className="table-header">
                    <div>Symbol</div>
                    <div>Quantity</div>
                    <div>Avg. Price</div>
                    <div>Current Price</div>
                    <div>Market Value</div>
                    <div>Unrealized P&L</div>
                    <div>Return %</div>
                  </div>
                  {portfolio.holdings.map((holding, i) => (
                    <div key={i} className="table-row">
                      <div className="symbol">{holding.symbol}</div>
                      <div>{holding.quantity}</div>
                      <div>${holding.avg_price?.toFixed(2) || '-'}</div>
                      <div>${holding.current_price?.toFixed(2) || '-'}</div>
                      <div>${holding.market_value?.toFixed(2) || '-'}</div>
                      <div className={`pnl ${(holding.unrealized_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(holding.unrealized_pnl || 0) >= 0 ? '+' : ''}${holding.unrealized_pnl?.toFixed(2) || '0.00'}
                      </div>
                      <div className={`pnl-percent ${(holding.unrealized_pnl_percent || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(holding.unrealized_pnl_percent || 0) >= 0 ? '+' : ''}{holding.unrealized_pnl_percent?.toFixed(2) || '0.00'}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="portfolio-empty">
                <h3>No Holdings</h3>
                <p>Your portfolio is empty. Start trading to see your holdings here.</p>
              </div>
            )}
          </>
        ) : !error ? (
          <p>Loading...</p>
        ) : null}
      </div>
    </div>
  );
}

export default Portfolio;
