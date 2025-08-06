import React, { useState, useEffect, useCallback, useRef } from "react";
import syntheticDataService from "../services/syntheticDataService";
import "./LiveMarketData.css";

function LiveMarketData({ symbols = [], maxSymbols = 6 }) {
  const [marketData, setMarketData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const updateTimeoutRef = useRef(null);

  const updateMarketData = useCallback(() => {
    // Throttle updates to prevent excessive re-renders
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      try {
        const allPrices = syntheticDataService.getAllCurrentPrices();

        if (!allPrices || allPrices.length === 0) {
          if (!isInitialized) {
            setIsLoading(true);
          }
          return;
        }

        // Filter to selected symbols or use default popular stocks
        let selectedSymbols =
          symbols.length > 0
            ? symbols
            : ["AAPL", "MSFT", "GOOG", "TSLA", "NVDA", "META"];

        // Limit to maxSymbols
        selectedSymbols = selectedSymbols.slice(0, maxSymbols);

        const filteredData = allPrices.filter(
          (price) =>
            selectedSymbols.includes(price.symbol) &&
            price.price !== undefined &&
            price.price !== null
        );

        // Only update if data has actually changed and avoid rapid state changes
        setMarketData((prevData) => {
          if (prevData.length === 0 && filteredData.length > 0) {
            return filteredData; // Initial load
          }

          // Check if prices have actually changed significantly
          const hasSignificantChange = filteredData.some((newStock) => {
            const oldStock = prevData.find((p) => p.symbol === newStock.symbol);
            return (
              !oldStock || Math.abs(oldStock.price - newStock.price) > 0.001
            );
          });

          return hasSignificantChange ? filteredData : prevData;
        });

        if (!isInitialized && filteredData.length > 0) {
          setIsInitialized(true);
          setIsLoading(false);
        }
        setError(null);
      } catch (err) {
        console.error("Error updating market data:", err);
        if (!isInitialized) {
          setError("Failed to load market data");
          setIsLoading(false);
        }
      }
    }, 200); // Increase throttle time to reduce flickering
  }, [symbols, maxSymbols, isInitialized]);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized) {
      updateMarketData();
      return;
    }

    // Check if synthetic data service is initialized
    if (syntheticDataService.isInitialized) {
      updateMarketData();
    } else {
      // Wait for initialization with exponential backoff
      let attempts = 0;
      const checkInit = () => {
        attempts++;
        if (syntheticDataService.isInitialized) {
          console.log("LiveMarketData: Synthetic data service ready");
          updateMarketData();
        } else if (attempts < 20) {
          // Max 2 seconds wait
          setTimeout(checkInit, Math.min(attempts * 100, 500));
        } else {
          console.error("LiveMarketData: Failed to initialize market data");
          setError("Failed to initialize market data");
          setIsLoading(false);
        }
      };
      checkInit();
    }

    // Subscribe to price updates with throttling
    let lastUpdateTime = 0;
    const unsubscribe = syntheticDataService.onPriceUpdate(() => {
      const now = Date.now();
      if (now - lastUpdateTime > 1000) {
        // Throttle to max 1 update per second
        updateMarketData();
        setLastUpdate(now);
        lastUpdateTime = now;
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [updateMarketData, isInitialized]);

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) return "$0.00";
    return `$${Number(price).toFixed(2)}`;
  };

  const formatChange = (change, changePercent) => {
    if (change === undefined || change === null || isNaN(change))
      return "+0.00 (0.00%)";
    if (
      changePercent === undefined ||
      changePercent === null ||
      isNaN(changePercent)
    )
      return `${change >= 0 ? "+" : ""}${Number(change).toFixed(2)} (0.00%)`;

    const sign = change >= 0 ? "+" : "";
    return `${sign}${Number(change).toFixed(2)} (${sign}${Number(
      changePercent
    ).toFixed(2)}%)`;
  };

  const getChangeClass = (change) => {
    if (change === undefined || change === null || isNaN(change)) return "";
    return change >= 0 ? "positive" : "negative";
  };

  const formatVolume = (volume) => {
    if (volume === undefined || volume === null || isNaN(volume)) return "0";
    return Number(volume).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="live-market-data">
        <div className="market-header">
          <h3>📊 Live Market Data</h3>
        </div>
        <div className="loading-message">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-market-data">
        <div className="market-header">
          <h3>📊 Live Market Data</h3>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="live-market-data">
      <div className="market-header">
        <h3>📊 Live Market Data</h3>
        <span className="last-update">
          Last Update: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>

      <div className="market-grid">
        {marketData.map((stock) => (
          <div key={stock.symbol} className="market-card">
            <div className="stock-header">
              <div className="stock-symbol">{stock.symbol}</div>
              <div className="stock-name">
                {stock.name || "Unknown Company"}
              </div>
            </div>

            <div className="stock-price">{formatPrice(stock.price || 0)}</div>

            <div
              className={`stock-change ${getChangeClass(stock.change || 0)}`}
            >
              {formatChange(stock.change || 0, stock.change_percent || 0)}
            </div>

            <div className="stock-details">
              <div className="detail-row">
                <span>Open:</span>
                <span>{formatPrice(stock.open || 0)}</span>
              </div>
              <div className="detail-row">
                <span>High:</span>
                <span>{formatPrice(stock.high || 0)}</span>
              </div>
              <div className="detail-row">
                <span>Low:</span>
                <span>{formatPrice(stock.low || 0)}</span>
              </div>
              <div className="detail-row">
                <span>Volume:</span>
                <span>{formatVolume(stock.volume)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {marketData.length === 0 && !isLoading && (
        <div className="no-data">
          <p>No market data available</p>
        </div>
      )}
    </div>
  );
}

export default LiveMarketData;
