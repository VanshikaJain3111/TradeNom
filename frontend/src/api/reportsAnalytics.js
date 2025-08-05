// src/api/reportsAnalytics.js
// Utility functions to call backend reports-analytics endpoints

const BASE = "/reports-analytics";

export async function fetchStocksList() {
  const res = await fetch(`${BASE}/stocks/list`);
  return res.json();
}

export async function fetchOHLC(symbol) {
  const res = await fetch(`${BASE}/stocks/${symbol}/ohlc`);
  return res.json();
}

export async function fetchSummary(symbol) {
  const res = await fetch(`${BASE}/stocks/${symbol}/summary`);
  return res.json();
}

export async function fetchCompare(symbols) {
  const res = await fetch(`${BASE}/stocks/compare?symbols=${symbols}`);
  return res.json();
}
