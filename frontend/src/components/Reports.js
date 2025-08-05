import React, { useEffect, useState } from 'react';
import api from '../services/api';
import PortfolioChart from './PortfolioChart';
import './Reports.css';

function Reports() {
  const [tradeHistory, setTradeHistory] = useState(null);
  const [portfolioPerformance, setPortfolioPerformance] = useState(null);
  const [pnlStatement, setPnlStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState('trade-history');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    symbol: ''
  });
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchReports();
  }, [user.id]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const [tradeRes, performanceRes, pnlRes] = await Promise.all([
        api.get(`/reports/trade-history/${user.id}`),
        api.get(`/reports/portfolio-performance/${user.id}`),
        api.get(`/reports/pnl-statement/${user.id}?period=month`)
      ]);
      
      setTradeHistory(tradeRes.data);
      setPortfolioPerformance(performanceRes.data);
      setPnlStatement(pnlRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load reports');
      setLoading(false);
    }
  };

  const fetchFilteredTradeHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('start_date', dateFilter.startDate);
      if (dateFilter.endDate) params.append('end_date', dateFilter.endDate);
      if (dateFilter.symbol) params.append('symbol', dateFilter.symbol);
      
      const res = await api.get(`/reports/trade-history/${user.id}?${params}`);
      setTradeHistory(res.data);
    } catch (err) {
      setError('Failed to load filtered trade history');
    }
  };

  const exportTradeHistory = async () => {
    try {
      const response = await api.get(`/reports/export/trade-history/${user.id}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'trade_history.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export trade history');
    }
  };

  const exportPortfolioPerformance = async () => {
    try {
      const response = await api.get(`/reports/export/portfolio-performance/${user.id}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'portfolio_performance.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export portfolio performance');
    }
  };

  const exportPnlStatement = async (period = 'month') => {
    try {
      const response = await api.get(`/reports/export/pnl-statement/${user.id}?period=${period}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pnl_statement_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export P&L statement');
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  if (loading) return <div className="loading">Loading reports...</div>;

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Trading Reports & Analytics</h2>
        <button onClick={fetchReports} className="refresh-btn">
          Refresh Reports
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Report Navigation */}
      <div className="report-nav">
        <button 
          className={`nav-btn ${selectedReport === 'trade-history' ? 'active' : ''}`}
          onClick={() => setSelectedReport('trade-history')}
        >
          Trade History
        </button>
        <button 
          className={`nav-btn ${selectedReport === 'performance' ? 'active' : ''}`}
          onClick={() => setSelectedReport('performance')}
        >
          Portfolio Performance
        </button>
        <button 
          className={`nav-btn ${selectedReport === 'pnl' ? 'active' : ''}`}
          onClick={() => setSelectedReport('pnl')}
        >
          P&L Statement
        </button>
      </div>

      {/* Trade History Report */}
      {selectedReport === 'trade-history' && tradeHistory && (
        <div className="report-section">
          <div className="section-header">
            <h3>Trade History Report</h3>
            <button onClick={exportTradeHistory} className="export-btn">
              Export to CSV
            </button>
          </div>

          {/* Date Filter */}
          <div className="filter-section">
            <h4>Filter Trades</h4>
            <div className="filter-row">
              <input
                type="date"
                placeholder="Start Date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
              />
              <input
                type="date"
                placeholder="End Date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
              />
              <input
                type="text"
                placeholder="Symbol (e.g., AAPL)"
                value={dateFilter.symbol}
                onChange={(e) => setDateFilter({...dateFilter, symbol: e.target.value.toUpperCase()})}
              />
              <button onClick={fetchFilteredTradeHistory} className="filter-btn">
                Apply Filter
              </button>
            </div>
          </div>

          {/* Trade Summary */}
          {tradeHistory.summary && (
            <div className="trade-summary">
              <h4>Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Total Trades</label>
                  <value>{tradeHistory.summary.total_trades}</value>
                </div>
                <div className="summary-item">
                  <label>Total Buy Value</label>
                  <value>{formatCurrency(tradeHistory.summary.total_buy_value)}</value>
                </div>
                <div className="summary-item">
                  <label>Total Sell Value</label>
                  <value>{formatCurrency(tradeHistory.summary.total_sell_value)}</value>
                </div>
                <div className="summary-item">
                  <label>Net Trading Value</label>
                  <value className={tradeHistory.summary.net_trading_value >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(tradeHistory.summary.net_trading_value)}
                  </value>
                </div>
                <div className="summary-item">
                  <label>Symbols Traded</label>
                  <value>{tradeHistory.summary.symbols_traded}</value>
                </div>
              </div>
            </div>
          )}

          {/* Trade History Table */}
          {tradeHistory.trade_history && tradeHistory.trade_history.length > 0 ? (
            <div className="trades-table">
              <div className="table-header">
                <div>Date/Time</div>
                <div>Symbol</div>
                <div>Side</div>
                <div>Quantity</div>
                <div>Price</div>
                <div>Total Value</div>
                <div>Status</div>
              </div>
              {tradeHistory.trade_history.map((trade, i) => (
                <div key={i} className="table-row">
                  <div>{formatDateTime(trade.timestamp)}</div>
                  <div>{trade.symbol}</div>
                  <div className={`side-${trade.side}`}>{trade.side.toUpperCase()}</div>
                  <div>{trade.quantity}</div>
                  <div>{formatCurrency(trade.price)}</div>
                  <div>{formatCurrency(trade.total_value)}</div>
                  <div className={`status-${trade.status}`}>{trade.status.toUpperCase()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No trades found for the selected criteria.</div>
          )}
        </div>
      )}

      {/* Portfolio Performance Report */}
      {selectedReport === 'performance' && portfolioPerformance && (
        <div className="report-section">
          <div className="section-header">
            <h3>Portfolio Performance Report</h3>
            <button onClick={exportPortfolioPerformance} className="export-btn">
              Export to CSV
            </button>
          </div>
          
          {/* Portfolio Performance Chart */}
          <div className="chart-section">
            <h4>Portfolio Value Over Time</h4>
            <PortfolioChart userId={user.id} />
          </div>
          
          {/* Performance Summary */}
          {portfolioPerformance.performance_summary && (
            <div className="performance-summary">
              <h4>Performance Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Total Value</label>
                  <value>{formatCurrency(portfolioPerformance.performance_summary.total_value)}</value>
                </div>
                <div className="summary-item">
                  <label>Cash</label>
                  <value>{formatCurrency(portfolioPerformance.performance_summary.cash)}</value>
                </div>
                <div className="summary-item">
                  <label>Portfolio Value</label>
                  <value>{formatCurrency(portfolioPerformance.performance_summary.portfolio_value)}</value>
                </div>
                <div className="summary-item">
                  <label>Total Return</label>
                  <value className={portfolioPerformance.performance_summary.total_return >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(portfolioPerformance.performance_summary.total_return)}
                    ({portfolioPerformance.performance_summary.total_return_percent?.toFixed(2)}%)
                  </value>
                </div>
                <div className="summary-item">
                  <label>Realized P&L</label>
                  <value className={portfolioPerformance.performance_summary.realized_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(portfolioPerformance.performance_summary.realized_pnl)}
                  </value>
                </div>
                <div className="summary-item">
                  <label>Unrealized P&L</label>
                  <value className={portfolioPerformance.performance_summary.unrealized_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(portfolioPerformance.performance_summary.unrealized_pnl)}
                  </value>
                </div>
                <div className="summary-item">
                  <label>Total P&L</label>
                  <value className={portfolioPerformance.performance_summary.total_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(portfolioPerformance.performance_summary.total_pnl)}
                  </value>
                </div>
                <div className="summary-item">
                  <label>Number of Positions</label>
                  <value>{portfolioPerformance.performance_summary.number_of_positions}</value>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Positions */}
          {portfolioPerformance.portfolio_positions && portfolioPerformance.portfolio_positions.length > 0 && (
            <div className="positions-section">
              <h4>Current Positions</h4>
              <div className="positions-table">
                <div className="table-header">
                  <div>Symbol</div>
                  <div>Quantity</div>
                  <div>Avg Price</div>
                  <div>Current Price</div>
                  <div>Cost Basis</div>
                  <div>Market Value</div>
                  <div>Unrealized P&L</div>
                  <div>Return %</div>
                  <div>Weight %</div>
                </div>
                {portfolioPerformance.portfolio_positions.map((position, i) => (
                  <div key={i} className="table-row">
                    <div>{position.symbol}</div>
                    <div>{position.quantity}</div>
                    <div>{formatCurrency(position.avg_price)}</div>
                    <div>{formatCurrency(position.current_price)}</div>
                    <div>{formatCurrency(position.cost_basis)}</div>
                    <div>{formatCurrency(position.market_value)}</div>
                    <div className={`pnl ${position.unrealized_pnl >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(position.unrealized_pnl)}
                    </div>
                    <div className={`pnl-percent ${position.unrealized_pnl_percent >= 0 ? 'positive' : 'negative'}`}>
                      {position.unrealized_pnl_percent?.toFixed(2)}%
                    </div>
                    <div>{position.weight_percent?.toFixed(2)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* P&L Statement */}
      {selectedReport === 'pnl' && pnlStatement && (
        <div className="report-section">
          <div className="section-header">
            <h3>Profit & Loss Statement</h3>
            <div className="export-buttons">
              <button onClick={() => exportPnlStatement('week')} className="export-btn">
                Export Weekly CSV
              </button>
              <button onClick={() => exportPnlStatement('month')} className="export-btn">
                Export Monthly CSV
              </button>
              <button onClick={() => exportPnlStatement('quarter')} className="export-btn">
                Export Quarterly CSV
              </button>
            </div>
          </div>
          
          {pnlStatement.period_summary && (
            <div className="pnl-summary">
              <h4>Period Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Period</label>
                  <value>{pnlStatement.period_summary.period}</value>
                </div>
                <div className="summary-item">
                  <label>Start Date</label>
                  <value>{pnlStatement.period_summary.start_date}</value>
                </div>
                <div className="summary-item">
                  <label>End Date</label>
                  <value>{pnlStatement.period_summary.end_date}</value>
                </div>
                <div className="summary-item">
                  <label>Total Realized P&L</label>
                  <value className={pnlStatement.period_summary.total_realized_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(pnlStatement.period_summary.total_realized_pnl)}
                  </value>
                </div>
                <div className="summary-item">
                  <label>Total Unrealized P&L</label>
                  <value className={pnlStatement.period_summary.total_unrealized_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(pnlStatement.period_summary.total_unrealized_pnl)}
                  </value>
                </div>
                <div className="summary-item">
                  <label>Net P&L</label>
                  <value className={pnlStatement.period_summary.net_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(pnlStatement.period_summary.net_pnl)}
                  </value>
                </div>
              </div>
            </div>
          )}

          {pnlStatement.symbol_breakdown && pnlStatement.symbol_breakdown.length > 0 && (
            <div className="pnl-breakdown">
              <h4>P&L by Symbol</h4>
              <div className="breakdown-table">
                <div className="table-header">
                  <div>Symbol</div>
                  <div>Realized P&L</div>
                  <div>Unrealized P&L</div>
                  <div>Total P&L</div>
                  <div>Trades Count</div>
                </div>
                {pnlStatement.symbol_breakdown.map((item, i) => (
                  <div key={i} className="table-row">
                    <div>{item.symbol}</div>
                    <div className={`pnl ${item.realized_pnl >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(item.realized_pnl)}
                    </div>
                    <div className={`pnl ${item.unrealized_pnl >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(item.unrealized_pnl)}
                    </div>
                    <div className={`pnl ${item.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(item.total_pnl)}
                    </div>
                    <div>{item.trades_count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;
