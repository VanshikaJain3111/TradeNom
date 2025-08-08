import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import './ChatBot.css';

const quickActions = [
  { label: "Portfolio Summary", value: "Show my portfolio summary" },
  { label: "Market Update", value: "Give me a market update" },
  { label: "P&L Analysis", value: "Analyze my P&L" },
  { label: "Trading Suggestions", value: "Suggest trades" },
  { label: "Risk Assessment", value: "Assess my risk" },
  { label: "Latest News", value: "Show latest market news" },
];

function ChatBot({ forceOpen, fullPage, portfolio, orders }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(forceOpen || false);
  const [messages, setMessages] = useState([
    {
      text: "Hi! I'm your trading assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  // Track state for details
  const [pendingDetails, setPendingDetails] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const messagesEndRef = useRef(null);

  // Helper to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Helper to format percentage
  const formatPercentage = (percentage) => {
    return `${percentage?.toFixed(2)}%`;
  };

  // Helper to render portfolio summary (similar to PortfolioSummary)
  const renderPortfolioSummary = () => {
    if (!portfolio) return <div>Unable to load portfolio data.</div>;
    const totalValue = portfolio.cash + (portfolio.portfolio_value || 0);
    const cashPercent = totalValue > 0 ? (portfolio.cash / totalValue) * 100 : 100;
    const stocksPercent = totalValue > 0 ? ((portfolio.portfolio_value || 0) / totalValue) * 100 : 0;
    return (
      <div>
        <h4>💼 Portfolio Summary</h4>
        <div>Total Value: {formatCurrency(totalValue)}</div>
        <div>Cash: {formatCurrency(portfolio.cash)} ({formatPercentage(cashPercent)})</div>
        <div>Investments: {formatCurrency(portfolio.portfolio_value || 0)} ({formatPercentage(stocksPercent)})</div>
        <div>Return: {formatCurrency(portfolio.total_return || 0)} ({formatPercentage(portfolio.total_return_percent || 0)})</div>
        {portfolio.holdings && portfolio.holdings.length > 0 && (
          <div>
            <h5>Top Holdings:</h5>
            <ul>
              {portfolio.holdings.slice(0, 3).map((holding, idx) => (
                <li key={idx}>{holding.symbol}: {holding.quantity} shares, Value: {formatCurrency(holding.market_value)}, P&L: {formatCurrency(holding.unrealized_pnl)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Helper to format order history
  const renderOrderHistory = () => {
    if (!orders || orders.length === 0) return <div>No recent orders found.</div>;
    return (
      <div>
        <div>Recent Orders:</div>
        <ul>
          {orders.slice(0, 10).map((order, idx) => (
            <li key={idx}>
              {order.side.toUpperCase()} {order.quantity} {order.symbol} @ ${order.price.toFixed(2)} ({order.status})
            </li>
          ))}
        </ul>
      </div>
    );
  };

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, open]);

  const handleSend = async (msg) => {
    if (!msg.trim()) return;
    setMessages((prev) => [
      ...prev,
      { text: msg, sender: "user", timestamp: new Date() },
    ]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      // Simulate smart response
      setMessages((prev) => [
        ...prev,
        {
          text: getBotResponse(msg),
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      setTyping(false);
    }, 1200);
  };

  const getBotResponse = (msg) => {
    const lowerMsg = msg.toLowerCase();
    if (pendingDetails) {
      setPendingDetails(false);
      if (portfolio) {
        return (
          <div>
            <div>Here are all the details from your portfolio:</div>
            <ul>
              {portfolio.holdings?.map((h, idx) => (
                <li key={idx}>{h.symbol}: {h.quantity} shares, Value: ${h.market_value?.toFixed(2)}, P&L: ${h.unrealized_pnl?.toFixed(2)}</li>
              ))}
            </ul>
            {renderOrderHistory()}
          </div>
        );
      }
      return "No portfolio details available.";
    }
    if (lowerMsg.includes("details")) {
      setPendingDetails(true);
      return "Would you like to see all the details?";
    }
    if (showBreakdown) {
      setShowBreakdown(false);
      if (portfolio) {
        return (
          <div>
            <div>Your portfolio breakdown:</div>
            <ul>
              {portfolio.holdings?.map((h, idx) => (
                <li key={idx}>{h.symbol}: {h.quantity} shares, Value: ${h.market_value?.toFixed(2)}, P&L: ${h.unrealized_pnl?.toFixed(2)}</li>
              ))}
            </ul>
            {renderOrderHistory()}
          </div>
        );
      }
      return "No portfolio breakdown available.";
    }
    if (lowerMsg.includes("portfolio summary") || lowerMsg.includes("show my portfolio summary") || lowerMsg.includes("portfolio")) {
      return renderPortfolioSummary();
    }
    if (lowerMsg.includes("order history") || lowerMsg.includes("recent orders")) {
      return renderOrderHistory();
    }
    if (lowerMsg.includes("market update")) {
      return "Markets are up 1.2% today. Tech leads gains. Would you like sector insights?";
    }
    if (lowerMsg.includes("news release") || lowerMsg.includes("latest news") || lowerMsg.includes("news")) {
      return "Latest news: TSLA beats earnings, AAPL launches new product, Fed signals rate hold. Want more news?";
    }
    if (lowerMsg.includes("buy") || lowerMsg.includes("purchase") || lowerMsg.includes("buy stock") || lowerMsg.includes("buy shares")) {
      return "I'm here to help with trading, analysis, and market news. Ask me anything!";
    }
    if (lowerMsg.includes("p&l") || lowerMsg.includes("analysis")) {
      if (portfolio) {
        const totalPnL = portfolio.holdings?.reduce((acc, h) => acc + (h.unrealized_pnl || 0), 0);
        setPendingDetails(true);
        return `Your total P&L is $${totalPnL?.toFixed(2)}. Want details?`;
      }
      setPendingDetails(true);
      return "Your P&L for this month is +$2,300. Want details?";
    }
    if (lowerMsg.includes("suggest") || lowerMsg.includes("trading suggestion") || lowerMsg.includes("invest")) {
      if (portfolio && portfolio.holdings) {
        // Analyze holdings and suggest based on lowest allocation
        const symbols = ["AAPL", "MSFT", "TSLA", "WMT", "UL", "JPM", "BAC"];
        const allocations = symbols.map(sym => {
          const holding = portfolio.holdings.find(h => h.symbol === sym);
          return { symbol: sym, value: holding ? holding.market_value : 0 };
        });
        allocations.sort((a, b) => a.value - b.value);
        const bestToInvest = allocations[0].symbol;
        return `Based on your current portfolio, consider investing in ${bestToInvest} as it has the lowest allocation. Want to place an order?`;
      }
      return "I recommend diversifying your portfolio. Want to place an order?";
    }
    if (lowerMsg.includes("risk")) {
      if (portfolio) {
        // Example: risk based on cash/holdings
        const cashPercent = (portfolio.cash / (portfolio.total_value || 1)) * 100;
        return `Your risk score is ${cashPercent < 10 ? "high" : cashPercent < 30 ? "moderate" : "low"}. Diversification recommended. Want risk breakdown?`;
      }
      return "Your risk score is moderate. Diversification recommended. Want risk breakdown?";
    }
    if (lowerMsg.includes("news")) {
      return "Latest: Fed signals rate hold, TSLA beats earnings, AAPL launches new product. Want more news?";
    }
    if (lowerMsg.includes("dividends")) {
      return "AAPL and MSFT paid dividends this quarter. Want to see the amounts?";
    }
    if (lowerMsg.includes("sector insights")) {
      return "Tech sector up 2%, Retail flat, Finance down 0.5%. Want more details?";
    }
    if (lowerMsg.includes("trades")) {
      return renderOrderHistory();
    }
    if (["yes", "yep", "sure", "ok", "yeah"].some(w => lowerMsg.includes(w)) && (showBreakdown || pendingDetails)) {
      if (showBreakdown) {
        setShowBreakdown(false);
        if (portfolio) {
          return (
            <div>
              <div>Your portfolio breakdown:</div>
              <ul>
                {portfolio.holdings?.map((h, idx) => (
                  <li key={idx}>{h.symbol}: {h.quantity} shares, Value: ${h.market_value?.toFixed(2)}, P&L: ${h.unrealized_pnl?.toFixed(2)}</li>
                ))}
              </ul>
              {renderOrderHistory()}
            </div>
          );
        }
        return "No portfolio breakdown available.";
      }
      if (pendingDetails) {
        setPendingDetails(false);
        if (portfolio) {
          return (
            <div>
              <div>Here are all the details from your portfolio:</div>
              <ul>
                {portfolio.holdings?.map((h, idx) => (
                  <li key={idx}>{h.symbol}: {h.quantity} shares, Value: ${h.market_value?.toFixed(2)}, P&L: ${h.unrealized_pnl?.toFixed(2)}</li>
                ))}
              </ul>
              {renderOrderHistory()}
            </div>
          );
        }
        return "No portfolio details available.";
      }
    }
    return "I'm here to help with trading, analysis, and market news. Ask me anything!";
  };

  const handleQuickAction = (action) => {
    handleSend(action.value);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend(input);
    }
  };

  const handleFloatBtnClick = (e) => {
    e.stopPropagation();
    if (forceOpen) return;
    navigate('/chatbot');
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!forceOpen && !fullPage && (
        <div
          className={`chatbot-float-btn${open ? " open" : ""}`}
          onClick={handleFloatBtnClick}
        >
          <span className="chatbot-icon">💬</span>
          {unread > 0 && <span className="chatbot-badge">{unread}</span>}
        </div>
      )}
      {/* Chat Window / Full Page */}
      {(open || forceOpen || fullPage) && (
        <div className={fullPage ? "chatbot-fullpage" : "chatbot-window"}>
          <div className="chatbot-header">
            <div className="chatbot-gradient">
              <span className="chatbot-title">Trading Assistant</span>
              <span className="chatbot-status online">● Online</span>
            </div>
            <button className="chatbot-close" onClick={() => {
              if (forceOpen) {
                navigate(-1);
              } else {
                setOpen(false);
              }
            }}>
              ×
            </button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chatbot-msg chatbot-msg-${msg.sender}`}
              >
                <div className="chatbot-avatar">
                  {msg.sender === "bot" ? "🤖" : "🧑"}
                </div>
                <div className="chatbot-msg-content">
                  <div className="chatbot-msg-text">{msg.text}</div>
                  <div className="chatbot-msg-time">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="chatbot-msg chatbot-msg-bot">
                <div className="chatbot-avatar">🤖</div>
                <div className="chatbot-msg-content">
                  <div className="chatbot-msg-text chatbot-typing">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-quick-actions">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="chatbot-quick-btn"
                onClick={() => handleQuickAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
          <div className="chatbot-input-row">
            <input
              type="text"
              className="chatbot-input"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;
