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
import { AlertCircle, MessageSquareOff, Loader2, UserPlus, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertTitle as AlertTitleSub, AlertDescription as AlertDescriptionSub } from '@/components/ui/alert';

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
  const [selectedUserToChatId, setSelectedUserToChatId] = useState<string>('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [isClientRender, setIsClientRender] = useState(false);

  useEffect(() => {
    setIsClientRender(true);
  }, []);

  useEffect(() => {
    if (!isClientRender) return;

    if (!isAuthenticated || !userId) {
      toast({ title: "Authentication Required", description: "Please sign in to access chat.", variant: "destructive" });
      router.push('/');
      return;
    }

    setIsLoadingConversations(true);
    setError(null);
    const unsubscribeConversations = subscribeToUserConversations(userId, (fetchedConversations, fetchError) => {
      if (fetchError) {
        console.error("Error fetching conversations:", fetchError);
        setError("Could not load conversations. Please check your connection.");
        setConversations([]);
      } else {
        setConversations(fetchedConversations);
        setError(null);
        if (selectedConversation) {
          const updatedSelectedConv = fetchedConversations.find(c => c.id === selectedConversation.id);
          if (updatedSelectedConv && JSON.stringify(updatedSelectedConv) !== JSON.stringify(selectedConversation)) {
            setSelectedConversation(updatedSelectedConv);
          } else if (!updatedSelectedConv) {
            setSelectedConversation(null);
            setMessages([]);
          }
        }
      }
      setIsLoadingConversations(false);
    });

    return () => {
      unsubscribeConversations();
    };
  }, [isClientRender, isAuthenticated, userId, router, toast, selectedConversation]);

  useEffect(() => {
    if (!isClientRender || !selectedConversation?.id || !userId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const unsubscribeMessages = subscribeToMessages(selectedConversation.id, (fetchedMessages, fetchError) => {
      if (fetchError) {
        console.error(`Error fetching messages for ${selectedConversation.id}:`, fetchError);
        toast({ title: "Message Error", description: "Could not load messages for this conversation.", variant: "destructive"});
        setMessages([]);
      } else {
        setMessages(fetchedMessages);
        if (isOnline && selectedConversation.unreadCounts?.[userId] && selectedConversation.unreadCounts[userId] > 0) {
          markMessagesAsRead(selectedConversation.id!, userId).catch(err => console.error("Failed to mark messages as read:", err));
        }
      }
      setIsLoadingMessages(false);
    });
    return () => unsubscribeMessages();
  }, [isClientRender, selectedConversation, userId, isOnline, toast]);

  const handleSelectConversation = (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    if (isOnline && conversation.unreadCounts?.[userId!] && conversation.unreadCounts[userId!] > 0) {
        markMessagesAsRead(conversation.id!, userId!).catch(err => console.error("Optimistic markRead failed:", err));
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation?.id || !userId || !userName || !isOnline) {
        toast({ title: "Cannot Send Message", description: "Please select a conversation and ensure you are online.", variant: "destructive"});
        return;
    }
    if (!text.trim()) return;

    try {
      await sendMessage(selectedConversation.id, userId, userName, userRole || undefined, text);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      toast({ title: "Send Error", description: err.message || "Could not send message.", variant: "destructive"});
    }
  };

  const handleStartNewChat = async () => {
    if (!userId || !userName || !selectedUserToChatId || !isOnline) {
        toast({ title: "Missing Information", description: "Please select a user to chat with and ensure you are online.", variant: "destructive"});
        return;
    }
    setIsCreatingConversation(true);
    try {
        const recipient = availableUsers.find(u => u.userId === selectedUserToChatId);
        if (!recipient) {
            toast({ title: "User Not Found", variant: "destructive" });
            setIsCreatingConversation(false);
            return;
        }
        const initiator: ConversationParticipant = { userId, userName, userAvatarUrl: userAvatarUrl || undefined, userRole: userRole || undefined };
        
        const conversation = await createOrGetConversation(initiator, recipient);
        
        setSelectedConversation(conversation);

        setIsNewChatModalOpen(false);
        setSelectedUserToChatId('');
        toast({ title: "Chat Ready", description: `You can now chat with ${recipient.userName}`});
    } catch (err: any) {
        console.error("Failed to start new chat:", err);
        toast({ title: "Chat Error", description: err.message || "Could not start new conversation.", variant: "destructive"});
    } finally {
        setIsCreatingConversation(false);
    }
  };

   useEffect(() => {
    if (!isClientRender || !isNewChatModalOpen || !isOnline || !userId) {
        setAvailableUsers([]);
        return;
    }
    setIsLoadingUsers(true);
    getMockUsersForChat(userId)
      .then(users => setAvailableUsers(users))
      .catch(err => {
          console.error("Error fetching users for new chat:", err);
          toast({title: "Error", description: "Could not load user list for new chat.", variant: "destructive"});
          setAvailableUsers([]);
      })
      .finally(() => setIsLoadingUsers(false));
  }, [isClientRender, isNewChatModalOpen, isOnline, userId, toast]);

  if (!isClientRender) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height,4rem))] border-t bg-muted/20 dark:bg-muted/5">
        <div className="w-full md:w-80 border-r flex flex-col h-full bg-sidebar text-sidebar-foreground p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-1">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
        </div>
        <div className="flex-1 flex flex-col bg-background items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground mt-2">Loading Chat...</p>
        </div>
      </div>
    );
  }

  // The redirection logic in the main useEffect will handle unauthenticated users
  // by redirecting them. This main return is for authenticated users or the brief moment
  // before redirection occurs.
  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem))] border-t bg-muted/20 dark:bg-muted/5">
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
        {!isOnline && (
            <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
                 <WifiOff className="h-4 w-4" />
                 <AlertTitleSub>You are offline</AlertTitleSub>
                 <AlertDescriptionSub>Chat functionality is limited. Messages may not send or receive until you reconnect.</AlertDescriptionSub>
            </Alert>
        )}
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
            {isLoadingConversations ? (
                <>
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                    <p className="text-muted-foreground">Loading conversations...</p>
                </>
            ) : error ? (
                <>
                    <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                    <p className="text-destructive font-semibold">Error loading conversations</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="mt-2">Retry</Button>
                </>
            ) : conversations.length > 0 ? (
                 <>
                    <MessageSquareOff className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">Select a conversation</p>
                    <p className="text-sm text-muted-foreground">Or start a new chat to begin messaging.</p>
                    <Button onClick={() => setIsNewChatModalOpen(true)} className="mt-2" disabled={!isOnline}>
                       <UserPlus className="mr-2 h-4 w-4" /> Start New Chat
                    </Button>
                 </>
            ) : (
                 <>
                    <MessageSquareOff className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg font-medium">No conversations yet</p>
                    <p className="text-sm text-muted-foreground">Start a new chat to connect with support or other users.</p>
                    <Button onClick={() => setIsNewChatModalOpen(true)} className="mt-2" disabled={!isOnline}>
                       <UserPlus className="mr-2 h-4 w-4" /> Start New Chat
                    </Button>
                 </>
            )}
          </div>
        )}
      </div>

      <Dialog open={isNewChatModalOpen} onOpenChange={setIsNewChatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a New Chat</DialogTitle>
            <DialogDescription>Select a user to start a conversation with. You can chat with support, parking lot owners, or other users.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingUsers && isOnline ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Loading users...
                </div>
            ) : !isOnline ? (
                 <Alert variant="warning" className="mb-4">
                     <WifiOff className="h-4 w-4" />
                     <AlertTitleSub>Offline</AlertTitleSub>
                     <AlertDescriptionSub>User list unavailable. Connect to the internet to start new chats.</AlertDescriptionSub>
                 </Alert>
            ) : (
                <Select value={selectedUserToChatId} onValueChange={setSelectedUserToChatId} disabled={isCreatingConversation || !isOnline}>
                  <SelectTrigger>
                    <SelectValue placeholder={"Select a user..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length > 0 ? (
                        availableUsers.map(user => (
                            <SelectItem key={user.userId} value={user.userId}>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={user.userAvatarUrl || `https://picsum.photos/seed/${user.userId}/30/30`} alt={user.userName} data-ai-hint="profile avatar small" />
                                        <AvatarFallback>{user.userName.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                    {user.userName} {user.userRole ? `(${user.userRole})` : ''}
                                </div>
                            </SelectItem>
                        ))
                    ) : (
                        <SelectItem value="no_users_placeholder" disabled>No users available to chat.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
            )}
          </div>
          <DialogFooter>
             <DialogClose asChild>
                 <Button variant="outline" disabled={isCreatingConversation}>Cancel</Button>
             </DialogClose>
            <Button onClick={handleStartNewChat} disabled={isCreatingConversation || !selectedUserToChatId || !isOnline}>
              {isCreatingConversation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
