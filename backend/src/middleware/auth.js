const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = function(req, res, next) {
  // Get token from header (either x-auth-token or Authorization: Bearer token)
  let token = req.header('x-auth-token');
  
  // Check for Authorization header with Bearer token
  const authHeader = req.header('Authorization');
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
}; 