// src/services/user-service.ts
// 'use server'; // Removed directive as localStorage and other browser APIs are used

/**
 * Represents a badge earned by a user.
 */
export interface UserBadge {
  id: string;
  name: string;
  description: string;
  iconName: string; // e.g., 'Star', 'Trophy', 'CheckCircle' from lucide-react
  earnedDate: string;
}

/**
 * Represents the user's gamification status.
 */
export interface UserGamification {
  points: number;
  badges: UserBadge[];
  isCarpoolEligible: boolean; // Flag for carpooling discounts/features
  parkingExtensionsUsed?: number; // Number of times parking has been extended in the current session/period (optional)
  referralCode?: string; // Unique referral code for the user
  referralsCompleted?: number; // Number of successful referrals
}

/**
 * Represents a user's saved location bookmark.
 */
export interface UserBookmark {
  id: string;
  userId: string;
  label: string; // e.g., 'Home', 'Work', 'School'
  address?: string; // Optional full address
  latitude?: number;
  longitude?: number;
}

/**
 * Represents a points transfer or earning/redemption transaction.
 */
export interface PointsTransaction {
    id: string;
    timestamp: string;
    senderId: string; // 'system' for earned/redeemed
    recipientId: string; // 'system' for redeemed
    points: number; // Positive for earned/received, negative for sent/redeemed
    type: 'sent' | 'received' | 'earned' | 'redeemed'; // Added earned/redeemed types
    description?: string; // e.g., 'Daily Login Bonus', 'Referral Bonus', 'Redeemed for Wallet Credit'
}

/**
 * Defines the possible user roles within the system.
 */
export type UserRole = 'User' | 'Admin' | 'ParkingLotOwner' | 'ParkingAttendant' | 'Premium'; // Added Premium role variant

/**
 * Represents user details for attendant search results.
 */
export interface AttendantSearchResult {
    userId: string;
    userName: string;
    phone?: string;
    vehiclePlate: string;
    vehicleMake?: string;
    vehicleModel?: string;
}

/**
 * Represents user preferences that can be saved locally.
 */
export interface UserPreferences {
    favoriteLocations?: string[]; // Array of favorite ParkingLot IDs
    // Add other preferences here, e.g., preferredMapStyle, notificationSettings
}

/**
 * Represents a referral record.
 */
export interface Referral {
    referringUserId: string;
    referredUserId: string;
    referredUserName?: string; // Optional name for display
    signupTimestamp: string;
    bonusAwarded: boolean; // Flag if bonus was given to referrer
}


