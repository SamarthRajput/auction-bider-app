// client/src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard = ({ user, onLogout }) => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAuctions();
  }, []);

  const loadAuctions = async () => {
    try {
      const response = await axios.get('/api/auctions');
      setAuctions(response.data);
    } catch (error) {
      setError('Failed to load auctions');
      console.error('Error loading auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading auctions...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Auction Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user.username || 'User'} ({user.role})</span>
          <div className="header-buttons">
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="btn btn-primary">
                Admin Panel
              </Link>
            )}
            <button onClick={onLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="auctions-container">
        <h2>Available Auctions</h2>
        
        {error && <div className="error-message">{error}</div>}

        {auctions.length === 0 ? (
          <div className="no-auctions">
            <p>No auctions available at the moment.</p>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="btn btn-primary">
                Create First Auction
              </Link>
            )}
          </div>
        ) : (
          <div className="auctions-table-container">
            <table className="auctions-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Reserve Price</th>
                  <th>Created By</th>
                  <th>Current Highest Bid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {auctions.map((auction) => {
                  const highestBid = auction.bids.length > 0 ? auction.bids[0] : null;
                  return (
                    <tr key={auction.id}>
                      <td>{auction.productName}</td>
                      <td>${auction.reservePrice}</td>
                      <td>{auction.creator.username}</td>
                      <td>
                        {highestBid ? (
                          <span>
                            ${highestBid.amount} 
                            <br />
                            <small>by {highestBid.bidder.username}</small>
                          </span>
                        ) : (
                          'No bids yet'
                        )}
                      </td>
                      <td>
                        <span className={`status ${auction.status.toLowerCase()}`}>
                          {auction.status}
                        </span>
                      </td>
                      <td>
                        <Link 
                          to={`/auction/${auction.id}`} 
                          className="btn btn-primary btn-sm"
                          target="_blank"
                        >
                          {user.role === 'ADMIN' ? 'Monitor' : 'Join Auction'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;