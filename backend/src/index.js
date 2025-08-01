// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'USER'
      }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create auction (Admin only)
app.post('/api/auctions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { productName, reservePrice } = req.body;
    
    const auction = await prisma.auction.create({
      data: {
        productName,
        reservePrice: parseFloat(reservePrice),
        createdBy: req.user.id
      }
    });

    res.json(auction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all auctions
app.get('/api/auctions', async (req, res) => {
  try {
    const auctions = await prisma.auction.findMany({
      include: {
        creator: {
          select: { username: true }
        },
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
          include: {
            bidder: {
              select: { username: true }
            }
          }
        }
      }
    });

    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get auction details with bids
app.get('/api/auctions/:id', async (req, res) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          select: { username: true }
        },
        bids: {
          orderBy: { amount: 'desc' },
          include: {
            bidder: {
              select: { username: true }
            }
          }
        }
      }
    });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json(auction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Place bid
app.post('/api/auctions/:id/bid', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'USER') {
      return res.status(403).json({ error: 'Only users can place bids' });
    }

    const { amount } = req.body;
    const auctionId = req.params.id;
    
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId }
    });

    if (!auction || auction.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Auction not found or not active' });
    }

    if (parseFloat(amount) < auction.reservePrice) {
      return res.status(400).json({ error: 'Bid must be at least the reserve price' });
    }

    // Get highest current bid
    const highestBid = await prisma.bid.findFirst({
      where: { auctionId },
      orderBy: { amount: 'desc' }
    });

    if (highestBid && parseFloat(amount) <= highestBid.amount) {
      return res.status(400).json({ error: 'Bid must be higher than current highest bid' });
    }

    const bid = await prisma.bid.create({
      data: {
        amount: parseFloat(amount),
        auctionId,
        bidderId: req.user.id
      },
      include: {
        bidder: {
          select: { username: true }
        }
      }
    });

    // Emit real-time update
    io.to(`auction_${auctionId}`).emit('newBid', bid);

    res.json(bid);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinAuction', (auctionId) => {
    socket.join(`auction_${auctionId}`);
    console.log(`User ${socket.id} joined auction ${auctionId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});