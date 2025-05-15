// src/services/user-service.ts

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
let userGamificationData: Record<string, UserGamification> = {
    'user_abc123': {
        points: 155,
        badges: [
            { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles', earnedDate: '2024-07-28' },
            { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Flag', earnedDate: '2024-07-29' },
        ],
        isCarpoolEligible: false,
        parkingExtensionsUsed: 1,
        referralCode: 'ALICE123',
        referralsCompleted: 1,
    },
     'user_def456': {
        points: 50,
        badges: [],
        isCarpoolEligible: true,
        parkingExtensionsUsed: 0,
        referralCode: 'BOB456',
        referralsCompleted: 0,
    },
     'attendant_001': { points: 10, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0, referralCode: 'ATTEND001', referralsCompleted: 0 },
      'user_premium_test': { points: 1000, badges: [], isCarpoolEligible: true, parkingExtensionsUsed: 0, referralCode: 'PREMIUM789', referralsCompleted: 5 },
};

let userBookmarks: Record<string, UserBookmark[]> = {
    'user_abc123': [
        { id: 'bm_1', userId: 'user_abc123', label: 'Home', address: '10 Residential St, Anytown', latitude: 34.0600, longitude: -118.2300 },
        { id: 'bm_2', userId: 'user_abc123', label: 'Work', address: '1 Business Ave, Anytown', latitude: 34.0510, longitude: -118.2450 },
    ],
     'user_premium_test': [
        { id: 'bm_3', userId: 'user_premium_test', label: 'Gym', address: '5 Fitness Way', latitude: 34.0550, longitude: -118.2550 },
    ],
};

let pointsTransactions: Record<string, PointsTransaction[]> = {
     'user_abc123': [
         { id: 'pts_txn_ref1', timestamp: new Date(Date.now() - 5*86400000).toISOString(), senderId: 'system', recipientId: 'user_abc123', points: 50, type: 'earned', description: 'Referral Bonus' },
          { id: 'pts_txn_daily1', timestamp: new Date(Date.now() - 2*86400000).toISOString(), senderId: 'system', recipientId: 'user_abc123', points: 5, type: 'earned', description: 'Daily Login Bonus' },
     ],
     'user_def456': [],
};

let referrals: Referral[] = [
    { referringUserId: 'user_abc123', referredUserId: 'user_new_1', referredUserName: 'New User 1', signupTimestamp: new Date(Date.now() - 5*86400000).toISOString(), bonusAwarded: true },
];

let userPreferences: Record<string, UserPreferences> = {};

const availableBadges: Omit<UserBadge, 'earnedDate'>[] = [
     { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles' },
     { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Flag' },
     { id: 'badge_frequent_parker', name: 'Frequent Parker', description: 'Completed 5 reservations.', iconName: 'Award' },
     { id: 'badge_carpool_champ', name: 'Carpool Champ', description: 'Enabled carpooling benefits.', iconName: 'Users' },
     { id: 'badge_referrer', name: 'Referrer', description: 'Successfully referred a new user.', iconName: 'Gift' },
];


// --- Mock Service Functions ---

const GAMIFICATION_CACHE_KEY_PREFIX = 'cachedGamification_';
const GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX = '_timestamp';
const GAMIFICATION_CACHE_MAX_AGE = 5 * 60 * 1000;

export async function getUserGamification(userId: string, forceRefresh: boolean = false): Promise<UserGamification> {
    const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
    const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
    let isOnline = true;
    if (typeof window !== 'undefined') {
        isOnline = navigator.onLine;
    }
    let cachedData: UserGamification | null = null;

    if (!forceRefresh && typeof window !== 'undefined') {
        const cachedTimestamp = localStorage.getItem(timestampKey);
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < GAMIFICATION_CACHE_MAX_AGE) {
            try {
                cachedData = JSON.parse(cachedRaw);
            } catch (e) {
                console.error("Failed to parse cached gamification data.", e);
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(timestampKey);
            }
        }
    }

    if (cachedData === null || (isOnline && forceRefresh)) {
        if (isOnline) {
            await new Promise(resolve => setTimeout(resolve, 300));
            let data = userGamificationData[userId];
            if (!data) {
                 const referralCode = `${(mockUserData.find(u => u.userId === userId)?.userName || 'USER').slice(0, 5).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                 data = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0, referralCode: referralCode, referralsCompleted: 0 };
                 userGamificationData[userId] = data;
            } else {
                if (!data.referralCode) {
                     data.referralCode = `${(mockUserData.find(u => u.userId === userId)?.userName || 'USER').slice(0, 5).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                }
                if (data.referralsCompleted === undefined) {
                    data.referralsCompleted = referrals.filter(r => r.referringUserId === userId && r.bonusAwarded).length;
                }
                if (data.parkingExtensionsUsed === undefined) {
                     data.parkingExtensionsUsed = 0;
                }
            }
             cachedData = { ...data };

            if (typeof window !== 'undefined') {
                 try {
                    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
                    localStorage.setItem(timestampKey, Date.now().toString());
                 } catch (e) {
                    console.error("Failed to cache gamification data:", e);
                 }
            }
        } else {
            console.warn(`Offline and no cached gamification data for ${userId}. Returning default.`);
            cachedData = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0, referralCode: 'OFFLINE', referralsCompleted: 0 };
        }
    }
    return cachedData!;
}

export async function incrementParkingExtensions(userId: string): Promise<number | null> {
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
        console.error("Cannot increment extensions: Offline.");
        return null;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    const data = await getUserGamification(userId, true);
    data.parkingExtensionsUsed = (data.parkingExtensionsUsed || 0) + 1;
    userGamificationData[userId] = data;

    const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
    const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
     if (typeof window !== 'undefined') {
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(timestampKey);
     }
    return data.parkingExtensionsUsed!;
}

export async function resetParkingExtensions(userId: string): Promise<boolean> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
        console.error("Cannot reset extensions: Offline.");
        return false;
     }
    await new Promise(resolve => setTimeout(resolve, 50));
    if (userGamificationData[userId]) {
        userGamificationData[userId].parkingExtensionsUsed = 0;
        const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
        const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
         if (typeof window !== 'undefined') {
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(timestampKey);
         }
    }
    return true;
}

