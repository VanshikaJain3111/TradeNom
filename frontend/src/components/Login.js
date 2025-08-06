import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AuthForm.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Since we're using local storage mode, send JSON data
      const loginData = {
        username: email,
        password: password
      };
      
      const res = await api.post('/auth/login', loginData);
      
      // Clear any existing user data first
      localStorage.removeItem('user');
      
      // Set new user data
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      console.log("Login successful, user:", res.data.user);
      
      // Use navigate instead of window.location for better React Router integration
      navigate('/dashboard');
    } catch (err) {
      console.error("Login error:", err);
      setError('Invalid credentials');
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <h2 className="auth-title">TradeNom Login</h2>
        
       

        <form onSubmit={handleSubmit} className="auth-form">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="auth-input" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="auth-input" />
          <button type="submit" className="auth-btn">Login</button>
        </form>
        {error && <p className="auth-error">{error}</p>}
        <div className="auth-link">
          <span>Don't have an account? </span>
          <button onClick={() => navigate('/register')} className="auth-link-btn">Register</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
