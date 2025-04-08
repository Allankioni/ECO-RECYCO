const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Computers', 'Mobile Phones', 'Accessories', 'Components', 'Other']
  },
  condition: {
    type: String,
    required: true,
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor']
  },
  images: [{
    type: String,
    required: true
  }],
  location: {
    type: String,
    required: true,
    trim: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'reserved'],
    default: 'available'
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for search functionality
productSchema.index({ title: 'text', description: 'text' });

// Method to check if bidding is still active
productSchema.methods.isBiddingActive = function() {
  return this.status === 'active' && this.biddingEndTime > new Date();
};

// Method to place a bid
productSchema.methods.placeBid = async function(bidderId, amount) {
  if (!this.isBiddingActive()) {
    throw new Error('Bidding is not active for this product');
  }
  
  if (amount <= this.currentPrice) {
    throw new Error('Bid amount must be higher than current price');
  }
  
  this.currentPrice = amount;
  this.currentBidder = bidderId;
  this.bids.push({
    bidder: bidderId,
    amount: amount
  });
  
  return this.save();
};

module.exports = mongoose.model('Product', productSchema); 