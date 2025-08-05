// src/components/ComparisonChart.jsx
import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import api from '../services/api';
import './StockChart.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const colors = [
  'rgb(75, 192, 192)',
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 205, 86)',
  'rgb(153, 102, 255)',
  'rgb(255, 159, 64)'
];

export default function ComparisonChart({ symbols = [], period = '1M' }) {
  const [priceData, setPriceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (symbols.length > 0) {
      fetchComparisonData();
    }
  }, [symbols, period]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate start date based on period
      switch (period) {
        case '1W':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '1M':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6M':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1Y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(endDate.getMonth() - 1);
      }

      const promises = symbols.map(symbol =>
        api.get(`/analytics/price-data/${symbol}`, {
          params: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            limit: 1000
          }
        })
      );

      const responses = await Promise.all(promises);
      const data = {};
      
      responses.forEach((response, index) => {
        data[symbols[index]] = response.data.data;
      });

      setPriceData(data);
    } catch (err) {
      setError('Failed to fetch comparison data');
      console.error('Error fetching comparison data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Normalize data to show percentage performance from start
  const normalizeData = (data) => {
    if (!data.length) return [];
    const basePrice = data[0].close;
    return data.map(item => ({
      ...item,
      normalizedPrice: ((item.close - basePrice) / basePrice) * 100
    }));
  };

  const chartData = {
    labels: priceData[symbols[0]] ? priceData[symbols[0]].map(item => new Date(item.timestamp)) : [],
    datasets: symbols.map((symbol, index) => {
      const data = priceData[symbol] || [];
      const normalizedData = normalizeData(data);
      
      return {
        label: `${symbol} Performance`,
        data: normalizedData.map(item => item.normalizedPrice),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
      };
    })
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Stock Performance Comparison - ${period}`,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            const sign = value >= 0 ? '+' : '';
            return `${context.dataset.label}: ${sign}${value.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Performance (%)'
        },
        ticks: {
          callback: function(value) {
            const sign = value >= 0 ? '+' : '';
            return `${sign}${value.toFixed(1)}%`;
          }
        },
        grid: {
          color: function(context) {
            if (context.tick.value === 0) {
              return '#000';
            }
            return '#e0e0e0';
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (loading) {
    return (
      <div className="chart-container">
        <div className="loading">Loading comparison data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className="chart-container">
        <div className="no-data">Select symbols to compare</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="period-selector">
        {['1W', '1M', '3M', '6M', '1Y'].map(p => (
          <button
            key={p}
            className={`period-btn ${period === p ? 'active' : ''}`}
            onClick={() => fetchComparisonData(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="chart-wrapper">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
