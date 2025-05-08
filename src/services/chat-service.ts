// src/services/chat-service.ts
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp, // Ensure Timestamp is imported
  doc,
  setDoc,
  getDocs,
  Unsubscribe,
  updateDoc,
  getDoc,
  arrayUnion,
  limit,
} from 'firebase/firestore';
import { firestore } from './firebase-config'; // Ensure this points to your Firebase config
import type { UserRole } from './user-service';

export interface ChatMessage {
  id?: string; // Firestore ID, optional for new messages
  conversationId: string;
  senderId: string;
  senderName: string; // Denormalized for display
  senderRole?: UserRole; // Optional: role of the sender
  text: string;
  timestamp: Timestamp;
  readBy?: string[]; // Array of user IDs who have read the message
}

export interface ConversationParticipant {
  userId: string;
  userName: string; // Denormalized
  userAvatarUrl?: string; // Denormalized
  userRole?: UserRole;
}
export interface ChatConversation {
  id: string; // Firestore ID - ensure it's always present
  participantIds: string[]; // IDs of users in the conversation
  participants: ConversationParticipant[]; // Denormalized participant details
  lastMessageText?: string;
  lastMessageTimestamp?: Timestamp;
  lastMessageSenderId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Optional: context for the chat, e.g., about a specific lot or reservation
  context?: {
    type: 'lot_inquiry' | 'reservation_issue' | 'general_support' | 'direct_message';
    relatedId?: string; // e.g., lotId or reservationId
  };
  unreadCounts?: { [userId: string]: number }; // e.g., { 'user1': 2, 'user2': 0 }
}

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Generates a unique and consistent conversation ID between two users.
 * @param userId1 First user ID.
 * @param userId2 Second user ID.
 * @returns A sorted, concatenated string representing the conversation ID.
 */
export const generateConversationId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

/**
 * Creates a new chat conversation or returns an existing one between two users.
 * If context is provided, it will be added to the conversation.
 *
 * @param initiator The user initiating the chat.
 * @param recipient The user receiving the chat invitation.
 * @param context Optional context for the conversation.
 * @returns The full ChatConversation object (newly created or existing).
 */
export async function createOrGetConversation(
  initiator: ConversationParticipant,
  recipient: ConversationParticipant,
  context?: ChatConversation['context']
): Promise<ChatConversation> {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot create or get conversation.");
    throw new Error("Chat service unavailable: Firestore not initialized.");
  }
  if (!initiator || !initiator.userId || !recipient || !recipient.userId) {
      throw new Error("Initiator and recipient user IDs are required.");
  }
  const conversationId = generateConversationId(initiator.userId, recipient.userId);
  const conversationRef = doc(firestore, CONVERSATIONS_COLLECTION, conversationId);

  const conversationSnap = await getDoc(conversationRef);

  if (conversationSnap.exists()) {
    const existingData = conversationSnap.data() as ChatConversation;
    // Conversation exists, potentially update context if it's new or different
    if (context && JSON.stringify(context) !== JSON.stringify(existingData.context)) {
      await updateDoc(conversationRef, {
        context: context,
        updatedAt: Timestamp.now(),
      });
      return { ...existingData, context, updatedAt: Timestamp.now() }; // Return updated data
    }
    return existingData;
  } else {
    // Create new conversation
    const newConversation: ChatConversation = {
      id: conversationId, // Ensure ID is set
      participantIds: [initiator.userId, recipient.userId],
      participants: [initiator, recipient],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      context: context,
      unreadCounts: { [initiator.userId]: 0, [recipient.userId]: 0 },
      // lastMessage fields will be undefined initially
    };
    await setDoc(conversationRef, newConversation);
    return newConversation;
  }
}

/**
 * Sends a message in a given conversation.
 * @param conversationId The ID of the conversation.
 * @param senderId The ID of the user sending the message.
 * @param senderName The name of the user sending the message.
 * @param senderRole The role of the sender (optional).
 * @param text The message text.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: UserRole | undefined,
  text: string
): Promise<void> {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot send message.");
    throw new Error("Chat service unavailable: Firestore not initialized.");
  }
  if (!text.trim()) throw new Error('Message text cannot be empty.');

  const messagesColRef = collection(firestore, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION);
  const newMessageData: Omit<ChatMessage, 'id'> = { // Explicitly Omit 'id'
    conversationId,
    senderId,
    senderName,
    senderRole,
    text,
    timestamp: Timestamp.now(),
    readBy: [senderId],
  };
  await addDoc(messagesColRef, newMessageData);

  const conversationRef = doc(firestore, CONVERSATIONS_COLLECTION, conversationId);
  const conversationSnap = await getDoc(conversationRef);
  if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data() as ChatConversation;
      const newUnreadCounts = { ...(conversationData.unreadCounts || {}) };
      
      // Increment unread count for all other participants
      conversationData.participantIds.forEach(pid => {
          if (pid !== senderId) {
              newUnreadCounts[pid] = (newUnreadCounts[pid] || 0) + 1;
          }
      });

      await updateDoc(conversationRef, {
        lastMessageText: text,
        lastMessageTimestamp: newMessageData.timestamp,
        lastMessageSenderId: senderId,
        updatedAt: newMessageData.timestamp,
        unreadCounts: newUnreadCounts,
      });
  } else {
      console.warn(`Conversation ${conversationId} not found while trying to update last message.`);
  }
}

/**
 * Subscribes to messages in a conversation.
 * @param conversationId The ID of the conversation.
 * @param callback Function to call with new messages or an error.
 * @returns An unsubscribe function, or a no-op function if Firestore is not initialized.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: ChatMessage[], error?: Error) => void
): Unsubscribe {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot subscribe to messages.");
    callback([], new Error("Chat service unavailable: Firestore not initialized."));
    return () => {};
  }
  const messagesQuery = query(
    collection(firestore, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(messagesQuery, (querySnapshot) => {
    const messages = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as ChatMessage));
    callback(messages);
  }, (error) => {
    console.error(`Error listening to messages for conversation ${conversationId}:`, error);
    callback([], error);
  });
}

/**
 * Subscribes to a user's conversations.
 * @param userId The ID of the user.
 * @param callback Function to call with the user's conversations or an error.
 * @returns An unsubscribe function, or a no-op function if Firestore is not initialized.
 */
