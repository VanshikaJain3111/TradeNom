import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
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

  // New state for advanced candlestick chart (matching sample.py behavior)
  const [liveCandlestickData, setLiveCandlestickData] = useState([]);
  const [visibleRows, setVisibleRows] = useState(100); // Start with 100 rows like sample.py
  const [candlestickIndicators, setCandlestickIndicators] = useState(['Volume']); // Volume enabled by default
  const [isRealTimeMode, setIsRealTimeMode] = useState(false); // Start with real-time off initially
  const intervalRef = useRef(null);
  const [candlestickLoading, setCandlestickLoading] = useState(true);

  const availableIndicators = [
    { key: 'SMA', name: 'Simple Moving Average', description: 'Average price over specified period' },
    { key: 'EMA', name: 'Exponential Moving Average', description: 'Weighted average giving more importance to recent prices' },
    { key: 'RSI', name: 'Relative Strength Index', description: 'Momentum oscillator (0-100)' },
    { key: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence' },
    { key: 'BOLLINGER', name: 'Bollinger Bands', description: 'Volatility bands around moving average' }
  ];

  // Available datasets for the candlestick chart
  const DATASETS = {
    "AAPL": "simulated_AAPL_live.csv",
    "TSLA": "simulated_TSLA_live.csv", 
    "GOOG": "simulated_GOOG_live.csv",
    "MSFT": "simulated_MSFT_live.csv",
    "UL": "simulated_UL_live.csv",
    "IBM": "simulated_IBM_live.csv",
    "WMT": "simulated_WMT_live.csv"
  };

  useEffect(() => {
    fetchStocks();
    initializeCandlestickChart();
  }, []);

  // Initialize candlestick chart data
  const initializeCandlestickChart = async () => {
    try {
      setCandlestickLoading(true);
      await loadCandlestickData(symbol);
    } catch (err) {
      console.error('Error initializing candlestick chart:', err);
      setCandlestickLoading(false);
    }
  };

  // Load candlestick data for selected symbol (matching sample.py data source)
  const loadCandlestickData = async (ticker) => {
    try {
      setCandlestickLoading(true);
      
      // Load CSV data directly like sample.py
      const csvFileName = DATASETS[ticker];
      const response = await fetch(`/data/simulation_price_data_July_1-Aug_30/${csvFileName}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load data for ${ticker}`);
      }
      
      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      
      const formattedData = lines.slice(1).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim();
        });
        
        return {
          timestamp: new Date(row.timestamp),
          open: parseFloat(row.open),
          high: parseFloat(row.high),
          low: parseFloat(row.low),
          close: parseFloat(row.close),
          volume: parseInt(row.volume)
        };
      }).filter(item => !isNaN(item.open)); // Filter out invalid data

      setLiveCandlestickData(formattedData);
      setCandlestickLoading(false);
    } catch (err) {
      console.error('Error loading candlestick data:', err);
      setError(`Failed to load candlestick data for ${ticker}`);
      setCandlestickLoading(false);
    }
  };

  // Calculate technical indicators for candlestick chart
  const calculateIndicators = (data) => {
    const indicators = {};

    if (data.length < 14) return indicators;

    // RSI Calculation
    if (candlestickIndicators.includes('RSI')) {
      const prices = data.map(d => d.close);
      const deltas = [];
      
      for (let i = 1; i < prices.length; i++) {
        deltas.push(prices[i] - prices[i - 1]);
      }

      let gains = deltas.map(d => d > 0 ? d : 0);
      let losses = deltas.map(d => d < 0 ? Math.abs(d) : 0);

      // Calculate averages
      let avgGain = gains.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
      let avgLoss = losses.slice(0, 14).reduce((a, b) => a + b, 0) / 14;

      const rsi = [];
      rsi.push(null); // First value is null

      for (let i = 14; i < gains.length; i++) {
        avgGain = (avgGain * 13 + gains[i]) / 14;
        avgLoss = (avgLoss * 13 + losses[i]) / 14;
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }

      indicators.rsi = rsi;
    }

    // MACD Calculation
    if (candlestickIndicators.includes('MACD') && data.length >= 26) {
      const prices = data.map(d => d.close);
      
      // Calculate EMAs
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      
      const macd = [];
      for (let i = 0; i < ema12.length; i++) {
        if (ema12[i] !== null && ema26[i] !== null) {
          macd.push(ema12[i] - ema26[i]);
        } else {
          macd.push(null);
        }
      }

      // Signal line (9-period EMA of MACD)
      const signal = calculateEMA(macd.filter(v => v !== null), 9);
      
      indicators.macd = macd;
      indicators.signal = signal;
    }

    return indicators;
  };

  // Helper function to calculate EMA
  const calculateEMA = (data, period) => {
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA value is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      if (i < data.length) {
        sum += data[i];
        ema.push(i === period - 1 ? sum / period : null);
      }
    }

    // Calculate remaining EMA values
    for (let i = period; i < data.length; i++) {
      ema.push((data[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
    }

    return ema;
  };

  // Start real-time updates for candlestick chart (matching sample.py interval)
  useEffect(() => {
    if (isRealTimeMode && !candlestickLoading) {
      intervalRef.current = setInterval(() => {
        setVisibleRows(prev => {
          const newRows = Math.min(prev + 1, liveCandlestickData.length);
          return newRows;
        });
      }, 1000); // 1 second interval to match sample.py
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRealTimeMode, candlestickLoading, liveCandlestickData.length]);

  // Update candlestick data when symbol changes
  useEffect(() => {
    if (symbol && DATASETS[symbol]) {
      loadCandlestickData(symbol);
      setVisibleRows(100); // Reset visible rows
    }
  }, [symbol]);

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

  // PlotlyChart component that exactly replicates the Dash implementation
  const PlotlyChart = ({ data, indicators, rsiData, macdData }) => {
    // Prepare traces exactly like the Dash implementation
    const traces = [];

    // Candlestick trace - matching exact sample.py implementation
    traces.push({
      x: data.map(d => d.timestamp),
      open: data.map(d => d.open),
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      type: 'candlestick',
      name: 'Candlestick',
      yaxis: 'y'
    });

    // Volume trace - exactly like sample.py
    if (indicators.includes('Volume')) {
      traces.push({
        x: data.map(d => d.timestamp),
        y: data.map(d => d.volume),
        type: 'bar',
        name: 'Volume',
        marker: { color: 'lightblue' },
        yaxis: 'y2'
      });
    }

    // RSI trace - exactly like sample.py
    if (indicators.includes('RSI') && rsiData.length > 0) {
      traces.push({
        x: data.slice(-rsiData.length).map(d => d.timestamp),
        y: rsiData,
        type: 'scatter',
        mode: 'lines',
        name: 'RSI',
        line: { color: 'orange' },
        yaxis: 'y3'
      });
    }

    // MACD trace - exactly like sample.py
    if (indicators.includes('MACD') && macdData.macd.length > 0) {
      traces.push({
        x: data.slice(-macdData.macd.length).map(d => d.timestamp),
        y: macdData.macd,
        type: 'scatter',
        mode: 'lines',
        name: 'MACD',
        line: { color: 'green' },
        yaxis: 'y4'
      });

      if (macdData.signal.length > 0) {
        traces.push({
          x: data.slice(-macdData.signal.length).map(d => d.timestamp),
          y: macdData.signal,
          type: 'scatter',
          mode: 'lines',
          name: 'Signal',
          line: { color: 'red' },
          yaxis: 'y4'
        });
      }
    }

    // Layout exactly matching the Dash implementation from sample.py with proper spacing
    const layout = {
      xaxis: {
        title: 'Time',
        rangeslider: { visible: false }
      },
      yaxis: {
        title: 'Price',
        domain: [0.45, 1]  // Main chart takes top 55%
      },
      yaxis2: {
        title: 'Volume',
        domain: [0.30, 0.42],  // Volume chart with margins
        showgrid: false,
        side: 'left'
      },
      yaxis3: {
        title: 'RSI',
        domain: [0.15, 0.27],  // RSI chart with margins
        showgrid: false,
        side: 'left'
      },
      yaxis4: {
        title: 'MACD',
        domain: [0, 0.12],  // MACD chart at bottom with margins
        showgrid: false,
        side: 'left'
      },
      height: 700,
      margin: { t: 40, b: 40, l: 80, r: 40 },  // Increased left margin for y-axis labels
      legend: {
        orientation: 'h',
        y: 1.02,
        x: 1,
        xanchor: 'right',
        yanchor: 'bottom'
      },
      template: 'plotly_white'
    };

    const config = {
      displayModeBar: false
    };

    return (
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    );
  };

  // Render advanced candlestick chart matching Plotly/Dash layout
  const renderCandlestickChart = () => {
    if (candlestickLoading) {
      return (
        <div className="candlestick-loading">
          <div className="loading-spinner">Loading candlestick chart...</div>
        </div>
      );
    }

    if (!liveCandlestickData.length) {
      return (
        <div className="candlestick-error">
          <p>No candlestick data available for {symbol}</p>
        </div>
      );
    }

    const displayData = liveCandlestickData.slice(0, visibleRows);

    // Calculate RSI exactly like the Dash implementation
    const calculateRSI = (data, period = 14) => {
      if (data.length < period + 1) return [];
      
      const prices = data.map(d => d.close);
      const deltas = [];
      
      for (let i = 1; i < prices.length; i++) {
        deltas.push(prices[i] - prices[i - 1]);
      }
      
      const gains = deltas.map(d => d > 0 ? d : 0);
      const losses = deltas.map(d => d < 0 ? Math.abs(d) : 0);
      
      // Simple moving averages for initial RSI calculation
      let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      
      const rsi = new Array(period).fill(null);
      
      for (let i = period; i < deltas.length; i++) {
        if (avgLoss === 0) {
          rsi.push(100);
        } else {
          const rs = avgGain / avgLoss;
          rsi.push(100 - (100 / (1 + rs)));
        }
        
        // Update averages (exponential smoothing like pandas ewm)
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      }
      
      return rsi;
    };

    // Calculate MACD exactly like the Dash implementation
    const calculateMACD = (data) => {
      if (data.length < 26) return { macd: [], signal: [] };
      
      const prices = data.map(d => d.close);
      
      // Calculate EMA 12 and EMA 26 like pandas ewm
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      
      const macd = [];
      for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
        macd.push(ema12[i] - ema26[i]);
      }
      
      // Signal line is 9-period EMA of MACD
      const signal = calculateEMA(macd, 9);
      
      return { macd, signal };
    };

    const rsiData = calculateRSI(displayData);
    const macdData = calculateMACD(displayData);

    return (
      <div className="plotly-style-container">
        {/* Header matching Plotly layout exactly */}
        <div className="plotly-header">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: '0', fontSize: '24px', fontWeight: '600' }}>Live Candlestick Chart Viewer</h2>
          </div>
          
          <div className="plotly-controls" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div className="stock-selector-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontWeight: '500', color: '#333', fontSize: '14px' }}>Select Stock:</label>
              <select 
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value)}
                className="plotly-dropdown"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  background: 'white',
                  minWidth: '120px'
                }}
              >
                {Object.keys(DATASETS).map(ticker => (
                  <option key={ticker} value={ticker}>{ticker}</option>
                ))}
              </select>
            </div>
            
            <div className="indicator-toggles" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              {['RSI', 'MACD', 'Volume'].map(indicator => (
                <label key={indicator} className="plotly-switch" style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#333'
                }}>
                  <input
                    type="checkbox"
                    checked={candlestickIndicators.includes(indicator)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCandlestickIndicators(prev => [...prev, indicator]);
                      } else {
                        setCandlestickIndicators(prev => prev.filter(i => i !== indicator));
                      }
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span 
                    className="slider"
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '40px',
                      height: '20px',
                      backgroundColor: candlestickIndicators.includes(indicator) ? '#1f77b4' : '#ccc',
                      borderRadius: '20px',
                      transition: '0.3s'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '16px',
                      width: '16px',
                      left: candlestickIndicators.includes(indicator) ? '22px' : '2px',
                      bottom: '2px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s',
                      display: 'block'
                    }}></span>
                  </span>
                  <span className="label" style={{ fontWeight: '500', userSelect: 'none' }}>{indicator}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Use Plotly.js for exact chart replication */}
        <div className="plotly-chart-container">
          <PlotlyChart 
            data={displayData}
            indicators={candlestickIndicators}
            rsiData={rsiData}
            macdData={macdData}
          />
        </div>
      </div>
    );
  };

  const selectedStock = stocks.find(s => s.symbol === symbol);

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Technical Analytics</h2>
        <p>Analyze stocks using technical indicators and chart patterns</p>
      </div>

      {/* Price Charts */}
      <div className="charts-section">
        <div className="chart-tabs">
          <h3>Price Charts</h3>
        </div>
        
        {/* Live Candlestick Chart */}
        <div className="live-candlestick-chart">
          {renderCandlestickChart()}
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