// --- Mock Data Store ---
// In a real app, this data would be stored in a database linked to the user ID.
let userGamificationData: Record<string, UserGamification> = {
    // Example data for a user (keys would be actual user IDs)
    'user_abc123': {
        points: 155, // Increased points
        badges: [
            { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles', earnedDate: '2024-07-28' },
            { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Flag', earnedDate: '2024-07-29' }, // Changed icon to Flag
        ],
        isCarpoolEligible: false,
        parkingExtensionsUsed: 1, // Example: used one extension
        referralCode: 'ALICE123',
        referralsCompleted: 1,
    },
     'user_def456': { // Example Premium user
        points: 50,
        badges: [],
        isCarpoolEligible: true,
        parkingExtensionsUsed: 0, // Premium users might have a higher limit or unlimited (logic handled elsewhere)
        referralCode: 'BOB456',
        referralsCompleted: 0,
    },
     // Add a sample attendant user's gamification data if needed
     'attendant_001': { points: 10, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0, referralCode: 'ATTEND001', referralsCompleted: 0 },
     // Add a user explicitly marked as Premium role (for testing role checks)
      'user_premium_test': { points: 1000, badges: [], isCarpoolEligible: true, parkingExtensionsUsed: 0, referralCode: 'PREMIUM789', referralsCompleted: 5 },
};

// Mock store for bookmarks
let userBookmarks: Record<string, UserBookmark[]> = {
    'user_abc123': [
        { id: 'bm_1', userId: 'user_abc123', label: 'Home', address: '10 Residential St, Anytown', latitude: 34.0600, longitude: -118.2300 },
        { id: 'bm_2', userId: 'user_abc123', label: 'Work', address: '1 Business Ave, Anytown', latitude: 34.0510, longitude: -118.2450 },
    ],
     'user_premium_test': [
        { id: 'bm_3', userId: 'user_premium_test', label: 'Gym', address: '5 Fitness Way', latitude: 34.0550, longitude: -118.2550 },
    ],
};

// Mock store for points transactions (optional, could be part of gamification history)
let pointsTransactions: Record<string, PointsTransaction[]> = {
     'user_abc123': [
         { id: 'pts_txn_ref1', timestamp: new Date(Date.now() - 5*86400000).toISOString(), senderId: 'system', recipientId: 'user_abc123', points: 50, type: 'earned', description: 'Referral Bonus' }, // Example referral bonus
          { id: 'pts_txn_daily1', timestamp: new Date(Date.now() - 2*86400000).toISOString(), senderId: 'system', recipientId: 'user_abc123', points: 5, type: 'earned', description: 'Daily Login Bonus' }, // Example daily login
     ],
     'user_def456': [],
};

// Mock store for referral records
let referrals: Referral[] = [
    { referringUserId: 'user_abc123', referredUserId: 'user_new_1', referredUserName: 'New User 1', signupTimestamp: new Date(Date.now() - 5*86400000).toISOString(), bonusAwarded: true },
];

// Mock store for user preferences (replace with localStorage or backend)
let userPreferences: Record<string, UserPreferences> = {};

// Available badges definition (could be stored elsewhere)
const availableBadges: Omit<UserBadge, 'earnedDate'>[] = [
     { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles' },
     { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Flag' }, // Changed icon to Flag
     { id: 'badge_frequent_parker', name: 'Frequent Parker', description: 'Completed 5 reservations.', iconName: 'Award' },
     { id: 'badge_carpool_champ', name: 'Carpool Champ', description: 'Enabled carpooling benefits.', iconName: 'Users' },
     { id: 'badge_referrer', name: 'Referrer', description: 'Successfully referred a new user.', iconName: 'Gift' }, // Added referral badge
];


// --- Mock Service Functions ---

// Cache constants for gamification
const GAMIFICATION_CACHE_KEY_PREFIX = 'cachedGamification_';
const GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX = '_timestamp';
const GAMIFICATION_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetches the gamification status (points, badges, carpool status, referral code) for a user.
 * Includes offline caching.
 * @param userId The ID of the user.
 * @param forceRefresh Bypasses cache and fetches fresh data if true.
 * @returns A promise resolving to the user's gamification data.
 */
export async function getUserGamification(userId: string, forceRefresh: boolean = false): Promise<UserGamification> {
    const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
    const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    let cachedData: UserGamification | null = null;

    // 1. Try loading from cache
    if (!forceRefresh && typeof window !== 'undefined') {
        const cachedTimestamp = localStorage.getItem(timestampKey);
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < GAMIFICATION_CACHE_MAX_AGE) {
            try {
                cachedData = JSON.parse(cachedRaw);
                console.log(`Using cached gamification data for ${userId}.`);
            } catch (e) {
                console.error("Failed to parse cached gamification data.", e);
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(timestampKey);
            }
        }
    }

    // 2. If cache is invalid/missing/forced OR online, fetch/simulate fresh data
    if (cachedData === null || (isOnline && forceRefresh)) {
        if (isOnline) {
            console.log(`Fetching fresh gamification data for ${userId}...`);
            await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
            // --- Simulation Logic ---
            let data = userGamificationData[userId];
            if (!data) {
                 const referralCode = `${(mockUserData.find(u => u.userId === userId)?.userName || 'USER').slice(0, 5).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                 data = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0, referralCode: referralCode, referralsCompleted: 0 };
                 userGamificationData[userId] = data;
                 console.log(`Initialized gamification data for ${userId} with referral code ${referralCode}`);
            } else {
                if (!data.referralCode) {
                     data.referralCode = `${(mockUserData.find(u => u.userId === userId)?.userName || 'USER').slice(0, 5).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                     console.log(`Generated missing referral code for ${userId}: ${data.referralCode}`);
                }
                if (data.referralsCompleted === undefined) {
                    data.referralsCompleted = referrals.filter(r => r.referringUserId === userId && r.bonusAwarded).length;
                }
                if (data.parkingExtensionsUsed === undefined) {
                     data.parkingExtensionsUsed = 0;
                }
            }
             cachedData = { ...data }; // Use the fetched/simulated data
            // --- End Simulation Logic ---

            // Cache the fresh data
            if (typeof window !== 'undefined') {
                 try {
                    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
                    localStorage.setItem(timestampKey, Date.now().toString());
                 } catch (e) {
                    console.error("Failed to cache gamification data:", e);
                 }
            }

        } else {
            // Offline and no valid cache
            console.warn(`Offline and no cached gamification data for ${userId}. Returning default.`);
            // Return a default structure to prevent errors in components expecting the object
            cachedData = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0, referralCode: 'OFFLINE', referralsCompleted: 0 };
        }
    }

    return cachedData!; // Should always have data by this point (either cached or default)
}

/**
 * Increments the parking extension counter for a user (requires online).
 * Invalidates cache.
 * @param userId The ID of the user.
 * @returns A promise resolving to the updated number of extensions used, or null if offline.
 */
export async function incrementParkingExtensions(userId: string): Promise<number | null> {
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
        console.error("Cannot increment extensions: Offline.");
        // TODO: Queue action if offline?
        return null;
    }

    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    const data = await getUserGamification(userId, true); // Force refresh to ensure current count
    data.parkingExtensionsUsed = (data.parkingExtensionsUsed || 0) + 1;
    userGamificationData[userId] = data; // Update mock store

    // Invalidate cache
    const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
    const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
     if (typeof window !== 'undefined') {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(timestampKey);
     }

    console.log(`Incremented parking extensions for user ${userId}. Total used: ${data.parkingExtensionsUsed}`);
    return data.parkingExtensionsUsed!;
}

/**
 * Resets the parking extension counter for a user (requires online).
 * Invalidates cache.
 * @param userId The ID of the user.
 * @returns A promise resolving to true if successful, false otherwise (or if offline).
 */
export async function resetParkingExtensions(userId: string): Promise<boolean> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
        console.error("Cannot reset extensions: Offline.");
        return false;
     }
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
    if (userGamificationData[userId]) {
        userGamificationData[userId].parkingExtensionsUsed = 0;
        // Invalidate cache
        const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
        const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
         if (typeof window !== 'undefined') {
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(timestampKey);
         }
        console.log(`Reset parking extensions for user ${userId}.`);
    }
    return true;
}

