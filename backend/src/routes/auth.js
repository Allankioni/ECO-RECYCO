const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Password validation regex patterns
const passwordRegex = {
  minLength: /.{8,}/,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>]/
};

// Validation middleware
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(passwordRegex.uppercase).withMessage('Password must contain at least one uppercase letter')
    .matches(passwordRegex.lowercase).withMessage('Password must contain at least one lowercase letter')
    .matches(passwordRegex.number).withMessage('Password must contain at least one number')
    .matches(passwordRegex.special).withMessage('Password must contain at least one special character'),
  body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Register route
router.post('/register', registerValidation, async (req, res) => {
  try {
    console.log('Registration attempt:', { 
      email: req.body.email,
      password: req.body.password // Only log during development!
    });
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, address } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password, // Will be hashed by the pre-save hook
      phone,
      address
    });

    // Log the password before saving
    console.log('Before save - password:', {
      originalPassword: password,
      userPassword: user.password
    });

    await user.save();

    // Log the password after saving
    console.log('After save - password:', {
      hashedPassword: user.password
    });

    console.log('User created successfully:', { 
      email: user.email, 
      userId: user._id,
      hashedPassword: user.password // Only log during development!
    });

    // Generate JWT token
    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login route
router.post('/login', loginValidation, async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email });
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', { email: user.email, userId: user._id });

    // Check password
    try {
      const isMatch = await user.comparePassword(password);
      console.log('Password match result:', isMatch);
      
      if (!isMatch) {
        console.log('Invalid password for user:', email);
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Password comparison error:', error);
      return res.status(500).json({ message: 'Error verifying credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user: { id: user._id } },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful:', { email: user.email, userId: user._id });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', {
      error: error.message,
      stack: error.stack,
      email: req.body.email
    });
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Request password reset
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save reset token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send reset email
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Reset password
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(passwordRegex.uppercase).withMessage('Password must contain at least one uppercase letter')
    .matches(passwordRegex.lowercase).withMessage('Password must contain at least one lowercase letter')
    .matches(passwordRegex.number).withMessage('Password must contain at least one number')
    .matches(passwordRegex.special).withMessage('Password must contain at least one special character')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router; 