import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={{ 
      background: '#333', 
      color: 'white',
      padding: '10px 20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>TradeNom</h1>
        <ul style={{ 
          display: 'flex', 
          listStyle: 'none', 
          margin: 0, 
          padding: 0
        }}>
          {/* Keep only working links */}
          <li style={{ marginLeft: '20px' }}>
            <Link to="/reports-analytics" style={{ color: 'white', textDecoration: 'none' }}>
              Reports & Analytics
            </Link>
          </li>
          <li style={{ marginLeft: '20px' }}>
            <Link to="/news" style={{ color: 'white', textDecoration: 'none' }}>
              News
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;