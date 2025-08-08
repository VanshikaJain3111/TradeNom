import React from "react";
import ChatBot from "../components/ChatBot";
import "../components/ChatBot.css";
import { useLocation } from "react-router-dom";

function ChatBotPage() {
  // Get portfolio and orders from location state if passed
  const location = useLocation();
  const { portfolio, orders } = location.state || {};
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}>
        <ChatBot forceOpen fullPage portfolio={portfolio} orders={orders} />
      </div>
    </div>
  );
}

export default ChatBotPage;
