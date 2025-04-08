const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Bid = require('../models/Bid');
const Product = require('../models/Product');
const ObjectId = mongoose.Types.ObjectId;

// Get all conversations for the current user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching conversations for user:', userId);
    
    // Find all messages where user is either sender or receiver
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new ObjectId(userId) },
            { receiver: new ObjectId(userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        // Look up sender information
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'senderInfo'
        }
      },
      {
        // Look up receiver information
        $lookup: {
          from: 'users',
          localField: 'receiver',
          foreignField: '_id',
          as: 'receiverInfo'
        }
      },
      {
        // Look up product information
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $addFields: {
          senderInfo: { $arrayElemAt: ['$senderInfo', 0] },
          receiverInfo: { $arrayElemAt: ['$receiverInfo', 0] },
          productInfo: { $arrayElemAt: ['$productInfo', 0] }
        }
      },
      {
        $group: {
          _id: {
            product: '$product',
            otherUser: {
              $cond: {
                if: { $eq: ['$sender', new ObjectId(userId)] },
                then: '$receiver',
                else: '$sender'
              }
            }
          },
          otherUser: {
            $first: {
              $cond: {
                if: { $eq: ['$sender', new ObjectId(userId)] },
                then: { 
                  _id: '$receiver', 
                  name: '$receiverInfo.name'
                },
                else: { 
                  _id: '$sender', 
                  name: '$senderInfo.name'
                }
              }
            }
          },
          product: {
            $first: {
              _id: '$product',
              title: '$productInfo.title'
            }
          },
          lastMessage: {
            $first: {
              content: '$content',
              createdAt: '$createdAt',
              read: '$read',
              bid: '$bid'
            }
          }
        }
      }
    ]);

    console.log('Found conversations:', messages);
    res.json(messages);
  } catch (error) {
    console.error('Error in /conversations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get messages for a specific conversation
router.get('/:productId/:otherUserId', auth, async (req, res) => {
  try {
    const { productId, otherUserId } = req.params;
    const userId = req.user.id;
    console.log('Fetching messages for product:', productId, 'between users:', userId, 'and', otherUserId);

    const messages = await Message.find({
      product: productId,
      $or: [
        { sender: new ObjectId(userId), receiver: new ObjectId(otherUserId) },
        { sender: new ObjectId(otherUserId), receiver: new ObjectId(userId) }
      ]
    })
    .populate('sender', 'name')
    .populate('receiver', 'name')
    .populate('product', 'title')
    .sort({ createdAt: 1 });

    console.log('Found messages:', messages.length);
    res.json(messages);
  } catch (error) {
    console.error('Error in /:productId/:otherUserId:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Configure multer for file attachments
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/messages';
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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and documents (jpeg, jpg, png, pdf, doc, docx) are allowed!'));
  }
});

// Send a new message
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { productId, receiverId, bidId, content } = req.body;
    const senderId = req.user.id;
    console.log('Creating new message:', { productId, receiverId, bidId, content, senderId });

    if (!productId || !receiverId || !bidId || !content) {
      // Delete uploaded files if validation fails
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify bid exists
    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Get user information for sender and receiver
    const [senderUser, receiverUser, productInfo] = await Promise.all([
      mongoose.model('User').findById(senderId),
      mongoose.model('User').findById(receiverId),
      mongoose.model('Product').findById(productId)
    ]);

    if (!senderUser || !receiverUser || !productInfo) {
      return res.status(404).json({ message: 'User or product not found' });
    }

    const attachmentPaths = req.files ? req.files.map(file => `/uploads/messages/${file.filename}`) : [];

    const newMessage = new Message({
      content,
      sender: new ObjectId(senderId),
      receiver: new ObjectId(receiverId),
      product: productId,
      bid: bidId,
      attachments: attachmentPaths,
      read: false
    });

    await newMessage.save();
    
    // Populate the message with sender and receiver info before sending response
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name')
      .populate('receiver', 'name');
    
    console.log('Message created:', populatedMessage);
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error in POST /:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark messages as read for a specific conversation
router.put('/mark-conversation-read/:productId/:otherUserId', auth, async (req, res) => {
  try {
    const { productId, otherUserId } = req.params;
    const userId = req.user.id;
    console.log('Marking messages as read for product:', productId, 'between users:', userId, 'and', otherUserId);

    const now = new Date();
    // Update all messages where current user is the receiver and the other user is the sender
    const result = await Message.updateMany(
      {
        product: productId,
        sender: new ObjectId(otherUserId),
        receiver: new ObjectId(userId),
        read: false
      },
      { 
        $set: { 
          read: true,
          readAt: now
        } 
      }
    );

    console.log('Messages marked as read:', result.modifiedCount);
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread messages count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Message.countDocuments({
      receiver: new ObjectId(userId),
      read: false
    });
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all messages as read (global)
router.put('/mark-read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await Message.updateMany(
      { receiver: new ObjectId(userId), read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;