// src/components/CorrelationMatrix.jsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './Analytics.css';

export default function CorrelationMatrix({ symbols = ['AAPL', 'GOOG', 'MSFT', 'TSLA'] }) {
  const [correlationData, setCorrelationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (symbols.length >= 2) {
      fetchCorrelationData();
    }
  }, [symbols]);

  const fetchCorrelationData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const symbolsParam = symbols.join(',');
      const response = await api.get(`/analytics/correlation/${symbolsParam}`);
      setCorrelationData(response.data);
    } catch (err) {
      setError('Failed to fetch correlation data');
      console.error('Error fetching correlation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCorrelationColor = (value) => {
    if (value > 0.7) return '#28a745'; // Strong positive - green
    if (value > 0.3) return '#6cb2eb'; // Moderate positive - light blue
    if (value > -0.3) return '#f8f9fa'; // Weak - light gray
    if (value > -0.7) return '#ffc107'; // Moderate negative - yellow
    return '#dc3545'; // Strong negative - red
  };

  const getTextColor = (value) => {
    return Math.abs(value) > 0.5 ? 'white' : 'black';
  };

  if (loading) {
    return (
      <div className="correlation-container">
        <div className="loading">Loading correlation analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="correlation-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!correlationData) {
    return (
      <div className="correlation-container">
        <div className="no-data">No correlation data available</div>
      </div>
    );
  }

  const { symbols: availableSymbols, returns_correlation } = correlationData;

  return (
    <div className="correlation-container">
      <h4>Stock Correlation Matrix</h4>
      <p className="correlation-description">
        Correlation values range from -1 to 1. Values closer to 1 indicate positive correlation, 
        values closer to -1 indicate negative correlation, and values near 0 indicate no correlation.
      </p>
      
      <div className="correlation-matrix">
        <div className="matrix-header">
          <div className="corner-cell"></div>
          {availableSymbols.map(symbol => (
            <div key={symbol} className="header-cell">{symbol}</div>
          ))}
        </div>
        
        {availableSymbols.map(rowSymbol => (
          <div key={rowSymbol} className="matrix-row">
            <div className="row-header">{rowSymbol}</div>
            {availableSymbols.map(colSymbol => {
              const corrValue = returns_correlation[rowSymbol]?.[colSymbol] || 0;
              return (
                <div
                  key={colSymbol}
                  className="correlation-cell"
                  style={{
                    backgroundColor: getCorrelationColor(corrValue),
                    color: getTextColor(corrValue)
                  }}
                  title={`${rowSymbol} vs ${colSymbol}: ${corrValue.toFixed(3)}`}
                >
                  {corrValue.toFixed(2)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="correlation-legend">
        <h5>Legend:</h5>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#28a745'}}></div>
            <span>Strong Positive (&gt;0.7)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#6cb2eb'}}></div>
            <span>Moderate Positive (0.3-0.7)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#f8f9fa'}}></div>
            <span>Weak (-0.3-0.3)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#ffc107'}}></div>
            <span>Moderate Negative (-0.7--0.3)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#dc3545'}}></div>
            <span>Strong Negative (&lt;-0.7)</span>
          </div>
        </div>
      </div>
      
      <div className="correlation-stats">
        <p><strong>Analysis Date:</strong> {new Date(correlationData.analysis_date).toLocaleString()}</p>
        <p><strong>Data Points:</strong> {correlationData.data_points}</p>
      </div>
    </div>
  );
}
