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
 * Represents a points transfer transaction.
 */
export interface PointsTransaction {
    id: string;
    timestamp: string;
    senderId: string;
    recipientId: string;
    points: number;
    type: 'sent' | 'received';
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


// --- Mock Data Store ---
// In a real app, this data would be stored in a database linked to the user ID.
let userGamificationData: Record<string, UserGamification> = {
    // Example data for a user (keys would be actual user IDs)
    'user_abc123': {
        points: 150,
        badges: [
            { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles', earnedDate: '2024-07-28' },
            { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Flag', earnedDate: '2024-07-29' }, // Changed icon to Flag
        ],
        isCarpoolEligible: false,
        parkingExtensionsUsed: 1, // Example: used one extension
    },
     'user_def456': { // Example Premium user
        points: 50,
        badges: [],
        isCarpoolEligible: true,
        parkingExtensionsUsed: 0, // Premium users might have a higher limit or unlimited (logic handled elsewhere)
    },
     // Add a sample attendant user's gamification data if needed
     'attendant_001': { points: 10, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0 },
     // Add a user explicitly marked as Premium role (for testing role checks)
      'user_premium_test': { points: 1000, badges: [], isCarpoolEligible: true, parkingExtensionsUsed: 0 },
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
     'user_abc123': [],
     'user_def456': [],
};


// Available badges definition (could be stored elsewhere)
const availableBadges: Omit<UserBadge, 'earnedDate'>[] = [
     { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles' },
     { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Flag' }, // Changed icon to Flag
     { id: 'badge_frequent_parker', name: 'Frequent Parker', description: 'Completed 5 reservations.', iconName: 'Award' },
     { id: 'badge_carpool_champ', name: 'Carpool Champ', description: 'Enabled carpooling benefits.', iconName: 'Users' },
];


// --- Mock Service Functions ---

/**
 * Fetches the gamification status (points, badges, carpool status) for a user.
 * @param userId The ID of the user.
 * @returns A promise resolving to the user's gamification data.
 */
export async function getUserGamification(userId: string): Promise<UserGamification> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    // Return existing data or default if user not found
    const data = userGamificationData[userId] || { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0 };
    // Ensure parkingExtensionsUsed is initialized
    if (data.parkingExtensionsUsed === undefined) {
        data.parkingExtensionsUsed = 0;
    }
    return data;
}

/**
 * Increments the parking extension counter for a user.
 * In a real app, this might have limits based on subscription or time period.
 * @param userId The ID of the user.
 * @returns A promise resolving to the updated number of extensions used.
 */
export async function incrementParkingExtensions(userId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    if (!userGamificationData[userId]) {
        userGamificationData[userId] = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0 };
    }
    userGamificationData[userId].parkingExtensionsUsed = (userGamificationData[userId].parkingExtensionsUsed || 0) + 1;
    console.log(`Incremented parking extensions for user ${userId}. Total used: ${userGamificationData[userId].parkingExtensionsUsed}`);
    return userGamificationData[userId].parkingExtensionsUsed!;
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
 * Awards points to a user.
 * @param userId The ID of the user.
 * @param pointsToAdd The number of points to add.
 * @returns A promise resolving to the updated total points.
 */
export async function awardPoints(userId: string, pointsToAdd: number): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate delay
    if (!userGamificationData[userId]) {
        userGamificationData[userId] = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0 };
    }
    userGamificationData[userId].points += pointsToAdd;
    console.log(`Awarded ${pointsToAdd} points to user ${userId}. New total: ${userGamificationData[userId].points}`);
    return userGamificationData[userId].points;
}

/**
 * Awards a specific badge to a user if they haven't earned it already.
 * @param userId The ID of the user.
 * @param badgeId The ID of the badge to award.
 * @returns A promise resolving to true if the badge was newly awarded, false otherwise.
 */
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay
    if (!userGamificationData[userId]) {
        userGamificationData[userId] = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0 };
    }

    const alreadyHasBadge = userGamificationData[userId].badges.some(b => b.id === badgeId);
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
    userGamificationData[userId].badges.push(newBadge);
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
    if (!userGamificationData[userId]) {
        userGamificationData[userId] = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0 };
    }
    userGamificationData[userId].isCarpoolEligible = isEligible;
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

    const senderData = userGamificationData[senderId];
    const recipientData = userGamificationData[recipientId];

    if (!senderData) {
        throw new Error("Sender not found.");
    }
    if (!recipientData) {
         // Optionally create recipient if they don't exist in gamification yet
         userGamificationData[recipientId] = { points: 0, badges: [], isCarpoolEligible: false, parkingExtensionsUsed: 0 };
         // throw new Error("Recipient not found.");
    }

    if (senderData.points < pointsToTransfer) {
        throw new Error(`Insufficient points. You only have ${senderData.points}.`);
    }

    // Perform the transfer
    senderData.points -= pointsToTransfer;
    userGamificationData[recipientId].points += pointsToTransfer;

    // Record the transaction (optional)
    const timestamp = new Date().toISOString();
    const transactionId = `pts_txn_${Date.now()}`;
    const senderTx: PointsTransaction = { id: transactionId + '_s', timestamp, senderId, recipientId, points: pointsToTransfer, type: 'sent' };
    const recipientTx: PointsTransaction = { id: transactionId + '_r', timestamp, senderId, recipientId, points: pointsToTransfer, type: 'received' };

    if (!pointsTransactions[senderId]) pointsTransactions[senderId] = [];
    if (!pointsTransactions[recipientId]) pointsTransactions[recipientId] = [];
    pointsTransactions[senderId].push(senderTx);
    pointsTransactions[recipientId].push(recipientTx);


    console.log(`Transferred ${pointsToTransfer} points from ${senderId} to ${recipientId}.`);
    console.log(`Sender new balance: ${senderData.points}. Recipient new balance: ${userGamificationData[recipientId].points}`);

    // Return sender's transaction for receipt purposes
    return { senderNewPoints: senderData.points, recipientNewPoints: userGamificationData[recipientId].points, transaction: senderTx };
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
         name: `User ${id.substring(0, 5)} (mock)`, // Replace with actual name lookup later
     }));
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