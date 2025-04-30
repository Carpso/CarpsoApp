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
}

// --- Mock Data Store ---
// In a real app, this data would be stored in a database linked to the user ID.
const userGamificationData: Record<string, UserGamification> = {
    // Example data for a user (keys would be actual user IDs)
    'user_abc123': {
        points: 150,
        badges: [
            { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles', earnedDate: '2024-07-28' },
            { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Megaphone', earnedDate: '2024-07-29' },
        ],
        isCarpoolEligible: false,
    },
};

// Available badges definition (could be stored elsewhere)
const availableBadges: Omit<UserBadge, 'earnedDate'>[] = [
     { id: 'badge_first_booking', name: 'First Booking', description: 'Completed your first parking reservation.', iconName: 'Sparkles' },
     { id: 'badge_reporter', name: 'Issue Reporter', description: 'Reported a parking spot issue.', iconName: 'Megaphone' },
     { id: 'badge_frequent_parker', name: 'Frequent Parker', description: 'Completed 5 reservations.', iconName: 'Award' }, // Assuming 'Award' icon exists
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
    return userGamificationData[userId] || { points: 0, badges: [], isCarpoolEligible: false };
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
        userGamificationData[userId] = { points: 0, badges: [], isCarpoolEligible: false };
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
        userGamificationData[userId] = { points: 0, badges: [], isCarpoolEligible: false };
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
        userGamificationData[userId] = { points: 0, badges: [], isCarpoolEligible: false };
    }
    userGamificationData[userId].isCarpoolEligible = isEligible;
    console.log(`Set carpool eligibility for user ${userId} to ${isEligible}.`);

    // Potentially award carpool badge
    if (isEligible) {
        await awardBadge(userId, 'badge_carpool_champ');
    }
    return true;
}

// Add more functions as needed, e.g., getLeaderboard