export async function awardPoints(userId: string, pointsToAdd: number, description?: string): Promise<number | null> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
        console.error(`Cannot award points to ${userId}: Offline.`);
        return null;
     }
    await new Promise(resolve => setTimeout(resolve, 150));
    const data = await getUserGamification(userId, true);
    data.points += pointsToAdd;
    userGamificationData[userId] = data;

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

     const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
     const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
      if (typeof window !== 'undefined') {
           localStorage.removeItem(cacheKey);
           localStorage.removeItem(timestampKey);
      }
       const txnCacheKey = `cachedPointsTxns_${userId}`;
       const txnTimestampKey = `${txnCacheKey}_timestamp`;
       if (typeof window !== 'undefined') {
           localStorage.removeItem(txnCacheKey);
           localStorage.removeItem(txnTimestampKey);
       }
    return data.points;
}

export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
        console.error(`Cannot award badge to ${userId}: Offline.`);
        return false;
     }
    await new Promise(resolve => setTimeout(resolve, 200));
    const data = await getUserGamification(userId, true);

    const alreadyHasBadge = data.badges.some(b => b.id === badgeId);
    if (alreadyHasBadge) {
        return false;
    }

    const badgeDefinition = availableBadges.find(b => b.id === badgeId);
    if (!badgeDefinition) {
        console.warn(`Badge definition not found for ID: ${badgeId}`);
        return false;
    }

    const newBadge: UserBadge = {
        ...badgeDefinition,
        earnedDate: new Date().toISOString(),
    };
    data.badges.push(newBadge);
    userGamificationData[userId] = data;

     const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
     const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
      if (typeof window !== 'undefined') {
           localStorage.removeItem(cacheKey);
           localStorage.removeItem(timestampKey);
      }
    return true;
}

