import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadMessages: number;
  unreadBids: number;
  fetchUnreadCount: () => Promise<void>;
  markMessagesAsRead: () => void;
  markBidsAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [unreadBids, setUnreadBids] = useState<number>(0);
  const { token, isAuthenticated } = useAuth();

  const fetchUnreadCount = async () => {
    if (!token || !isAuthenticated) {
      setUnreadMessages(0);
      setUnreadBids(0);
      return;
    }

    try {
      // Fetch unread messages count
      const messagesResponse = await axios.get('http://localhost:5000/api/messages/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadMessages(messagesResponse.data.count);
      
      // Fetch unread bids count
      const bidsResponse = await axios.get('http://localhost:5000/api/bids/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadBids(bidsResponse.data.count);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!token || !isAuthenticated) return;
    
    try {
      await axios.put('http://localhost:5000/api/messages/mark-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadMessages(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const markBidsAsRead = async () => {
    if (!token || !isAuthenticated) return;
    
    try {
      await axios.put('http://localhost:5000/api/bids/mark-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadBids(0);
    } catch (error) {
      console.error('Error marking bids as read:', error);
    }
  };

  // Fetch unread counts on mount and when authentication state changes
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
    }
  }, [token, fetchUnreadCount]);

  return (
    <NotificationContext.Provider value={{ 
      unreadMessages, 
      unreadBids, 
      fetchUnreadCount, 
      markMessagesAsRead, 
      markBidsAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};