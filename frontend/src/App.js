import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import Portfolio from './components/Portfolio';
import Reports from './components/Reports';
import Analytics from './components/Analytics';
import TestTrading from './components/TestTrading';
import ReportsAnalytics from './pages/ReportsAnalytics';

function PrivateRoute({ children }) {
  const user = localStorage.getItem('user');
  return user ? children : <Navigate to="/" />;
}

function App() {
  const isLoggedIn = !!localStorage.getItem('user');
  return (
    <Router>
      <Navbar />
      <div style={{ padding: '30px' }}>
        <Routes>
          <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/order" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
          <Route path="/portfolio" element={<PrivateRoute><Portfolio /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/test-trading" element={<PrivateRoute><TestTrading /></PrivateRoute>} />
          <Route path="/reports-analytics" element={<ReportsAnalytics />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