export async function updateCarpoolEligibility(userId: string, isEligible: boolean): Promise<boolean> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
        console.error("Cannot update carpool status: Offline.");
        return false;
     }
    await new Promise(resolve => setTimeout(resolve, 100));
    const data = await getUserGamification(userId, true);
    data.isCarpoolEligible = isEligible;
    userGamificationData[userId] = data;

     const cacheKey = GAMIFICATION_CACHE_KEY_PREFIX + userId;
     const timestampKey = cacheKey + GAMIFICATION_CACHE_TIMESTAMP_KEY_SUFFIX;
      if (typeof window !== 'undefined') {
           localStorage.removeItem(cacheKey);
           localStorage.removeItem(timestampKey);
      }

    if (isEligible) {
        await awardBadge(userId, 'badge_carpool_champ');
    }
    return true;
}

export async function transferPoints(
    senderId: string,
    recipientId: string,
    pointsToTransfer: number
): Promise<{ senderNewPoints: number; recipientNewPoints: number; transaction: PointsTransaction }> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         throw new Error("Cannot transfer points: Offline.");
     }
    await new Promise(resolve => setTimeout(resolve, 400));

    if (pointsToTransfer <= 0) {
        throw new Error("Points to transfer must be positive.");
    }
    if (senderId === recipientId) {
        throw new Error("Cannot transfer points to yourself.");
    }

    const senderData = await getUserGamification(senderId, true);
    let recipientData = userGamificationData[recipientId];

    if (!recipientData) {
         const recipientUser = mockUserData.find(u => u.userId === recipientId);
         if (recipientUser) {
              recipientData = await getUserGamification(recipientId, true);
         } else {
            throw new Error("Recipient user not found.");
         }
    } else {
         recipientData = await getUserGamification(recipientId, true);
    }

    if (senderData.points < pointsToTransfer) {
        throw new Error(`Insufficient points. You only have ${senderData.points}.`);
    }

    senderData.points -= pointsToTransfer;
    recipientData.points += pointsToTransfer;
    userGamificationData[senderId] = senderData;
    userGamificationData[recipientId] = recipientData;

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

    return { senderNewPoints: senderData.points, recipientNewPoints: recipientData.points, transaction: senderTx };
}

export async function getMockUsersForTransfer(): Promise<{ id: string, name: string }[]> {
     await new Promise(resolve => setTimeout(resolve, 100));
     return Object.keys(userGamificationData).map(id => ({
         id,
         name: mockUserData.find(u => u.userId === id)?.userName || `User ${id.substring(0, 5)} (mock)`,
     })).filter(u => u.name);
}

export async function getPointsTransactions(userId: string, limit: number = 10): Promise<PointsTransaction[]> {
     await new Promise(resolve => setTimeout(resolve, 300));
     const txns = pointsTransactions[userId] || [];
     return txns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

export async function redeemPoints(
    userId: string,
    pointsToRedeem: number,
    rate: number = 0.10
): Promise<{
    redeemedAmount: number;
    newPointsBalance: number;
    newWalletBalance: number;
    transaction: PointsTransaction;
} | null> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         console.error(`Cannot redeem points for ${userId}: Offline.`);
         return null;
     }
    await new Promise(resolve => setTimeout(resolve, 450));

    if (pointsToRedeem <= 0) {
        throw new Error("Points to redeem must be positive.");
    }

    const gamificationData = await getUserGamification(userId, true);
    const { getWalletBalance: getWalletBalService } = await import('./wallet-service'); // Dynamic import
    const walletData = await getWalletBalService(userId);

    if (gamificationData.points < pointsToRedeem) {
        throw new Error(`Insufficient points. You only have ${gamificationData.points}.`);
    }

    const redeemedAmount = parseFloat((pointsToRedeem * rate).toFixed(2));

    gamificationData.points -= pointsToRedeem;
    userGamificationData[userId] = gamificationData;

    let newWalletBalance = walletData.balance + redeemedAmount;
    // This direct update is for mock; real app uses service
    if (typeof window !== 'undefined' && userWallets[userId]) {
         userWallets[userId].balance = newWalletBalance;
    } else if (typeof window !== 'undefined') {
         userWallets[userId] = { balance: newWalletBalance, currency: 'ZMW' };
    }


    const redeemTx: PointsTransaction = {
        id: `pts_txn_redeem_${Date.now()}`,
        timestamp: new Date().toISOString(),
        senderId: userId,
        recipientId: 'system',
        points: -pointsToRedeem,
        type: 'redeemed',
        description: `Redeemed for K ${redeemedAmount.toFixed(2)} wallet credit`,
    };
    if (!pointsTransactions[userId]) pointsTransactions[userId] = [];
    pointsTransactions[userId].push(redeemTx);

    // Invalidate caches
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

    return {
        redeemedAmount,
        newPointsBalance: gamificationData.points,
        newWalletBalance: newWalletBalance,
        transaction: redeemTx
    };
}