export function subscribeToUserConversations(
  userId: string,
  callback: (conversations: ChatConversation[], error?: Error) => void
): Unsubscribe {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot subscribe to user conversations.");
    callback([], new Error("Chat service unavailable: Firestore not initialized."));
    return () => {};
  }
  const conversationsQuery = query(
    collection(firestore, CONVERSATIONS_COLLECTION),
    where('participantIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(conversationsQuery, (querySnapshot) => {
    const conversations = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id, // Ensure ID is included from the document snapshot ID
      ...docSnap.data(),
    } as ChatConversation));
    callback(conversations);
  }, (error) => {
    console.error(`Error listening to conversations for user ${userId}:`, error);
    callback([], error);
  });
}

/**
 * Marks messages in a conversation as read by a user.
 * @param conversationId The ID of the conversation.
 * @param userId The ID of the user reading the messages.
 */
export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot mark messages as read.");
    throw new Error("Chat service unavailable: Firestore not initialized.");
  }
  const conversationRef = doc(firestore, CONVERSATIONS_COLLECTION, conversationId);
  
  try {
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
        const conversationData = conversationSnap.data() as ChatConversation;
        const currentUnreadCount = conversationData.unreadCounts?.[userId] || 0;

        if (currentUnreadCount > 0) {
            const newUnreadCounts = { ...(conversationData.unreadCounts || {}) };
            newUnreadCounts[userId] = 0;

            await updateDoc(conversationRef, {
                unreadCounts: newUnreadCounts,
                // Optionally, update each message individually (can be write-heavy)
                // For performance, often just updating the conversation-level unread count is sufficient
            });
            console.log(`Marked conversation ${conversationId} as read for user ${userId}. Unread count reset.`);
        } else {
            console.log(`Conversation ${conversationId} already marked as read or no unread messages for user ${userId}.`);
        }
    } else {
         console.warn(`Conversation ${conversationId} not found for marking messages as read.`);
    }
  } catch (error) {
     console.error(`Error marking messages as read for conversation ${conversationId}, user ${userId}:`, error);
     // Optionally re-throw or handle specific errors
  }
}

/**
 * Fetches a list of mock users. In a real app, this would search your user database.
 * @param currentUserId The ID of the current user, to exclude them from the list.
 * @returns A promise resolving to an array of user objects.
 */
export async function getMockUsersForChat(currentUserId?: string): Promise<ConversationParticipant[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  // This is mock data. Replace with actual user fetching logic.
  // Example: Fetch users from your authentication system or user profiles collection.
  const allMockUsers: ConversationParticipant[] = [
    { userId: 'admin_support_01', userName: 'Carpso Support', userRole: 'Admin', userAvatarUrl: `https://picsum.photos/seed/support/40/40` },
    { userId: 'owner_lot_A', userName: 'Downtown Garage Owner', userRole: 'ParkingLotOwner', userAvatarUrl: `https://picsum.photos/seed/owner_A/40/40` },
    { userId: 'owner_lot_B', userName: 'Airport Lot B Manager', userRole: 'ParkingLotOwner', userAvatarUrl: `https://picsum.photos/seed/owner_B/40/40` },
    { userId: 'user_sample_1', userName: 'John Doe', userRole: 'User', userAvatarUrl: `https://picsum.photos/seed/john_d/40/40` },
    { userId: 'user_sample_2', userName: 'Jane Smith', userRole: 'User', userAvatarUrl: `https://picsum.photos/seed/jane_s/40/40` },
    { userId: 'attendant_001', userName: 'Parking Attendant (Lot A)', userRole: 'ParkingAttendant', userAvatarUrl: `https://picsum.photos/seed/attend_A/40/40` },
  ];
  return currentUserId ? allMockUsers.filter(user => user.userId !== currentUserId) : allMockUsers;
}
