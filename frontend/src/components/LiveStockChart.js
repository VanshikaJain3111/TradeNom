import React, { useState, useEffect, useRef } from "react";
import syntheticDataService from "../services/syntheticDataService";
import "./LiveStockChart.css";

function LiveStockChart({ symbol = "AAPL", height = 300, timeframe = "1H" }) {
  const [chartData, setChartData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    loadChartData();

    // Subscribe to price updates
    const unsubscribe = syntheticDataService.onPriceUpdate(() => {
      updateCurrentPrice();
    });

    return () => {
      unsubscribe();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [symbol, timeframe]);

  useEffect(() => {
    if (chartData.length > 0 && !isLoading) {
      drawChart();
    }

    // Add resize handler for responsive chart
    const handleResize = () => {
      if (chartData.length > 0 && !isLoading) {
        drawChart();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [chartData, currentPrice, isLoading]);

  const loadChartData = () => {
    try {
      const historicalData = syntheticDataService.getHistoricalData(
        symbol,
        timeframe
      );
      const currentPriceData = syntheticDataService.getCurrentPrice(symbol);

      // Convert historical data to chart format
      const formattedData = historicalData.map((item) => ({
        timestamp: new Date(item.timestamp).getTime(),
        price: item.close,
        volume: item.volume,
        high: item.high,
        low: item.low,
        open: item.open,
      }));

      setChartData(formattedData);
      setCurrentPrice(currentPriceData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading chart data:", error);
      setIsLoading(false);
    }
  };

  const updateCurrentPrice = () => {
    const newPrice = syntheticDataService.getCurrentPrice(symbol);
    if (!newPrice || !newPrice.price) return;

    setCurrentPrice(newPrice);

    // Add current price to chart data if it's newer
    if (chartData.length > 0) {
      const lastDataTime = chartData[chartData.length - 1]?.timestamp || 0;
      const currentTime = Date.now();

      // Only add new data point if 1 minute has passed
      if (currentTime > lastDataTime + 60000) {
        const newDataPoint = {
          timestamp: currentTime,
          price: newPrice.price,
          volume: newPrice.volume || 100000,
          high: newPrice.high || newPrice.price,
          low: newPrice.low || newPrice.price,
          open: newPrice.open || newPrice.price,
        };

        setChartData((prev) => {
          const updatedData = [...prev, newDataPoint];
          // Keep last 50 points for responsive chart
          return updatedData.slice(-50);
        });
      }
    }
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext("2d");

    // Set canvas size to match container
    const containerWidth = canvas.parentElement?.offsetWidth || 800;
    canvas.width = containerWidth;
    canvas.height = height;

    const { width } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate price range
    const prices = chartData.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Add padding to price range for better visualization
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;

    // Padding
    const padding = { top: 20, right: 70, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Helper functions
    const xScale = (index) =>
      padding.left + (index / (chartData.length - 1)) * chartWidth;
    const yScale = (price) =>
      padding.top + ((paddedMax - price) / paddedRange) * chartHeight;

    // Draw grid
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const price = paddedMin + (paddedRange * i) / 5;
      const y = yScale(price);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Price labels
      ctx.fillStyle = "#666";
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`$${price.toFixed(2)}`, padding.left - 10, y + 4);
    }

    // Vertical grid lines
    const timeStep = Math.max(1, Math.floor(chartData.length / 6));
    for (let i = 0; i < chartData.length; i += timeStep) {
      const x = xScale(i);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();

      // Time labels
      if (chartData[i]) {
        const time = new Date(chartData[i].timestamp);
        ctx.fillStyle = "#666";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          time.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          x,
          height - 10
        );
      }
    }

    // Draw price line
    ctx.strokeStyle = "#2196F3";
    ctx.lineWidth = 2;
    ctx.beginPath();

    chartData.forEach((dataPoint, index) => {
      const x = xScale(index);
      const y = yScale(dataPoint.price);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw price points
    ctx.fillStyle = "#2196F3";
    chartData.forEach((dataPoint, index) => {
      const x = xScale(index);
      const y = yScale(dataPoint.price);

      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Highlight current price
    if (currentPrice && chartData.length > 0) {
      const lastIndex = chartData.length - 1;
      const x = xScale(lastIndex);
      const y = yScale(currentPrice.price);

      // Current price dot
      ctx.fillStyle = currentPrice.change >= 0 ? "#4CAF50" : "#F44336";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Current price line
      ctx.strokeStyle = currentPrice.change >= 0 ? "#4CAF50" : "#F44336";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current price label
      ctx.fillStyle = currentPrice.change >= 0 ? "#4CAF50" : "#F44336";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "left";
      ctx.fillText(
        `$${currentPrice.price.toFixed(2)}`,
        padding.left + chartWidth + 10,
        y + 4
      );
    }

    // Draw title
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${symbol} - ${timeframe}`, padding.left, 20);
  };

  const handleTimeframeChange = (newTimeframe) => {
    setIsLoading(true);
    // Update timeframe would trigger useEffect to reload data
    // This is a placeholder for timeframe switching functionality
  };

  if (isLoading) {
    return (
      <div className="live-stock-chart loading">
        <div className="loading-spinner">Loading chart data...</div>
      </div>
    );
  }

  return (
    <div className="live-stock-chart">
      <div className="chart-header">
        <div className="chart-info">
          <h3>{symbol} Live Chart</h3>
          {currentPrice && (
            <div className="price-info">
              <span className="current-price">
                ${currentPrice.price?.toFixed(2) || "0.00"}
              </span>
              <span
                className={`price-change ${
                  (currentPrice.change || 0) >= 0 ? "positive" : "negative"
                }`}
              >
                {(currentPrice.change || 0) >= 0 ? "+" : ""}
                {(currentPrice.change || 0).toFixed(2)}(
                {(currentPrice.change_percent || 0) >= 0 ? "+" : ""}
                {(currentPrice.change_percent || 0).toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <div className="chart-controls">
          {["15M", "1H", "4H", "1D"].map((tf) => (
            <button
              key={tf}
              className={`timeframe-btn ${tf === timeframe ? "active" : ""}`}
              onClick={() => handleTimeframeChange(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          className="price-chart"
          style={{ width: "100%", height: `${height}px` }}
        />
      </div>

      {chartData.length === 0 && (
        <div className="no-data">
          <p>No chart data available for {symbol}</p>
        </div>
      )}
    </div>
  );
}

export default LiveStockChart;