/**
 * Awards points to a user and records the transaction (requires online).
 * Invalidates cache.
 * @param userId The ID of the user.
 * @param pointsToAdd The number of points to add.
 * @param description Optional description for the transaction.
 * @returns A promise resolving to the updated total points, or null if offline.
 */
export async function awardPoints(userId: string, pointsToAdd: number, description?: string): Promise<number | null> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
        console.error(`Cannot award points to ${userId}: Offline.`);
        // TODO: Queue action if offline?
        return null;
     }
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate delay
    const data = await getUserGamification(userId, true); // Force refresh
    data.points += pointsToAdd;
    userGamificationData[userId] = data; // Update mock store

    // Record transaction
    const earnTx: PointsTransaction = {
        id: `pts_txn_earn_${Date.now()}`,
        timestamp: new Date().toISOString(),
        senderId: 'system',
        recipientId: userId,
        points: pointsToAdd,
        type: 'earned',
        description: description || 'Points earned',
    };
    if (!pointsTransactions[userId]) pointsTransactions[userId] = [];
    pointsTransactions[userId].push(earnTx);

     // Invalidate cache
     const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
     const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
      if (typeof window !== 'undefined') {
           localStorage.removeItem(cacheKey);
           localStorage.removeItem(timestampKey);
      }
      // Also invalidate points transaction cache
       const txnCacheKey = `cachedPointsTxns_${userId}`;
       const txnTimestampKey = `${txnCacheKey}_timestamp`;
       if (typeof window !== 'undefined') {
           localStorage.removeItem(txnCacheKey);
           localStorage.removeItem(txnTimestampKey);
       }

    console.log(`Awarded ${pointsToAdd} points to user ${userId}. Description: ${description || 'N/A'}. New total: ${data.points}`);
    return data.points;
}

/**
 * Awards a specific badge to a user if they haven't earned it already (requires online).
 * Invalidates cache.
 * @param userId The ID of the user.
 * @param badgeId The ID of the badge to award.
 * @returns A promise resolving to true if the badge was newly awarded, false otherwise (or if offline).
 */
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
        console.error(`Cannot award badge to ${userId}: Offline.`);
        // TODO: Queue action if offline?
        return false;
     }
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    const data = await getUserGamification(userId, true); // Force refresh

    const alreadyHasBadge = data.badges.some(b => b.id === badgeId);
    if (alreadyHasBadge) {
        return false; // Already earned
    }

    const badgeDefinition = availableBadges.find(b => b.id === badgeId);
    if (!badgeDefinition) {
        console.warn(`Badge definition not found for ID: ${badgeId}`);
        return false; // Badge definition missing
    }

    const newBadge: UserBadge = {
        ...badgeDefinition,
        earnedDate: new Date().toISOString(),
    };
    data.badges.push(newBadge);
    userGamificationData[userId] = data; // Update mock store

     // Invalidate cache
     const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
     const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
      if (typeof window !== 'undefined') {
           localStorage.removeItem(cacheKey);
           localStorage.removeItem(timestampKey);
      }

    console.log(`Awarded badge "${badgeDefinition.name}" to user ${userId}.`);
    return true;
}

/**
 * Updates the user's carpool eligibility status (requires online).
 * Invalidates cache.
 * @param userId The ID of the user.
 * @param isEligible The new eligibility status.
 * @returns A promise resolving to true if the update was successful, false if offline.
 */
