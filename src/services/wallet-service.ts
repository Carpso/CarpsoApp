
// src/services/wallet-service.ts

/**
 * Represents a wallet transaction.
 */
export interface WalletTransaction {
  id: string;
  type: 'top-up' | 'send' | 'receive' | 'payment' | 'payment_other' | 'points_redemption'; // Added payment_other and points_redemption
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

/**
 * Represents a saved payment method.
 */
export interface PaymentMethod {
    id: string; // Unique identifier for the payment method
    type: 'Card' | 'MobileMoney';
    details: string; // e.g., "Visa **** 4321" or "MTN 096X XXX XXX"
    isPrimary: boolean;
    // Add other fields if needed, like expiry date for cards, provider name, etc.
}


// --- Mock Data Store ---
// In a real app, this would be a secure database.
let userWallets: Record<string, Wallet> = {
    'user_abc123': { balance: 550.50, currency: 'ZMW' }, // Default to ZMW
    'user_def456': { balance: 100.00, currency: 'ZMW' }, // Default to ZMW
    'user_premium_test': { balance: 2000.00, currency: 'ZMW' }, // Add wallet for premium user
};
let userTransactions: Record<string, WalletTransaction[]> = {
    'user_abc123': [
        { id: 'txn_1', type: 'top-up', amount: 500.00, description: 'Top up via Mobile Money MTN', paymentMethodUsed: 'mobile_money_mtn', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { id: 'txn_2', type: 'payment', amount: -150.00, description: 'Payment at Downtown Garage Cafe', partnerId: 'partner_cafe_1', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'txn_3', type: 'send', amount: -100.00, description: 'Sent to user_def456', relatedUserId: 'user_def456', timestamp: new Date(Date.now() - 1 * 3600000).toISOString() },
         { id: 'txn_4', type: 'receive', amount: 55.50, description: 'Received from user_ghi789', relatedUserId: 'user_ghi789', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
         { id: 'txn_7', type: 'points_redemption', amount: 15.50, description: 'Credit from redeeming 155 points', paymentMethodUsed: 'points', timestamp: new Date(Date.now() - 30*60000).toISOString() }, // Example redemption
    ],
     'user_def456': [
         { id: 'txn_5', type: 'receive', amount: 100.00, description: 'Received from user_abc123', relatedUserId: 'user_abc123', timestamp: new Date(Date.now() - 1 * 3600000).toISOString() },
     ],
     'user_premium_test': [
          { id: 'txn_6', type: 'top-up', amount: 2000.00, description: 'Initial Premium Top Up', paymentMethodUsed: 'card_visa_chip', timestamp: new Date(Date.now() - 10 * 86400000).toISOString() },
     ]
};

// Mock store for saved payment methods
let userPaymentMethods: Record<string, PaymentMethod[]> = {
    'user_abc123': [
        { id: 'pm_1', type: 'Card', details: 'Visa **** 4321', isPrimary: true },
        { id: 'pm_2', type: 'MobileMoney', details: 'MTN 096X XXX XXX', isPrimary: false },
    ],
     'user_def456': [
        { id: 'pm_3', type: 'MobileMoney', details: 'Airtel 097X XXX XXX', isPrimary: true },
     ],
      'user_premium_test': [
        { id: 'pm_4', type: 'Card', details: 'Mastercard **** 5678', isPrimary: true },
     ],
};

// Add mock vehicle data (can be imported from user-service if structure matches)
const mockVehicleData = [
    { userId: 'user_abc123', plate: 'ABC 123', make: 'Toyota', model: 'Corolla' },
    { userId: 'user_abc123', plate: 'XYZ 789', make: 'Nissan', model: 'Hardbody' },
    { userId: 'user_def456', plate: 'DEF 456', make: 'Honda', model: 'CRV' },
    { userId: 'user_premium_test', plate: 'PREMIUM 1', make: 'BMW', model: 'X5' },
];
// Add mock user data (can be imported from user-service if structure matches)
const mockUserData = [
    { userId: 'user_abc123', userName: 'Alice Smith', phone: '0977123456', role: 'User' },
    { userId: 'user_def456', userName: 'Bob Phiri', phone: '0966789012', role: 'Premium' },
    { userId: 'attendant_001', userName: 'Attendant One', phone: '0955555555', role: 'ParkingAttendant' },
    { userId: 'user_premium_test', userName: 'Premium Tester', phone: '0977777777', role: 'Premium' },
];

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
        description: `Top up via ${paymentMethodValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        paymentMethodUsed: paymentMethodValue,
        timestamp: new Date().toISOString(),
    };
    userTransactions[userId].push(newTxn);

    console.log(`Recorded top-up for ${userId} by ${amount}. New balance: ${userWallets[userId].balance}`);
    return { newBalance: userWallets[userId].balance, transaction: newTxn };
}


/**
 * Simulates sending money from one user to another.
 * Ensures recipient exists before transferring.
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

     // Check if recipient exists
     const recipientExists = await checkUserOrPlateExists(recipientIdentifier);
     if (!recipientExists) {
         throw new Error(`Recipient "${recipientIdentifier}" not found in the Carpso system.`);
     }
     // Find actual recipient ID if identifier was phone (for crediting)
     let recipientId = Object.keys(userWallets).find(id => id === recipientIdentifier);
     if (!recipientId) {
         const userByPhone = mockUserData.find(u => u.phone && u.phone.replace(/\D/g, '') === recipientIdentifier.replace(/\D/g, ''));
         if (userByPhone) recipientId = userByPhone.userId;
     }
     if (!recipientId) {
         // Should not happen if checkUserOrPlateExists passed, but safety check
         throw new Error(`Could not resolve recipient ID for "${recipientIdentifier}".`);
     }
     if (recipientId === senderId) {
         throw new Error("Cannot send money to yourself.");
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
        relatedUserId: recipientId, // Store the resolved recipient ID
    };
    userTransactions[senderId].push(senderTxn);

    // Add to recipient
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
 * Ensures target user/plate exists before paying.
 * @param payerId The ID of the user making the payment.
 * @param targetIdentifier The user ID or license plate# of the user whose parking is being paid for.
 * @param parkingRecordId The ID of the specific parking record being paid.
 * @param amount The amount to pay.
 * @returns A promise resolving to an object containing the payer's new balance and the transaction details.
 * @throws Error if payer wallet not found, insufficient balance, invalid amount, or target not found.
 */
export async function payForOtherUser(
    payerId: string,
    targetIdentifier: string, // Can be userId or plate# in simulation
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

    // Check if target user/plate exists before proceeding
    const targetExists = await checkUserOrPlateExists(targetIdentifier);
    if (!targetExists) {
        throw new Error(`Target user or plate "${targetIdentifier}" not found in Carpso system.`);
    }

    // Deduct from payer
    payerWallet.balance -= amount;

    // Create transaction for payer
    const paymentTxn: WalletTransaction = {
        id: `txn_${Date.now()}`,
        type: 'payment_other',
        amount: -amount,
        description: `Paid parking (ID: ${parkingRecordId.substring(0, 6)}...) for ${targetIdentifier}`,
        timestamp: new Date().toISOString(),
        relatedUserId: targetIdentifier, // Link to the user/plate who received the benefit
        parkingRecordId: parkingRecordId, // Link to the specific parking record
    };
    userTransactions[payerId].push(paymentTxn);

    console.log(`User ${payerId} paid ${amount} for ${targetIdentifier}'s parking (Record: ${parkingRecordId}). Payer balance: ${payerWallet.balance}`);

    // TODO: In a real application, update the status of the parkingRecordId to 'Completed' or 'Paid'.

    return { newBalance: payerWallet.balance, transaction: paymentTxn };
}

/**
 * Gets mock exchange rates. In a real app, fetch from an API.
 * @returns A promise resolving to an object with exchange rates relative to ZMW.
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
    // Example rates relative to ZMW=1
    return {
        'ZMW': 1,
        'USD': 0.040,
        'EUR': 0.037,
        'GBP': 0.032,
        'ZAR': 0.75,
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


/**
 * Fetches saved payment methods for a user.
 * @param userId The ID of the user.
 * @returns A promise resolving to an array of PaymentMethod objects.
 */
export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    return userPaymentMethods[userId] || [];
}

/**
 * Updates (replaces) the payment methods for a user.
 * Handles setting the primary method based on the isPrimary flag.
 * @param userId The ID of the user.
 * @param methods The complete array of new payment methods for the user.
 * @returns A promise resolving to the updated array of PaymentMethod objects.
 */
export async function updatePaymentMethods(userId: string, methods: PaymentMethod[]): Promise<PaymentMethod[]> {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay

    // Ensure only one method is marked as primary
    let primaryFound = false;
    const updatedMethods = methods.map(method => {
        if (method.isPrimary && !primaryFound) {
            primaryFound = true;
            return method;
        }
        return { ...method, isPrimary: false };
    });

    // If no primary was explicitly set and there are methods, make the first one primary
    if (!primaryFound && updatedMethods.length > 0) {
        updatedMethods[0].isPrimary = true;
    }

    userPaymentMethods[userId] = updatedMethods;
    console.log(`Updated payment methods for user ${userId}:`, updatedMethods);
    return updatedMethods;
}


/**
 * Checks if a given identifier (user ID, phone number, or license plate) exists in the system.
 * Simulates checking relevant data sources.
 * @param identifier The identifier to check.
 * @returns A promise resolving to true if the identifier exists, false otherwise.
 */
export async function checkUserOrPlateExists(identifier: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 250)); // Simulate check delay

    // 1. Check if it's a known user ID
    if (userWallets[identifier] || mockUserData.some(u => u.userId === identifier)) {
        return true;
    }

    // 2. Check if it's a known phone number (normalized)
    const normalizedPhone = identifier.replace(/\D/g, '');
    if (normalizedPhone.length >= 9 && mockUserData.some(u => u.phone && u.phone.replace(/\D/g, '') === normalizedPhone)) {
        return true;
    }

    // 3. Check if it's a known license plate (normalized)
    const normalizedPlate = identifier.replace(/\s+/g, '').toUpperCase();
    if (normalizedPlate.length >= 3 && mockVehicleData.some(v => v.plate.replace(/\s+/g, '').toUpperCase() === normalizedPlate)) {
        return true;
    }

    // If none of the above match
    return false;
}


// Function to get mock users for sending money selector
export async function getMockUsersForTransfer(): Promise<{ id: string, name: string }[]> {
     await new Promise(resolve => setTimeout(resolve, 100));
     // Get all users from the wallet data as an example
     return Object.keys(userWallets).map(id => ({
         id,
         name: mockUserData.find(u => u.userId === id)?.userName || `User ${id.substring(0, 5)} (mock)`, // Use actual name if available
     })).filter(u => u.name); // Ensure user has a name
}
