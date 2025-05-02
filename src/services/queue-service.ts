// src/services/queue-service.ts

/**
 * Represents a user waiting in a queue for a specific spot.
 */
export interface QueueEntry {
  userId: string;
  spotId: string;
  queueTimestamp: string; // ISO timestamp when the user joined the queue
  notified: boolean; // Whether the user has been notified it's their turn
}

// Mock data store for queues (spotId -> array of QueueEntry)
let spotQueues: Record<string, QueueEntry[]> = {};
// Mock store for user positions (userId -> array of {spotId, position})
let userQueuePositions: Record<string, { spotId: string; position: number }[]> = {};

/**
 * Simulates joining a queue for a specific parking spot.
 * @param userId The ID of the user joining the queue.
 * @param spotId The ID of the spot being queued for.
 * @returns A promise resolving to the user's position in the queue (1-based) or null if already in queue.
 */
export async function joinQueue(userId: string, spotId: string): Promise<number | null> {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay

  if (!spotQueues[spotId]) {
    spotQueues[spotId] = [];
  }

  // Check if user is already in the queue for this spot
  if (spotQueues[spotId].some(entry => entry.userId === userId)) {
    console.log(`User ${userId} already in queue for spot ${spotId}`);
    return null; // Indicate already in queue
  }

  const newEntry: QueueEntry = {
    userId,
    spotId,
    queueTimestamp: new Date().toISOString(),
    notified: false,
  };
  spotQueues[spotId].push(newEntry);

  const position = spotQueues[spotId].length;
  updateUserQueuePosition(userId, spotId, position); // Update user's position cache

  console.log(`User ${userId} joined queue for spot ${spotId} at position ${position}`);
  return position;
}

/**
 * Simulates leaving a queue for a specific parking spot.
 * @param userId The ID of the user leaving the queue.
 * @param spotId The ID of the spot queue to leave.
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function leaveQueue(userId: string, spotId: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 150)); // Simulate delay

  if (!spotQueues[spotId]) {
    return false; // Queue doesn't exist
  }

  const initialLength = spotQueues[spotId].length;
  spotQueues[spotId] = spotQueues[spotId].filter(entry => entry.userId !== userId);

  if (spotQueues[spotId].length < initialLength) {
    console.log(`User ${userId} left queue for spot ${spotId}`);
    // Remove from user's position cache
    if (userQueuePositions[userId]) {
        userQueuePositions[userId] = userQueuePositions[userId].filter(p => p.spotId !== spotId);
    }
    // Update positions for remaining users in the queue
    spotQueues[spotId].forEach((entry, index) => {
        updateUserQueuePosition(entry.userId, spotId, index + 1);
    });
    return true;
  }

  return false; // User wasn't in the queue
}

/**
 * Simulates getting the queues a user is currently in and their position.
 * @param userId The ID of the user.
 * @returns A promise resolving to an array of objects containing spotId and position.
 */
export async function getUserQueueStatus(userId: string): Promise<{ spotId: string; position: number }[]> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
    return userQueuePositions[userId] || [];
}

/**
 * Simulates getting the next user in the queue when a spot becomes free.
 * Marks the user as notified. In a real system, this would trigger a notification.
 * @param spotId The ID of the spot that became free.
 * @returns A promise resolving to the QueueEntry of the next user, or null if queue is empty.
 */
export async function notifyNextInQueue(spotId: string): Promise<QueueEntry | null> {
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay

  if (!spotQueues[spotId] || spotQueues[spotId].length === 0) {
    return null; // Queue is empty
  }

  const nextUserEntry = spotQueues[spotId][0];

  // Check if already notified (prevent re-notification within a short time?)
  if (nextUserEntry.notified) {
      console.log(`User ${nextUserEntry.userId} already notified for spot ${spotId}`);
      // Maybe implement a timeout before allowing re-notification
      return nextUserEntry; // Return the entry anyway
  }

  nextUserEntry.notified = true;
  console.log(`Notifying user ${nextUserEntry.userId} that spot ${spotId} is available.`);

  // In a real app: Trigger push notification, SMS, etc.

  // Optional: Remove the user from the queue after notification or after a timeout if they don't reserve.
  // For now, we leave them but mark as notified. They need to explicitly leave or reserve.

  return nextUserEntry;
}

/**
 * Removes the user at the front of the queue (presumably after they reserve or timeout).
 * Also updates positions for remaining users.
 * @param spotId The ID of the spot queue.
 * @returns A promise resolving to the entry that was removed, or null.
 */
export async function removeFirstFromQueue(spotId: string): Promise<QueueEntry | null> {
     await new Promise(resolve => setTimeout(resolve, 150)); // Simulate delay
     if (!spotQueues[spotId] || spotQueues[spotId].length === 0) {
        return null;
     }
     const removedEntry = spotQueues[spotId].shift(); // Remove the first user
     if (removedEntry) {
         console.log(`Removed user ${removedEntry.userId} from front of queue for ${spotId}`);
          // Remove from user's position cache
          if (userQueuePositions[removedEntry.userId]) {
             userQueuePositions[removedEntry.userId] = userQueuePositions[removedEntry.userId].filter(p => p.spotId !== spotId);
         }
          // Update positions for remaining users
         spotQueues[spotId].forEach((entry, index) => {
             updateUserQueuePosition(entry.userId, spotId, index + 1);
         });
     }
     return removedEntry || null;
}

// Helper function to update the user's queue position cache
function updateUserQueuePosition(userId: string, spotId: string, position: number): void {
    if (!userQueuePositions[userId]) {
        userQueuePositions[userId] = [];
    }
    const existingIndex = userQueuePositions[userId].findIndex(p => p.spotId === spotId);
    if (existingIndex !== -1) {
        userQueuePositions[userId][existingIndex].position = position;
    } else {
        userQueuePositions[userId].push({ spotId, position });
    }
    // Sort positions? Maybe not necessary.
}

/**
 * Gets the current queue length for a spot.
 * @param spotId The ID of the spot.
 * @returns A promise resolving to the number of users in the queue.
 */
export async function getQueueLength(spotId: string): Promise<number> {
     await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
     return spotQueues[spotId]?.length || 0;
}
