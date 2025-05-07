// src/components/chat/ChatSidebar.tsx
import React from 'react';
import type { ChatConversation, ConversationParticipant } from '@/services/chat-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

interface ChatSidebarProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: ChatConversation) => void;
  isLoading: boolean;
  currentUserId: string;
  onNewChat: () => void;
  isOnline: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  isLoading,
  currentUserId,
  onNewChat,
  isOnline,
}) => {
  const getOtherParticipant = (conversation: ChatConversation): ConversationParticipant | undefined => {
    return conversation.participants?.find(p => p.userId !== currentUserId);
  };

  return (
    <div className="w-full md:w-80 border-r bg-muted/40 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
        <Button onClick={onNewChat} size="sm" className="w-full mt-2" disabled={!isOnline}>
          <UserPlus className="mr-2 h-4 w-4" /> New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-24 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : !isOnline && conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
                <WifiOff className="mx-auto h-8 w-8 mb-2" />
                Chat is unavailable offline.
            </div>
        ) : conversations.length === 0 ? (
           <div className="p-4 text-center text-sm text-muted-foreground">
             No conversations yet. <br/> Start a new chat.
           </div>
        ) : (
          conversations.map((conv) => {
            const otherParticipant = getOtherParticipant(conv);
            const lastMessageTime = conv.lastMessageTimestamp
              ? formatDistanceToNowStrict(conv.lastMessageTimestamp.toDate(), { addSuffix: true })
              : '';
            const unreadCount = conv.unreadCounts?.[currentUserId] || 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={cn(
                  'flex items-center w-full p-3 hover:bg-accent transition-colors text-left',
                  selectedConversationId === conv.id && 'bg-accent'
                )}
                disabled={!isOnline && selectedConversationId !== conv.id} // Allow viewing selected offline
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={otherParticipant?.userAvatarUrl || `https://picsum.photos/seed/${otherParticipant?.userId || 'default'}/40/40`} alt={otherParticipant?.userName} data-ai-hint="profile avatar" />
                  <AvatarFallback>{otherParticipant?.userName?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm truncate">{otherParticipant?.userName || 'Unknown User'}</h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{lastMessageTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessageSenderId === currentUserId ? "You: " : ""}
                        {conv.lastMessageText || 'No messages yet'}
                    </p>
                    {unreadCount > 0 && (
                        <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
