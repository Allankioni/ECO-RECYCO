const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Bid = require('./models/Bid');
const Product = require('./models/Product');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Find all bids
    const bids = await Bid.find({});
    
    console.log('\nAll Bids:');
    if (bids.length === 0) {
      console.log('No bids found');
    } else {
      bids.forEach(bid => {
        console.log(`\nBid ID: ${bid._id}`);
        console.log(`Product ID: ${bid.product}`);
        console.log(`Amount: $${bid.amount}`);
        console.log(`Status: ${bid.status}`);
        console.log(`Bidder ID: ${bid.bidder}`);
        console.log('------------------------');
      });
    }

    // Find all products
    const products = await Product.find({});
    
    console.log('\nAll Products:');
    if (products.length === 0) {
      console.log('No products found');
    } else {
      products.forEach(product => {
        console.log(`\nProduct ID: ${product._id}`);
        console.log(`Title: ${product.title}`);
        console.log(`Price: $${product.price}`);
        console.log(`Status: ${product.status}`);
        console.log('------------------------');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});