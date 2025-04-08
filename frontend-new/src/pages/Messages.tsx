import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface Conversation {
  _id: {
    product: string;
    otherUser: string;
  };
  otherUser: {
    _id: string;
    name: string;
  };
  product: {
    _id: string;
    title: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    read: boolean;
    bid: string;
  };
}

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    name: string;
  };
  receiver: {
    _id: string;
    name: string;
  };
  product: string;
  bid: string;
  createdAt: string;
  read: boolean;
}

interface LocationState {
  productId?: string;
  userId?: string;
  bidId?: string;
}

const Messages: React.FC = () => {
  const { user, token } = useAuth();
  const { markMessagesAsRead, fetchUnreadCount } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state?.productId && state?.userId && state?.bidId) {
      // Create initial message when coming from product detail
      const createInitialMessage = async () => {
        try {
          // Use token from the AuthContext
          console.log('[DEBUG] Using token from context:', token ? 'YES' : 'NO');
          
          if (!token || !user?._id) {
            console.log('[DEBUG] No token or user, redirecting to login');
            navigate('/login');
            return;
          }

          // Send initial message
          await axios.post(
            'http://localhost:5000/api/messages',
            {
              productId: state.productId,
              receiverId: state.userId,
              bidId: state.bidId,
              content: "Hi, I'd like to discuss this item."
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          // Fetch conversations after creating the message
          fetchConversations();
        } catch (error) {
          console.error('Error creating initial message:', error);
          setError('Failed to start conversation');
        }
      };

      createInitialMessage();
    } else {
      fetchConversations();
    }
  }, [state?.productId, state?.userId, state?.bidId, user, token, navigate]);

  useEffect(() => {
    if (state?.productId && state?.userId) {
      const conversation = conversations.find(
        conv => conv._id.product === state.productId && conv._id.otherUser === state.userId
      );
      if (conversation) {
        setSelectedConversation(conversation);
        if (state.bidId) {
          setSelectedBidId(state.bidId);
        }
      }
    }
  }, [conversations, state]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      // Mark messages as read when viewing a conversation
      markMessagesAsRead();
      // Update the unread count in the notification context
      fetchUnreadCount();
      
      // Update the read status in the UI
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv._id.product === selectedConversation._id.product && 
              conv._id.otherUser === selectedConversation._id.otherUser) {
            return {
              ...conv,
              lastMessage: {
                ...conv.lastMessage,
                read: true
              }
            };
          }
          return conv;
        })
      );
    }
  }, [selectedConversation, token, navigate, markMessagesAsRead, fetchUnreadCount]);

  const fetchConversations = async () => {
    try {
      // Use token from context instead of localStorage
      console.log('[DEBUG] Token from context:', token ? 'YES' : 'NO');
      
      if (!token || !user?._id) {
        console.log('[DEBUG] No token or user, redirecting to login');
        navigate('/login');
        return;
      }

      console.log('[DEBUG] Request to GET /api/messages/conversations with token:', token ? 'YES' : 'NO');
      const response = await axios.get('http://localhost:5000/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Conversations response:', response.data);

      setConversations(response.data);
      setError('');
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      setError(error.response?.data?.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    try {
      // Use token from context instead of localStorage
      console.log('[DEBUG] Using token for fetching messages:', token ? 'YES' : 'NO');
      
      const response = await axios.get(
        `http://localhost:5000/api/messages/${selectedConversation._id.product}/${selectedConversation._id.otherUser}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data);
      
      // If we don't have a bidId yet, get it from the first message
      if (!selectedBidId && response.data.length > 0) {
        setSelectedBidId(response.data[0].bid);
      }
      
      setError('');
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError(error.response?.data?.message || 'Failed to fetch messages');
    }
  };

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      return isValidType && isValidSize;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !selectedBidId) {
      console.error('Missing required data:', {
        message: newMessage.trim(),
        conversation: selectedConversation,
        bidId: selectedBidId
      });
      return;
    }

    try {
      // Use token from context instead of localStorage
      console.log('[DEBUG] Using token for sending message:', token ? 'YES' : 'NO');
      console.log('Sending message with data:', {
        productId: selectedConversation._id.product,
        receiverId: selectedConversation._id.otherUser,
        bidId: selectedBidId,
        content: newMessage.trim()
      });

      const formData = new FormData();
      formData.append('productId', selectedConversation._id.product);
      formData.append('receiverId', selectedConversation._id.otherUser);
      formData.append('bidId', selectedBidId);
      formData.append('content', newMessage.trim());
      
      selectedFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await axios.post(
        'http://localhost:5000/api/messages',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
            setUploadProgress(progress);
          }
        }
      );

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      setSelectedFiles([]);
      setUploadProgress(0);
      setError('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.response?.data?.message || 'Failed to send message');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchConversations}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="md:col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Conversations</h2>
          </div>
          <div className="divide-y">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={`${conversation._id.product}-${conversation._id.otherUser}`}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 text-left hover:bg-gray-50 ${
                    selectedConversation?._id.product === conversation._id.product &&
                    selectedConversation?._id.otherUser === conversation._id.otherUser
                      ? 'bg-gray-50'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{conversation.otherUser.name}</p>
                      <p className="text-sm text-gray-500">{conversation.product.title}</p>
                    </div>
                    {!conversation.lastMessage.read && (
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {conversation.lastMessage.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(conversation.lastMessage.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="md:col-span-2 bg-white rounded-lg shadow">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">
                  Chat with {selectedConversation.otherUser.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Re: {selectedConversation.product.title}
                </p>
              </div>

              <div className="h-[500px] overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      className={`mb-4 ${
                        message.sender._id === user?._id ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          message.sender._id === user?._id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="text-xs mt-1 opacity-75">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="file-upload"
                    className="p-2 text-blue-500 hover:text-blue-600 cursor-pointer"
                    title="Attach files"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </label>
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-4">
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-center mt-1">{uploadProgress}%</p>
                    </div>
                  )}
                </div>
                  <button
                    type="submit"
                    disabled={!selectedBidId}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-gray-500">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;