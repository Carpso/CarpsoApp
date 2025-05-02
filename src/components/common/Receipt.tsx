// src/components/common/Receipt.tsx
import React from 'react';

interface ReceiptProps {
  transaction: {
    id: string;
    type: string;
    amount: number;
    description?: string;
    timestamp: string;
    currency: string; // e.g., ZMW, USD
    paymentMethodLabel?: string;
    newBalance?: number;
    relatedUserId?: string;
    partnerId?: string;
    parkingRecordId?: string;
    senderId?: string; // For points transfer
    recipientId?: string; // For points transfer
    points?: number; // For points transfer
  };
  title?: string;
}

// Function to get currency symbol (simplified)
const getCurrencySymbol = (currencyCode: string): string => {
    switch (currencyCode.toUpperCase()) {
        case 'ZMW': return 'K';
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'ZAR': return 'R';
        default: return currencyCode; // Fallback to code
    }
};


/**
 * Basic Receipt component for display/printing.
 * Note: Styling here is minimal and assumes basic print styles.
 */
const Receipt: React.FC<ReceiptProps> = ({ transaction, title = "Transaction Receipt" }) => {
  const currencySymbol = getCurrencySymbol(transaction.currency);

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '12px', padding: '10px', maxWidth: '300px' }}>
      <h2 style={{ textAlign: 'center', margin: '0 0 10px 0', borderBottom: '1px dashed #ccc', paddingBottom: '5px' }}>
        {title}
      </h2>
      <p><strong>Date:</strong> {new Date(transaction.timestamp).toLocaleString()}</p>
      <p><strong>Type:</strong> <span style={{ textTransform: 'capitalize' }}>{transaction.type.replace(/_/g, ' ')}</span></p>

      {transaction.description && <p><strong>Details:</strong> {transaction.description}</p>}

      {/* Specific details based on type */}
      {(transaction.type === 'top-up' || transaction.type === 'receive') && (
        <p><strong>Amount Received:</strong> {currencySymbol} {transaction.amount.toFixed(2)}</p>
      )}
      {(transaction.type === 'send' || transaction.type === 'payment' || transaction.type === 'payment_other') && (
        <p><strong>Amount Paid:</strong> {currencySymbol} {Math.abs(transaction.amount).toFixed(2)}</p>
      )}
      {transaction.type === 'sent' || transaction.type === 'received' && transaction.points && (
         <p><strong>Points:</strong> {transaction.points}</p>
      )}


      {transaction.paymentMethodLabel && <p><strong>Method:</strong> {transaction.paymentMethodLabel}</p>}

      {/* Add sender/recipient info if available */}
      {transaction.relatedUserId && transaction.type === 'send' && <p><strong>To:</strong> {transaction.relatedUserId}</p>}
      {transaction.relatedUserId && transaction.type === 'receive' && <p><strong>From:</strong> {transaction.relatedUserId}</p>}
      {transaction.relatedUserId && transaction.type === 'payment_other' && <p><strong>For User/Plate:</strong> {transaction.relatedUserId}</p>}
      {transaction.senderId && transaction.type === 'received' && <p><strong>From:</strong> {transaction.senderId}</p>}
      {transaction.recipientId && transaction.type === 'sent' && <p><strong>To:</strong> {transaction.recipientId}</p>}


      {transaction.parkingRecordId && <p><strong>Parking Ref:</strong> {transaction.parkingRecordId.substring(0, 10)}...</p>}
      {transaction.partnerId && <p><strong>Partner:</strong> {transaction.partnerId}</p>}


      {transaction.newBalance !== undefined && (
        <p><strong>New Balance:</strong> {currencySymbol} {transaction.newBalance.toFixed(2)}</p>
      )}

      <p style={{ borderTop: '1px dashed #ccc', paddingTop: '5px', marginTop: '10px' }}>
        <strong>Txn ID:</strong> {transaction.id.substring(0, 12)}...
      </p>
      <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '10px' }}>
        Thank you for using Carpso!
      </p>
    </div>
  );
};

export default Receipt;