export async function updateCarpoolEligibility(userId: string, isEligible: boolean): Promise<boolean> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
        console.error("Cannot update carpool status: Offline.");
        // TODO: Queue action if offline?
        return false;
     }
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    const data = await getUserGamification(userId, true); // Force refresh
    data.isCarpoolEligible = isEligible;
    userGamificationData[userId] = data; // Update mock store

     // Invalidate cache
     const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
     const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
      if (typeof window !== 'undefined') {
           localStorage.removeItem(cacheKey);
           localStorage.removeItem(timestampKey);
      }

    console.log(`Set carpool eligibility for user ${userId} to ${isEligible}.`);

    // Potentially award carpool badge
    if (isEligible) {
        await awardBadge(userId, 'badge_carpool_champ'); // Award badge will handle its own cache invalidation
    }
    return true;
}

/**
 * Transfers gamification points from one user to another (requires online).
 * Invalidates cache for both users.
 * @param senderId The ID of the user sending points.
 * @param recipientId The ID of the user receiving points.
 * @param pointsToTransfer The number of points to transfer.
 * @returns A promise resolving to an object containing the sender's and recipient's new point balances and the created transaction.
 * @throws Error if sender or recipient is not found, insufficient points, offline, or self-transfer.
 */
export async function transferPoints(
    senderId: string,
    recipientId: string,
    pointsToTransfer: number
): Promise<{ senderNewPoints: number; recipientNewPoints: number; transaction: PointsTransaction }> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         throw new Error("Cannot transfer points: Offline.");
         // TODO: Queue action if offline?
     }

    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay

    if (pointsToTransfer <= 0) {
        throw new Error("Points to transfer must be positive.");
    }
    if (senderId === recipientId) {
        throw new Error("Cannot transfer points to yourself.");
    }

    const senderData = await getUserGamification(senderId, true); // Force refresh sender
    let recipientData = userGamificationData[recipientId]; // Check recipient mock data

    if (!recipientData) {
         const recipientUser = mockUserData.find(u => u.userId === recipientId);
         if (recipientUser) {
              recipientData = await getUserGamification(recipientId, true); // Initialize recipient if they exist as user
              console.log(`Initialized recipient ${recipientId} gamification data for transfer.`);
         } else {
            throw new Error("Recipient user not found.");
         }
    } else {
         // Recipient exists, force refresh their data too
         recipientData = await getUserGamification(recipientId, true);
    }

    if (senderData.points < pointsToTransfer) {
        throw new Error(`Insufficient points. You only have ${senderData.points}.`);
    }

    // Perform the transfer
    senderData.points -= pointsToTransfer;
    recipientData.points += pointsToTransfer;
    userGamificationData[senderId] = senderData;
    userGamificationData[recipientId] = recipientData;

    // Record the transaction
    const timestamp = new Date().toISOString();
    const transactionId = `pts_txn_${Date.now()}`;
    const senderTx: PointsTransaction = {
        id: transactionId + '_s', timestamp, senderId, recipientId,
        points: -pointsToTransfer, type: 'sent',
        description: `Sent to ${recipientData.referralCode || recipientId.substring(0,8)}...`
    };
    const recipientTx: PointsTransaction = {
        id: transactionId + '_r', timestamp, senderId, recipientId,
        points: pointsToTransfer, type: 'received',
        description: `Received from ${senderData.referralCode || senderId.substring(0,8)}...`
    };

    if (!pointsTransactions[senderId]) pointsTransactions[senderId] = [];
    if (!pointsTransactions[recipientId]) pointsTransactions[recipientId] = [];
    pointsTransactions[senderId].push(senderTx);
    pointsTransactions[recipientId].push(recipientTx);

    // --- Invalidate Caches ---
    const invalidateCache = (userIdToInvalidate: string) => {
        const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userIdToInvalidate;
        const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
        const txnCacheKey = `cachedPointsTxns_${userIdToInvalidate}`;
        const txnTimestampKey = `${txnCacheKey}_timestamp`;
         if (typeof window !== 'undefined') {
             localStorage.removeItem(cacheKey);
             localStorage.removeItem(timestampKey);
             localStorage.removeItem(txnCacheKey);
             localStorage.removeItem(txnTimestampKey);
         }
    };
    invalidateCache(senderId);
    invalidateCache(recipientId);
    // --- End Invalidate Caches ---

    console.log(`Transferred ${pointsToTransfer} points from ${senderId} to ${recipientId}.`);
    return { senderNewPoints: senderData.points, recipientNewPoints: recipientData.points, transaction: senderTx };
}

// Helper function for modals etc. to get mock users (replace with real user search later)
export async function getMockUsersForTransfer(): Promise<{ id: string, name: string }[]> {
     await new Promise(resolve => setTimeout(resolve, 100));
     // Get all users from the wallet data as an example
     return Object.keys(userGamificationData).map(id => ({
         id,
         name: mockUserData.find(u => u.userId === id)?.userName || `User ${id.substring(0, 5)} (mock)`, // Use actual name if available
     })).filter(u => u.name); // Ensure user has a name
}

