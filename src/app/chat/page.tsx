// src/app/chat/page.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppStateContext } from '@/context/AppStateProvider';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatView from '@/components/chat/ChatView';
import type { ChatConversation, ChatMessage, ConversationParticipant } from '@/services/chat-service';
import {
  subscribeToUserConversations,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  createOrGetConversation,
  getMockUsersForChat,
} from '@/services/chat-service';
import { AlertCircle, MessageSquareOff, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore'; // Added Timestamp import

export default function ChatPage() {
  const { isAuthenticated, userId, userName, userAvatarUrl, userRole, isOnline } = useContext(AppStateContext)!;
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<ConversationParticipant[]>([]);
  const [selectedUserToChat, setSelectedUserToChat] = useState<string>('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      toast({ title: "Authentication Required", description: "Please sign in to access chat.", variant: "destructive" });
      router.push('/'); // Redirect to home or login
      return;
    }

    setIsLoadingConversations(true);
    const unsubscribeConversations = subscribeToUserConversations(userId, (fetchedConversations) => {
      setConversations(fetchedConversations);
      setIsLoadingConversations(false);
      setError(null);

      // If a selected conversation is no longer in the list, deselect it
      if (selectedConversation && !fetchedConversations.find(c => c.id === selectedConversation.id)) {
          setSelectedConversation(null);
          setMessages([]);
      }
    });

    return () => {
      unsubscribeConversations();
    };
  }, [isAuthenticated, userId, router, toast, selectedConversation]);

  useEffect(() => {
    if (selectedConversation?.id && userId) {
      setIsLoadingMessages(true);
      const unsubscribeMessages = subscribeToMessages(selectedConversation.id, (fetchedMessages) => {
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);
        // Mark messages as read
        if (isOnline) {
            markMessagesAsRead(selectedConversation.id!, userId).catch(err => console.error("Failed to mark messages as read:", err));
        }
      });
      return () => unsubscribeMessages();
    } else {
      setMessages([]); // Clear messages if no conversation selected
    }
  }, [selectedConversation, userId, isOnline]);

  const handleSelectConversation = (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation?.id || !userId || !userName || !isOnline) {
        toast({ title: "Cannot Send Message", description: "Please select a conversation and ensure you are online.", variant: "destructive"});
        return;
    }
    try {
      await sendMessage(selectedConversation.id, userId, userName, userRole || undefined, text);
    } catch (err) {
      console.error('Failed to send message:', err);
      toast({ title: "Send Error", description: "Could not send message.", variant: "destructive"});
    }
  };

  const handleStartNewChat = async () => {
    if (!userId || !userName || !selectedUserToChat || !isOnline) {
        toast({ title: "Missing Information", description: "Please select a user to chat with and ensure you are online.", variant: "destructive"});
        return;
    }
    setIsCreatingConversation(true);
    try {
        const recipient = availableUsers.find(u => u.userId === selectedUserToChat);
        if (!recipient) {
            toast({ title: "User Not Found", variant: "destructive" });
            setIsCreatingConversation(false);
            return;
        }
        const initiator: ConversationParticipant = { userId, userName, userAvatarUrl: userAvatarUrl || undefined, userRole: userRole || undefined };
        const conversationId = await createOrGetConversation(initiator, recipient);

        // Find and select the new/existing conversation
        // This might take a moment for subscribeToUserConversations to update
        // A direct fetch might be better here or rely on the subscription update
        const existingOrNewConv = conversations.find(c => c.id === conversationId) ||
          {
            id: conversationId,
            participantIds: [userId, recipient.userId],
            participants: [initiator, recipient],
            createdAt: Timestamp.now(), // Use imported Timestamp
            updatedAt: Timestamp.now(), // Use imported Timestamp
            lastMessageText: undefined,
            lastMessageSenderId: undefined,
            lastMessageTimestamp: undefined,
            unreadCounts: { [initiator.userId]: 0, [recipient.userId]: 0 },
            // context is optional
          };
        setSelectedConversation(existingOrNewConv as ChatConversation); // Cast as ChatConversation

        setIsNewChatModalOpen(false);
        setSelectedUserToChat('');
        toast({ title: "Chat Started", description: `You can now chat with ${recipient.userName}`});
    } catch (err) {
        console.error("Failed to start new chat:", err);
        toast({ title: "Chat Error", description: "Could not start new conversation.", variant: "destructive"});
    } finally {
        setIsCreatingConversation(false);
    }
  };

   useEffect(() => {
    if (isNewChatModalOpen && isOnline && userId) {
      getMockUsersForChat(userId).then(users => setAvailableUsers(users));
    }
  }, [isNewChatModalOpen, isOnline, userId]);


  if (!isAuthenticated) {
      // This should ideally be handled by the effect redirecting,
      // but as a fallback or for initial server render:
      return (
         <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h1 className="text-xl font-semibold">Access Denied</h1>
              <p className="text-muted-foreground">Please sign in to use the chat feature.</p>
              <Button onClick={() => router.push('/')} className="mt-4">Go to Home</Button>
          </div>
      );
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem))] border-t"> {/* Use CSS variable for header height */}
      <ChatSidebar
        conversations={conversations}
        selectedConversationId={selectedConversation?.id || null}
        onSelectConversation={handleSelectConversation}
        isLoading={isLoadingConversations}
        currentUserId={userId || ''}
        onNewChat={() => setIsNewChatModalOpen(true)}
        isOnline={isOnline}
      />
      <div className="flex-1 flex flex-col bg-background">
        {selectedConversation ? (
          <ChatView
            conversation={selectedConversation}
            messages={messages}
            currentUserId={userId || ''}
            onSendMessage={handleSendMessage}
            isLoadingMessages={isLoadingMessages}
            isOnline={isOnline}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            {isLoadingConversations ? (
                <>
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Loading conversations...</p>
                </>
            ) : error ? (
                <>
                    <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                    <p className="text-destructive font-semibold">Error loading conversations</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </>
            ) : conversations.length > 0 ? (
                 <>
                    <MessageSquareOff className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm text-muted-foreground">Or start a new chat to begin messaging.</p>
                 </>
            ) : (
                 <>
                    <MessageSquareOff className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No conversations yet</p>
                    <p className="text-sm text-muted-foreground">Start a new chat to connect with support or parking lot owners.</p>
                    <Button onClick={() => setIsNewChatModalOpen(true)} className="mt-4" disabled={!isOnline}>
                       <UserPlus className="mr-2 h-4 w-4" /> Start New Chat
                    </Button>
                 </>
            )}
          </div>
        )}
      </div>

      <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a New Chat</DialogTitle>
            <DialogDescription>Select a user to start a conversation with.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedUserToChat} onValueChange={setSelectedUserToChat} disabled={isCreatingConversation || !isOnline}>
              <SelectTrigger>
                <SelectValue placeholder={!isOnline ? "Unavailable Offline" : "Select a user..."} />
              </SelectTrigger>
              <SelectContent>
                {!isOnline ? <SelectItem value="offline" disabled>Offline - User list unavailable</SelectItem> :
                availableUsers.length > 0 ? (
                    availableUsers.map(user => (
                        <SelectItem key={user.userId} value={user.userId}>
                            {user.userName} ({user.userRole || 'User'})
                        </SelectItem>
                    ))
                ) : (
                    <SelectItem value="no_users" disabled>No users available to chat.</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewChatModalOpen(false)} disabled={isCreatingConversation}>Cancel</Button>
            <Button onClick={handleStartNewChat} disabled={isCreatingConversation || !selectedUserToChat || !isOnline}>
              {isCreatingConversation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
