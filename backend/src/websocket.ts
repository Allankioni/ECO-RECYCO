import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket[]> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      // Extract token from query parameters
      const url = new URL(req.url || '', 'ws://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      try {
        // Verify token and get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
        ws.userId = decoded.id;

        // Store client connection
        if (!this.clients.has(ws.userId)) {
          this.clients.set(ws.userId, []);
        }
        this.clients.get(ws.userId)?.push(ws);

        console.log(`Client connected: ${ws.userId}`);

        ws.on('close', () => {
          this.removeClient(ws);
        });

        ws.on('error', (error) => {
          console.error(`WebSocket error for user ${ws.userId}:`, error);
          this.removeClient(ws);
        });
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        ws.close(1008, 'Invalid token');
      }
    });
  }

  private removeClient(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        const index = userClients.indexOf(ws);
        if (index > -1) {
          userClients.splice(index, 1);
        }
        if (userClients.length === 0) {
          this.clients.delete(ws.userId);
        }
      }
    }
  }

  // Send message to specific user
  sendToUser(userId: string, type: string, payload: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const message = JSON.stringify({ type, payload });
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  // Broadcast message to all connected clients
  broadcast(type: string, payload: any) {
    const message = JSON.stringify({ type, payload });
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export default WebSocketManager; 