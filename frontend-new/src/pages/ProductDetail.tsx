import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import BidStatus from '../components/BidStatus';

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  location: string;
  createdAt: string;
  currentBid?: number;
  seller: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  status: string;
}

interface Bid {
  _id: string;
  product: string;
  bidder: {
    _id: string;
    name: string;
  };
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active';
  createdAt: string;
}

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProduct();
    fetchBids();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProduct(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch product details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/bids/product/${id}`);
      setBids(response.data);
    } catch (err) {
      console.error('Failed to fetch bids:', err);
    }
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidError('');
    setBidLoading(true);

    try {
      const token = localStorage.getItem('token');
      const amount = parseFloat(bidAmount);
      
      if (!product || amount <= product.price) {
        setBidError('Bid amount must be higher than the current price');
        setBidLoading(false);
        return;
      }

      await axios.post(
        `http://localhost:5000/api/bids`,
        {
          productId: id,
          amount
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Refresh product and bids
      await Promise.all([fetchProduct(), fetchBids()]);
      setBidAmount('');
    } catch (err: any) {
      setBidError(err.response?.data?.message || 'Failed to place bid. Please try again.');
    } finally {
      setBidLoading(false);
    }
  };

  const handleBidAction = async (bidId: string, action: 'approve' | 'reject' | 'complete') => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/bids/${bidId}/${action}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Refresh product and bids
      await Promise.all([fetchProduct(), fetchBids()]);
      
      // If bid was approved, automatically create a conversation
      if (action === 'approve') {
        // Find the approved bid to get bidder information
        const approvedBid = bids.find(bid => bid._id === bidId);
        if (approvedBid && product) {
          // Navigate to messages page with necessary information to create conversation
          navigate('/messages', {
            state: {
              productId: product._id,
              userId: approvedBid.bidder._id,
              bidId: bidId
            }
          });
        }
      }
    } catch (err: any) {
      setBidError(err.response?.data?.message || `Failed to ${action} bid. Please try again.`);
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:5000${imagePath}`;
  };

  const getBidStatus = () => {
    if (!isAuthenticated || !user || !bids.length) return null;
    
    const userBids = bids.filter(bid => bid.bidder._id === user._id);
    if (!userBids.length) return null;

    const latestBid = userBids[userBids.length - 1];
    const highestBid = bids.reduce((max, bid) => bid.amount > max.amount ? bid : max, bids[0]);

    if (latestBid.status === 'approved') {
      return { status: 'winning' as const, amount: latestBid.amount };
    } else if (latestBid.status === 'active') {
      if (highestBid._id === latestBid._id) {
        return { status: 'placed' as const, amount: latestBid.amount };
      } else {
        return { status: 'outbid' as const, amount: latestBid.amount };
      }
    }
    return null;
  };

  const handleMessageClick = (bid: Bid) => {
    navigate('/messages', {
      state: {
        productId: product?._id,
        userId: user?._id === bid.bidder._id ? product?.seller._id : bid.bidder._id,
        bidId: bid._id
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
          <div className="mt-6">
            <Link
              to="/products"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <img
              src={getImageUrl(product?.images[selectedImage] || '')}
              alt={product?.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product?.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative aspect-square rounded-lg overflow-hidden ${
                  selectedImage === index ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <img
                  src={getImageUrl(image)}
                  alt={`${product?.title} - Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product info */}
        <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.title}</h1>
          
          <div className="mt-3">
            <h2 className="sr-only">Product information</h2>
            <p className="text-3xl text-gray-900">
              ${product.currentBid ? product.currentBid.toFixed(2) : product.price.toFixed(2)}
            </p>
            {product.currentBid && (
              <p className="text-sm text-gray-500">Starting price: ${product.price.toFixed(2)}</p>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="ml-2 text-sm text-gray-500">Condition: {product.condition}</p>
              </div>
              <div className="ml-4 pl-4 border-l border-gray-300">
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="ml-2 text-sm text-gray-500">{product.location}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900">Description</h3>
            <div className="mt-2 prose prose-sm text-gray-500">
              {product.description}
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-8">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Category</h3>
              <p className="text-sm text-gray-500">{product.category}</p>
            </div>
          </div>

          {/* Bidding Section */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bidding</h3>
            
            {getBidStatus() && (
              <BidStatus
                status={getBidStatus()!.status}
                amount={getBidStatus()!.amount}
                currency="$"
              />
            )}
            {isAuthenticated && product.seller && user?._id !== product.seller._id ? (
              <form onSubmit={handleBidSubmit} className="space-y-4">
                <div>
                  <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">
                    Your Bid Amount
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="bidAmount"
                      id="bidAmount"
                      className="focus:ring-green-500 focus:border-green-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={product.currentBid ? product.currentBid + 1 : product.price + 1}
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                {bidError && (
                  <p className="text-sm text-red-600">{bidError}</p>
                )}
                <button
                  type="submit"
                  disabled={bidLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50"
                >
                  {bidLoading ? 'Placing Bid...' : 'Place Bid'}
                </button>
              </form>
            ) : !isAuthenticated ? (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">Please log in to place a bid</p>
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Login to Bid
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500">You cannot bid on your own product</p>
            )}

            {/* Bids History */}
            {bids.length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Bid History</h4>
                <div className="space-y-2">
                  {bids.map((bid) => (
                    <div key={bid._id} className="border rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">${bid.amount.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">by {bid.bidder.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(bid.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {bid.status === 'approved' && (
                            <button
                              onClick={() => handleMessageClick(bid)}
                              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Message
                            </button>
                          )}
                          {user?._id === product?.seller._id && bid.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleBidAction(bid._id, 'approve')}
                                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleBidAction(bid._id, 'reject')}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bid.status === 'approved' ? 'bg-green-100 text-green-800' :
                          bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          bid.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Status */}
            {product.status !== 'available' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900">
                  Status: <span className="font-medium capitalize">{product.status}</span>
                </p>
                {product.status === 'reserved' && (
                  <p className="mt-1 text-sm text-gray-500">
                    This product has been reserved for a buyer.
                  </p>
                )}
                {product.status === 'sold' && (
                  <p className="mt-1 text-sm text-gray-500">
                    This product has been sold.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 pt-8">
            {isAuthenticated ? (
              <div className="space-y-4">
                <button
                  onClick={() => setShowContact(!showContact)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                >
                  {showContact ? 'Hide Contact Info' : 'Show Contact Info'}
                </button>
                
                {showContact && product.seller && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Seller:</span> {product.seller.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Email:</span> {product.seller.email || 'N/A'}
                    </p>
                    {product.seller.phone && (
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Phone:</span> {product.seller.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Link
                  to="/login"
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                >
                  Login to Contact Seller
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;