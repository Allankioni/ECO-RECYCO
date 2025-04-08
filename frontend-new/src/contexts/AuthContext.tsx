import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  photo?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; password: string; phone?: string; address?: string; photo?: File }) => Promise<void>;
  uploadPhoto: (photo: File) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchUser = async () => {
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching user with token:', token);
      const response = await axios.get('http://localhost:5000/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      console.log('Login successful, setting token:', response.data);
      const newToken = response.data.token;
      if (newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        await fetchUser();
      } else {
        console.error('No token received from server');
        throw new Error('Authentication failed: No token received');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: { name: string; email: string; password: string; phone?: string; address?: string; photo?: File }) => {
    try {
      // Validate required fields
      if (!userData.name?.trim()) {
        throw new Error('Name is required');
      }
      const name = userData.name.trim();
  
      if (!userData.email?.trim()) {
        throw new Error('Email is required');
      }
      const email = userData.email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email');
      }
  
      if (!userData.password?.trim()) {
        throw new Error('Password is required');
      }
      const password = userData.password.trim();
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      if (!/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(password)) {
        throw new Error('Password must contain at least one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        throw new Error('Password must contain at least one special character');
      }
  
      // Register user with basic data
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password,
        phone: userData.phone?.trim(),
        address: userData.address?.trim()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
  
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Registration failed with status ${response.status}`);
      }
  
      const newToken = response.data.token;
      if (!newToken) {
        throw new Error('Registration successful but no token received');
      }
  
      // Set token and trigger login flow
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setIsAuthenticated(true);

      // If photo is provided, upload it after successful registration
      if (userData.photo) {
        try {
          const formData = new FormData();
          formData.append('photo', userData.photo);

          await axios.post('http://localhost:5000/api/users/upload-photo', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${newToken}`
            }
          });
          // Wait for a moment to ensure the server has processed the photo
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (photoError) {
          console.error('Error uploading photo during registration:', photoError);
          throw new Error('Failed to upload photo during registration');
        }
      }

      // Fetch user data multiple times to ensure we get the latest data
      await fetchUser();
      // Add a small delay and fetch again to ensure we have the latest data
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchUser();
  
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response?.data?.errors) {
        throw new Error(error.response.data.errors.map((err: any) => err.msg).join(', '));
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Registration failed. Please try again.');
      }
    }
  };

  const uploadPhoto = async (photo: File) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      const formData = new FormData();
      formData.append('photo', photo);

      await axios.post('http://localhost:5000/api/users/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      await fetchUser(); // Refresh user data to get updated photo
    } catch (error: any) {
      console.error('Photo upload error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload photo');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    token,
    login,
    register,
    uploadPhoto,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};