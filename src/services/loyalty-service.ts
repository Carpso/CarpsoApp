// src/services/loyalty-service.ts

/**
 * Interface representing a linked loyalty program for a user.
 */
export interface LinkedLoyaltyProgram {
  id: string; // Unique ID for this linkage
  userId: string;
  programName: string; // e.g., "GroceryMart Rewards", "AirMiles Zambia"
  membershipId: string; // User's ID/number within that program
  linkedDate: string; // ISO timestamp when linked
  // Optional: Store points balance from the external program? (Might be complex to keep updated)
  // externalPointsBalance?: number;
}

// --- Mock Data Store ---
// In a real app, this data would be stored securely, possibly encrypted,
// and interactions would involve calling the loyalty partner's API.
let linkedPrograms: Record<string, LinkedLoyaltyProgram[]> = {
    'user_abc123': [
        { id: 'loy_1', userId: 'user_abc123', programName: 'GroceryMart Rewards', membershipId: 'GM123456', linkedDate: '2024-07-01T00:00:00Z' },
        { id: 'loy_2', userId: 'user_abc123', programName: 'AirMiles Zambia', membershipId: 'AM987654', linkedDate: '2024-06-15T00:00:00Z' },
    ],
    // Add more users as needed
};

/**
 * Fetches the loyalty programs linked by a specific user.
 * @param userId The ID of the user.
 * @returns A promise resolving to an array of linked loyalty programs.
 */
export async function getLinkedLoyaltyPrograms(userId: string): Promise<LinkedLoyaltyProgram[]> {
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate delay
    console.log(`Fetching linked loyalty programs for user ${userId}`);
    return linkedPrograms[userId] || [];
}

/**
 * Simulates linking a new external loyalty program to a user's Carpso account.
 * In a real application, this would involve:
 * 1. Securely collecting the user's credentials/membership ID for the external program.
 * 2. Calling the external loyalty program's API to validate the credentials.
 * 3. Storing the linkage information securely if validation is successful.
 *
 * @param userId The ID of the Carpso user.
 * @param programName The name of the external loyalty program.
 * @param membershipId The user's membership ID in the external program.
 * @returns A promise resolving to the newly linked program details, or null if linking failed.
 */
export async function linkLoyaltyProgram(userId: string, programName: string, membershipId: string): Promise<LinkedLoyaltyProgram | null> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API validation delay
    console.log(`Simulating linking loyalty program "${programName}" (ID: ${membershipId}) for user ${userId}`);

    // --- Mock Validation Logic ---
    // Replace with actual API call to the loyalty partner
    const validationSuccess = Math.random() > 0.2; // 80% success rate simulation
    if (!validationSuccess) {
        console.warn(`Failed to validate loyalty membership for ${programName} / ${membershipId}`);
        return null;
    }
    // --- End Mock Validation ---

    // Check if already linked (simple check, real app might need more robust check)
    if (linkedPrograms[userId]?.some(p => p.programName === programName && p.membershipId === membershipId)) {
        console.log(`Program "${programName}" already linked for user ${userId}`);
        // Optionally return the existing link or null/error
        return linkedPrograms[userId].find(p => p.programName === programName && p.membershipId === membershipId) || null;
    }


    const newLink: LinkedLoyaltyProgram = {
        id: `loy_${Date.now()}`,
        userId,
        programName,
        membershipId,
        linkedDate: new Date().toISOString(),
    };

    if (!linkedPrograms[userId]) {
        linkedPrograms[userId] = [];
    }
    linkedPrograms[userId].push(newLink);
    console.log(`Successfully linked program "${programName}" for user ${userId}`);
    return newLink;
}

/**
 * Simulates unlinking an external loyalty program from a user's Carpso account.
 * @param userId The ID of the Carpso user.
 * @param linkId The unique ID of the linkage record to remove.
 * @returns A promise resolving to true if unlinking was successful, false otherwise.
 */
export async function unlinkLoyaltyProgram(userId: string, linkId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    console.log(`Simulating unlinking loyalty program (Link ID: ${linkId}) for user ${userId}`);

    if (!linkedPrograms[userId]) {
        return false; // User has no linked programs
    }

    const initialLength = linkedPrograms[userId].length;
    linkedPrograms[userId] = linkedPrograms[userId].filter(p => p.id !== linkId);

    const success = linkedPrograms[userId].length < initialLength;
    if (success) {
        console.log(`Successfully unlinked program (Link ID: ${linkId}) for user ${userId}`);
    } else {
        console.warn(`Link ID ${linkId} not found for user ${userId}`);
    }
    return success;
}

/**
 * Placeholder function to get available loyalty programs Carpso integrates with.
 * @returns A promise resolving to an array of program names or objects.
 */
export async function getAvailableLoyaltyPartners(): Promise<{ name: string; /* other details? */ }[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    // In a real app, fetch this list from a configuration or backend service
    return [
        { name: 'GroceryMart Rewards' },
        { name: 'AirMiles Zambia' },
        { name: 'ShopRite Xtra Savings' },
        { name: 'Proflight ProRewards' },
    ];
}

// Potential future functions:
// - getExternalLoyaltyPoints(userId, linkId): Fetch points from partner API
// - redeemCarpsoPointsForExternal(userId, linkId, carpsoPoints): Convert Carpso points to partner points
// - redeemExternalPointsForCarpso(userId, linkId, externalPoints): Convert partner points to Carpso credit/points
