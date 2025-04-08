import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import BidStatus from '../components/BidStatus';

interface Bid {
  _id: string;
  product: {
    _id: string;
    title: string;
    images: string[];
    price: number;
    currentBid?: number;
  };
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active';
  createdAt: string;
}

const MyBids: React.FC = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const { token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchBids();
  }, [isAuthenticated, isLoading, navigate]);

  const fetchBids = async () => {
    try {
      // Get user bids with full product details including images
      const response = await axios.get('http://localhost:5000/api/bids/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // For each bid, fetch the complete product details
      const bidsWithFullProductDetails = await Promise.all(
        response.data.map(async (bid: Bid) => {
          try {
            const productResponse = await axios.get(`http://localhost:5000/api/products/${bid.product._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return { ...bid, product: productResponse.data };
          } catch (error) {
            console.error(`Error fetching product details for bid ${bid._id}:`, error);
            return bid; // Return original bid if product fetch fails
          }
        })
      );
      
      setBids(bidsWithFullProductDetails);
      setError('');
    } catch (err: any) {
      console.error('Error fetching bids:', err);
      setError(err.response?.data?.message || 'Failed to fetch bids');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:5000${imagePath}`;
  };

  const filteredBids = bids.filter(bid => {
    if (filter === 'all') return true;
    return bid.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Bids</h1>
        <div className="flex items-center space-x-4">
          <label htmlFor="filter" className="text-sm font-medium text-gray-700">
            Filter by status:
          </label>
          <select
            id="filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
          >
            <option value="all">All Bids</option>
            <option value="active">Active</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBids.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No bids found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Start bidding on products to see them here.
            </p>
            <div className="mt-6">
              <Link
                to="/products"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Browse Products
              </Link>
            </div>
          </div>
        ) : (
          filteredBids.map((bid) => (
            <div
              key={bid._id}
              className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <Link to={`/products/${bid.product._id}`}>
                <div className="aspect-w-16 aspect-h-9">
                  <img
                    src={bid.product.images && bid.product.images.length > 0 
                      ? getImageUrl(bid.product.images[0])
                      : 'http://localhost:5000/default-product-image.jpg'}
                    alt={bid.product.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              </Link>
              <div className="p-6">
                <Link
                  to={`/products/${bid.product._id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-green-600"
                >
                  {bid.product.title}
                </Link>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Your Bid:</span>
                    <span className="text-lg font-medium text-gray-900">
                      ${bid.amount.toFixed(2)}
                    </span>
                  </div>
                  {bid.product.currentBid && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Current Highest:</span>
                      <span className="text-lg font-medium text-gray-900">
                        ${bid.product.currentBid.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Starting Price:</span>
                    <span className="text-lg font-medium text-gray-900">
                      ${bid.product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-4">
                    <BidStatus
                      status={getBidStatusType(bid)}
                      amount={bid.amount}
                      currency="$"
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Bid placed on {new Date(bid.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Helper function to map bid status to BidStatus component status
  function getBidStatusType(bid: Bid): 'winning' | 'outbid' | 'placed' {
    if (bid.status === 'active' && bid.product.currentBid === bid.amount) {
      return 'winning';
    } else if (bid.status === 'active') {
      return 'outbid';
    } else {
      // For all other statuses (pending, approved, rejected, cancelled)
      return 'placed';
    }
  }
};

export default MyBids;