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
  serverTimestamp, // For server-generated timestamps
} from 'firebase/firestore';
import { firestore } from './firebase-config'; // Ensure this points to your Firebase config
import type { UserRole } from './user-service';

export interface ChatMessageReaction {
  [emoji: string]: string[]; // emoji: [userId, userId, ...]
}
export interface ChatMessage {
  id?: string; // Firestore ID, optional for new messages
  conversationId: string;
  senderId: string;
  senderName: string; // Denormalized for display
  senderRole?: UserRole; // Optional: role of the sender
  text: string;
  timestamp: Timestamp;
  readBy?: string[]; // Array of user IDs who have read the message
  reactions?: ChatMessageReaction; // For message reactions
  attachmentUrl?: string; // For file attachments
  attachmentType?: 'image' | 'file'; // Type of attachment
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
  // Optional: context for the chat
  context?: {
    type: 'lot_inquiry' | 'reservation_issue' | 'general_support' | 'direct_message' | 'group_chat';
    relatedId?: string; // e.g., lotId or reservationId
    groupName?: string; // For group chats
  };
  unreadCounts?: { [userId: string]: number };
  typing?: { [userId: string]: boolean }; // { userId: true/false }
  isGroupChat?: boolean; // Flag for group chats
}

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_SUBCOLLECTION = 'messages';

// Admin/Support User ID (predefined for contextual chat)
export const SUPPORT_USER_ID = 'admin_support_01'; // Make sure this ID exists in your mock or real users

/**
 * Generates a unique and consistent conversation ID.
 * For 1-on-1, it's sorted user IDs. For groups, it could be a new unique ID.
 * @param userIds Array of user IDs.
 * @returns A conversation ID string.
 */
export const generateConversationId = (userIds: string[]): string => {
  if (userIds.length === 2) {
    return userIds.sort().join('_');
  }
  // For group chats, generate a new unique ID (e.g., using Firestore's auto-ID capability elsewhere or a custom scheme)
  // For this simulation, we'll just concatenate and hash lightly if more than 2 for simplicity
  if (userIds.length > 2) {
    return `group_${userIds.sort().join('_').substring(0, 20)}_${Date.now()}`;
  }
  if (userIds.length === 1) { // Self-chat or note-to-self
    return `${userIds[0]}_self`;
  }
  throw new Error("Cannot generate conversation ID with no users.");
};

/**
 * Creates a new chat conversation or returns an existing one.
 *
 * @param initiator The user initiating the chat.
 * @param recipients An array of recipient participants.
 * @param context Optional context for the conversation.
 * @param isGroup Flag to indicate if this is a group chat.
 * @param groupName Optional name for the group chat.
 * @returns The full ChatConversation object (newly created or existing).
 */
