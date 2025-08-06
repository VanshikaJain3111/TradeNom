import React, { useEffect, useState } from 'react';
import api from '../services/api';
import PortfolioChart from './PortfolioChart';
import localStorageService from '../services/localStorageService';
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
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user?.id) {
      fetchReports();
    }
  }, [user.id]);

  // Helper function to generate trade history report from localStorage data
  const generateTradeHistoryReport = (orders) => {
    if (!orders || orders.length === 0) {
      return {
        trade_history: [],
        summary: {
          total_trades: 0,
          total_buy_value: 0,
          total_sell_value: 0,
          net_trading_value: 0,
          symbols_traded: 0
        }
      };
    }

    let total_buy_value = 0;
    let total_sell_value = 0;
    const symbols = new Set();

    const trade_history = orders.map(order => {
      const trade_value = order.quantity * order.price;
      
      if (order.side === 'buy') {
        total_buy_value += trade_value;
      } else {
        total_sell_value += trade_value;
      }
      
      symbols.add(order.symbol);

      return {
        id: order.id,
        timestamp: order.timestamp,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        total_value: trade_value,
        status: order.status || 'executed'
      };
    });

    return {
      trade_history,
      summary: {
        total_trades: orders.length,
        total_buy_value,
        total_sell_value,
        net_trading_value: total_buy_value - total_sell_value,
        symbols_traded: symbols.size
      }
    };
  };

  // Helper function to generate portfolio performance report
  const generatePortfolioPerformanceReport = (portfolio, orders, realizedPnL) => {
    const totalRealizedPnL = realizedPnL.reduce((sum, trade) => sum + trade.realizedPnL, 0);
    
    const portfolio_positions = portfolio.holdings.map(holding => ({
      symbol: holding.symbol,
      quantity: holding.quantity,
      avg_price: holding.average_price || holding.avg_price,
      current_price: holding.current_price || holding.average_price,
      cost_basis: holding.cost_basis,
      market_value: holding.market_value || (holding.quantity * (holding.current_price || holding.average_price)),
      unrealized_pnl: holding.unrealized_pnl || 0,
      unrealized_pnl_percent: holding.unrealized_pnl_percent || 0,
      weight_percent: portfolio.portfolio_value > 0 ? 
        ((holding.market_value || (holding.quantity * (holding.current_price || holding.average_price))) / portfolio.portfolio_value) * 100 : 0
    }));

    const performance_summary = {
      total_value: portfolio.total_value,
      cash: portfolio.cash,
      portfolio_value: portfolio.portfolio_value,
      starting_value: 10000.0, // Default starting cash
      total_return: portfolio.total_return,
      total_return_percent: portfolio.total_return_percent,
      realized_pnl: totalRealizedPnL,
      unrealized_pnl: portfolio.total_return,
      total_pnl: totalRealizedPnL + portfolio.total_return,
      number_of_positions: portfolio.holdings.length
    };

    return {
      performance_summary,
      portfolio_positions,
      generation_time: new Date().toISOString()
    };
  };

  // Helper function to generate P&L statement
  const generatePnLStatement = (orders, realizedPnL, portfolio) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last month

    const totalRealizedPnL = realizedPnL.reduce((sum, trade) => sum + trade.realizedPnL, 0);
    const totalUnrealizedPnL = portfolio.total_return || 0;

    // Calculate trading metrics
    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const trading_volume = periodOrders.reduce((sum, order) => sum + (order.quantity * order.price), 0);
    const buy_volume = periodOrders.filter(o => o.side === 'buy').reduce((sum, order) => sum + (order.quantity * order.price), 0);
    const sell_volume = periodOrders.filter(o => o.side === 'sell').reduce((sum, order) => sum + (order.quantity * order.price), 0);

    return {
      period: 'month',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      realized_pnl: totalRealizedPnL,
      unrealized_pnl: totalUnrealizedPnL,
      total_pnl: totalRealizedPnL + totalUnrealizedPnL,
      trading_metrics: {
        total_trades: periodOrders.length,
        trading_volume,
        buy_volume,
        sell_volume,
        net_flow: buy_volume - sell_volume
      },
      realized_trades: realizedPnL.map(trade => ({
        symbol: trade.symbol,
        quantity: trade.quantity,
        sell_price: trade.sellPrice,
        avg_buy_price: trade.buyPrice,
        pnl: trade.realizedPnL,
        timestamp: trade.date
      })),
      unrealized_positions: portfolio.holdings.map(holding => ({
        symbol: holding.symbol,
        quantity: holding.quantity,
        avg_price: holding.average_price || holding.avg_price,
        current_price: holding.current_price || holding.average_price,
        unrealized_pnl: holding.unrealized_pnl || 0
      }))
    };
  };

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    console.log('=== Reports Debug Info ===');
    console.log('User object:', user);
    console.log('User ID:', user.id);
    console.log('User ID type:', typeof user.id);
    
    try {
      // Get data from localStorage instead of API
      const orders = localStorageService.getUserOrders(user.id);
      const portfolio = localStorageService.getPortfolio(user.id);
      const realizedPnL = localStorageService.getRealizedPnLHistory(user.id);
      
      console.log('Orders from localStorage:', orders);
      console.log('Portfolio from localStorage:', portfolio);
      console.log('Realized P&L from localStorage:', realizedPnL);
      
      // Generate trade history report
      const tradeHistoryData = generateTradeHistoryReport(orders);
      
      // Generate portfolio performance report  
      const portfolioPerformanceData = generatePortfolioPerformanceReport(portfolio, orders, realizedPnL);
      
      // Generate P&L statement
      const pnlStatementData = generatePnLStatement(orders, realizedPnL, portfolio);
      
      console.log('Generated Trade History:', tradeHistoryData);
      console.log('Generated Portfolio Performance:', portfolioPerformanceData);
      console.log('Generated P&L Statement:', pnlStatementData);
      
      setTradeHistory(tradeHistoryData);
      setPortfolioPerformance(portfolioPerformanceData);
      setPnlStatement(pnlStatementData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(`Failed to load reports: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchFilteredTradeHistory = async () => {
    try {
      setLoading(true);
      
      // Get orders from localStorage
      let orders = localStorageService.getUserOrders(user.id);
      
      // Apply filters
      if (dateFilter.startDate || dateFilter.endDate || dateFilter.symbol) {
        orders = orders.filter(order => {
          let matches = true;
          
          if (dateFilter.startDate) {
            const orderDate = new Date(order.timestamp);
            const filterDate = new Date(dateFilter.startDate);
            matches = matches && orderDate >= filterDate;
          }
          
          if (dateFilter.endDate) {
            const orderDate = new Date(order.timestamp);
            const filterDate = new Date(dateFilter.endDate + 'T23:59:59');
            matches = matches && orderDate <= filterDate;
          }
          
          if (dateFilter.symbol) {
            matches = matches && order.symbol.toUpperCase() === dateFilter.symbol.toUpperCase();
          }
          
          return matches;
        });
      }
      
      const filteredTradeHistory = generateTradeHistoryReport(orders);
      setTradeHistory(filteredTradeHistory);
      setLoading(false);
    } catch (err) {
      console.error('Error loading filtered trade history:', err);
      setError(`Failed to load filtered trade history: ${err.message}`);
      setLoading(false);
    }
  };

  const exportTradeHistory = async () => {
    try {
      const orders = localStorageService.getUserOrders(user.id);
      
      if (!orders || orders.length === 0) {
        setError('No trade history to export');
        return;
      }
      
      // Create CSV content
      const headers = ['Date', 'Time', 'Symbol', 'Side', 'Quantity', 'Price', 'Total Value', 'Status'];
      const csvContent = [
        headers.join(','),
        ...orders.map(order => {
          const timestamp = new Date(order.timestamp);
          const totalValue = order.quantity * order.price;
          return [
            timestamp.toLocaleDateString(),
            timestamp.toLocaleTimeString(),
            order.symbol,
            order.side.toUpperCase(),
            order.quantity,
            `$${order.price.toFixed(2)}`,
            `$${totalValue.toFixed(2)}`,
            (order.status || 'executed').toUpperCase()
          ].join(',');
        })
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trade_history_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting trade history:', err);
      setError(`Failed to export trade history: ${err.message}`);
    }
  };

  const exportPortfolioPerformance = async () => {
    try {
      const portfolio = localStorageService.getPortfolio(user.id);
      const orders = localStorageService.getUserOrders(user.id);
      const realizedPnL = localStorageService.getRealizedPnLHistory(user.id);
      const performanceData = generatePortfolioPerformanceReport(portfolio, orders, realizedPnL);
      
      // Create CSV content
      const summaryHeaders = ['Metric', 'Value'];
      const summary = performanceData.performance_summary;
      
      const csvContent = [
        'Portfolio Performance Summary',
        summaryHeaders.join(','),
        `Total Value,$${summary.total_value.toFixed(2)}`,
        `Cash,$${summary.cash.toFixed(2)}`,
        `Portfolio Value,$${summary.portfolio_value.toFixed(2)}`,
        `Total Return,$${summary.total_return.toFixed(2)}`,
        `Total Return %,${summary.total_return_percent.toFixed(2)}%`,
        `Realized P&L,$${summary.realized_pnl.toFixed(2)}`,
        `Unrealized P&L,$${summary.unrealized_pnl.toFixed(2)}`,
        `Total P&L,$${summary.total_pnl.toFixed(2)}`,
        '',
        'Current Positions',
        'Symbol,Quantity,Avg Price,Current Price,Cost Basis,Market Value,Unrealized P&L,Return %,Weight %',
        ...performanceData.portfolio_positions.map(position => [
          position.symbol,
          position.quantity,
          `$${position.avg_price.toFixed(2)}`,
          `$${position.current_price.toFixed(2)}`,
          `$${position.cost_basis.toFixed(2)}`,
          `$${position.market_value.toFixed(2)}`,
          `$${position.unrealized_pnl.toFixed(2)}`,
          `${position.unrealized_pnl_percent.toFixed(2)}%`,
          `${position.weight_percent.toFixed(2)}%`
        ].join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `portfolio_performance_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting portfolio performance:', err);
      setError(`Failed to export portfolio performance: ${err.message}`);
    }
  };

  const exportPnlStatement = async (period = 'month') => {
    try {
      const orders = localStorageService.getUserOrders(user.id);
      const realizedPnL = localStorageService.getRealizedPnLHistory(user.id);
      const portfolio = localStorageService.getPortfolio(user.id);
      const pnlData = generatePnLStatement(orders, realizedPnL, portfolio);
      
      // Create CSV content
      const csvContent = [
        `P&L Statement - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
        `Period,${new Date(pnlData.start_date).toLocaleDateString()} to ${new Date(pnlData.end_date).toLocaleDateString()}`,
        '',
        'Summary',
        'Metric,Value',
        `Realized P&L,$${pnlData.realized_pnl.toFixed(2)}`,
        `Unrealized P&L,$${pnlData.unrealized_pnl.toFixed(2)}`,
        `Total P&L,$${pnlData.total_pnl.toFixed(2)}`,
        '',
        'Trading Metrics',
        `Total Trades,${pnlData.trading_metrics.total_trades}`,
        `Trading Volume,$${pnlData.trading_metrics.trading_volume.toFixed(2)}`,
        `Buy Volume,$${pnlData.trading_metrics.buy_volume.toFixed(2)}`,
        `Sell Volume,$${pnlData.trading_metrics.sell_volume.toFixed(2)}`,
        `Net Flow,$${pnlData.trading_metrics.net_flow.toFixed(2)}`,
        ''
      ];
      
      if (pnlData.realized_trades && pnlData.realized_trades.length > 0) {
        csvContent.push(
          'Realized Trades',
          'Date,Symbol,Quantity,Sell Price,Avg Buy Price,P&L',
          ...pnlData.realized_trades.map(trade => [
            new Date(trade.timestamp).toLocaleDateString(),
            trade.symbol,
            trade.quantity,
            `$${trade.sell_price.toFixed(2)}`,
            `$${trade.avg_buy_price.toFixed(2)}`,
            `$${trade.pnl.toFixed(2)}`
          ].join(','))
        );
      }
      
      const csvString = csvContent.join('\n');
      
      // Create and download file
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pnl_statement_${period}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting P&L statement:', err);
      setError(`Failed to export P&L statement: ${err.message}`);
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
          
          {pnlStatement && (
            <div className="pnl-summary">
              <h4>Period Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <label>Period</label>
                  <value>{pnlStatement.period}</value>
                </div>
                <div className="summary-item">
                  <label>Start Date</label>
                  <value>{new Date(pnlStatement.start_date).toLocaleDateString()}</value>
                </div>
                <div className="summary-item">
                  <label>End Date</label>
                  <value>{new Date(pnlStatement.end_date).toLocaleDateString()}</value>
                </div>
                <div className="summary-item">
                  <label>Total Realized P&L</label>
                  <value className={pnlStatement.realized_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(pnlStatement.realized_pnl)}
                  </value>
                </div>
                <div className="summary-item">
                  <label>Total Unrealized P&L</label>
                  <value className={pnlStatement.unrealized_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(pnlStatement.unrealized_pnl)}
                  </value>
                </div>
                <div className="summary-item">
                  <label>Net P&L</label>
                  <value className={pnlStatement.total_pnl >= 0 ? 'positive' : 'negative'}>
                    {formatCurrency(pnlStatement.total_pnl)}
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
