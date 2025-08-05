// src/components/CorrelationHeatmap.jsx
import React from "react";

export default function CorrelationHeatmap({ data }) {
  if (!data || !data.correlation) return null;
  const syms = Object.keys(data.correlation);
  return (
    <div style={{ marginBottom: 32 }}>
      <h2>Correlation Heatmap</h2>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th></th>
            {syms.map(s => <th key={s}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {syms.map(r => (
            <tr key={r}>
              <th>{r}</th>
              {syms.map(c => (
                <td key={c} style={{
                  background: `rgba(0,123,255,${Math.abs(data.correlation[r][c])})`,
                  color: Math.abs(data.correlation[r][c]) > 0.5 ? '#fff' : '#222',
                  padding: 8,
                  textAlign: 'center',
                  minWidth: 40
                }}>{data.correlation[r][c].toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