const BOOKMARKS_CACHE_KEY_PREFIX = 'cachedUserBookmarks_';
const BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX = '_timestamp';
const BOOKMARKS_CACHE_MAX_AGE = 10 * 60 * 1000;

export async function getUserBookmarks(userId: string, forceRefresh: boolean = false): Promise<UserBookmark[]> {
    const cacheKey = BOOKMARKS_CACHE_KEY_PREFIX + userId;
    const timestampKey = cacheKey + BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX;
    let isOnline = true;
    if (typeof window !== 'undefined') {
        isOnline = navigator.onLine;
    }
    let cachedData: UserBookmark[] | null = null;

    if (!forceRefresh && typeof window !== 'undefined') {
        const cachedTimestamp = localStorage.getItem(timestampKey);
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < BOOKMARKS_CACHE_MAX_AGE) {
            try {
                cachedData = JSON.parse(cachedRaw);
            } catch (e) {
                console.error("Failed to parse cached bookmarks.", e);
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(timestampKey);
            }
        }
    }

    if (cachedData === null || (isOnline && forceRefresh)) {
        if (isOnline) {
            await new Promise(resolve => setTimeout(resolve, 200));
            cachedData = userBookmarks[userId] || [];
             if (typeof window !== 'undefined') {
                  try {
                     localStorage.setItem(cacheKey, JSON.stringify(cachedData));
                     localStorage.setItem(timestampKey, Date.now().toString());
                  } catch (e) {
                     console.error("Failed to cache bookmarks:", e);
                  }
             }
        } else {
            console.warn(`Offline and no cached bookmarks for ${userId}. Returning empty array.`);
            cachedData = [];
        }
    }
    return cachedData!.sort((a, b) => a.label.localeCompare(b.label));
}

export async function addBookmark(userId: string, bookmarkData: Omit<UserBookmark, 'id' | 'userId'>): Promise<UserBookmark | null> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         console.error("Cannot add bookmark: Offline.");
         return null;
     }
    await new Promise(resolve => setTimeout(resolve, 250));
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

    const cacheKey = BOOKMARKS_CACHE_KEY_PREFIX + userId;
    const timestampKey = cacheKey + BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX;
     if (typeof window !== 'undefined') {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
     }
    return newBookmark;
}

export async function updateBookmark(bookmarkId: string, updateData: Partial<Omit<UserBookmark, 'id' | 'userId'>>): Promise<UserBookmark | null> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         console.error("Cannot update bookmark: Offline.");
         return null;
     }
    await new Promise(resolve => setTimeout(resolve, 200));
    if (!updateData.label) throw new Error("Bookmark label is required.");

    let foundBookmark: UserBookmark | null = null;
    let userId: string | null = null;

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
         const cacheKey = BOOKMARKS_CACHE_KEY_PREFIX + userId;
         const timestampKey = cacheKey + BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX;
          if (typeof window !== 'undefined') {
             localStorage.removeItem(cacheKey);
             localStorage.removeItem(timestampKey);
          }
         return foundBookmark;
    } else {
         console.warn(`Bookmark not found for update: ${bookmarkId}`);
         return null;
    }
}

