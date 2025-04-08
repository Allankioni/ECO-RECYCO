import React from 'react';
import { Toaster } from 'react-hot-toast';

const Toast: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
        },
        success: {
          duration: 3000,
          style: {
            background: '#4a5568',
          },
        },
        error: {
          duration: 4000,
          style: {
            background: '#e53e3e',
          },
        },
      }}
    />
  );
};

export default Toast; 