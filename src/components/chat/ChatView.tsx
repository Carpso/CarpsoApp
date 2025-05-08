// src/components/chat/ChatView.tsx
import React, { useRef, useEffect, useState } from 'react'; // Added useState
import type { ChatConversation, ChatMessage } from '@/services/chat-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Paperclip, WifiOff, ArrowDownCircle } from 'lucide-react'; // Added ArrowDownCircle
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface ChatViewProps {
  conversation: ChatConversation;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => Promise<void>;
  isLoadingMessages: boolean;
  isOnline: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  isLoadingMessages,
  isOnline,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false); // For send loading state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for ScrollArea's viewport
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);


  const otherParticipant = conversation.participants?.find(p => p.userId !== currentUserId);

  useEffect(() => {
    // Scroll to bottom when messages change, unless user has scrolled up
    if (!showScrollToBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      // Show button if user scrolled up more than a certain threshold from the bottom
      if (scrollHeight - scrollTop - clientHeight > 200) {
          setShowScrollToBottom(true);
      } else {
          setShowScrollToBottom(false);
      }
  };

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowScrollToBottom(false);
  };


  const handleSend = async () => {
    if (!newMessage.trim() || !isOnline || isSending) return;
    setIsSending(true);
    try {
        await onSendMessage(newMessage);
        setNewMessage('');
    } catch (error) {
        // Error toast is handled by the parent component (ChatPage)
        console.error("Send message failed in ChatView:", error);
    } finally {
        setIsSending(false);
    }
  };

  const formatMessageTimestamp = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    if (isToday(date)) {
      return format(date, 'p'); // e.g., 2:30 PM
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'p')}`;
    }
    return format(date, 'MMM d, p'); // e.g., Jul 23, 2:30 PM
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center space-x-3 bg-card shadow-sm">
        <Avatar className="h-10 w-10">
           <AvatarImage src={otherParticipant?.userAvatarUrl || `https://picsum.photos/seed/${otherParticipant?.userId || 'other'}/40/40`} alt={otherParticipant?.userName || "Avatar"} data-ai-hint="profile avatar" />
           <AvatarFallback className="bg-muted text-muted-foreground">{otherParticipant?.userName?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold text-card-foreground">{otherParticipant?.userName || 'Chat'}</h2>
          <p className="text-xs text-muted-foreground">
            {otherParticipant?.userRole || 'User'}
            {!isOnline && <span className="text-destructive ml-2 font-medium">(Offline)</span>}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="relative flex-1">
        <ScrollArea className="absolute inset-0 p-4 space-y-2" onScroll={handleScroll} viewportRef={scrollAreaRef}>
            {isLoadingMessages && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            )}
            {!isLoadingMessages && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground p-4 text-center">
                No messages yet. <br/> Be the first to start the conversation!
                </p>
            </div>
            )}
            {messages.map((msg, index) => {
            const isCurrentUser = msg.senderId === currentUserId;
            const prevMessage = messages[index - 1];
            const showAvatarAndName = !prevMessage || prevMessage.senderId !== msg.senderId || 
                (msg.timestamp.toDate().getTime() - prevMessage.timestamp.toDate().getTime()) > 5 * 60 * 1000; // 5 minutes threshold

            return (
                <div
                key={msg.id || index}
                className={cn(
                    'flex items-end space-x-2 max-w-[85%] md:max-w-[75%] group', // Added group for potential hover effects
                    isCurrentUser ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
                )}
                >
                {!isCurrentUser && showAvatarAndName && (
                    <Avatar className="h-8 w-8 self-start border shadow-sm">
                    <AvatarImage src={conversation.participants.find(p=>p.userId === msg.senderId)?.userAvatarUrl || `https://picsum.photos/seed/${msg.senderId}/32/32`} alt={msg.senderName} data-ai-hint="profile avatar small"/>
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">{msg.senderName?.charAt(0)?.toUpperCase() || 'S'}</AvatarFallback>
                    </Avatar>
                )}
                {!isCurrentUser && !showAvatarAndName && <div className="w-8 h-8 mr-2 shrink-0"></div>}

                <div className={cn("p-2.5 rounded-xl shadow-sm", // Slightly larger padding, more rounded
                    isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-card-foreground rounded-bl-md'
                )}>
                    {!isCurrentUser && showAvatarAndName && (
                        <p className="text-xs font-semibold mb-0.5 text-primary">{msg.senderName}</p> // Accent color for sender name
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={cn("text-[10px] mt-1 opacity-80", isCurrentUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left")}>
                    {formatMessageTimestamp(msg.timestamp)}
                    </p>
                </div>
                </div>
            );
            })}
            <div ref={messagesEndRef} />
        </ScrollArea>
         {showScrollToBottom && (
             <Button
                 variant="outline"
                 size="icon"
                 className="absolute bottom-4 right-4 z-10 rounded-full shadow-lg h-10 w-10 bg-background/80 hover:bg-background"
                 onClick={scrollToBottom}
                 aria-label="Scroll to bottom"
             >
                 <ArrowDownCircle className="h-5 w-5" />
             </Button>
         )}
      </div>


      {/* Message Input Area */}
      <div className="p-3 border-t bg-background shadow-sm">
        <div className="flex items-center space-x-2">
          {/* <Button variant="ghost" size="icon" disabled={!isOnline || isSending}> <Paperclip className="h-5 w-5" /> </Button> */}
          <Input
            type="text"
            placeholder={isOnline ? "Type a message..." : "You are offline..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (handleSend(), e.preventDefault())}
            disabled={!isOnline || isSending}
            className="flex-1 h-10 text-sm"
            aria-label="Message input"
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || !isOnline || isSending} className="h-10 w-10 p-0">
            {isSending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send Message</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
