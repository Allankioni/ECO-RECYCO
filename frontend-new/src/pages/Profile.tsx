import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Add } from '@mui/icons-material';
import placeholderAvatar from '../assets/placeholder-avatar.svg';

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
  status: 'available' | 'sold' | 'reserved';
}

interface User {
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  avatar?: string;
}

const Profile = () => {
  const { user, token } = useAuth();
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'available' | 'sold' | 'reserved'>('available');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    if (userDetails) {
      setEditForm({
        name: userDetails.name || '',
        phone: userDetails.phone || '',
        address: formatAddress(userDetails.address) || ''
      });
    }
  }, [userDetails]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('phone', editForm.phone);
      
      // Format address as JSON string to ensure it's properly handled by the backend
      const addressObj = { street: editForm.address };
      formData.append('address', JSON.stringify(addressObj));
      
      if (selectedImage) {
        formData.append('avatar', selectedImage);
      }

      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }
      
      // Make sure we process the avatar URL correctly
      const updatedUserData = {
        ...data,
        // Ensure avatar URL is properly formatted
        avatar: data.avatar ? getImageUrl(data.avatar) : null
      };
      
      // Update the userDetails with the processed data
      setUserDetails(updatedUserData);
      
      // Reset the form state
      setIsEditing(false);
      setSelectedImage(null);
      setImagePreview('');
      
      // Update the edit form with the new values
      setEditForm({
        name: data.name || '',
        phone: data.phone || '',
        address: formatAddress(data.address) || ''
      });
      
      console.log('Profile updated successfully with avatar:', updatedUserData.avatar);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch user details');
        const data = await response.json();
        setUserDetails(data);
      } catch (err) {
        setError('Failed to load user details');
      }
    };

    const fetchUserProducts = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/users/products`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        console.log('Fetched products:', data); // Debug log
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err); // Debug log
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    if (token && user) {
      fetchUserDetails();
      fetchUserProducts();
    }
  }, [token, user]);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `http://localhost:5000${imagePath}`;
  };

  // Helper function to format address for display
  const formatAddress = (address: any): string => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    // If address is an object, format it for display
    if (address.street) return address.street;
    return '';
  };

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || price === null) return '0.00';
    return price.toFixed(2);
  };

  const filteredProducts = products.filter(product => product.status === activeTab);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
    </div>
  );

  if (error) return (
    <div className="text-red-500 text-center py-8">{error}</div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* User Info Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Profile Information</h2>
        
        {!isEditing ? (
          <>
            <div className="flex items-start mb-6">
              <div className="relative">
                <img
                  src={userDetails?.avatar ? getImageUrl(userDetails.avatar) : placeholderAvatar}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6 flex-1 ml-8">
                <div>
                  <p className="text-gray-600 mb-2">Full Name</p>
                  <p className="font-medium">{userDetails?.name}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-2">Email</p>
                  <p className="font-medium">{userDetails?.email}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-2">Phone</p>
                  <p className="font-medium">{userDetails?.phone}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-2">Address</p>
                  <p className="font-medium">{formatAddress(userDetails?.address)}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-2">Member Since</p>
                  <p className="font-medium">
                    {new Date(userDetails?.createdAt || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-6 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition duration-300 ease-in-out"
            >
              Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="flex items-center justify-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img
                  src={imagePreview || (userDetails?.avatar ? getImageUrl(userDetails.avatar) : placeholderAvatar)}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="text-white text-2xl">
                    <Add />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-600 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-600 mb-2">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={updateLoading}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition duration-300 ease-in-out disabled:opacity-50"
              >
                {updateLoading ? 'Updating...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedImage(null);
                  setImagePreview('');
                  setError('');
                }}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition duration-300 ease-in-out"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Products Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Products</h2>
          <Link
            to="/create-product"
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition duration-300 ease-in-out"
          >
            List New Item
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          {(['available', 'sold', 'reserved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize ${
                activeTab === tab
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product._id} className="bg-gray-50 rounded-lg p-4">
              <img
                src={getImageUrl(product.images[0])}
                alt={product.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="font-semibold text-lg mb-2">{product.title}</h3>
              <p className="text-green-600 font-medium mb-2">
                ${formatPrice(product.price)}
              </p>
              <p className="text-gray-500 text-sm">
                Listed on {new Date(product.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-4 flex space-x-2">
                <Link
                  to={`/products/${product._id}`}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-center hover:bg-gray-200 transition duration-300"
                >
                  View
                </Link>
                <button className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition duration-300">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No {activeTab} products found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;