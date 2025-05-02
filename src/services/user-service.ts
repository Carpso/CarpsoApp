
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


// Available badges definition (could be stored elsewhere)
const availableBadges: Omit<UserBadge, 'earnedDate'>[] = [
     { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles' },
     { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Flag' }, // Changed icon to Flag
     { id: 'badge_frequent_parker', name: 'Frequent Parker', description: 'Completed 5 reservations.', iconName: 'Award' },
     { id: 'badge_carpool_champ', name: 'Carpool Champ', description: 'Enabled carpooling benefits.', iconName: 'Users' },
     { id: 'badge_referrer', name: 'Referrer', description: 'Successfully referred a new user.', iconName: 'Gift' }, // Added referral badge
];


// --- Mock Service Functions ---

/**
 * Fetches the gamification status (points, badges, carpool status, referral code) for a user.
 * @param userId The ID of the user.
 * @returns A promise resolving to the user's gamification data.
 */
export async function getUserGamification(userId: string): Promise<UserGamification> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    // Return existing data or default if user not found
    let data = userGamificationData[userId];
    if (!data) {
         // Create default gamification data if none exists, including a referral code
         const referralCode = `${(mockUserData.find(u => u.userId === userId)?.userName || 'USER').slice(0, 5).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
         data = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0, referralCode: referralCode, referralsCompleted: 0 };
         userGamificationData[userId] = data;
         console.log(`Initialized gamification data for ${userId} with referral code ${referralCode}`);
    } else {
        // Ensure referralCode and referralsCompleted exist for older mock data
        if (!data.referralCode) {
             data.referralCode = `${(mockUserData.find(u => u.userId === userId)?.userName || 'USER').slice(0, 5).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
             console.log(`Generated missing referral code for ${userId}: ${data.referralCode}`);
        }
        if (data.referralsCompleted === undefined) {
            data.referralsCompleted = referrals.filter(r => r.referringUserId === userId && r.bonusAwarded).length; // Calculate from referral history if missing
        }
    }

    // Ensure parkingExtensionsUsed is initialized
    if (data.parkingExtensionsUsed === undefined) {
        data.parkingExtensionsUsed = 0;
    }
    return { ...data }; // Return a copy
}

/**
 * Increments the parking extension counter for a user.
 * In a real app, this might have limits based on subscription or time period.
 * @param userId The ID of the user.
 * @returns A promise resolving to the updated number of extensions used.
 */
export async function incrementParkingExtensions(userId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    const data = await getUserGamification(userId); // Ensure data exists
    data.parkingExtensionsUsed = (data.parkingExtensionsUsed || 0) + 1;
    userGamificationData[userId] = data; // Update mock store
    console.log(`Incremented parking extensions for user ${userId}. Total used: ${data.parkingExtensionsUsed}`);
    return data.parkingExtensionsUsed!;
}

/**
 * Resets the parking extension counter for a user (e.g., monthly or based on subscription).
 * @param userId The ID of the user.
 * @returns A promise resolving to true if successful.
 */
export async function resetParkingExtensions(userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
    if (userGamificationData[userId]) {
        userGamificationData[userId].parkingExtensionsUsed = 0;
        console.log(`Reset parking extensions for user ${userId}.`);
    }
    return true;
}

/**
 * Awards points to a user and records the transaction.
 * @param userId The ID of the user.
 * @param pointsToAdd The number of points to add.
 * @param description Optional description for the transaction.
 * @returns A promise resolving to the updated total points.
 */
export async function awardPoints(userId: string, pointsToAdd: number, description?: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate delay
    const data = await getUserGamification(userId); // Ensure data exists
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

    console.log(`Awarded ${pointsToAdd} points to user ${userId}. Description: ${description || 'N/A'}. New total: ${data.points}`);
    return data.points;
}

/**
 * Awards a specific badge to a user if they haven't earned it already.
 * @param userId The ID of the user.
 * @param badgeId The ID of the badge to award.
 * @returns A promise resolving to true if the badge was newly awarded, false otherwise.
 */
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    const data = await getUserGamification(userId); // Ensure data exists

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
    console.log(`Awarded badge "${badgeDefinition.name}" to user ${userId}.`);
    return true;
}