/**
 * Fetches the recent points transactions for a user.
 * @param userId The ID of the user.
 * @param limit Max number of transactions to return.
 * @returns A promise resolving to an array of points transactions.
 */
export async function getPointsTransactions(userId: string, limit: number = 10): Promise<PointsTransaction[]> {
     await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
     const txns = pointsTransactions[userId] || [];
     // Sort by timestamp descending and take limit
     return txns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

/**
 * Redeems user points for wallet credit (requires online).
 * Invalidates gamification and wallet caches.
 * @param userId The ID of the user redeeming points.
 * @param pointsToRedeem The number of points to redeem.
 * @param rate The conversion rate (e.g., 0.10 Kwacha per point).
 * @returns A promise resolving to an object with the redeemed amount, new balances, and the transaction, or null if offline.
 * @throws Error if insufficient points or other errors occur.
 */
export async function redeemPoints(
    userId: string,
    pointsToRedeem: number,
    rate: number = 0.10 // Default rate (e.g., K 0.10 per point)
): Promise<{
    redeemedAmount: number;
    newPointsBalance: number;
    newWalletBalance: number;
    transaction: PointsTransaction;
} | null> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         console.error(`Cannot redeem points for ${userId}: Offline.`);
         // TODO: Queue action if offline?
         return null;
     }
    await new Promise(resolve => setTimeout(resolve, 450)); // Simulate delay

    if (pointsToRedeem <= 0) {
        throw new Error("Points to redeem must be positive.");
    }

    const gamificationData = await getUserGamification(userId, true); // Force refresh
    const { getWalletBalance, getWalletTransactions } = await import('./wallet-service'); // Dynamically import wallet service functions
    const walletData = await getWalletBalance(userId); // Ensure wallet exists

    if (gamificationData.points < pointsToRedeem) {
        throw new Error(`Insufficient points. You only have ${gamificationData.points}.`);
    }

    const redeemedAmount = parseFloat((pointsToRedeem * rate).toFixed(2));

    // Update points
    gamificationData.points -= pointsToRedeem;
    userGamificationData[userId] = gamificationData;

    // Update wallet - Assuming wallet-service handles internal update
    // This requires wallet-service to expose an update function or handle this internally
    // For mock, we might need direct access (which is bad practice in real apps)
    // Let's assume a simulated update via an internal function if wallet-service doesn't export one.
    let newWalletBalance = walletData.balance + redeemedAmount;
    // userWallets[userId].balance = newWalletBalance; // Direct update for mock (replace with proper service call)

    // Record points transaction
    const redeemTx: PointsTransaction = {
        id: `pts_txn_redeem_${Date.now()}`,
        timestamp: new Date().toISOString(),
        senderId: userId, // User is "sending" points to the system
        recipientId: 'system',
        points: -pointsToRedeem, // Negative points
        type: 'redeemed',
        description: `Redeemed for K ${redeemedAmount.toFixed(2)} wallet credit`,
    };
    if (!pointsTransactions[userId]) pointsTransactions[userId] = [];
    pointsTransactions[userId].push(redeemTx);

    // Record wallet transaction (Needs access to wallet transaction array or service function)
    const walletTx: any = { // Using 'any' as WalletTransaction type might not be exported/accessible here
        id: `txn_pts_redeem_${Date.now()}`,
        timestamp: redeemTx.timestamp,
        type: 'points_redemption',
        amount: redeemedAmount, // Positive amount for wallet
        description: `Credit from redeeming ${pointsToRedeem} points`,
        paymentMethodUsed: 'points',
    };
    // if (!userTransactions[userId]) userTransactions[userId] = [];
    // userTransactions[userId].push(walletTx);


    // --- Invalidate Caches ---
    const invalidateGamificationCache = (userIdToInvalidate: string) => {
        const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userIdToInvalidate;
        const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
        const txnCacheKey = `cachedPointsTxns_${userIdToInvalidate}`;
        const txnTimestampKey = `${txnCacheKey}_timestamp`;
         if (typeof window !== 'undefined') {
             localStorage.removeItem(cacheKey);
             localStorage.removeItem(timestampKey);
             localStorage.removeItem(txnCacheKey);
             localStorage.removeItem(txnTimestampKey);
         }
    };
     const invalidateWalletCache = (userIdToInvalidate: string) => {
        const cacheKey = `cachedUserWallet_${userIdToInvalidate}`;
        const timestampKey = `${cacheKey}_timestamp`;
        const txnCacheKey = `cachedUserWalletTxns_${userIdToInvalidate}`;
        const txnTimestampKey = `${txnCacheKey}_timestamp`;
        if (typeof window !== 'undefined') {
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timestampKey);
            localStorage.removeItem(txnCacheKey);
            localStorage.removeItem(txnTimestampKey);
        }
     };
    invalidateGamificationCache(userId);
    invalidateWalletCache(userId);
    // --- End Invalidate Caches ---

    console.log(`Redeemed ${pointsToRedeem} points for K ${redeemedAmount} by user ${userId}.`);
    return {
        redeemedAmount,
        newPointsBalance: gamificationData.points,
        newWalletBalance: newWalletBalance,
        transaction: redeemTx
    };
}


