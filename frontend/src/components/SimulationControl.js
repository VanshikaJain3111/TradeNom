import React, { useState, useEffect } from "react";
import api from "../services/api";
import syntheticDataService from "../services/syntheticDataService";
import "./SimulationControl.css";

function SimulationControl() {
  const [simulationStatus, setSimulationStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSimulationStatus();

    // Update status every 10 seconds
    const interval = setInterval(fetchSimulationStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchSimulationStatus = async () => {
    try {
      const response = await api.get("/trading/simulation/status");
      setSimulationStatus(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching simulation status:", error);
      setIsLoading(false);
    }
  };

  const resetSimulation = () => {
    syntheticDataService.resetSimulation();
    fetchSimulationStatus();
  };

  const setSimulationSpeed = (multiplier) => {
    syntheticDataService.setSimulationSpeed(multiplier);
    fetchSimulationStatus();
  };

  if (isLoading) {
    return (
      <div className="simulation-control loading">
        Loading simulation status...
      </div>
    );
  }

  if (!simulationStatus || !simulationStatus.isActive) {
    return (
      <div className="simulation-control error">
        <h3>Simulation Status</h3>
        <p>
          Simulation not active: {simulationStatus?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="simulation-control">
      <h3>📊 Live Market Simulation</h3>

      <div className="status-grid">
        <div className="status-item">
          <label>Simulation Started:</label>
          <span>{formatTime(simulationStatus.simulationStartTime)}</span>
        </div>

        <div className="status-item">
          <label>Data Period Start:</label>
          <span>{formatTime(simulationStatus.dataStartTime)}</span>
        </div>

        <div className="status-item">
          <label>Current Simulation Time:</label>
          <span>{formatTime(simulationStatus.currentSimulationTime)}</span>
        </div>

        <div className="status-item">
          <label>Runtime:</label>
          <span>{formatDuration(simulationStatus.elapsedRealTime)}</span>
        </div>
      </div>

      <div className="controls">
        <button onClick={resetSimulation} className="btn-secondary">
          🔄 Reset Simulation
        </button>

        <div className="speed-controls">
          <label>Speed:</label>
          <button onClick={() => setSimulationSpeed(0.5)} className="btn-speed">
            0.5x
          </button>
          <button
            onClick={() => setSimulationSpeed(1)}
            className="btn-speed active"
          >
            1x
          </button>
          <button onClick={() => setSimulationSpeed(2)} className="btn-speed">
            2x
          </button>
          <button onClick={() => setSimulationSpeed(5)} className="btn-speed">
            5x
          </button>
        </div>
      </div>

      <div className="info">
        <p>
          <span className="indicator live"></span>
          Live prices update every 60 seconds based on synthetic market data
        </p>
      </div>
    </div>
  );
}

export default SimulationControl;