/**
 * Updates the user's carpool eligibility status.
 * @param userId The ID of the user.
 * @param isEligible The new eligibility status.
 * @returns A promise resolving to true if the update was successful.
 */
export async function updateCarpoolEligibility(userId: string, isEligible: boolean): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    const data = await getUserGamification(userId); // Ensure data exists
    data.isCarpoolEligible = isEligible;
    userGamificationData[userId] = data; // Update mock store
    console.log(`Set carpool eligibility for user ${userId} to ${isEligible}.`);

    // Potentially award carpool badge
    if (isEligible) {
        await awardBadge(userId, 'badge_carpool_champ');
    }
    return true;
}

/**
 * Transfers gamification points from one user to another.
 * @param senderId The ID of the user sending points.
 * @param recipientId The ID of the user receiving points.
 * @param pointsToTransfer The number of points to transfer.
 * @returns A promise resolving to an object containing the sender's and recipient's new point balances and the created transaction.
 * @throws Error if sender or recipient is not found, or if sender has insufficient points.
 */
export async function transferPoints(
    senderId: string,
    recipientId: string,
    pointsToTransfer: number
): Promise<{ senderNewPoints: number; recipientNewPoints: number; transaction: PointsTransaction }> {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay

    if (pointsToTransfer <= 0) {
        throw new Error("Points to transfer must be positive.");
    }
    if (senderId === recipientId) {
        throw new Error("Cannot transfer points to yourself.");
    }

    const senderData = await getUserGamification(senderId); // Ensure sender data exists
    let recipientData = userGamificationData[recipientId]; // Check if recipient exists

    if (!recipientData) {
        // Optionally create recipient if they don't exist in gamification yet
         const recipientUser = mockUserData.find(u => u.userId === recipientId);
         if (recipientUser) {
              recipientData = await getUserGamification(recipientId); // This will initialize recipient data
              console.log(`Initialized recipient ${recipientId} gamification data for transfer.`);
         } else {
            throw new Error("Recipient user not found.");
         }
    }

    if (senderData.points < pointsToTransfer) {
        throw new Error(`Insufficient points. You only have ${senderData.points}.`);
    }

    // Perform the transfer
    senderData.points -= pointsToTransfer;
    recipientData.points += pointsToTransfer;
    userGamificationData[senderId] = senderData; // Update mock store
    userGamificationData[recipientId] = recipientData; // Update mock store

    // Record the transaction (optional)
    const timestamp = new Date().toISOString();
    const transactionId = `pts_txn_${Date.now()}`;
    const senderTx: PointsTransaction = {
        id: transactionId + '_s',
        timestamp,
        senderId,
        recipientId,
        points: -pointsToTransfer, // Negative for sender
        type: 'sent',
        description: `Sent to ${recipientData.referralCode || recipientId.substring(0,8)}...` // Use referral code if available
    };
    const recipientTx: PointsTransaction = {
        id: transactionId + '_r',
        timestamp,
        senderId,
        recipientId,
        points: pointsToTransfer,
        type: 'received',
        description: `Received from ${senderData.referralCode || senderId.substring(0,8)}...`
    };

    if (!pointsTransactions[senderId]) pointsTransactions[senderId] = [];
    if (!pointsTransactions[recipientId]) pointsTransactions[recipientId] = [];
    pointsTransactions[senderId].push(senderTx);
    pointsTransactions[recipientId].push(recipientTx);


    console.log(`Transferred ${pointsToTransfer} points from ${senderId} to ${recipientId}.`);
    console.log(`Sender new balance: ${senderData.points}. Recipient new balance: ${recipientData.points}`);

    // Return sender's transaction for receipt purposes
    return { senderNewPoints: senderData.points, recipientNewPoints: recipientData.points, transaction: senderTx };
}


