// src/components/StockSelector.jsx
import React from "react";

export default function StockSelector({ stocks, selected, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label>Select Stocks: </label>
      <select multiple value={selected} onChange={e => {
        const opts = Array.from(e.target.selectedOptions).map(o => o.value);
        onChange(opts);
      }}>
        {stocks.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
