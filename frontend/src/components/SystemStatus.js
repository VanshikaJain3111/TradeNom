import React, { useState, useEffect } from "react";
import syntheticDataService from "../services/syntheticDataService";
import localStorageService from "../services/localStorageService";
import "./SystemStatus.css";

function SystemStatus() {
  const [status, setStatus] = useState({
    syntheticDataInitialized: false,
    stocksLoaded: 0,
    totalDataPoints: 0,
    lastPriceUpdate: null,
    localStorageConnected: false,
    storageSize: 0,
  });

  useEffect(() => {
    updateStatus();

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateStatus = () => {
    try {
      // Check synthetic data service
      const simulationStatus = syntheticDataService.getSimulationStatus() || {};
      const allPrices = syntheticDataService.getAllCurrentPrices() || [];

      // Check local storage
      let storageSize = 0;
      try {
        const portfolios = localStorageService.getItem("portfolios");
        const orders = localStorageService.getItem("orders");
        storageSize =
          JSON.stringify(portfolios || {}).length +
          JSON.stringify(orders || {}).length;
      } catch (e) {
        storageSize = 0;
      }

      setStatus({
        syntheticDataInitialized: simulationStatus.isActive || false,
        stocksLoaded: allPrices.length || 0,
        totalDataPoints: allPrices.reduce(
          (sum, stock) => sum + (stock.volume || 0),
          0
        ),
        lastPriceUpdate: simulationStatus.currentSimulationTime || null,
        localStorageConnected:
          localStorageService.getItem("portfolios") !== null,
        storageSize: Math.round(storageSize / 1024), // KB
      });
    } catch (error) {
      console.error("Error updating system status:", error);
      // Set safe defaults on error
      setStatus({
        syntheticDataInitialized: false,
        stocksLoaded: 0,
        totalDataPoints: 0,
        lastPriceUpdate: null,
        localStorageConnected: false,
        storageSize: 0,
      });
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    return Math.round(bytes) + " KB";
  };

  const clearAllData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all trading data? This action cannot be undone."
      )
    ) {
      localStorageService.clearAllData();
      updateStatus();
      window.location.reload();
    }
  };

  const exportData = () => {
    const data = localStorageService.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trading-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="system-status">
      <h4>🔧 System Status</h4>

      <div className="status-grid">
        <div className="status-item">
          <div
            className={`status-indicator ${
              status.syntheticDataInitialized ? "green" : "red"
            }`}
          ></div>
          <span>Synthetic Data Service</span>
          <span className="status-value">
            {status.syntheticDataInitialized ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="status-item">
          <div
            className={`status-indicator ${
              status.stocksLoaded > 0 ? "green" : "red"
            }`}
          ></div>
          <span>Stocks Loaded</span>
          <span className="status-value">{status.stocksLoaded}</span>
        </div>

        <div className="status-item">
          <div
            className={`status-indicator ${
              status.lastPriceUpdate ? "green" : "yellow"
            }`}
          ></div>
          <span>Last Price Update</span>
          <span className="status-value">
            {status.lastPriceUpdate
              ? new Date(status.lastPriceUpdate).toLocaleTimeString()
              : "Never"}
          </span>
        </div>

        <div className="status-item">
          <div
            className={`status-indicator ${
              status.localStorageConnected ? "green" : "red"
            }`}
          ></div>
          <span>Local Storage</span>
          <span className="status-value">
            {status.localStorageConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="status-item">
          <div className="status-indicator blue"></div>
          <span>Storage Used</span>
          <span className="status-value">
            {formatBytes(status.storageSize)}
          </span>
        </div>
      </div>

      <div className="status-actions">
        <button onClick={updateStatus} className="btn-refresh">
          🔄 Refresh
        </button>
        <button onClick={exportData} className="btn-export">
          📥 Export Data
        </button>
        <button onClick={clearAllData} className="btn-clear">
          🗑️ Clear All Data
        </button>
      </div>
    </div>
  );
}

export default SystemStatus;