/**
 * Fetches the points transaction history for a user.
 * @param userId The ID of the user.
 * @param limit Max number of transactions to return.
 * @returns A promise resolving to an array of points transactions.
 */
export async function getPointsTransactions(userId: string, limit: number = 10): Promise<PointsTransaction[]> {
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate delay
    const transactions = pointsTransactions[userId] || [];
    // Sort by timestamp descending and take limit
    return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

/**
 * Simulates redeeming points for wallet credit.
 * @param userId The ID of the user redeeming points.
 * @param pointsToRedeem The number of points to redeem.
 * @param conversionRate The rate at which points convert to wallet currency (e.g., 0.10 ZMW per point).
 * @returns A promise resolving to details of the redemption or null if failed.
 * @throws Error if user not found, insufficient points, or wallet update fails.
 */
export async function redeemPoints(
    userId: string,
    pointsToRedeem: number,
    conversionRate: number = 0.10 // Default to K0.10 per point
): Promise<{ redeemedAmount: number; newPointsBalance: number; newWalletBalance: number; transaction: PointsTransaction } | null> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

    if (pointsToRedeem <= 0) {
        throw new Error("Points to redeem must be positive.");
    }

    const gamificationData = await getUserGamification(userId);
    if (gamificationData.points < pointsToRedeem) {
        throw new Error(`Insufficient points. You only have ${gamificationData.points}.`);
    }

    // Ensure wallet exists
    if (!userWallets[userId]) {
         userWallets[userId] = { balance: 0, currency: 'ZMW' };
    }
    if (!userTransactions[userId]) {
        userTransactions[userId] = [];
    }
     if (!pointsTransactions[userId]) {
        pointsTransactions[userId] = [];
     }

    const redeemedAmount = pointsToRedeem * conversionRate;

    // Update points
    gamificationData.points -= pointsToRedeem;
    userGamificationData[userId] = gamificationData;

    // Update wallet balance
    userWallets[userId].balance += redeemedAmount;

    // Record points transaction
    const timestamp = new Date().toISOString();
    const pointsTx: PointsTransaction = {
        id: `pts_txn_redeem_${Date.now()}`,
        timestamp,
        senderId: userId, // User 'sends' points to system
        recipientId: 'system', // System 'receives' points
        points: -pointsToRedeem, // Negative for redemption
        type: 'redeemed',
        description: `Redeemed for K ${redeemedAmount.toFixed(2)} wallet credit`,
    };
    pointsTransactions[userId].push(pointsTx);

    // Record wallet transaction
     const walletTx: WalletTransaction = {
         id: `txn_redeem_${Date.now()}`,
         type: 'points_redemption', // Use a specific type if needed
         amount: redeemedAmount, // Positive amount added to wallet
         description: `Credit from redeeming ${pointsToRedeem} points`,
         timestamp,
         paymentMethodUsed: 'points', // Indicate source
     };
     userTransactions[userId].push(walletTx);

    console.log(`User ${userId} redeemed ${pointsToRedeem} points for K ${redeemedAmount.toFixed(2)}. New points: ${gamificationData.points}. New wallet balance: ${userWallets[userId].balance}.`);

    return {
        redeemedAmount,
        newPointsBalance: gamificationData.points,
        newWalletBalance: userWallets[userId].balance,
        transaction: pointsTx, // Return the points transaction for potential receipt
    };
}


// --- Bookmark Functions ---

/**
 * Fetches the saved location bookmarks for a user.
 * @param userId The ID of the user.
 * @returns A promise resolving to an array of the user's bookmarks.
 */
export async function getUserBookmarks(userId: string): Promise<UserBookmark[]> {
    await new Promise(resolve => setTimeout(resolve, 250)); // Simulate delay
    return userBookmarks[userId] || [];
}

