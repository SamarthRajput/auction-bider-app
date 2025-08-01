// client/src/components/AdminPanel.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AdminPanel = ({ user, onLogout }) => {
  const [auctions, setAuctions] = useState([]);
  const [formData, setFormData] = useState({
    productName: '',
    reservePrice: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    loadAuctions();
  }, []);

  const loadAuctions = async () => {
    try {
      const response = await axios.get('/api/auctions');
      // Filter to show only auctions created by this admin
      const myAuctions = response.data.filter(auction => auction.createdBy === user.id);
      setAuctions(myAuctions);
    } catch (error) {
      console.error('Error loading auctions:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/auctions', formData);
      
      setMessage(`Auction created successfully! Share this link: ${window.location.origin}/auction/${response.data.id}`);
      setMessageType('success');
      setFormData({ productName: '', reservePrice: '' });
      loadAuctions();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to create auction');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const copyAuctionLink = (auctionId) => {
    const link = `${window.location.origin}/auction/${auctionId}`;
    navigator.clipboard.writeText(link).then(() => {
      setMessage('Auction link copied to clipboard!');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    }).catch(() => {
      prompt('Copy this link:', link);
    });
  };

  return (
    <div className="admin-panel">
      <header className="dashboard-header">
        <h1>Admin Panel</h1>
        <div className="user-info">
          <span>Welcome, {user.username} (Admin)</span>
          <div className="header-buttons">
            <Link to="/" className="btn btn-secondary">
              Back to Dashboard
            </Link>
            <button onClick={onLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-content">
        <div className="create-auction-section">
          <h2>Create New Auction</h2>
          
          <form onSubmit={handleSubmit} className="create-auction-form">
            <div className="form-group">
              <label htmlFor="productName">Product Name</label>
              <input
                type="text"
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reservePrice">Reserve Price ($)</label>
              <input
                type="number"
                id="reservePrice"
                name="reservePrice"
                value={formData.reservePrice}
                onChange={handleChange}
                placeholder="Enter reserve price"
                step="0.01"
                min="0"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Auction'}
            </button>
          </form>

          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}
        </div>

        <div className="my-auctions-section">
          <h2>My Auctions</h2>
          
          {auctions.length === 0 ? (
            <div className="no-auctions">
              <p>You haven't created any auctions yet.</p>
            </div>
          ) : (
            <div className="auctions-table-container">
              <table className="auctions-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Reserve Price</th>
                    <th>Current Highest Bid</th>
                    <th>Total Bids</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((auction) => {
                    const highestBid = auction.bids.length > 0 ? auction.bids[0] : null;
                    return (
                      <tr key={auction.id}>
                        <td>{auction.productName}</td>
                        <td>${auction.reservePrice}</td>
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
                        <td>{auction.bids.length}</td>
                        <td>
                          <span className={`status ${auction.status.toLowerCase()}`}>
                            {auction.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <Link 
                              to={`/auction/${auction.id}`} 
                              className="btn btn-primary btn-sm"
                              target="_blank"
                            >
                              Monitor
                            </Link>
                            <button
                              onClick={() => copyAuctionLink(auction.id)}
                              className="btn btn-secondary btn-sm"
                            >
                              Copy Link
                            </button>
                          </div>
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
    </div>
  );
};

export default AdminPanel;