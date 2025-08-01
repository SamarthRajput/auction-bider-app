// client/src/components/AuctionRoom.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const AuctionRoom = ({ user, onLogout }) => {
  const { auctionId } = useParams();
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
    setSocket(newSocket);

    // Join auction room
    newSocket.emit('joinAuction', auctionId);

    // Listen for new bids
    newSocket.on('newBid', (newBid) => {
      setBids(prevBids => {
        const updatedBids = [newBid, ...prevBids.filter(bid => bid.id !== newBid.id)];
        return updatedBids.sort((a, b) => b.amount - a.amount);
      });
      setMessage(`New bid placed: $${newBid.amount} by ${newBid.bidder.username}`);
      setTimeout(() => setMessage(''), 3000);
    });

    // Load auction data
    loadAuctionData();

    // Cleanup socket on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [auctionId]);

  const loadAuctionData = async () => {
    try {
      const response = await axios.get(`/api/auctions/${auctionId}`);
      setAuction(response.data);
      setBids(response.data.bids.sort((a, b) => b.amount - a.amount));
      
      // Set initial bid amount to be higher than current highest
      if (response.data.bids.length > 0) {
        const highestBid = Math.max(...response.data.bids.map(bid => bid.amount));
        setBidAmount((highestBid + 1).toString());
      } else {
        setBidAmount(response.data.reservePrice.toString());
      }
    } catch (error) {
      setError('Failed to load auction data');
      console.error('Error loading auction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setBidLoading(true);
    setError('');

    try {
      await axios.post(`/api/auctions/${auctionId}/bid`, {
        amount: parseFloat(bidAmount)
      });
      
      setMessage('Bid placed successfully!');
      setBidAmount((parseFloat(bidAmount) + 1).toString());
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to place bid');
    } finally {
      setBidLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading auction...</div>;
  }

  if (!auction) {
    return (
      <div className="error-container">
        <h2>Auction Not Found</h2>
        <Link to="/" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const highestBid = bids.length > 0 ? bids[0] : null;
  const userCanBid = user.role === 'USER' && auction.status === 'ACTIVE';

  return (
    <div className="auction-room">
      <header className="auction-header">
        <div className="header-content">
          <h1>{auction.productName}</h1>
          <div className="user-info">
            <span>{user.username} ({user.role})</span>
            <div className="header-buttons">
              <Link to="/" className="btn btn-secondary">
                Back to Dashboard
              </Link>
              <button onClick={onLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="auction-content">
        <div className="auction-info-card">
          <div className="auction-details">
            <h2>Auction Details</h2>
            <div className="detail-row">
              <span className="label">Reserve Price:</span>
              <span className="value">${auction.reservePrice}</span>
            </div>
            <div className="detail-row">
              <span className="label">Created by:</span>
              <span className="value">{auction.creator.username}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className={`status ${auction.status.toLowerCase()}`}>
                {auction.status}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Current Highest Bid:</span>
              <span className="value highest-bid">
                {highestBid ? `$${highestBid.amount}` : 'No bids yet'}
              </span>
            </div>
          </div>

          {userCanBid && (
            <div className="bid-form-container">
              <h3>Place Your Bid</h3>
              <form onSubmit={handleBidSubmit} className="bid-form">
                <div className="bid-input-group">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Enter bid amount"
                    step="0.01"
                    min={highestBid ? highestBid.amount + 0.01 : auction.reservePrice}
                    required
                    disabled={bidLoading}
                  />
                  <button 
                    type="submit" 
                    disabled={bidLoading}
                    className="btn btn-primary"
                  >
                    {bidLoading ? 'Placing...' : 'Place Bid'}
                  </button>
                </div>
              </form>
              
              {error && <div className="error-message">{error}</div>}
              {message && <div className="success-message">{message}</div>}
            </div>
          )}
        </div>

        <div className="bids-section">
          <h2>Live Bidding Ranking</h2>
          
          {bids.length === 0 ? (
            <div className="no-bids">
              <p>No bids placed yet. Be the first to bid!</p>
            </div>
          ) : (
            <div className="bids-table-container">
              <table className="bids-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Bidder</th>
                    <th>Bid Amount</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((bid, index) => (
                    <tr 
                      key={bid.id} 
                      className={index === 0 ? 'highest-bid-row' : ''}
                    >
                      <td>
                        <span className={`rank ${index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : ''}`}>
                          #{index + 1}
                          {index === 0 && ' 👑'}
                          {index === 1 && ' 🥈'}
                          {index === 2 && ' 🥉'}
                        </span>
                      </td>
                      <td className={bid.bidder.username === user.username ? 'current-user' : ''}>
                        {bid.bidder.username}
                        {bid.bidder.username === user.username && ' (You)'}
                      </td>
                      <td className="bid-amount">${bid.amount.toFixed(2)}</td>
                      <td className="bid-time">
                        {new Date(bid.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className={`bid-status ${index === 0 ? 'winning' : 'outbid'}`}>
                          {index === 0 ? 'Winning' : 'Outbid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {bids.length > 0 && (
            <div className="auction-stats">
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Bids</span>
                  <span className="stat-value">{bids.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Unique Bidders</span>
                  <span className="stat-value">
                    {new Set(bids.map(bid => bid.bidder.username)).size}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Highest Bid</span>
                  <span className="stat-value">${highestBid.amount.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Leading Bidder</span>
                  <span className="stat-value">{highestBid.bidder.username}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Controls */}
        {user.role === 'ADMIN' && (
          <div className="admin-controls">
            <div className="admin-panel-card">
              <h3>Admin Controls</h3>
              <div className="admin-info">
                <p><strong>Your Role:</strong> Auction Administrator</p>
                <p><strong>Auction Created:</strong> {new Date(auction.createdAt).toLocaleString()}</p>
                <p><strong>Reserve Met:</strong> {highestBid && highestBid.amount >= auction.reservePrice ? '✅ Yes' : '❌ No'}</p>
              </div>
              
              <div className="admin-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => copyAuctionLink()}
                >
                  📋 Copy Auction Link
                </button>
                
                {auction.status === 'ACTIVE' && (
                  <button 
                    className="btn btn-danger"
                    onClick={() => closeAuction()}
                    disabled={!highestBid || highestBid.amount < auction.reservePrice}
                  >
                    🔒 Close Auction
                  </button>
                )}
              </div>
              
              {(!highestBid || highestBid.amount < auction.reservePrice) && (
                <div className="admin-warning">
                  ⚠️ Reserve price not yet met. Auction cannot be closed.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auction Status Banner */}
        {auction.status === 'CLOSED' && (
          <div className="auction-closed-banner">
            <div className="closed-message">
              <h3>🎉 Auction Closed!</h3>
              {highestBid ? (
                <div className="winner-info">
                  <p><strong>Winner:</strong> {highestBid.bidder.username}</p>
                  <p><strong>Winning Bid:</strong> ${highestBid.amount.toFixed(2)}</p>
                  <p><strong>Final Time:</strong> {new Date(highestBid.createdAt).toLocaleString()}</p>
                </div>
              ) : (
                <p>No bids were placed on this auction.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to copy auction link
const copyAuctionLink = () => {
  const link = window.location.href;
  navigator.clipboard.writeText(link).then(() => {
    alert('Auction link copied to clipboard!');
  }).catch(() => {
    prompt('Copy this auction link:', link);
  });
};

// Note: closeAuction function would need to be implemented in the backend
// For now, it's just a placeholder button

export default AuctionRoom;