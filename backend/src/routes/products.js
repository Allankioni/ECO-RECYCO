const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Product = require('../models/Product');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
  }
});

// Validation middleware
const productValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isIn(['Electronics', 'Computers', 'Mobile Phones', 'Accessories', 'Components', 'Other'])
    .withMessage('Invalid category'),
  body('condition').isIn(['New', 'Like New', 'Good', 'Fair', 'Poor'])
    .withMessage('Invalid condition'),
  body('location').trim().notEmpty().withMessage('Location is required')
];

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name email phone');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// Create product
router.post('/', auth, upload.array('images', 4), productValidation, async (req, res) => {
  try {
    console.log('Creating product with data:', {
      ...req.body,
      seller: req.user.id,
      files: req.files ? req.files.length : 0
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      // Delete uploaded files if validation fails
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
    console.log('Generated image URLs:', imageUrls);

    const product = new Product({
      ...req.body,
      images: imageUrls,
      seller: req.user.id,
      status: 'available',
      views: 0
    });

    await product.save();
    console.log('Product created successfully:', product._id);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    // Delete uploaded files if saving fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    res.status(500).json({ message: 'Error creating product' });
  }
});

// Update product
router.put('/:id', auth, upload.array('images', 4), productValidation, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is the seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Delete new uploaded files if validation fails
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { ...req.body };

    // Handle image updates if new images are uploaded
    if (req.files && req.files.length > 0) {
      // Delete old images
      product.images.forEach(image => {
        const filePath = path.join(__dirname, '../../', image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      // Add new images
      updateData.images = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updatedProduct);
  } catch (error) {
    // Delete uploaded files if updating fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Delete product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is the seller
    if (product.seller.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    // Delete product images
    product.images.forEach(image => {
      const filePath = path.join(__dirname, '../../', image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    await product.remove();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

module.exports = router; 