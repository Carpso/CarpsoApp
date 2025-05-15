// src/components/chat/ChatSidebar.tsx
import React from 'react';
import type { ChatConversation, ConversationParticipant } from '@/services/chat-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { UserPlus, WifiOff, MessageSquareText, Loader2, Users } from 'lucide-react'; // Added Users for group
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { Badge } from '@/components/ui/badge';

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
  const getConversationDisplayDetails = (conversation: ChatConversation): { name: string; avatarUrl?: string; isOnline?: boolean } => {
    if (conversation.isGroupChat) {
      return {
        name: conversation.context?.groupName || conversation.participants.filter(p=>p.userId !== currentUserId).map(p => p.userName).join(', ') || 'Group Chat',
        avatarUrl: `https://placehold.co/40x40.png?text=${(conversation.context?.groupName || 'G').charAt(0)}`, // Simple group avatar
        isOnline: undefined, // Online status for groups is more complex
      };
    }
    const otherParticipant = conversation.participants?.find(p => p.userId !== currentUserId);
    return {
      name: otherParticipant?.userName || 'Unknown User',
      avatarUrl: otherParticipant?.userAvatarUrl,
      isOnline: undefined, // Placeholder for individual online status
    };
  };

  return (
    <div className={cn(
        "w-full md:w-80 border-r flex flex-col h-full",
        "bg-sidebar text-sidebar-foreground" // Sidebar specific theme
    )}>
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold">Messages</h2>
        <Button 
            onClick={onNewChat} 
            size="sm" 
            className="w-full mt-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
            disabled={!isOnline || isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} 
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse p-3">
                <div className="h-10 w-10 rounded-full bg-sidebar-accent/30" />
                <div className="space-y-1 flex-1">
                  <div className="h-4 w-3/4 rounded bg-sidebar-accent/30" />
                  <div className="h-3 w-1/2 rounded bg-sidebar-accent/20" />
                </div>
              </div>
            ))}
          </div>
        ) : !isOnline && conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-sidebar-foreground/70 flex flex-col items-center justify-center h-full">
                <WifiOff className="mx-auto h-10 w-10 mb-3" />
                <p className="font-medium">Chat is unavailable offline.</p>
                <p className="text-xs">Connect to the internet to see your messages.</p>
            </div>
        ) : conversations.length === 0 ? (
           <div className="p-6 text-center text-sm text-sidebar-foreground/70 flex flex-col items-center justify-center h-full">
             <MessageSquareText className="mx-auto h-10 w-10 mb-3" />
             <p className="font-medium">No conversations yet.</p>
             <p className="text-xs">Click "New Chat" to start messaging.</p>
           </div>
        ) : (
          conversations.map((conv) => {
            const displayDetails = getConversationDisplayDetails(conv);
            const lastMessageTime = conv.lastMessageTimestamp
              ? formatDistanceToNowStrict(conv.lastMessageTimestamp.toDate(), { addSuffix: true })
              : '';
            const unreadCount = conv.unreadCounts?.[currentUserId] || 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={cn(
                  'flex items-center w-full p-3 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar',
                  selectedConversationId === conv.id 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                    : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  (!isOnline && selectedConversationId !== conv.id) && 'opacity-60 cursor-not-allowed'
                )}
                disabled={!isOnline && selectedConversationId !== conv.id}
                aria-current={selectedConversationId === conv.id ? "page" : undefined}
              >
                <Avatar className="h-10 w-10 mr-3 border-2 border-sidebar-border/50 relative">
                  <AvatarImage src={displayDetails.avatarUrl || `https://placehold.co/40x40.png?text=${displayDetails.name.charAt(0)}`} alt={displayDetails.name} data-ai-hint="profile avatar" />
                  <AvatarFallback className="bg-sidebar-accent/50 text-sidebar-accent-foreground/80">{displayDetails.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                  {/* Placeholder for online status indicator */}
                  {/* {displayDetails.isOnline && <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-sidebar-background" />} */}
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className={cn("font-semibold text-sm truncate flex items-center", selectedConversationId === conv.id ? "text-sidebar-primary-foreground" : "text-sidebar-foreground")}>
                        {conv.isGroupChat && <Users className="h-3 w-3 mr-1.5 opacity-70" />}
                        {displayDetails.name}
                        {!conv.isGroupChat && conv.participants.find(p=>p.userId !== currentUserId)?.userRole && <span className={cn("ml-1.5 text-[10px] opacity-70", selectedConversationId === conv.id ? "text-sidebar-primary-foreground/80" : "text-sidebar-foreground/70")}>({conv.participants.find(p=>p.userId !== currentUserId)?.userRole})</span>}
                    </h3>
                    <span className={cn("text-xs whitespace-nowrap", selectedConversationId === conv.id ? "text-sidebar-primary-foreground/80" : "text-sidebar-foreground/70")}>{lastMessageTime}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className={cn("text-xs truncate", selectedConversationId === conv.id ? "text-sidebar-primary-foreground/90" : "text-sidebar-foreground/80", unreadCount > 0 && "font-medium")}>
                        {conv.lastMessageSenderId === currentUserId ? "You: " : ""}
                        {conv.typing && Object.values(conv.typing).some(t => t === true) && Object.keys(conv.typing).filter(uid => uid !== currentUserId && conv.typing?.[uid]).length > 0
                            ? <span className="italic text-primary">typing...</span>
                            : conv.lastMessageText || (conv.lastMessageSenderId ? 'Sent an attachment' : 'No messages yet')
                        }
                    </p>
                    {unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full h-4 min-w-[16px] flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
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