/**
 * Adds a new bookmark for a user.
 * @param userId The ID of the user.
 * @param bookmarkData Data for the new bookmark (label is required).
 * @returns A promise resolving to the newly created bookmark.
 */
export async function addBookmark(userId: string, bookmarkData: Pick<UserBookmark, 'label' | 'address' | 'latitude' | 'longitude'>): Promise<UserBookmark> {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay
    if (!bookmarkData.label) {
        throw new Error("Bookmark label cannot be empty.");
    }
    const newBookmark: UserBookmark = {
        id: `bm_${Date.now()}`,
        userId,
        ...bookmarkData,
    };
    if (!userBookmarks[userId]) {
        userBookmarks[userId] = [];
    }
    userBookmarks[userId].push(newBookmark);
    console.log(`Added bookmark for user ${userId}:`, newBookmark);
    return newBookmark;
}

/**
 * Updates an existing bookmark.
 * @param bookmarkId The ID of the bookmark to update.
 * @param updateData The fields to update.
 * @returns A promise resolving to the updated bookmark or null if not found.
 */
export async function updateBookmark(bookmarkId: string, updateData: Partial<Omit<UserBookmark, 'id' | 'userId'>>): Promise<UserBookmark | null> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    for (const userId in userBookmarks) {
        const bookmarkIndex = userBookmarks[userId].findIndex(bm => bm.id === bookmarkId);
        if (bookmarkIndex !== -1) {
            userBookmarks[userId][bookmarkIndex] = {
                ...userBookmarks[userId][bookmarkIndex],
                ...updateData,
            };
            console.log(`Updated bookmark ${bookmarkId}:`, userBookmarks[userId][bookmarkIndex]);
            return userBookmarks[userId][bookmarkIndex];
        }
    }
    console.warn(`Bookmark not found for update: ${bookmarkId}`);
    return null;
}

/**
 * Deletes a bookmark.
 * @param bookmarkId The ID of the bookmark to delete.
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function deleteBookmark(bookmarkId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    for (const userId in userBookmarks) {
        const initialLength = userBookmarks[userId].length;
        userBookmarks[userId] = userBookmarks[userId].filter(bm => bm.id !== bookmarkId);
        if (userBookmarks[userId].length < initialLength) {
            console.log(`Deleted bookmark ${bookmarkId} for user ${userId}.`);
            return true;
        }
    }
    console.warn(`Bookmark not found for deletion: ${bookmarkId}`);
    return false;
}

// --- User Preferences (including Favorites) ---

const USER_PREFS_KEY_PREFIX = 'userPreferences_';

/**
 * Saves user preferences (including favorite locations) to localStorage.
 * @param userId The ID of the user.
 * @param preferences The preferences object to save.
 */
export function saveUserPreferences(userId: string, preferences: UserPreferences): void {
    if (typeof window === 'undefined') return;
    try {
        const key = USER_PREFS_KEY_PREFIX + userId;
        localStorage.setItem(key, JSON.stringify(preferences));
        console.log(`Saved preferences for user ${userId}`);
    } catch (e) {
        console.error(`Failed to save preferences for user ${userId}:`, e);
    }
}

/**
 * Loads user preferences (including favorite locations) from localStorage.
 * @param userId The ID of the user.
 * @returns The loaded preferences object or null if not found or error.
 */
export function loadUserPreferences(userId: string): UserPreferences | null {
    if (typeof window === 'undefined') return null;
    try {
        const key = USER_PREFS_KEY_PREFIX + userId;
        const data = localStorage.getItem(key);
        if (data) {
            return JSON.parse(data) as UserPreferences;
        }
        return null; // No preferences saved yet
    } catch (e) {
        console.error(`Failed to load preferences for user ${userId}:`, e);
        return null;
    }
}


// Add more functions as needed, e.g., getLeaderboard

