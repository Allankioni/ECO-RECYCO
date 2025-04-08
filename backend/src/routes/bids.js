const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Bid = require('../models/Bid');
const Product = require('../models/Product');

// Get all bids for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const bids = await Bid.find({ product: req.params.productId })
      .populate('bidder', 'name email')
      .sort({ amount: -1 });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all bids by a user
router.get('/user', auth, async (req, res) => {
  try {
    const bids = await Bid.find({ bidder: req.user.id })
      .populate('product', 'title currentPrice')
      .sort({ createdAt: -1 });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Place a new bid
router.post('/', auth, async (req, res) => {
  try {
    const { productId, amount } = req.body;
    
    // Check if product exists and is still available
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.status !== 'available') {
      return res.status(400).json({ message: 'Product is no longer available for bidding' });
    }
    
    // Check if bid amount is higher than current price
    if (amount <= product.price) {
      return res.status(400).json({ message: 'Bid amount must be higher than current price' });
    }
    
    // Create new bid
    const bid = new Bid({
      product: productId,
      bidder: req.user.id,
      amount,
      status: 'active'
    });
    
    await bid.save();
    
    // Update product's current price
    product.currentBid = amount;
    await product.save();
    
    res.status(201).json(bid);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel a bid
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }
    
    if (bid.bidder.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this bid' });
    }
    
    bid.status = 'cancelled';
    await bid.save();
    
    res.json(bid);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve a bid
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id).populate('product');
    
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }
    
    // Check if user is the seller
    if (bid.product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to approve this bid' });
    }
    
    // Update bid status
    bid.status = 'approved';
    await bid.save();
    
    // Update product status
    bid.product.status = 'reserved';
    await bid.product.save();
    
    // Cancel all other active bids on this product
    await Bid.updateMany(
      { 
        product: bid.product._id,
        _id: { $ne: bid._id },
        status: 'active'
      },
      { status: 'cancelled' }
    );
    
    res.json(bid);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject a bid
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id).populate('product');
    
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }
    
    // Check if user is the seller
    if (bid.product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to reject this bid' });
    }
    
    bid.status = 'rejected';
    await bid.save();
    
    res.json(bid);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Complete a transaction (mark as sold)
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id).populate('product');
    
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }
    
    // Check if user is the seller
    if (bid.product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to complete this transaction' });
    }
    
    // Update bid status
    bid.status = 'completed';
    await bid.save();
    
    // Update product status
    bid.product.status = 'sold';
    await bid.product.save();
    
    res.json(bid);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get unread bid count for current user
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Bid.countDocuments({
      $or: [
        { bidder: req.user._id, read: false },
        { product: { $in: await Product.find({ seller: req.user._id }).select('_id') }, read: false }
      ]
    });
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread bid count:', error);
    res.status(500).json({ message: 'Error getting unread bid count' });
  }
});

module.exports = router; 