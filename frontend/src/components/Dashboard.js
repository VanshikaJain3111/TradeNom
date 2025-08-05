import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StockChart from './StockChart';
import PortfolioChart from './PortfolioChart';
import './Dashboard.css';

function Dashboard() {
  const [portfolio, setPortfolio] = useState(null);
  const [orders, setOrders] = useState([]);
  const [testTrades, setTestTrades] = useState([]);
  const [news, setNews] = useState([]);
  const [newsPage, setNewsPage] = useState(0);
  const [stocks, setStocks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [theme, setTheme] = useState('light');
  const [selectedChart, setSelectedChart] = useState('AAPL');
  const [watchlist, setWatchlist] = useState(['AAPL', 'MSFT', 'GOOGL', 'TSLA']);
  const [marketData, setMarketData] = useState({});
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const newsIntervalRef = useRef(null);
  const marketDataIntervalRef = useRef(null);
  
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  })();
  const navigate = useNavigate();

  // Mock market data for major indices
  const marketIndices = [
    { name: 'S&P 500', symbol: 'SPY', value: 4892.37, change: 1.23, volume: '45.2M' },
    { name: 'NASDAQ', symbol: 'QQQ', value: 17496.65, change: 1.78, volume: '32.1M' },
    { name: 'DOW', symbol: 'DIA', value: 38754.38, change: 0.76, volume: '12.5M' },
    { name: 'Russell 2000', symbol: 'IWM', value: 2039.72, change: -0.42, volume: '8.3M' },
    { name: 'VIX', symbol: 'VIX', value: 13.21, change: -4.35, volume: '2.1M' }
  ];

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    const fetchAllData = async () => {
      try {
        const [
          portfolioRes, 
          ordersRes, 
          testRes, 
          newsRes, 
          stocksRes
        ] = await Promise.all([
          api.get(`/portfolio/user/${user.id}`),
          api.get(`/orders/user/${user.id}`),
          api.get(`/test/user/${user.id}`),
          api.get('/news'),
          api.get('/trading/stocks').catch(() => ({ data: [] }))
        ]);
        
        setPortfolio(portfolioRes.data);
        setOrders(ordersRes.data);
        setTestTrades(testRes.data);
        setNews(newsRes.data.news || []);
        setStocks(stocksRes.data || []);
        
        // Fetch analytics data
        try {
          const analyticsRes = await api.get(`/analytics/portfolio-performance/${user.id}`);
          setAnalytics(analyticsRes.data);
        } catch (err) {
          console.log('Analytics not available');
        }
        
        // Mock some notifications and alerts
        setNotifications([
          { id: 1, type: 'success', message: 'Portfolio updated successfully', time: new Date() },
          { id: 2, type: 'warning', message: 'AAPL price alert triggered', time: new Date(Date.now() - 300000) },
          { id: 3, type: 'info', message: 'Monthly report is ready', time: new Date(Date.now() - 600000) }
        ]);
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    
    fetchAllData();
    
    // Set up periodic updates for market data
    marketDataIntervalRef.current = setInterval(() => {
      fetchMarketData();
    }, 30000); // Update every 30 seconds
    
    return () => {
      if (marketDataIntervalRef.current) {
        clearInterval(marketDataIntervalRef.current);
      }
    };
  }, [user, navigate]);

  const fetchMarketData = async () => {
    // In a real app, this would fetch live market data
    // For now, simulate price updates
    const updatedData = {};
    watchlist.forEach(symbol => {
      updatedData[symbol] = {
        price: (100 + Math.random() * 900).toFixed(2),
        change: (Math.random() * 10 - 5).toFixed(2),
        volume: (Math.random() * 50 + 10).toFixed(1) + 'M'
      };
    });
    setMarketData(updatedData);
  };

  // News carousel effect
  useEffect(() => {
    if (news.length <= 5) return;
    newsIntervalRef.current = setInterval(() => {
      setNewsPage(prev => (prev + 1) % Math.ceil(news.length / 5));
    }, 120000); // 2 minutes
    return () => clearInterval(newsIntervalRef.current);
  }, [news]);

  if (!user) return null;

  // Utility functions
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    const num = parseFloat(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  // Portfolio calculations
  const totalValue = portfolio && portfolio.holdings ?
    portfolio.holdings.reduce((sum, h) => sum + (h.market_value || 0), 0) : 0;
  
  const totalInvestment = portfolio && portfolio.holdings ?
    portfolio.holdings.reduce((sum, h) => sum + (h.cost_basis || 0), 0) : 0;
  
  const overallPL = totalValue - totalInvestment;
  const overallPLPercent = totalInvestment > 0 ? (overallPL / totalInvestment) * 100 : 0;
  
  // Mock today's P&L (would come from real-time data)
  const todayPL = totalValue * 0.0132;
  const todayPLPercent = (todayPL / totalValue) * 100;

  // Top holdings
  const topHoldings = portfolio && portfolio.holdings ?
    portfolio.holdings
      .sort((a, b) => (b.market_value || 0) - (a.market_value || 0))
      .slice(0, 5) : [];

  // Recent trades
  const recentTrades = orders ?
    orders
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5) : [];

  // Calculate portfolio diversification score
  const diversificationScore = portfolio && portfolio.holdings && portfolio.holdings.length > 0 ?
    Math.min(100, portfolio.holdings.length * 15) : 0;

  // Risk score calculation
  const riskScore = portfolio && portfolio.holdings && portfolio.holdings.length > 0 ?
    Math.min(100, Math.max(1, Math.round(65 - portfolio.holdings.length * 3 + Math.abs(overallPLPercent)))) : 50;

  // Get current news for carousel
  const startIdx = newsPage * 5;
  const currentNews = news.slice(startIdx, startIdx + 5);
  const trendingNews = news.slice(0, 3);

  // Quick actions
  const handleQuickBuy = () => {
    setShowQuickOrder(true);
  };

  const handleViewReports = () => {
    navigate('/reports');
  };

  const handleViewAnalytics = () => {
    navigate('/analytics');
  };

  const handleAddToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Market status helper function
  const getMarketStatus = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute; // Convert to minutes since midnight
    
    const marketOpen = 9 * 60 + 15; // 9:15 AM in minutes
    const marketClose = 16 * 60; // 4:00 PM in minutes
    
    // Check if it's a weekday (Monday = 1, Sunday = 0)
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    
    if (!isWeekday) {
      return { status: 'Market Closed', indicator: 'closed', reason: 'Weekend' };
    }
    
    if (currentTime >= marketOpen && currentTime <= marketClose) {
      return { status: 'Market Open', indicator: 'open', reason: 'Trading Hours' };
    } else if (currentTime < marketOpen) {
      const minutesToOpen = marketOpen - currentTime;
      const hoursToOpen = Math.floor(minutesToOpen / 60);
      const minsToOpen = minutesToOpen % 60;
      return { 
        status: 'Pre-Market', 
        indicator: 'pre-market', 
        reason: `Opens in ${hoursToOpen}h ${minsToOpen}m` 
      };
    } else {
      return { status: 'Market Closed', indicator: 'closed', reason: 'After Hours' };
    }
  };

  const marketStatus = getMarketStatus();

  return (
    <div className={`dashboard-container pro-dashboard ${theme}`}>
      {/* Header Bar */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">TradeNom</div>
          <div className="market-status">
            <span className={`status-indicator ${marketStatus.indicator}`}></span>
            <div className="market-info">
              <span className="market-status-text">{marketStatus.status}</span>
              <span className="market-hours">9:15 AM - 4:00 PM</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-time">{new Date().toLocaleTimeString()}</div>
          <button className="header-notification" onClick={() => setNotifications([])}>
            <span className="notification-icon">🔔</span>
            {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
          </button>
          <button className="header-theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div className="user-avatar">
            <span>{user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}</span>
          </div>
        </div>
      </div>

      {/* Personalized Greeting */}
      <div className="greeting-section">
        <div className="greeting-content">
          <h1 className="greeting-title">
            {getGreeting()}, {user.full_name?.split(' ')[0] || 'Trader'}!
          </h1>
          <p className="greeting-subtitle">
            Welcome back to your trading dashboard. Here's your portfolio overview.
          </p>
        </div>
        <div className="quick-actions">
          <button className="quick-action-btn primary" onClick={handleQuickBuy}>
            <span className="btn-icon">📈</span>
            Quick Trade
          </button>
          <button className="quick-action-btn secondary" onClick={handleViewReports}>
            <span className="btn-icon">📊</span>
            Reports
          </button>
          <button className="quick-action-btn secondary" onClick={handleViewAnalytics}>
            <span className="btn-icon">🔍</span>
            Analytics
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-bar">
          <div className="notifications-scroll">
            {notifications.map(notification => (
              <div key={notification.id} className={`notification-item ${notification.type}`}>
                <span className="notification-message">{notification.message}</span>
                <span className="notification-time">
                  {Math.floor((Date.now() - notification.time) / 60000)}m ago
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Summary */}
      <section className="market-summary">
        <h2 className="section-title">Market Overview</h2>
        <div className="market-indices-grid">
          {marketIndices.map(index => (
            <div key={index.symbol} className="market-index-card">
              <div className="index-header">
                <h3 className="index-name">{index.name}</h3>
                <span className="index-symbol">{index.symbol}</span>
              </div>
              <div className="index-price">{formatCurrency(index.value)}</div>
              <div className={`index-change ${index.change >= 0 ? 'positive' : 'negative'}`}>
                <span className="change-arrow">{index.change >= 0 ? '▲' : '▼'}</span>
                <span>{formatPercentage(index.change)}</span>
              </div>
              <div className="index-volume">Vol: {index.volume}</div>
              <div className="index-sparkline">
                <svg width="100" height="30" viewBox="0 0 100 30">
                  <path
                    d={`M0,15 Q25,${index.change > 0 ? 20 : 10} 50,15 T100,${index.change > 0 ? 10 : 20}`}
                    fill="none"
                    stroke={index.change >= 0 ? '#10b981' : '#ef4444'}
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Portfolio Overview */}
      <section className="portfolio-overview">
        <h2 className="section-title">Portfolio Overview</h2>
        <div className="portfolio-grid">
          <div className="portfolio-card main-value">
            <div className="card-header">
              <h3>Total Portfolio Value</h3>
              <button className="card-action" onClick={() => navigate('/portfolio')}>
                View Details →
              </button>
            </div>
            <div className="portfolio-value-large">{formatCurrency(totalValue)}</div>
            <div className="portfolio-stats">
              <div className="stat-item">
                <span className="stat-label">Today's P&L</span>
                <span className={`stat-value ${todayPL >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(todayPL)} ({formatPercentage(todayPLPercent)})
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total P&L</span>
                <span className={`stat-value ${overallPL >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(overallPL)} ({formatPercentage(overallPLPercent)})
                </span>
              </div>
            </div>
          </div>

          <div className="portfolio-card">
            <h3>Portfolio Breakdown</h3>
            <div className="breakdown-item">
              <span>Cash Balance</span>
              <span>{formatCurrency(portfolio?.cash || 0)}</span>
            </div>
            <div className="breakdown-item">
              <span>Invested Amount</span>
              <span>{formatCurrency(totalInvestment)}</span>
            </div>
            <div className="breakdown-item">
              <span>Total Holdings</span>
              <span>{portfolio?.holdings?.length || 0} positions</span>
            </div>
          </div>

          <div className="portfolio-card">
            <h3>Risk & Performance</h3>
            <div className="risk-metrics">
              <div className="metric-item">
                <div className="metric-label">Risk Score</div>
                <div className="metric-value">
                  <div className="progress-circle">
                    <svg width="60" height="60" viewBox="0 0 60 60">
                      <circle
                        cx="30" cy="30" r="25"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="4"
                      />
                      <circle
                        cx="30" cy="30" r="25"
                        fill="none"
                        stroke={riskScore > 70 ? '#ef4444' : riskScore > 30 ? '#f59e0b' : '#10b981'}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 25}`}
                        strokeDashoffset={`${2 * Math.PI * 25 * (1 - riskScore / 100)}`}
                        transform="rotate(-90 30 30)"
                      />
                    </svg>
                    <span className="progress-text">{riskScore}</span>
                  </div>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-label">Diversification</div>
                <div className="metric-value">
                  <div className="diversification-bar">
                    <div 
                      className="diversification-fill"
                      style={{ width: `${diversificationScore}%` }}
                    ></div>
                  </div>
                  <span className="metric-text">{diversificationScore}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Holdings & Activity */}
      <section className="holdings-activity">
        <div className="section-split">
          <div className="holdings-section">
            <div className="section-header">
              <h2 className="section-title">Top Holdings</h2>
              <button className="section-action" onClick={() => navigate('/portfolio')}>
                View All →
              </button>
            </div>
            {topHoldings.length > 0 ? (
              <div className="holdings-table">
                <div className="table-header">
                  <span>Symbol</span>
                  <span>Shares</span>
                  <span>Value</span>
                  <span>P&L</span>
                </div>
                {topHoldings.map((holding, idx) => {
                  const gainLoss = (holding.market_value || 0) - (holding.cost_basis || 0);
                  const gainLossPercent = holding.cost_basis > 0 ? (gainLoss / holding.cost_basis) * 100 : 0;
                  return (
                    <div key={idx} className="table-row">
                      <span className="symbol-cell">
                        <strong>{holding.symbol}</strong>
                      </span>
                      <span>{holding.quantity}</span>
                      <span>{formatCurrency(holding.market_value || 0)}</span>
                      <span className={`pnl-cell ${gainLoss >= 0 ? 'positive' : 'negative'}`}>
                        {formatPercentage(gainLossPercent)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-data">
                <p>No holdings found</p>
                <button className="cta-button" onClick={() => navigate('/order')}>
                  Start Trading
                </button>
              </div>
            )}
          </div>

          <div className="activity-section">
            <div className="section-header">
              <h2 className="section-title">Recent Activity</h2>
              <button className="section-action" onClick={() => navigate('/reports')}>
                View All →
              </button>
            </div>
            {recentTrades.length > 0 ? (
              <div className="activity-list">
                {recentTrades.map((trade, idx) => (
                  <div key={idx} className="activity-item">
                    <div className="activity-main">
                      <span className={`activity-side ${trade.side?.toLowerCase()}`}>
                        {trade.side}
                      </span>
                      <div className="activity-details">
                        <span className="activity-symbol">{trade.symbol}</span>
                        <span className="activity-quantity">{trade.quantity} shares @ {formatCurrency(trade.price || 0)}</span>
                      </div>
                    </div>
                    <div className="activity-time">
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Watchlist */}
      <section className="watchlist-section">
        <div className="section-header">
          <h2 className="section-title">Watchlist</h2>
          <button className="section-action" onClick={() => navigate('/analytics')}>
            Manage →
          </button>
        </div>
        <div className="watchlist-grid">
          {watchlist.map(symbol => {
            const data = marketData[symbol] || { price: '0.00', change: '0.00', volume: '0' };
            return (
              <div key={symbol} className="watchlist-card">
                <div className="watchlist-header">
                  <h3 className="watchlist-symbol">{symbol}</h3>
                  <button 
                    className="quick-trade-btn"
                    onClick={() => {
                      setSelectedChart(symbol);
                      handleQuickBuy();
                    }}
                  >
                    Trade
                  </button>
                </div>
                <div className="watchlist-price">{formatCurrency(data.price)}</div>
                <div className={`watchlist-change ${parseFloat(data.change) >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentage(data.change)}
                </div>
                <div className="watchlist-volume">Vol: {data.volume}</div>
                <div className="watchlist-sparkline">
                  <svg width="100" height="25" viewBox="0 0 100 25">
                    <path
                      d={`M0,12 Q25,${Math.random() * 20} 50,12 T100,${Math.random() * 20}`}
                      fill="none"
                      stroke={parseFloat(data.change) >= 0 ? '#10b981' : '#ef4444'}
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Market Insights & Charts */}
      <section className="market-insights">
        <h2 className="section-title">Market Insights</h2>
        <div className="insights-grid">
          <div className="chart-container">
            <div className="chart-header">
              <h3>Portfolio Performance</h3>
              <select 
                value={selectedChart}
                onChange={(e) => setSelectedChart(e.target.value)}
                className="chart-selector"
              >
                <option value="portfolio">Portfolio</option>
                {watchlist.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>
            <div className="chart-wrapper">
              {selectedChart === 'portfolio' ? (
                <PortfolioChart userId={user.id} period="1M" />
              ) : (
                <StockChart symbol={selectedChart} period="1M" />
              )}
            </div>
          </div>
          
          <div className="market-news">
            <h3>Market News</h3>
            <div className="news-feed">
              {trendingNews.length > 0 ? (
                trendingNews.map((item, idx) => (
                  <div key={idx} className="news-item-compact">
                    <div className="news-time">
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                    <div className="news-title-compact">
                      {item.title || 'No Title'}
                    </div>
                    <div className="news-summary-compact">
                      {(item.summary || item.content || '').substring(0, 100)}...
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">No news available</div>
              )}
            </div>
            <button 
              className="view-all-news"
              onClick={() => navigate('/news')}
            >
              View All News →
            </button>
          </div>
        </div>
      </section>

      {/* Test Trading Section */}
      {testTrades && testTrades.length > 0 && (
        <section className="test-trading-section">
          <div className="section-header">
            <h2 className="section-title">Test Trading Performance</h2>
            <button className="section-action" onClick={() => navigate('/test-trading')}>
              View All →
            </button>
          </div>
          <div className="test-trades-summary">
            <div className="test-stat">
              <span className="test-label">Total Test Trades</span>
              <span className="test-value">{testTrades.length}</span>
            </div>
            <div className="test-stat">
              <span className="test-label">Avg. Performance</span>
              <span className="test-value positive">+2.34%</span>
            </div>
            <div className="test-stat">
              <span className="test-label">Best Trade</span>
              <span className="test-value positive">+15.67%</span>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-links">
            <button onClick={() => navigate('/support')}>Support</button>
            <button onClick={() => navigate('/settings')}>Settings</button>
            <button onClick={() => navigate('/reports')}>Reports</button>
          </div>
          <div className="footer-status">
            <span className="server-time">Last updated: {new Date().toLocaleTimeString()}</span>
            <span className="connection-status online">● Connected</span>
          </div>
        </div>
      </footer>

      {/* Quick Order Modal */}
      {showQuickOrder && (
        <div className="modal-overlay" onClick={() => setShowQuickOrder(false)}>
          <div className="quick-order-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quick Trade</h3>
              <button className="modal-close" onClick={() => setShowQuickOrder(false)}>×</button>
            </div>
            <div className="modal-content">
              <p>Quick trade feature for {selectedChart}</p>
              <button 
                className="modal-action-btn"
                onClick={() => {
                  setShowQuickOrder(false);
                  navigate('/order');
                }}
              >
                Go to Full Order Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;




