// src/pages/ReportsAnalytics.jsx
import React, { useEffect, useState } from "react";
import { fetchStocksList, fetchOHLC, fetchSummary, fetchCompare } from "../api/reportsAnalytics";
import StockSelector from "../components/StockSelector";
import SummaryCards from "../components/SummaryCards";
import StockChart from "../components/StockChart";
import ComparisonChart from "../components/ComparisonChart";
import CorrelationHeatmap from "../components/CorrelationHeatmap";

export default function ReportsAnalytics() {
  const [stocks, setStocks] = useState([]);
  const [selected, setSelected] = useState(["AAPL"]);
  const [ohlcData, setOhlcData] = useState({});
  const [summaries, setSummaries] = useState({});
  const [compareData, setCompareData] = useState(null);

  useEffect(() => {
    fetchStocksList().then(setStocks);
  }, []);

  useEffect(() => {
    selected.forEach(symbol => {
      fetchOHLC(symbol).then(data => setOhlcData(d => ({ ...d, [symbol]: data })));
      fetchSummary(symbol).then(data => setSummaries(s => ({ ...s, [symbol]: data })));
    });
    fetchCompare(selected.join(",")).then(setCompareData);
  }, [selected]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Reports & Analytics</h1>
      <StockSelector stocks={stocks} selected={selected} onChange={setSelected} />
      <SummaryCards summaries={summaries} selected={selected} />
      <StockChart data={ohlcData} selected={selected} />
      <ComparisonChart data={ohlcData} selected={selected} />
      <CorrelationHeatmap data={compareData} />
    </div>
  );
}
