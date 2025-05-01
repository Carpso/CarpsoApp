// src/services/wallet-service.ts

/**
 * Represents a wallet transaction.
 */
export interface WalletTransaction {
  id: string;
  type: 'top-up' | 'send' | 'receive' | 'payment';
  amount: number; // Positive for received/top-up, negative for sent/payment
  description: string; // e.g., "Sent to user_xyz", "Top up via Visa **** 1234", "Payment at Partner Cafe"
  timestamp: string;
  relatedUserId?: string; // For send/receive
  partnerId?: string; // For payments
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
    'user_abc123': { balance: 25.50, currency: 'ZMW' },
};
let userTransactions: Record<string, WalletTransaction[]> = {
    'user_abc123': [
        { id: 'txn_1', type: 'top-up', amount: 50.00, description: 'Top up via Mobile Money', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: 'txn_2', type: 'payment', amount: -15.00, description: 'Payment at Downtown Garage Cafe', partnerId: 'partner_cafe_1', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'txn_3', type: 'send', amount: -10.00, description: 'Sent to user_def456', relatedUserId: 'user_def456', timestamp: new Date().toISOString() },
         { id: 'txn_4', type: 'receive', amount: 5.50, description: 'Received from user_ghi789', relatedUserId: 'user_ghi789', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
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
        userWallets[userId] = { balance: 0, currency: 'ZMW' }; // Create wallet if not exists
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
 * @param method Description of the top-up method.
 * @returns A promise resolving to the new wallet balance.
 */
export async function topUpWallet(userId: string, amount: number, method: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate delay
    if (amount <= 0) throw new Error("Top-up amount must be positive.");

    if (!userWallets[userId]) {
        userWallets[userId] = { balance: 0, currency: 'ZMW' };
    }
     if (!userTransactions[userId]) {
        userTransactions[userId] = [];
    }

    userWallets[userId].balance += amount;

    const newTxn: WalletTransaction = {
        id: `txn_${Date.now()}`,
        type: 'top-up',
        amount: amount,
        description: `Top up via ${method}`,
        timestamp: new Date().toISOString(),
    };
    userTransactions[userId].push(newTxn);

    console.log(`Topped up ${userId} by ${amount}. New balance: ${userWallets[userId].balance}`);
    return userWallets[userId].balance;
}

/**
 * Simulates sending money from one user to another.
 * VERY simplified - no real checks for recipient existence or balance handling for them.
 * @param senderId The ID of the user sending money.
 * @param recipientIdentifier The ID or unique identifier (e.g., phone) of the recipient.
 * @param amount The amount to send.
 * @param note Optional note for the transaction.
 * @returns A promise resolving to the sender's new wallet balance.
 */
export async function sendMoney(senderId: string, recipientIdentifier: string, amount: number, note?: string): Promise<number> {
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

    // Simulate adding to recipient (in real app, this needs proper handling)
    // For mock, we might just log it or optionally add to recipient if they exist in our mock data
    const recipientId = Object.keys(userWallets).find(id => id === recipientIdentifier); // Simple lookup by ID
    if (recipientId && recipientId !== senderId) {
         if (!userWallets[recipientId]) userWallets[recipientId] = { balance: 0, currency: 'ZMW' };
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
        console.log(`Recipient ${recipientIdentifier} not found in mock data or is sender, only logging sender transaction.`);
    }


    console.log(`Sent ${amount} from ${senderId} to ${recipientIdentifier}. Sender balance: ${userWallets[senderId].balance}`);
    return userWallets[senderId].balance;
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

// TODO: Function to generate QR code data for receiving payments
// TODO: Function to scan QR code and initiate payment/send

// Function to get mock users for sending money selector
export async function getMockUsersForTransfer(): Promise<{ id: string, name: string }[]> {
     await new Promise(resolve => setTimeout(resolve, 100));
     // Exclude the example user 'user_abc123' from the list of recipients
     return [
         { id: 'user_def456', name: 'Bob Phiri (mock)' },
         { id: 'user_ghi789', name: 'Charlie Zulu (mock)' },
         { id: 'user_jkl012', name: 'Diana Mumba (mock)' },
     ];
}