export async function deleteBookmark(bookmarkId: string): Promise<boolean> {
     let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
     if (!isOnline) {
         console.error("Cannot delete bookmark: Offline.");
         return false;
     }
    await new Promise(resolve => setTimeout(resolve, 150));

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
         const cacheKey = BOOKMARKS_CACHE_KEY_PREFIX + userId;
         const timestampKey = cacheKey + BOOKMARKS_CACHE_TIMESTAMP_KEY_SUFFIX;
          if (typeof window !== 'undefined') {
             localStorage.removeItem(cacheKey);
             localStorage.removeItem(timestampKey);
          }
    } else {
         console.warn(`Bookmark not found for deletion: ${bookmarkId}`);
    }
    return deleted;
}

export function saveUserPreferences(userId: string, preferences: UserPreferences): void {
    if (typeof window !== 'undefined') {
        try {
            const key = `userPreferences_${userId}`;
            localStorage.setItem(key, JSON.stringify(preferences));
        } catch (e: any) {
            console.error("Failed to save user preferences:", e.message);
        }
    }
}

export function loadUserPreferences(userId: string): UserPreferences | null {
    if (typeof window !== 'undefined') {
        try {
            const key = `userPreferences_${userId}`;
            const storedPrefs = localStorage.getItem(key);
            if (storedPrefs) {
                return JSON.parse(storedPrefs) as UserPreferences;
            }
        } catch (e: any) {
            console.error("Failed to load or parse user preferences:", e.message);
             localStorage.removeItem(`userPreferences_${userId}`);
        }
    }
    return null;
}

export async function getReferralHistory(userId: string): Promise<Referral[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return referrals.filter(r => r.referringUserId === userId);
}

export async function applyPromoCode(promoCode: string, userId: string): Promise<{ success: boolean; message: string, pointsAwarded?: number }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const codeUpper = promoCode.toUpperCase();

    if (codeUpper === 'WELCOME10') {
        const points = 10;
        const gamification = await getUserGamification(userId);
        if (!gamification.badges.some(b => b.id === 'badge_welcome_bonus_used')) {
             const newTotal = await awardPoints(userId, points, "Signup Promo Code");
             if (newTotal !== null) {
                return { success: true, message: `Promo code applied! +${points} points awarded!`, pointsAwarded: points };
             } else {
                 return { success: false, message: "Could not award points (maybe offline?)." };
             }
        } else {
            return { success: false, message: "Welcome promo code already used." };
        }
    }
     if (codeUpper === 'PARKFREE5') {
          return { success: true, message: "Code applied! K5 discount on your next parking session." };
     }

    return { success: false, message: "Invalid or expired promo code." };
}

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
     { userId: 'user_def456', plate: 'BDE 456', make: 'Honda', model: 'CRV' },
     { userId: 'user_ghi789', plate: 'CGE 789', make: 'Mazda', model: 'Demio' },
     { userId: 'user_jkl012', plate: 'ADE 012', make: 'Mercedes', model: 'C-Class' },
     { userId: 'user_premium_test', plate: 'PREMIUM 1', make: 'BMW', model: 'X5' },
      { userId: 'attendant_001', plate: 'ATT 001', make: 'Ford', model: 'Ranger' },
];

export async function searchUserOrVehicleByAttendant(query: string): Promise<AttendantSearchResult[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const normalizedQuery = query.replace(/\s+/g, '').toUpperCase();
    const results: AttendantSearchResult[] = [];

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

    const phoneQuery = query.replace(/\D/g, '');
    if (phoneQuery.length >= 5) {
         mockUserData.forEach(user => {
             if (user.phone && user.phone.replace(/\D/g, '').includes(phoneQuery)) {
                 mockVehicleData.forEach(vehicle => {
                      if (vehicle.userId === user.userId) {
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
                  if (!mockVehicleData.some(v => v.userId === user.userId)) {
                       if (!results.some(r => r.userId === user.userId)) {
                           results.push({
                               userId: user.userId,
                               userName: user.userName,
                               phone: user.phone,
                               vehiclePlate: 'N/A',
                           });
                       }
                  }
             }
        });
    }
    return results;
}
