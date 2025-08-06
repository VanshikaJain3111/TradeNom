import React, { useState, useEffect, useCallback, useRef } from "react";
import syntheticDataService from "../services/syntheticDataService";
import "./SpreadDisplay.css";

function SpreadDisplay({ symbol, className = "" }) {
  const [orderBookData, setOrderBookData] = useState({
    bids: [],
    asks: [],
    bestBid: 0,
    bestAsk: 0,
    spread: 0,
    spreadPercent: 0,
    midPrice: 0,
    lastUpdate: Date.now(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFullDepth, setShowFullDepth] = useState(false);
  const updateTimeoutRef = useRef(null);
  const priceUpdateUnsubscribe = useRef(null);

  const calculateOrderBook = useCallback((currentPrice) => {
    if (!currentPrice || !currentPrice.price) {
      return {
        bids: [],
        asks: [],
        bestBid: 0,
        bestAsk: 0,
        spread: 0,
        spreadPercent: 0,
        midPrice: 0,
        lastUpdate: Date.now(),
      };
    }

    const basePrice = currentPrice.price;
    let spreadPercentage;
    
    if (basePrice < 10) {
      spreadPercentage = 0.005; // 0.5% for low-priced stocks
    } else if (basePrice < 50) {
      spreadPercentage = 0.001; // 0.1% for mid-priced stocks
    } else if (basePrice < 200) {
      spreadPercentage = 0.0005; // 0.05% for high-priced stocks
    } else {
      spreadPercentage = 0.0002; // 0.02% for very high-priced stocks
    }
    
    const randomFactor = 0.8 + (Math.random() * 0.4);
    spreadPercentage *= randomFactor;
    
    const halfSpread = basePrice * spreadPercentage / 2;
    const bestBid = Math.max(0.01, basePrice - halfSpread);
    const bestAsk = basePrice + halfSpread;
    
    // Generate multiple bid/ask levels
    const levels = 20;
    const bids = [];
    const asks = [];
    
    // Calculate price increments for deeper levels
    const priceIncrement = halfSpread / levels * 2;
    const baseVolume = currentPrice.volume || 100000;
    
    // Generate bid levels (descending prices from best bid)
    for (let i = 0; i < levels; i++) {
      const levelPrice = bestBid - (i * priceIncrement);
      if (levelPrice > 0.01) {
        const volumeVariation = 0.5 + Math.random() * 1.0; // 0.5x to 1.5x variation
        const quantity = Math.floor((baseVolume / levels) * volumeVariation / levelPrice);
        
        bids.push({
          price: levelPrice,
          quantity: quantity,
          total: quantity * levelPrice
        });
      }
    }
    
    // Generate ask levels (ascending prices from best ask)
    for (let i = 0; i < levels; i++) {
      const levelPrice = bestAsk + (i * priceIncrement);
      const volumeVariation = 0.5 + Math.random() * 1.0; // 0.5x to 1.5x variation
      const quantity = Math.floor((baseVolume / levels) * volumeVariation / levelPrice);
      
      asks.push({
        price: levelPrice,
        quantity: quantity,
        total: quantity * levelPrice
      });
    }

    const spread = bestAsk - bestBid;
    const spreadPercent = basePrice > 0 ? (spread / basePrice) * 100 : 0;
    const midPrice = (bestBid + bestAsk) / 2;

    return {
      bids: bids,
      asks: asks,
      bestBid: bestBid,
      bestAsk: bestAsk,
      spread: spread,
      spreadPercent: spreadPercent,
      midPrice: midPrice,
      lastUpdate: Date.now(),
    };
  }, []);

  const updateOrderBookData = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      try {
        if (!symbol) {
          setIsLoading(false);
          return;
        }

        const currentPrice = syntheticDataService.getCurrentPrice(symbol);
        const newOrderBookData = calculateOrderBook(currentPrice);

        setOrderBookData((prevData) => {
          // Only update if there's a meaningful change
          const hasChanged = 
            Math.abs(prevData.bestBid - newOrderBookData.bestBid) > 0.001 ||
            Math.abs(prevData.bestAsk - newOrderBookData.bestAsk) > 0.001;

          if (hasChanged) {
            setIsUpdating(true);
            setTimeout(() => setIsUpdating(false), 500); // Flash for 500ms
            return newOrderBookData;
          }
          
          return { ...prevData, lastUpdate: Date.now() };
        });

        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error("Error updating order book data:", err);
        setError("Failed to load order book data");
        setIsLoading(false);
      }
    }, 100); // Quick update for order book data
  }, [symbol, calculateOrderBook]);

  useEffect(() => {
    if (!symbol) {
      setIsLoading(false);
      return;
    }

    // Initialize order book data
    updateOrderBookData();

    // Subscribe to price updates
    priceUpdateUnsubscribe.current = syntheticDataService.onPriceUpdate(() => {
      updateOrderBookData();
    });

    return () => {
      if (priceUpdateUnsubscribe.current) {
        priceUpdateUnsubscribe.current();
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [symbol, updateOrderBookData]);

  const formatPrice = (price) => {
    if (price === undefined || price === null || isNaN(price)) return "0.00";
    return Number(price).toFixed(2);
  };

  const formatQuantity = (quantity) => {
    if (quantity === undefined || quantity === null || isNaN(quantity)) return "0";
    if (quantity >= 1000000) {
      return `${(quantity / 1000000).toFixed(1)}M`;
    } else if (quantity >= 1000) {
      return `${(quantity / 1000).toFixed(0)}K`;
    }
    return quantity.toString();
  };

  const formatSpread = (spread) => {
    if (spread === undefined || spread === null || isNaN(spread)) return "0.0000";
    return Number(spread).toFixed(4);
  };

  const formatSpreadPercent = (percent) => {
    if (percent === undefined || percent === null || isNaN(percent)) return "0.00%";
    return `${Number(percent).toFixed(4)}%`;
  };

  const displayLevels = showFullDepth ? 20 : 5;

  if (!symbol) {
    return (
      <div className={`spread-display ${className}`}>
        <div className="spread-header">
          <h4>📊 Order Book</h4>
        </div>
        <div className="spread-message">Select a symbol to view order book</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`spread-display ${className}`}>
        <div className="spread-header">
          <h4>📊 Order Book</h4>
        </div>
        <div className="spread-loading">Loading order book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`spread-display ${className}`}>
        <div className="spread-header">
          <h4>📊 Order Book</h4>
        </div>
        <div className="spread-error">{error}</div>
      </div>
    );
  }

  return (
    <div className={`spread-display order-book ${className} ${isUpdating ? 'updating' : ''}`}>
      <div className="spread-header">
        <h4>📊 Order Book - {symbol}</h4>
        <div className="header-controls">
          <span className="spread-summary">
            Spread: {formatSpread(orderBookData.spread)} ({formatSpreadPercent(orderBookData.spreadPercent)})
          </span>
          <button 
            className="depth-toggle"
            onClick={() => setShowFullDepth(!showFullDepth)}
          >
            {showFullDepth ? 'Show Less' : 'View 5 depth'}
          </button>
          <span className="spread-last-update">
            {new Date(orderBookData.lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="order-book-content">
        <div className="order-book-table">
          {/* Table Headers */}
          <div className="table-headers">
            <div className="bid-section">
              <div className="header-row">
                <span>BID</span>
                <span>ORDERS</span>
                <span>QTY.</span>
              </div>
            </div>
            <div className="ask-section">
              <div className="header-row">
                <span>OFFER</span>
                <span>ORDERS</span>
                <span>QTY.</span>
              </div>
            </div>
          </div>

          {/* Order Book Rows */}
          <div className="order-book-rows">
            {Array.from({ length: displayLevels }, (_, i) => {
              const bid = orderBookData.bids[i];
              const ask = orderBookData.asks[i];
              
              return (
                <div key={i} className="order-row">
                  <div className="bid-row">
                    {bid ? (
                      <>
                        <span className="price bid-price">{formatPrice(bid.price)}</span>
                        <span className="orders">1</span>
                        <span className="quantity">{formatQuantity(bid.quantity)}</span>
                      </>
                    ) : (
                      <>
                        <span className="price">-</span>
                        <span className="orders">-</span>
                        <span className="quantity">-</span>
                      </>
                    )}
                  </div>
                  <div className="ask-row">
                    {ask ? (
                      <>
                        <span className="price ask-price">{formatPrice(ask.price)}</span>
                        <span className="orders">1</span>
                        <span className="quantity">{formatQuantity(ask.quantity)}</span>
                      </>
                    ) : (
                      <>
                        <span className="price">-</span>
                        <span className="orders">-</span>
                        <span className="quantity">-</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="table-totals">
            <div className="total-row">
              <div className="bid-total">
                <span>Total</span>
                <span>{orderBookData.bids.slice(0, displayLevels).reduce((sum, bid) => sum + (bid?.quantity || 0), 0).toLocaleString()}</span>
                <span>Total</span>
                <span>{orderBookData.asks.slice(0, displayLevels).reduce((sum, ask) => sum + (ask?.quantity || 0), 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpreadDisplay;
