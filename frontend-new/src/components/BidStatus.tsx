import React from 'react';
import '../styles/BidStatus.css';

interface BidStatusProps {
  status: 'outbid' | 'placed' | 'winning';
  amount: number;
  currency?: string;
}

const BidStatus: React.FC<BidStatusProps> = ({ status, amount, currency = '£' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'outbid':
        return 'bid-status-red';
      case 'winning':
        return 'bid-status-green';
      case 'placed':
        return 'bid-status-green';
      default:
        return '';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'outbid':
        return 'Outbid!';
      case 'winning':
        return 'Winning!';
      case 'placed':
        return 'Bid\nPlaced!';
      default:
        return '';
    }
  };

  return (
    <div className={`bid-status-container ${getStatusColor()}`}>
      <div className="bid-status-circle">
        <div className="bid-status-content">
          <div className="bid-status-text">{getStatusText()}</div>
          <div className="bid-status-amount">{`${currency}${amount.toLocaleString()}`}</div>
        </div>
        {status === 'winning' && (
          <div className="bid-status-checkmark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default BidStatus;