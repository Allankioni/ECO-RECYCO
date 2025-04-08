import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { unreadMessages, unreadBids, fetchUnreadCount } = useNotification();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotificationTooltip, setShowNotificationTooltip] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Calculate total unread notifications
  const totalUnread = unreadMessages + unreadBids;
  
  // Fetch notifications periodically for real-time updates
  useEffect(() => {
    if (isAuthenticated) {
      // Initial fetch
      fetchUnreadCount();
      
      // Set up interval for real-time updates (every 15 seconds)
      const intervalId = setInterval(() => {
        fetchUnreadCount();
      }, 15000);
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white/90 shadow-soft sticky top-0 z-50 backdrop-blur-md border-b border-neutral-200 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center group transition-all duration-300">
                <img src="/logo.svg" alt="Eco-Recyco Logo" className="h-8 w-8 transform group-hover:scale-110 transition-transform duration-300" />
                <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-500 bg-clip-text text-transparent group-hover:opacity-80 transition-all duration-300">Eco-Recyco</span>
              </Link>
            </div>
            
            {/* Main Navigation */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
              <Link
                to="/products"
                className="nav-link inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary-600 transition-all duration-300 border-b-2 border-transparent hover:border-primary-500"
              >
                Browse Products
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/create-product"
                    className="nav-link inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary-600 transition-all duration-300 border-b-2 border-transparent hover:border-primary-500"
                  >
                    Create Listing
                  </Link>
                  <Link
                    to="/my-bids"
                    className="nav-link inline-flex items-center px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary-600 transition-all duration-300 border-b-2 border-transparent hover:border-primary-500"
                  >
                    My Bids
                  </Link>
                </>
              )}
            </div>
          </div>
          
          {/* Right side menu */}
          <div className="hidden sm:flex sm:items-center sm:space-x-2">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* Notification Bell Icon */}
                <Link
                  to="/messages"
                  className="relative p-2 rounded-full hover:bg-primary-50/70 transition-all duration-300"
                  onMouseEnter={() => setShowNotificationTooltip(true)}
                  onMouseLeave={() => setShowNotificationTooltip(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-700 hover:text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {totalUnread}
                    </span>
                  )}
                  {showNotificationTooltip && totalUnread > 0 && (
                    <div className="absolute top-10 right-0 bg-white shadow-lg rounded-md p-2 w-64 z-50 text-sm text-gray-700">
                      <div className="flex flex-col space-y-1">
                        {unreadMessages > 0 && (
                          <p>You have {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}</p>
                        )}
                        {unreadBids > 0 && (
                          <p>You have {unreadBids} new bid{unreadBids !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
                
                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 rounded-full hover:bg-primary-50/70 transition-all duration-300"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left block px-4 py-2 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-neutral-700 hover:text-primary-600 transition-all duration-300"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium rounded-md text-white bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 shadow-sm hover:shadow"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden animate-slide-up bg-white/95 backdrop-blur-md shadow-lg rounded-b-xl mx-2 overflow-hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            to="/products"
            className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-primary-50 hover:border-primary-500 hover:text-primary-600 transition-all duration-200"
            onClick={() => setIsOpen(false)}
          >
            Browse Products
          </Link>
          {isAuthenticated && (
            <>
              <Link
                to="/create-product"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-primary-50 hover:border-primary-500 hover:text-primary-600 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                Create Listing
              </Link>
              <Link
                to="/my-bids"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-primary-50 hover:border-primary-500 hover:text-primary-600 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                My Bids
              </Link>
              <Link
                to="/messages"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-primary-50 hover:border-primary-500 hover:text-primary-600 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                <div className="relative inline-flex items-center">
                  Messages
                  {totalUnread > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {totalUnread}
                    </span>
                  )}
                </div>
              </Link>
            </>
          )}
        </div>
        <div className="pt-4 pb-3 border-t border-neutral-200">
          {isAuthenticated ? (
            <div className="space-y-1">
              <Link
                to="/profile"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-primary-50 hover:border-primary-500 hover:text-primary-600 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-primary-50 hover:border-primary-500 hover:text-primary-600 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Link
                to="/login"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-primary-50 hover:border-primary-500 hover:text-primary-600 transition-all duration-200"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="block pl-3 pr-4 py-2 border-l-4 border-primary-500 text-base font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;