// --- Bookmark Functions ---

// Cache constants for bookmarks
const BOOKMARKS_CACHE_KEY_PREFIX = 'cachedUserBookmarks_';
const BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX = '_timestamp';
const BOOKMARKS_CACHE_MAX_AGE = 10 * 60 * 1000; // 10 minutes cache

/**
 * Fetches saved location bookmarks for a user. Includes offline caching.
 * @param userId The ID of the user.
 * @param forceRefresh Bypasses cache and fetches fresh data if true.
 * @returns A promise resolving to an array of UserBookmark objects.
 */
export async function getUserBookmarks(userId: string, forceRefresh: boolean = false): Promise<UserBookmark[]> {
    const cacheKey = BOOKMARKS_CACHE_KEY_PREFIX + userId;
    const timestampKey = cacheKey + BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX;
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    let cachedData: UserBookmark[] | null = null;

     // 1. Try loading from cache
    if (!forceRefresh && typeof window !== 'undefined') {
        const cachedTimestamp = localStorage.getItem(timestampKey);
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < BOOKMARKS_CACHE_MAX_AGE) {
            try {
                cachedData = JSON.parse(cachedRaw);
                console.log(`Using cached bookmarks for ${userId}.`);
            } catch (e) {
                console.error("Failed to parse cached bookmarks.", e);
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(timestampKey);
            }
        }
    }

    // 2. If cache is invalid/missing/forced OR online, fetch/simulate fresh data
    if (cachedData === null || (isOnline && forceRefresh)) {
        if (isOnline) {
             console.log(`Fetching fresh bookmarks for ${userId}...`);
            await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
            // --- Simulation Logic ---
            cachedData = userBookmarks[userId] || [];
            // --- End Simulation Logic ---

             // Cache the fresh data
             if (typeof window !== 'undefined') {
                  try {
                     localStorage.setItem(cacheKey, JSON.stringify(cachedData));
                     localStorage.setItem(timestampKey, Date.now().toString());
                  } catch (e) {
                     console.error("Failed to cache bookmarks:", e);
                  }
             }
        } else {
            // Offline and no valid cache
             console.warn(`Offline and no cached bookmarks for ${userId}. Returning empty array.`);
            cachedData = [];
        }
    }
    // Sort bookmarks alphabetically by label before returning
    return cachedData!.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Adds a new bookmark for a user (requires online). Invalidates cache.
 * @param userId The ID of the user.
 * @param bookmarkData Data for the new bookmark (label is required).
 * @returns A promise resolving to the newly created bookmark, or null if offline.
 */
export async function addBookmark(userId: string, bookmarkData: Omit<UserBookmark, 'id' | 'userId'>): Promise<UserBookmark | null> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         console.error("Cannot add bookmark: Offline.");
         // TODO: Queue action if offline?
         return null;
     }
    await new Promise(resolve => setTimeout(resolve, 250)); // Simulate delay
    if (!bookmarkData.label) throw new Error("Bookmark label is required.");

    const newBookmark: UserBookmark = {
        id: `bm_${Date.now()}`,
        userId: userId,
        ...bookmarkData,
    };

    if (!userBookmarks[userId]) {
        userBookmarks[userId] = [];
    }
    userBookmarks[userId].push(newBookmark);

    // Invalidate cache
    const cacheKey = BOOKMARKS_CACHE_KEY_PREFIX + userId;
    const timestampKey = cacheKey + BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX;
     if (typeof window !== 'undefined') {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
     }

    console.log(`Added bookmark "${newBookmark.label}" for user ${userId}.`);
    return newBookmark;
}

/**
 * Updates an existing bookmark (requires online). Invalidates cache.
 * @param bookmarkId The ID of the bookmark to update.
 * @param updateData The fields to update (label, address, etc.).
 * @returns A promise resolving to the updated bookmark, or null if not found or offline.
 */
