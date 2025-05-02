// src/services/wallet-service.ts

/**
 * Represents a wallet transaction.
 */
export interface WalletTransaction {
  id: string;
  type: 'top-up' | 'send' | 'receive' | 'payment' | 'payment_other'; // Added payment_other
  amount: number; // Positive for received/top-up, negative for sent/payment
  description: string; // e.g., "Sent to user_xyz", "Top up via Visa **** 1234", "Payment at Partner Cafe"
  timestamp: string;
  relatedUserId?: string; // For send/receive or payment_other
  partnerId?: string; // For payments
  parkingRecordId?: string; // Optional link to parking record for payments
  paymentMethodUsed?: string; // Record the specific method (e.g., 'card_visa_contactless', 'mobile_money_mtn')
}

/**
 * Represents the user's wallet.
 */
export interface Wallet {
  balance: number;
  currency: string; // e.g., 'ZMW', 'USD'
}

// --- Mock Data Store ---
// In a real app, this would be a secure database.
let userWallets: Record<string, Wallet> = {
    'user_abc123': { balance: 550.50, currency: 'ZMW' }, // Default to ZMW
    'user_def456': { balance: 100.00, currency: 'ZMW' }, // Default to ZMW
};
let userTransactions: Record<string, WalletTransaction[]> = {
    'user_abc123': [
        { id: 'txn_1', type: 'top-up', amount: 500.00, description: 'Top up via Mobile Money MTN', paymentMethodUsed: 'mobile_money_mtn', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: 'txn_2', type: 'payment', amount: -150.00, description: 'Payment at Downtown Garage Cafe', partnerId: 'partner_cafe_1', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'txn_3', type: 'send', amount: -100.00, description: 'Sent to user_def456', relatedUserId: 'user_def456', timestamp: new Date(Date.now() - 1 * 3600000).toISOString() },
         { id: 'txn_4', type: 'receive', amount: 55.50, description: 'Received from user_ghi789', relatedUserId: 'user_ghi789', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
     'user_def456': [
         { id: 'txn_5', type: 'receive', amount: 100.00, description: 'Received from user_abc123', relatedUserId: 'user_abc123', timestamp: new Date(Date.now() - 1 * 3600000).toISOString() },
     ],
};

// --- Mock Service Functions ---

/**
 * Fetches the wallet balance for a user.
 * @param userId The ID of the user.
 * @returns A promise resolving to the user's wallet data.
 */
export async function getWalletBalance(userId: string): Promise<Wallet> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    if (!userWallets[userId]) {
        userWallets[userId] = { balance: 0, currency: 'ZMW' }; // Create wallet if not exists, default ZMW
    }
    console.log(`Fetched balance for ${userId}:`, userWallets[userId]);
    return userWallets[userId];
}

/**
 * Fetches the transaction history for a user.
 * @param userId The ID of the user.
 * @param limit Max number of transactions to return.
 * @returns A promise resolving to an array of wallet transactions.
 */
export async function getWalletTransactions(userId: string, limit: number = 10): Promise<WalletTransaction[]> {
    await new Promise(resolve => setTimeout(resolve, 350)); // Simulate delay
    const transactions = userTransactions[userId] || [];
    // Sort by timestamp descending and take limit
    return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

/**
 * Simulates topping up a user's wallet.
 * @param userId The ID of the user.
 * @param amount The amount to add.
 * @param paymentMethodValue The specific payment method value used (e.g., 'mobile_money_mtn', 'card_visa_contactless').
 * @returns A promise resolving to an object containing the new balance and the transaction details.
 */
export async function topUpWallet(
    userId: string,
    amount: number,
    paymentMethodValue: string
): Promise<{ newBalance: number; transaction: WalletTransaction }> {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate delay
    if (amount <= 0) throw new Error("Top-up amount must be positive.");

    if (!userWallets[userId]) {
        userWallets[userId] = { balance: 0, currency: 'ZMW' }; // Default ZMW
    }
     if (!userTransactions[userId]) {
        userTransactions[userId] = [];
    }

    // --- POS Integration Point ---
    // Assume payment is already authorized if it reaches here.
    console.log(`Recording top-up for ${userId} via method ${paymentMethodValue}. Payment assumed authorized.`);

    userWallets[userId].balance += amount;

    const newTxn: WalletTransaction = {
        id: `txn_${Date.now()}`,
        type: 'top-up',
        amount: amount,
        description: `Top up via ${paymentMethodValue.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        paymentMethodUsed: paymentMethodValue,
        timestamp: new Date().toISOString(),
    };
    userTransactions[userId].push(newTxn);

    console.log(`Recorded top-up for ${userId} by ${amount}. New balance: ${userWallets[userId].balance}`);
    return { newBalance: userWallets[userId].balance, transaction: newTxn };
}


/**
 * Simulates sending money from one user to another.
 * @param senderId The ID of the user sending money.
 * @param recipientIdentifier The ID or unique identifier (e.g., phone) of the recipient.
 * @param amount The amount to send.
 * @param note Optional note for the transaction.
 * @returns A promise resolving to an object containing the sender's new wallet balance and the created transaction details.
 */
export async function sendMoney(
    senderId: string,
    recipientIdentifier: string,
    amount: number,
    note?: string
): Promise<{ newBalance: number; transaction: WalletTransaction }> {
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate delay
    if (amount <= 0) throw new Error("Send amount must be positive.");

    if (!userWallets[senderId]) {
         throw new Error("Sender wallet not found.");
    }
    if (userWallets[senderId].balance < amount) {
        throw new Error("Insufficient balance.");
    }
     if (!userTransactions[senderId]) {
        userTransactions[senderId] = [];
     }

    // Deduct from sender
    userWallets[senderId].balance -= amount;

    // Create transaction for sender
    const senderTxn: WalletTransaction = {
        id: `txn_${Date.now()}`,
        type: 'send',
        amount: -amount, // Negative for sender
        description: `Sent to ${recipientIdentifier}${note ? ` (${note})` : ''}`,
        timestamp: new Date().toISOString(),
        relatedUserId: recipientIdentifier, // Store identifier used
    };
    userTransactions[senderId].push(senderTxn);

    // Simulate adding to recipient
    const recipientId = Object.keys(userWallets).find(id => id === recipientIdentifier);
    if (recipientId && recipientId !== senderId) {
         if (!userWallets[recipientId]) userWallets[recipientId] = { balance: 0, currency: 'ZMW' }; // Default ZMW
         if (!userTransactions[recipientId]) userTransactions[recipientId] = [];
         userWallets[recipientId].balance += amount;
         const recipientTxn: WalletTransaction = {
             id: `txn_${Date.now()}_rec`,
             type: 'receive',
             amount: amount,
             description: `Received from ${senderId}${note ? ` (${note})` : ''}`,
             timestamp: new Date().toISOString(),
             relatedUserId: senderId,
         };
         userTransactions[recipientId].push(recipientTxn);
         console.log(`Credited ${recipientId} with ${amount}`);
    } else {
        console.log(`Recipient ${recipientIdentifier} not found or is sender, only logging sender transaction.`);
    }


    console.log(`Sent ${amount} from ${senderId} to ${recipientIdentifier}. Sender balance: ${userWallets[senderId].balance}`);
    return { newBalance: userWallets[senderId].balance, transaction: senderTxn };
}


/**
 * Simulates making a payment to a partner.
 * @param userId The ID of the user making the payment.
 * @param partnerId The ID of the partner being paid.
 * @param amount The amount to pay.
 * @param description Description of the payment (e.g., "Coffee", "Parking Fee").
 * @returns A promise resolving to the user's new wallet balance.
 */
export async function makePartnerPayment(userId: string, partnerId: string, amount: number, description: string): Promise<number> {
     await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    if (amount <= 0) throw new Error("Payment amount must be positive.");

     if (!userWallets[userId]) {
         throw new Error("User wallet not found.");
    }
     if (userWallets[userId].balance < amount) {
         throw new Error("Insufficient balance for payment.");
     }
      if (!userTransactions[userId]) {
         userTransactions[userId] = [];
     }

     // Deduct from user
     userWallets[userId].balance -= amount;

     // Create transaction
     const paymentTxn: WalletTransaction = {
         id: `txn_${Date.now()}`,
         type: 'payment',
         amount: -amount, // Negative for payment
         description: `Payment: ${description} at Partner ${partnerId}`,
         timestamp: new Date().toISOString(),
         partnerId: partnerId,
     };
     userTransactions[userId].push(paymentTxn);

     console.log(`Payment of ${amount} made by ${userId} to partner ${partnerId}. New balance: ${userWallets[userId].balance}`);
     // In real app, notify partner system
     return userWallets[userId].balance;
}

/**
 * Simulates paying for another user's parking fee.
 * @param payerId The ID of the user making the payment.
 * @param targetUserId The ID or identifier (like plate#) of the user whose parking is being paid for.
 * @param parkingRecordId The ID of the specific parking record being paid.
 * @param amount The amount to pay.
 * @returns A promise resolving to an object containing the payer's new balance and the transaction details.
 * @throws Error if payer wallet not found, insufficient balance, or invalid amount.
 */
export async function payForOtherUser(
    payerId: string,
    targetUserId: string, // Can be userId or plate# in simulation
    parkingRecordId: string,
    amount: number
): Promise<{ newBalance: number; transaction: WalletTransaction }> {
    await new Promise(resolve => setTimeout(resolve, 650)); // Simulate delay

    if (amount <= 0) {
        throw new Error("Payment amount must be positive.");
    }

    const payerWallet = userWallets[payerId];

    if (!payerWallet) {
        throw new Error("Payer wallet not found.");
    }
    if (payerWallet.balance < amount) {
        throw new Error("Insufficient balance to pay for other user.");
    }
    if (!userTransactions[payerId]) {
        userTransactions[payerId] = [];
    }

    // Deduct from payer
    payerWallet.balance -= amount;

    // Create transaction for payer
    const paymentTxn: WalletTransaction = {
        id: `txn_${Date.now()}`,
        type: 'payment_other',
        amount: -amount,
        description: `Paid parking (ID: ${parkingRecordId.substring(0, 6)}...) for ${targetUserId}`,
        timestamp: new Date().toISOString(),
        relatedUserId: targetUserId, // Link to the user/plate who received the benefit
        parkingRecordId: parkingRecordId, // Link to the specific parking record
    };
    userTransactions[payerId].push(paymentTxn);

    console.log(`User ${payerId} paid ${amount} for ${targetUserId}'s parking (Record: ${parkingRecordId}). Payer balance: ${payerWallet.balance}`);

    // TODO: In a real application, update the status of the parkingRecordId to 'Completed' or 'Paid'.

    return { newBalance: payerWallet.balance, transaction: paymentTxn };
}

/**
 * Gets mock exchange rates. In a real app, fetch from an API.
 * @returns A promise resolving to an object with exchange rates relative to ZMW.
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
    return {
        'ZMW': 1,
        'USD': 0.040, // Example rate: 1 ZMW = 0.040 USD
        'EUR': 0.037, // Example rate: 1 ZMW = 0.037 EUR
        'GBP': 0.032, // Example rate: 1 ZMW = 0.032 GBP
        'ZAR': 0.75, // Example rate: 1 ZMW = 0.75 ZAR
    };
}

/**
 * Converts an amount from ZMW to a target currency.
 * @param amountZMW The amount in Zambian Kwacha.
 * @param targetCurrency The target currency code (e.g., 'USD').
 * @param rates Exchange rates object (ZMW must be 1).
 * @returns The converted amount or null if rate is unavailable.
 */
export function convertCurrency(amountZMW: number, targetCurrency: string, rates: Record<string, number>): number | null {
    const rate = rates[targetCurrency];
    if (rate === undefined) {
        console.warn(`Exchange rate for ${targetCurrency} not available.`);
        return null;
    }
    return amountZMW * rate;
}


// TODO: Function to generate QR code data for receiving payments
// TODO: Function to scan QR code and initiate payment/send

// Function to get mock users for sending money selector
export async function getMockUsersForTransfer(): Promise<{ id: string, name: string }[]> {
     await new Promise(resolve => setTimeout(resolve, 100));
     // Get all users from the wallet data as an example
     return Object.keys(userWallets).map(id => ({
         id,
         name: `User ${id.substring(0, 5)} (mock)`, // Replace with actual name lookup later
     }));
}
