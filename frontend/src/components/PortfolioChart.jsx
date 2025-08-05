// src/components/PortfolioChart.jsx
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
  Filler
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
  TimeScale,
  Filler
);

export default function PortfolioChart({ userId, period = '1M' }) {
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) {
      fetchPortfolioHistory();
    }
  }, [userId, period]);

  const fetchPortfolioHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Since we don't have historical portfolio data stored,
      // we'll simulate it based on current portfolio and trade history
      const [portfolioResponse, tradesResponse] = await Promise.all([
        api.get(`/portfolio/${userId}`),
        api.get(`/reports/trade-history/${userId}`)
      ]);

      const currentPortfolio = portfolioResponse.data;
      const trades = tradesResponse.data.trade_history;

      // Generate simulated portfolio value over time
      // This is a simplified simulation - in production, you'd store daily portfolio snapshots
      const simulatedHistory = generatePortfolioHistory(currentPortfolio, trades, period);
      setPortfolioHistory(simulatedHistory);
      
    } catch (err) {
      setError('Failed to fetch portfolio history');
      console.error('Error fetching portfolio history:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePortfolioHistory = (portfolio, trades, period) => {
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

    // Generate daily data points
    const history = [];
    const currentDate = new Date(startDate);
    const currentValue = portfolio.total_value || 10000;
    const startingValue = 10000;
    
    while (currentDate <= endDate) {
      // Simulate portfolio value changes (simplified)
      const daysSinceStart = (currentDate - startDate) / (1000 * 60 * 60 * 24);
      const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      const progress = daysSinceStart / totalDays;
      
      // Linear interpolation with some randomness
      const randomFactor = 0.95 + Math.random() * 0.1; // ±5% randomness
      const interpolatedValue = startingValue + (currentValue - startingValue) * progress * randomFactor;
      
      history.push({
        date: new Date(currentDate),
        portfolioValue: interpolatedValue,
        cash: portfolio.cash || 0,
        investedValue: interpolatedValue - (portfolio.cash || 0)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return history;
  };

  const chartData = {
    labels: portfolioHistory.map(item => item.date),
    datasets: [
      {
        label: 'Total Portfolio Value',
        data: portfolioHistory.map(item => item.portfolioValue),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Invested Value',
        data: portfolioHistory.map(item => item.investedValue),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Portfolio Performance - ${period}`,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
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
          text: 'Value ($)'
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString(undefined, {maximumFractionDigits: 0});
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
        <div className="loading">Loading portfolio history...</div>
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

  if (!portfolioHistory.length) {
    return (
      <div className="chart-container">
        <div className="no-data">No portfolio history available</div>
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
            onClick={() => fetchPortfolioHistory(p)}
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