export async function updateBookmark(bookmarkId: string, updateData: Partial<Omit<UserBookmark, 'id' | 'userId'>>): Promise<UserBookmark | null> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         console.error("Cannot update bookmark: Offline.");
         // TODO: Queue action if offline?
         return null;
     }
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    if (!updateData.label) throw new Error("Bookmark label is required.");

    let foundBookmark: UserBookmark | null = null;
    let userId: string | null = null;

    // Find the bookmark across all users (in mock data)
    for (const uid in userBookmarks) {
        const index = userBookmarks[uid].findIndex(bm => bm.id === bookmarkId);
        if (index !== -1) {
            userId = uid;
            userBookmarks[uid][index] = { ...userBookmarks[uid][index], ...updateData };
            foundBookmark = userBookmarks[uid][index];
            break;
        }
    }

    if (foundBookmark && userId) {
         // Invalidate cache for the specific user
         const cacheKey = BOOKMARKS_CACHE_KEY_PREFIX + userId;
         const timestampKey = cacheKey + BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX;
          if (typeof window !== 'undefined') {
             localStorage.removeItem(cacheKey);
             localStorage.removeItem(timestampKey);
          }
         console.log(`Updated bookmark "${foundBookmark.label}" (ID: ${bookmarkId}).`);
         return foundBookmark;
    } else {
         console.warn(`Bookmark not found for update: ${bookmarkId}`);
         return null;
    }
}

/**
 * Deletes a bookmark (requires online). Invalidates cache.
 * @param bookmarkId The ID of the bookmark to delete.
 * @returns A promise resolving to true if successful, false otherwise (or if offline).
 */
export async function deleteBookmark(bookmarkId: string): Promise<boolean> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         console.error("Cannot delete bookmark: Offline.");
         // TODO: Queue action if offline?
         return false;
     }
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate delay

    let deleted = false;
    let userId: string | null = null;

    for (const uid in userBookmarks) {
        const initialLength = userBookmarks[uid].length;
        userBookmarks[uid] = userBookmarks[uid].filter(bm => bm.id !== bookmarkId);
        if (userBookmarks[uid].length < initialLength) {
            deleted = true;
            userId = uid;
            break;
        }
    }

    if (deleted && userId) {
         // Invalidate cache for the specific user
         const cacheKey = BOOKMARKS_CACHE_KEY_PREFIX + userId;
         const timestampKey = cacheKey + BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX;
          if (typeof window !== 'undefined') {
             localStorage.removeItem(cacheKey);
             localStorage.removeItem(timestampKey);
          }
         console.log(`Deleted bookmark (ID: ${bookmarkId}).`);
    } else {
         console.warn(`Bookmark not found for deletion: ${bookmarkId}`);
    }
    return deleted;
}

// --- User Preferences Functions ---

/**
 * Saves user preferences (like favorite locations) to localStorage.
 * @param userId The ID of the user.
 * @param preferences The preferences object to save.
 */
export function saveUserPreferences(userId: string, preferences: UserPreferences): void {
    if (typeof window !== 'undefined') {
        try {
            const key = `userPreferences_${userId}`;
            localStorage.setItem(key, JSON.stringify(preferences));
            console.log(`Saved preferences for user ${userId}.`);
        } catch (e) {
            console.error("Failed to save user preferences:", e);
        }
    }
}

/**
 * Loads user preferences from localStorage.
 * @param userId The ID of the user.
 * @returns The loaded preferences object or null if not found or invalid.
 */
export function loadUserPreferences(userId: string): UserPreferences | null {
    if (typeof window !== 'undefined') {
        try {
            const key = `userPreferences_${userId}`;
            const storedPrefs = localStorage.getItem(key);
            if (storedPrefs) {
                return JSON.parse(storedPrefs) as UserPreferences;
            }
        } catch (e) {
            console.error("Failed to load or parse user preferences:", e);
             localStorage.removeItem(`userPreferences_${userId}`); // Clear invalid data
        }
    }
    return null; // Return null if not found or error
}

// --- Referral Functions ---

/**
 * Fetches the referral history for a user.
 * @param userId The ID of the referring user.
 * @returns A promise resolving to an array of Referral objects.
 */
export async function getReferralHistory(userId: string): Promise<Referral[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return referrals.filter(r => r.referringUserId === userId);
}

