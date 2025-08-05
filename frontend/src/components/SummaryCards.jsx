// src/components/SummaryCards.jsx
import React from "react";

export default function SummaryCards({ summaries, selected }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
      {selected.map(symbol => (
        <div key={symbol} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16, minWidth: 180 }}>
          <h3>{symbol}</h3>
          {summaries[symbol] ? (
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li>Latest Close: {summaries[symbol].latest_close.toFixed(2)}</li>
              <li>Mean Close: {summaries[symbol].mean_close.toFixed(2)}</li>
              <li>Volatility: {summaries[symbol].volatility.toFixed(2)}</li>
              <li>Avg Volume: {summaries[symbol].avg_volume.toFixed(0)}</li>
              <li>Max Drawdown: {summaries[symbol].max_drawdown.toFixed(2)}</li>
            </ul>
          ) : <div>Loading...</div>}
        </div>
      ))}
    </div>
  );
}
