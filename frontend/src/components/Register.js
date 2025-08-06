import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AuthForm.css';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { email, password, full_name: fullName });
      navigate('/');
    } catch (err) {
      setError('Registration failed. Email may already be registered.');
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <h2 className="auth-title">TradeNom Register</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className="auth-input" />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="auth-input" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="auth-input" />
          <button type="submit" className="auth-btn">Register</button>
        </form>
        {error && <p className="auth-error">{error}</p>}
        <div className="auth-link">
          <span>Already have an account? </span>
          <button onClick={() => navigate('/')} className="auth-link-btn">Login</button>
        </div>
      </div>
    </div>
  );
}

export default Register;