export async function createOrGetConversation(
  initiator: ConversationParticipant,
  recipients: ConversationParticipant[],
  context?: ChatConversation['context'],
  isGroup: boolean = false,
  groupName?: string
): Promise<ChatConversation> {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot create or get conversation.");
    throw new Error("Chat service unavailable: Firestore not initialized.");
  }
  if (!initiator || !initiator.userId || !recipients || recipients.length === 0 || !recipients.every(r => r.userId)) {
      throw new Error("Initiator and at least one recipient user ID are required.");
  }

  const allParticipantUsers = [initiator, ...recipients];
  const allParticipantIds = allParticipantUsers.map(p => p.userId);

  // For 1-on-1 chats, use the standard ID generation. For group chats, we might need a new ID or a different strategy.
  // If it's a 1-on-1 chat and not explicitly marked as group, use the 2-party ID.
  const conversationId = (allParticipantIds.length === 2 && !isGroup)
                         ? generateConversationId([initiator.userId, recipients[0].userId])
                         : doc(collection(firestore, CONVERSATIONS_COLLECTION)).id; // Generate new ID for groups or if forced

  const conversationRef = doc(firestore, CONVERSATIONS_COLLECTION, conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (conversationSnap.exists()) {
    const existingData = conversationSnap.data() as ChatConversation;
    // Potentially update context or participants if needed
    let needsUpdate = false;
    const updates: Partial<ChatConversation> = { updatedAt: Timestamp.now() };

    if (context && JSON.stringify(context) !== JSON.stringify(existingData.context)) {
      updates.context = context;
      needsUpdate = true;
    }
    // Check if participants list needs updating (e.g., for adding someone to an existing 1-on-1 that becomes a group)
    // This logic can get complex for group member management, keeping it simple here.
    if (isGroup && existingData.participantIds.length < allParticipantIds.length) {
        updates.participantIds = Array.from(new Set([...existingData.participantIds, ...allParticipantIds]));
        updates.participants = allParticipantUsers; // Could be smarter, merging unique
        updates.isGroupChat = true;
        if(groupName) updates.context = { ...existingData.context, groupName, type: 'group_chat' };
        needsUpdate = true;
    }


    if (needsUpdate) {
      await updateDoc(conversationRef, updates);
      return { ...existingData, ...updates } as ChatConversation;
    }
    return existingData;
  } else {
    // Create new conversation
    const unreadCountsInit = allParticipantIds.reduce((acc, pid) => ({ ...acc, [pid]: 0 }), {});
    const newConversation: ChatConversation = {
      id: conversationId,
      participantIds: allParticipantIds,
      participants: allParticipantUsers,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      context: context || (isGroup ? { type: 'group_chat', groupName: groupName || 'Group Chat' } : { type: 'direct_message' }),
      unreadCounts: unreadCountsInit,
      typing: {},
      isGroupChat: isGroup || allParticipantIds.length > 2,
    };
    await setDoc(conversationRef, newConversation);
    return newConversation;
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: UserRole | undefined,
  text: string,
  attachmentUrl?: string,
  attachmentType?: 'image' | 'file'
): Promise<void> {
  if (!firestore) {
    console.error("Firestore is not initialized. Cannot send message.");
    throw new Error("Chat service unavailable: Firestore not initialized.");
  }
  if (!text.trim() && !attachmentUrl) throw new Error('Message text or attachment cannot be empty.');

  const messagesColRef = collection(firestore, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION);
  const newMessageData: Omit<ChatMessage, 'id'> = {
    conversationId,
    senderId,
    senderName,
    senderRole,
    text: text.trim(),
    timestamp: Timestamp.now(),
    readBy: [senderId],
    attachmentUrl,
    attachmentType,
  };
  await addDoc(messagesColRef, newMessageData);

  const conversationRef = doc(firestore, CONVERSATIONS_COLLECTION, conversationId);
  const conversationSnap = await getDoc(conversationRef);
  if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data() as ChatConversation;
      const newUnreadCounts = { ...(conversationData.unreadCounts || {}) };
      
      conversationData.participantIds.forEach(pid => {
          if (pid !== senderId) {
              newUnreadCounts[pid] = (newUnreadCounts[pid] || 0) + 1;
          }
      });

      await updateDoc(conversationRef, {
        lastMessageText: text ? (text.length > 50 ? text.substring(0, 47) + "..." : text) : (attachmentType || "Attachment"),
        lastMessageTimestamp: newMessageData.timestamp,
        lastMessageSenderId: senderId,
        updatedAt: newMessageData.timestamp,
        unreadCounts: newUnreadCounts,
        typing: { ...conversationData.typing, [senderId]: false } // Clear sender's typing indicator
      });

      // Conceptual: Send push notifications to other participants
      // conversationData.participantIds.forEach(pid => {
      //   if (pid !== senderId) {
      //     sendPushNotification(pid, `${senderName} sent a message`, text);
      //   }
      // });

  } else {
      console.warn(`Conversation ${conversationId} not found while trying to update last message.`);
  }
}

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
    orderBy('timestamp', 'asc'),
    limit(100) // Limit recent messages to improve performance initially
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
      id: docSnap.id,
      ...docSnap.data(),
    } as ChatConversation));
    callback(conversations);
  }, (error) => {
    console.error(`Error listening to conversations for user ${userId}:`, error);
    callback([], error);
  });
}

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
                [`unreadCounts.${userId}`]: 0 // More direct update
            });
            console.log(`Marked conversation ${conversationId} as read for user ${userId}. Unread count reset.`);
        } else {
            // console.log(`Conversation ${conversationId} already marked as read or no unread messages for user ${userId}.`);
        }
    } else {
         console.warn(`Conversation ${conversationId} not found for marking messages as read.`);
    }
  } catch (error) {
     console.error(`Error marking messages as read for conversation ${conversationId}, user ${userId}:`, error);
  }
}

/**
 * Fetches a list of mock users, simulating a search if query is provided.
 * @param currentUserId The ID of the current user, to exclude them from the list.
 * @param searchQuery Optional search query to filter users by name.
 * @returns A promise resolving to an array of user objects.
 */