// Helper function for modals etc. to get mock users (replace with real user search later)
export async function getMockUsersForTransfer(): Promise<{ id: string, name: string }[]> {
     await new Promise(resolve => setTimeout(resolve, 100));
     // Get all users from the gamification data as an example
     return Object.keys(userGamificationData).map(id => ({
         id,
         name: mockUserData.find(u => u.userId === id)?.userName || `User ${id.substring(0, 5)} (mock)`, // Use actual name if available
     })).filter(u => u.name); // Ensure user has a name
}

// Mock data for users and vehicles (replace with actual data source)
const mockUserData = [
    { userId: 'user_abc123', userName: 'Alice Smith', phone: '0977123456', role: 'User' },
    { userId: 'user_def456', userName: 'Bob Phiri', phone: '0966789012', role: 'Premium' }, // Bob is Premium
    { userId: 'attendant_001', userName: 'Attendant One', phone: '0955555555', role: 'ParkingAttendant' },
    { userId: 'user_premium_test', userName: 'Premium Tester', phone: '0977777777', role: 'Premium' },
];
const mockVehicleData = [
    { userId: 'user_abc123', plate: 'ABC 123', make: 'Toyota', model: 'Corolla' },
    { userId: 'user_abc123', plate: 'XYZ 789', make: 'Nissan', model: 'Hardbody' },
    { userId: 'user_def456', plate: 'DEF 456', make: 'Honda', model: 'CRV' },
    { userId: 'user_premium_test', plate: 'PREMIUM 1', make: 'BMW', model: 'X5' },
];

/**
 * Simulates searching for user/vehicle details by plate number or phone number (for attendants).
 * In a real app, this would query a database or multiple services.
 * @param query The search query (plate number or phone number).
 * @returns A promise resolving to an array of matching results.
 */
