const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> WebSocket connection

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws, req) {
    // Extract token from query string
    const token = new URL(req.url, 'ws://localhost').searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Store the connection
      this.clients.set(userId, ws);

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(userId);
      });

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1008, 'Invalid token');
    }
  }

  sendToUser(userId, event, data) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }

  broadcast(event, data) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event, data }));
      }
    });
  }
}

module.exports = WebSocketManager; 