export async function getMockUsersForChat(currentUserId?: string, searchQuery?: string): Promise<ConversationParticipant[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  const allMockUsers: ConversationParticipant[] = [
    { userId: SUPPORT_USER_ID, userName: 'Carpso Support', userRole: 'Admin', userAvatarUrl: `https://placehold.co/40x40.png?text=CS` },
    { userId: 'owner_lot_A', userName: 'Downtown Garage Owner', userRole: 'ParkingLotOwner', userAvatarUrl: `https://placehold.co/40x40.png?text=DO` },
    { userId: 'owner_lot_B', userName: 'Airport Lot B Manager', userRole: 'ParkingLotOwner', userAvatarUrl: `https://placehold.co/40x40.png?text=AM` },
    { userId: 'user_sample_1', userName: 'John Doe', userRole: 'User', userAvatarUrl: `https://placehold.co/40x40.png?text=JD` },
    { userId: 'user_sample_2', userName: 'Jane Smith', userRole: 'Premium', userAvatarUrl: `https://placehold.co/40x40.png?text=JS` },
    { userId: 'attendant_001', userName: 'Parking Attendant (Lot A)', userRole: 'ParkingAttendant', userAvatarUrl: `https://placehold.co/40x40.png?text=PA` },
  ];

  let filteredUsers = currentUserId ? allMockUsers.filter(user => user.userId !== currentUserId) : allMockUsers;

  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    filteredUsers = filteredUsers.filter(user => user.userName.toLowerCase().includes(lowerQuery));
  }

  return filteredUsers;
}

// --- Typing Indicators ---
export async function sendTypingIndicator(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
  if (!firestore) return;
  const conversationRef = doc(firestore, CONVERSATIONS_COLLECTION, conversationId);
  try {
    await updateDoc(conversationRef, {
      [`typing.${userId}`]: isTyping,
      updatedAt: serverTimestamp(), // Keep conversation fresh
    });
  } catch (error) {
    console.error("Error sending typing indicator:", error);
  }
}

// Subscription to typing indicators is handled by subscribing to the conversation document itself.

// --- Conceptual: Push Notifications (needs Firebase Functions) ---
// async function sendPushNotification(recipientUserId: string, title: string, body: string) {
//   console.log(`Simulating push notification to ${recipientUserId}: ${title} - ${body}`);
//   // In Firebase Functions:
//   // 1. Get recipient's FCM token from their user profile in Firestore.
//   // 2. Use Firebase Admin SDK to send a message:
//   //    admin.messaging().sendToDevice(token, { notification: { title, body } });
// }

// --- Message Reactions (Conceptual: would need UI and more logic) ---
export async function addReactionToMessage(conversationId: string, messageId: string, userId: string, emoji: string): Promise<void> {
  if (!firestore) return;
  const messageRef = doc(firestore, CONVERSATIONS_COLLECTION, conversationId, MESSAGES_SUBCOLLECTION, messageId);
  try {
    const messageSnap = await getDoc(messageRef);
    if (messageSnap.exists()) {
      const messageData = messageSnap.data() as ChatMessage;
      const newReactions = { ...(messageData.reactions || {}) };
      if (!newReactions[emoji]) {
        newReactions[emoji] = [];
      }
      if (!newReactions[emoji].includes(userId)) {
        newReactions[emoji].push(userId);
      } else {
        // User already reacted with this emoji, remove reaction (toggle)
        newReactions[emoji] = newReactions[emoji].filter(uid => uid !== userId);
        if (newReactions[emoji].length === 0) {
          delete newReactions[emoji];
        }
      }
      await updateDoc(messageRef, { reactions: newReactions });
    }
  } catch (error) {
    console.error("Error adding reaction:", error);
  }
}

// --- File Attachments (Conceptual: needs Firebase Storage and UI) ---
// async function uploadAttachment(file: File): Promise<string | null> {
//   if (!storage) return null;
//   const storageRef = ref(storage, `chat_attachments/${Date.now()}_${file.name}`);
//   try {
//     const snapshot = await uploadBytes(storageRef, file);
//     const downloadURL = await getDownloadURL(snapshot.ref);
//     return downloadURL;
//   } catch (error) {
//     console.error("Error uploading attachment:", error);
//     return null;
//   }
// }
// Then, when sending message, include attachmentUrl and attachmentType.
