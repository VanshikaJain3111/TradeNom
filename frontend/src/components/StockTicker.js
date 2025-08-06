// Real-time stock price ticker component
import React, { useEffect, useState, useRef } from "react";
import syntheticDataService from "../services/syntheticDataService";
import "./StockTicker.css";

function StockTicker({ selectedSymbols = [], maxSymbols = 6 }) {
  const [currentPrices, setCurrentPrices] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const priceUpdateUnsubscribe = useRef(null);

  useEffect(() => {
    // Initialize synthetic data service
    const initializeData = async () => {
      await syntheticDataService.initialize();
      setCurrentPrices(syntheticDataService.getAllCurrentPrices());
    };

    initializeData();

    // Subscribe to price updates
    priceUpdateUnsubscribe.current = syntheticDataService.onPriceUpdate(
      (prices) => {
        setCurrentPrices(prices);
        setLastUpdate(Date.now());
      }
    );

    return () => {
      if (priceUpdateUnsubscribe.current) {
        priceUpdateUnsubscribe.current();
      }
    };
  }, []);

  // Filter and limit stocks to display
  const displayStocks = React.useMemo(() => {
    let stocks = currentPrices;

    if (selectedSymbols.length > 0) {
      stocks = stocks.filter((stock) => selectedSymbols.includes(stock.symbol));
    }

    return stocks.slice(0, maxSymbols);
  }, [currentPrices, selectedSymbols, maxSymbols]);

  if (!displayStocks.length) {
    return (
      <div className="stock-ticker">
        <div className="ticker-item loading">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="stock-ticker">
      <div className="ticker-header">
        <span className="market-status">LIVE MARKET DATA</span>
        <span className="last-update">
          Updated: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
      <div className="ticker-scroll">
        {displayStocks.map((stock, index) => (
          <div key={stock.symbol} className="ticker-item">
            <div className="stock-symbol">{stock.symbol}</div>
            <div className="stock-price">
              ${stock.price?.toFixed(2) || "0.00"}
            </div>
            <div
              className={`stock-change ${
                (stock.change || 0) >= 0 ? "positive" : "negative"
              }`}
            >
              {(stock.change || 0) >= 0 ? "+" : ""}$
              {stock.change?.toFixed(2) || "0.00"}
              <span className="change-percent">
                ({(stock.change_percent || 0).toFixed(2)}%)
              </span>
            </div>
            <div className="stock-volume">
              Vol: {(stock.volume || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StockTicker;