export async function searchUserOrVehicleByAttendant(query: string): Promise<AttendantSearchResult[]> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate search delay
    const normalizedQuery = query.replace(/\s+/g, '').toUpperCase();
    const results: AttendantSearchResult[] = [];

    console.log(`Attendant searching for: ${normalizedQuery}`);

    // Search by Plate Number
    for (const vehicle of mockVehicleData) {
        if (vehicle.plate.replace(/\s+/g, '').toUpperCase().includes(normalizedQuery)) {
            const user = mockUserData.find(u => u.userId === vehicle.userId);
            if (user) {
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
    }

    // Search by Phone Number
    for (const user of mockUserData) {
        if (user.phone && user.phone.replace(/\D/g, '').includes(normalizedQuery.replace(/\D/g, ''))) {
            // Find vehicles associated with this user
            const userVehicles = mockVehicleData.filter(v => v.userId === user.userId);
            if (userVehicles.length > 0) {
                // Add a result for each vehicle found for the matching phone number
                userVehicles.forEach(vehicle => {
                    // Avoid adding duplicates if already found via plate search
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
                });
            } else {
                 // Add user even if no vehicle is found, if phone matches
                 if (!results.some(r => r.userId === user.userId)) {
                     results.push({
                         userId: user.userId,
                         userName: user.userName,
                         phone: user.phone,
                         vehiclePlate: 'N/A', // Indicate no vehicle linked in this mock data
                     });
                 }
            }
        }
    }

    console.log(`Attendant search results for "${query}":`, results);
    return results;
}

// --- Referral and Promo Code Functions ---

/**
 * Fetches the referral history for a user.
 * @param userId The ID of the user whose referrals to fetch.
 * @returns A promise resolving to an array of referral records.
 */
export async function getReferralHistory(userId: string): Promise<Referral[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return referrals.filter(r => r.referringUserId === userId);
}

/**
 * Simulates applying a referral code during signup.
 * In a real app, this would happen server-side during user creation.
 * @param referredUserId The ID of the new user signing up.
 * @param referralCode The referral code entered.
 * @param referredUserName The name of the new user (optional).
 * @returns A promise resolving to true if the code was valid and applied, false otherwise.
 */
export async function applyReferralCode(referredUserId: string, referralCode: string, referredUserName?: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Find the user whose referral code this is
    const referringUserEntry = Object.entries(userGamificationData).find(([_, data]) => data.referralCode === referralCode.toUpperCase());

    if (!referringUserEntry) {
        console.warn(`Referral code ${referralCode} not found.`);
        return false; // Code not valid
    }

    const referringUserId = referringUserEntry[0];

    if (referringUserId === referredUserId) {
        console.warn(`User ${referredUserId} cannot refer themselves.`);
        return false; // Cannot refer self
    }

    // Check if this user was already referred
    if (referrals.some(r => r.referredUserId === referredUserId)) {
        console.warn(`User ${referredUserId} was already referred.`);
        return false; // Already referred
    }

    // Record the successful referral
    const newReferral: Referral = {
        referringUserId,
        referredUserId,
        referredUserName,
        signupTimestamp: new Date().toISOString(),
        bonusAwarded: false, // Bonus awarded after first action (e.g., parking)
    };
    referrals.push(newReferral);
    console.log(`Recorded referral: ${referringUserId} referred ${referredUserId}`);

    // Optional: Give the new user an initial bonus for using a code
    await awardPoints(referredUserId, 25, "Signup Referral Bonus"); // Example: 25 points for signing up with code

    return true;
}

/**
 * Simulates awarding a bonus to the referrer after the referred user takes an action (e.g., first parking).
 * @param referredUserId The ID of the user who completed the action.
 */
export async function processReferralBonus(referredUserId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const referral = referrals.find(r => r.referredUserId === referredUserId && !r.bonusAwarded);
    if (referral) {
        const referringUserId = referral.referringUserId;
        const bonusPoints = 50; // Example bonus amount

        // Award points to referrer
        await awardPoints(referringUserId, bonusPoints, `Bonus for referring ${referral.referredUserName || referredUserId}`);
        // Award badge to referrer
        await awardBadge(referringUserId, 'badge_referrer');

        // Update referral record
        referral.bonusAwarded = true;

        // Update referrer's completed count
        if (userGamificationData[referringUserId]) {
             userGamificationData[referringUserId].referralsCompleted = (userGamificationData[referringUserId].referralsCompleted || 0) + 1;
        }

        console.log(`Awarded ${bonusPoints} points and badge to ${referringUserId} for referring ${referredUserId}.`);
    }
}

/**
 * Simulates applying a promo code.
 * In a real app, this would check validity, usage limits, applicability, etc.
 * @param promoCode The promo code entered.
 * @param userId The ID of the user applying the code.
 * @param context Optional context (e.g., 'parking_fee', 'pass_purchase', 'top_up')
 * @returns A promise resolving to an object indicating success and the discount/bonus details, or failure.
 */
export async function applyPromoCode(promoCode: string, userId: string, context?: string): Promise<{ success: boolean; message: string; discountAmount?: number; pointsAwarded?: number }> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const codeUpper = promoCode.toUpperCase();

    // Mock promo codes
    if (codeUpper === 'WELCOME10') {
        // Award points directly (example)
        const points = 10;
        await awardPoints(userId, points, "Promo Code: WELCOME10");
        return { success: true, message: `Promo code applied! ${points} bonus points added to your account.`, pointsAwarded: points };
    } else if (codeUpper === 'PARKFREE5') {
        // Apply discount to next parking (example, needs integration with cost calculation)
        const discount = 5.00; // Example: K 5.00 discount
        return { success: true, message: `Promo code applied! K ${discount.toFixed(2)} discount will be applied to your next parking session.`, discountAmount: discount };
    } else if (codeUpper === 'SUMMER24' && context === 'pass_purchase') {
        // Specific discount for pass purchase (needs integration)
        const discount = 10.00;
        return { success: true, message: `Promo code applied! K ${discount.toFixed(2)} discount applied to pass purchase.`, discountAmount: discount };
    }

    return { success: false, message: "Invalid or expired promo code." };
}