// Function to simulate applying a promo code (replace with real API)
export async function applyPromoCode(promoCode: string, userId: string): Promise<{ success: boolean; message: string, pointsAwarded?: number }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const codeUpper = promoCode.toUpperCase();

    // Check if user already used this type of code (e.g., only one welcome bonus)
    // (Add more complex validation based on backend rules)

    if (codeUpper === 'WELCOME10') {
        // For the sake of example, we will award points directly
        const points = 10;
        // Award points only if user doesn't have a specific badge/flag indicating they already got welcome bonus
        const gamification = await getUserGamification(userId);
        if (!gamification.badges.some(b => b.id === 'badge_welcome_bonus_used')) { // Assume such a badge exists
             const newTotal = await awardPoints(userId, points, "Signup Promo Code");
             if (newTotal !== null) {
                // Optional: Award a badge to prevent reuse
                // await awardBadge(userId, 'badge_welcome_bonus_used');
                return { success: true, message: `Promo code applied! +${points} points awarded!`, pointsAwarded: points };
             } else {
                 return { success: false, message: "Could not award points (maybe offline?)." };
             }
        } else {
            return { success: false, message: "Welcome promo code already used." };
        }
    }
     if (codeUpper === 'PARKFREE5') {
          // Simulate a discount for next parking (would need backend logic)
          return { success: true, message: "Code applied! K5 discount on your next parking session." };
     }

    return { success: false, message: "Invalid or expired promo code." };
}

// --- Mock User Data for Searches ---
const mockUserData = [
     { userId: 'user_abc123', userName: 'Alice Smith', phone: '0977123456', role: 'User' },
     { userId: 'user_def456', userName: 'Bob Johnson', phone: '0966789012', role: 'ParkingLotOwner' },
     { userId: 'user_ghi789', userName: 'Charlie Brown', phone: '0955111222', role: 'User' },
     { userId: 'user_jkl012', userName: 'Diana Prince', phone: '0971000000', role: 'Admin' },
     { userId: 'user_premium_test', userName: 'Premium Tester', phone: '0977777777', role: 'Premium' },
     { userId: 'attendant_001', userName: 'Attendant One', phone: '0955001001', role: 'ParkingAttendant' },
];

const mockVehicleData = [
     { userId: 'user_abc123', plate: 'ABC 123', make: 'Toyota', model: 'Corolla' },
     { userId: 'user_abc123', plate: 'XYZ 789', make: 'Nissan', model: 'Hardbody' },
     { userId: 'user_def456', plate: 'BDE 456', make: 'Honda', model: 'CRV' }, // Corrected plate for Bob
     { userId: 'user_ghi789', plate: 'CGE 789', make: 'Mazda', model: 'Demio' },
     { userId: 'user_jkl012', plate: 'ADE 012', make: 'Mercedes', model: 'C-Class' },
     { userId: 'user_premium_test', plate: 'PREMIUM 1', make: 'BMW', model: 'X5' },
      { userId: 'attendant_001', plate: 'ATT 001', make: 'Ford', model: 'Ranger' }, // Attendant might have a car
];

/**
 * Searches for users or vehicles by query (plate or phone) - for Attendant Dashboard.
 * @param query The search query (license plate or phone number).
 * @returns A promise resolving to an array of search results.
 */
export async function searchUserOrVehicleByAttendant(query: string): Promise<AttendantSearchResult[]> {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate search delay
    const normalizedQuery = query.replace(/\s+/g, '').toUpperCase();
    const results: AttendantSearchResult[] = [];

    // Search by Plate
    mockVehicleData.forEach(vehicle => {
        if (vehicle.plate.replace(/\s+/g, '').toUpperCase().includes(normalizedQuery)) {
            const user = mockUserData.find(u => u.userId === vehicle.userId);
            results.push({
                userId: vehicle.userId,
                userName: user?.userName || 'Unknown User',
                phone: user?.phone,
                vehiclePlate: vehicle.plate,
                vehicleMake: vehicle.make,
                vehicleModel: vehicle.model,
            });
        }
    });

    // Search by Phone (if query looks like a phone number)
    const phoneQuery = query.replace(/\D/g, ''); // Remove non-digits
    if (phoneQuery.length >= 5) { // Basic check if it might be a phone number part
         mockUserData.forEach(user => {
             if (user.phone && user.phone.replace(/\D/g, '').includes(phoneQuery)) {
                 // Find vehicles associated with this user
                 mockVehicleData.forEach(vehicle => {
                      if (vehicle.userId === user.userId) {
                           // Avoid duplicate entries if already found via plate
                          if (!results.some(r => r.userId === user.userId && r.vehiclePlate === vehicle.plate)) {
                              results.push({
                                  userId: user.userId,
                                  userName: user.userName,
                                  phone: user.phone,
                                  vehiclePlate: vehicle.plate,
                                  vehicleMake: vehicle.make,
                                  vehicleModel: vehicle.model,
                              });
                          }
                      }
                 });
                 // If user has no vehicles listed, add user info anyway
                  if (!mockVehicleData.some(v => v.userId === user.userId)) {
                       if (!results.some(r => r.userId === user.userId)) { // Avoid duplicates if user has multiple phones matching?
                           results.push({
                               userId: user.userId,
                               userName: user.userName,
                               phone: user.phone,
                               vehiclePlate: 'N/A', // Indicate no vehicle found for this match
                           });
                       }
                  }
             }
        });
    }

    return results;
}
