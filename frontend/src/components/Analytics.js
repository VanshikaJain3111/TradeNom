import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StockChart from './StockChart';
import ComparisonChart from './ComparisonChart';
import CorrelationMatrix from './CorrelationMatrix';
import './Analytics.css';

function Analytics() {
  const [stocks, setStocks] = useState([]);
  const [symbol, setSymbol] = useState('AAPL');
  const [indicators, setIndicators] = useState(['SMA', 'EMA', 'RSI']);
  const [timeframe, setTimeframe] = useState('1D');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIndicators, setSelectedIndicators] = useState({
    SMA: true,
    EMA: true,
    RSI: true,
    MACD: false,
    BOLLINGER: false
  });

  const availableIndicators = [
    { key: 'SMA', name: 'Simple Moving Average', description: 'Average price over specified period' },
    { key: 'EMA', name: 'Exponential Moving Average', description: 'Weighted average giving more importance to recent prices' },
    { key: 'RSI', name: 'Relative Strength Index', description: 'Momentum oscillator (0-100)' },
    { key: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence' },
    { key: 'BOLLINGER', name: 'Bollinger Bands', description: 'Volatility bands around moving average' }
  ];

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const res = await api.get('/trading/stocks');
      setStocks(res.data);
    } catch (err) {
      setError('Failed to load stocks');
    }
  };

  const handleIndicatorChange = (indicator) => {
    setSelectedIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    
    try {
      const selectedIndicatorsList = Object.keys(selectedIndicators)
        .filter(key => selectedIndicators[key]);
      
      const requestData = {
        symbol,
        indicators: selectedIndicatorsList,
        timeframe,
        start_date: '2024-01-01',
        end_date: '2025-08-31'
      };

      const res = await api.post('/analytics/analyze', requestData);
      setAnalysisResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getPriceData = async () => {
    try {
      const res = await api.get(`/analytics/price-data/${symbol}`);
      return res.data;
    } catch (err) {
      setError('Failed to load price data');
      return null;
    }
  };

  const formatValue = (value, decimals = 2) => {
    if (typeof value === 'number') {
      return value.toFixed(decimals);
    }
    return value;
  };

  const getSignalColor = (signal) => {
    switch (signal?.toLowerCase()) {
      case 'buy':
      case 'bullish':
        return 'positive';
      case 'sell':
      case 'bearish':
        return 'negative';
      default:
        return 'neutral';
    }
  };

  const selectedStock = stocks.find(s => s.symbol === symbol);

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Technical Analytics</h2>
        <p>Analyze stocks using technical indicators and chart patterns</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Stock Selection */}
      <div className="analysis-controls">
        <div className="control-section">
          <h3>Stock Selection</h3>
          <div className="stock-selector">
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {stocks.map(stock => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>
            {selectedStock && (
              <div className="stock-info">
                <span>Current Price: <strong>${selectedStock.price.toFixed(2)}</strong></span>
                <span className={`price-change ${selectedStock.change >= 0 ? 'positive' : 'negative'}`}>
                  {selectedStock.change >= 0 ? '+' : ''}${selectedStock.change?.toFixed(2)} 
                  ({selectedStock.change_percent?.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Indicator Selection */}
        <div className="control-section">
          <h3>Technical Indicators</h3>
          <div className="indicators-grid">
            {availableIndicators.map(indicator => (
              <div key={indicator.key} className="indicator-option">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIndicators[indicator.key]}
                    onChange={() => handleIndicatorChange(indicator.key)}
                  />
                  <span className="indicator-name">{indicator.name}</span>
                </label>
                <small className="indicator-description">{indicator.description}</small>
              </div>
            ))}
          </div>
        </div>

        {/* Timeframe Selection */}
        <div className="control-section">
          <h3>Timeframe</h3>
          <div className="timeframe-selector">
            {['1D', '1W', '1M', '3M', '6M', '1Y'].map(tf => (
              <button
                key={tf}
                className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleAnalyze} 
          className="analyze-btn"
          disabled={loading || Object.values(selectedIndicators).every(v => !v)}
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Price Charts */}
      <div className="charts-section">
        <div className="chart-tabs">
          <h3>Price Charts</h3>
        </div>
        
        {/* Individual Stock Chart */}
        <div className="individual-chart">
          <StockChart symbol={symbol} period={timeframe} />
        </div>
        
        {/* Comparison Chart */}
        <div className="comparison-chart">
          <h4>Stock Comparison</h4>
          <ComparisonChart 
            symbols={['AAPL', 'GOOG', 'MSFT', 'TSLA']} 
            period={timeframe} 
          />
        </div>
        
        {/* Correlation Matrix */}
        <div className="correlation-section">
          <CorrelationMatrix symbols={['AAPL', 'GOOG', 'MSFT', 'TSLA']} />
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="analysis-results">
          <h3>Analysis Results for {symbol}</h3>
          
          {/* Overall Signal */}
          {analysisResult.overall_signal && (
            <div className="overall-signal">
              <h4>Overall Signal</h4>
              <div className={`signal-badge ${getSignalColor(analysisResult.overall_signal.signal)}`}>
                {analysisResult.overall_signal.signal.toUpperCase()}
              </div>
              <p>{analysisResult.overall_signal.description}</p>
              <div className="signal-strength">
                Confidence: <strong>{analysisResult.overall_signal.confidence}%</strong>
              </div>
            </div>
          )}

          {/* Indicator Results */}
          <div className="indicators-results">
            <h4>Indicator Analysis</h4>
            <div className="indicators-grid">
              
              {/* SMA Results */}
              {analysisResult.SMA && (
                <div className="indicator-result">
                  <h5>Simple Moving Average (SMA)</h5>
                  <div className="indicator-values">
                    <div>SMA 20: <strong>${formatValue(analysisResult.SMA.sma_20)}</strong></div>
                    <div>SMA 50: <strong>${formatValue(analysisResult.SMA.sma_50)}</strong></div>
                    <div>Current Price vs SMA 20: 
                      <span className={`${analysisResult.SMA.position_vs_sma20 === 'above' ? 'positive' : 'negative'}`}>
                        {analysisResult.SMA.position_vs_sma20}
                      </span>
                    </div>
                    <div className={`signal ${getSignalColor(analysisResult.SMA.signal)}`}>
                      Signal: {analysisResult.SMA.signal}
                    </div>
                  </div>
                </div>
              )}

              {/* EMA Results */}
              {analysisResult.EMA && (
                <div className="indicator-result">
                  <h5>Exponential Moving Average (EMA)</h5>
                  <div className="indicator-values">
                    <div>EMA 12: <strong>${formatValue(analysisResult.EMA.ema_12)}</strong></div>
                    <div>EMA 26: <strong>${formatValue(analysisResult.EMA.ema_26)}</strong></div>
                    <div>Trend: 
                      <span className={`${analysisResult.EMA.trend === 'upward' ? 'positive' : 'negative'}`}>
                        {analysisResult.EMA.trend}
                      </span>
                    </div>
                    <div className={`signal ${getSignalColor(analysisResult.EMA.signal)}`}>
                      Signal: {analysisResult.EMA.signal}
                    </div>
                  </div>
                </div>
              )}

              {/* RSI Results */}
              {analysisResult.RSI && (
                <div className="indicator-result">
                  <h5>Relative Strength Index (RSI)</h5>
                  <div className="indicator-values">
                    <div>RSI: <strong>{formatValue(analysisResult.RSI.rsi)}</strong></div>
                    <div>Condition: 
                      <span className={`${
                        analysisResult.RSI.condition === 'overbought' ? 'negative' : 
                        analysisResult.RSI.condition === 'oversold' ? 'positive' : 'neutral'
                      }`}>
                        {analysisResult.RSI.condition}
                      </span>
                    </div>
                    <div className={`signal ${getSignalColor(analysisResult.RSI.signal)}`}>
                      Signal: {analysisResult.RSI.signal}
                    </div>
                  </div>
                  <div className="rsi-gauge">
                    <div className="gauge-bar">
                      <div 
                        className="gauge-fill" 
                        style={{width: `${Math.min(100, Math.max(0, analysisResult.RSI.rsi))}%`}}
                      ></div>
                    </div>
                    <div className="gauge-labels">
                      <span>0</span>
                      <span>30</span>
                      <span>70</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MACD Results */}
              {analysisResult.MACD && (
                <div className="indicator-result">
                  <h5>MACD</h5>
                  <div className="indicator-values">
                    <div>MACD Line: <strong>{formatValue(analysisResult.MACD.macd_line, 4)}</strong></div>
                    <div>Signal Line: <strong>{formatValue(analysisResult.MACD.signal_line, 4)}</strong></div>
                    <div>Histogram: <strong>{formatValue(analysisResult.MACD.histogram, 4)}</strong></div>
                    <div className={`signal ${getSignalColor(analysisResult.MACD.signal)}`}>
                      Signal: {analysisResult.MACD.signal}
                    </div>
                  </div>
                </div>
              )}

              {/* Bollinger Bands Results */}
              {analysisResult.BOLLINGER && (
                <div className="indicator-result">
                  <h5>Bollinger Bands</h5>
                  <div className="indicator-values">
                    <div>Upper Band: <strong>${formatValue(analysisResult.BOLLINGER.upper_band)}</strong></div>
                    <div>Middle Band: <strong>${formatValue(analysisResult.BOLLINGER.middle_band)}</strong></div>
                    <div>Lower Band: <strong>${formatValue(analysisResult.BOLLINGER.lower_band)}</strong></div>
                    <div>Position: 
                      <span className={`${
                        analysisResult.BOLLINGER.position === 'above_upper' ? 'negative' :
                        analysisResult.BOLLINGER.position === 'below_lower' ? 'positive' : 'neutral'
                      }`}>
                        {analysisResult.BOLLINGER.position}
                      </span>
                    </div>
                    <div className={`signal ${getSignalColor(analysisResult.BOLLINGER.signal)}`}>
                      Signal: {analysisResult.BOLLINGER.signal}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Market Summary */}
          {analysisResult.market_summary && (
            <div className="market-summary">
              <h4>Market Summary</h4>
              <div className="summary-grid">
                <div>Current Price: <strong>${formatValue(analysisResult.market_summary.current_price)}</strong></div>
                <div>Volume: <strong>{analysisResult.market_summary.volume?.toLocaleString()}</strong></div>
                <div>Volatility: <strong>{formatValue(analysisResult.market_summary.volatility, 4)}</strong></div>
                <div>Price Range (24h): 
                  <strong>
                    ${formatValue(analysisResult.market_summary.low)} - ${formatValue(analysisResult.market_summary.high)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Trading Recommendations */}
          {analysisResult.recommendations && (
            <div className="recommendations">
              <h4>Trading Recommendations</h4>
              <div className="recommendations-list">
                {analysisResult.recommendations.map((rec, i) => (
                  <div key={i} className={`recommendation ${getSignalColor(rec.type)}`}>
                    <div className="rec-type">{rec.type.toUpperCase()}</div>
                    <div className="rec-description">{rec.description}</div>
                    {rec.target_price && (
                      <div className="rec-target">Target: ${formatValue(rec.target_price)}</div>
                    )}
                    {rec.stop_loss && (
                      <div className="rec-stop">Stop Loss: ${formatValue(rec.stop_loss)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Market Screener */}
      <div className="market-screener">
        <h3>Market Screener</h3>
        <p>Quick overview of all available stocks</p>
        
        {stocks.length > 0 && (
          <div className="stocks-grid">
            {stocks.map(stock => (
              <div 
                key={stock.symbol} 
                className={`stock-card ${symbol === stock.symbol ? 'selected' : ''}`}
                onClick={() => setSymbol(stock.symbol)}
              >
                <div className="stock-symbol">{stock.symbol}</div>
                <div className="stock-name">{stock.name}</div>
                <div className="stock-price">${stock.price.toFixed(2)}</div>
                <div className={`stock-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                  {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)} 
                  ({stock.change_percent?.toFixed(2)}%)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;
