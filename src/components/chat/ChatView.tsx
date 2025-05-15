// src/components/chat/ChatView.tsx
import React, { useRef, useEffect, useState } from 'react';
import type { ChatConversation, ChatMessage } from '@/services/chat-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Paperclip, WifiOff, ArrowDownCircle, Smile, Users, Info } from 'lucide-react'; // Added Smile, Users, Info
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { sendTypingIndicator } from '@/services/chat-service'; // Import typing indicator service

interface ChatViewProps {
  conversation: ChatConversation;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, attachmentUrl?: string, attachmentType?: 'image' | 'file') => Promise<void>;
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
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const otherParticipants = conversation.participants?.filter(p => p.userId !== currentUserId);
  const displayHeaderName = conversation.isGroupChat
    ? conversation.context?.groupName || otherParticipants.map(p => p.userName).join(', ') || 'Group Chat'
    : otherParticipants[0]?.userName || 'Chat';
  
  const displayHeaderAvatarText = conversation.isGroupChat
    ? (conversation.context?.groupName || 'G').charAt(0)
    : (otherParticipants[0]?.userName?.charAt(0) || '?');

  const displayHeaderAvatarUrl = conversation.isGroupChat
    ? `https://placehold.co/40x40.png?text=${displayHeaderAvatarText}`
    : otherParticipants[0]?.userAvatarUrl;


  useEffect(() => {
    if (!showScrollToBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showScrollToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
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

  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (!isOnline) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      // Send "is typing" immediately if not already typing
      sendTypingIndicator(conversation.id, currentUserId, true);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(conversation.id, currentUserId, false);
      typingTimeoutRef.current = null;
    }, 3000); // User is considered "not typing" after 3 seconds of inactivity
  };


  const handleSend = async () => {
    if (!newMessage.trim() || !isOnline || isSending) return;
    setIsSending(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingIndicator(conversation.id, currentUserId, false); // Ensure typing indicator is cleared on send

    try {
        await onSendMessage(newMessage);
        setNewMessage('');
    } catch (error) {
        console.error("Send message failed in ChatView:", error);
    } finally {
        setIsSending(false);
    }
  };

  const formatMessageTimestamp = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    if (isToday(date)) {
      return format(date, 'p');
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'p')}`;
    }
    return format(date, 'MMM d, p');
  };

  const typingUserNames = conversation.typing && Object.entries(conversation.typing)
    .filter(([uid, isTyping]) => isTyping && uid !== currentUserId)
    .map(([uid]) => conversation.participants.find(p => p.userId === uid)?.userName)
    .filter(Boolean);


  return (
    <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center space-x-3 bg-card shadow-sm">
        <Avatar className="h-10 w-10">
           <AvatarImage src={displayHeaderAvatarUrl || `https://placehold.co/40x40.png?text=${displayHeaderAvatarText}`} alt={displayHeaderName} data-ai-hint="profile avatar chat header" />
           <AvatarFallback className="bg-muted text-muted-foreground">{displayHeaderAvatarText.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold text-card-foreground flex items-center">
            {conversation.isGroupChat && <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />}
            {displayHeaderName}
          </h2>
          <p className="text-xs text-muted-foreground">
            {typingUserNames && typingUserNames.length > 0
              ? `${typingUserNames.join(', ')} is typing...`
              : conversation.isGroupChat
                ? `${conversation.participantIds.length} members`
                : otherParticipants[0]?.userRole || 'User'}
            {!isOnline && <span className="text-destructive ml-2 font-medium">(Offline)</span>}
          </p>
        </div>
        {/* Placeholder for context display/actions */}
        {conversation.context?.type === 'reservation_issue' && conversation.context.relatedId &&(
            <Button variant="ghost" size="sm" className="ml-auto text-xs p-1 h-auto">
                <Info className="h-3 w-3 mr-1"/> Issue: {conversation.context.relatedId.substring(0,6)}...
            </Button>
        )}
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
                (msg.timestamp.toDate().getTime() - prevMessage.timestamp.toDate().getTime()) > 5 * 60 * 1000;

            return (
                <div
                key={msg.id || index}
                className={cn(
                    'flex items-end space-x-2 max-w-[85%] md:max-w-[75%] group mb-1',
                    isCurrentUser ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
                )}
                >
                {!isCurrentUser && showAvatarAndName && (
                    <Avatar className="h-8 w-8 self-start border shadow-sm">
                    <AvatarImage src={conversation.participants.find(p=>p.userId === msg.senderId)?.userAvatarUrl || `https://placehold.co/32x32.png?text=${msg.senderName?.charAt(0)}`} alt={msg.senderName} data-ai-hint="profile avatar small"/>
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">{msg.senderName?.charAt(0)?.toUpperCase() || 'S'}</AvatarFallback>
                    </Avatar>
                )}
                {!isCurrentUser && !showAvatarAndName && <div className="w-8 h-8 mr-2 shrink-0"></div>}

                <div className={cn("p-2.5 rounded-xl shadow-sm relative group/message", 
                    isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-card-foreground rounded-bl-md'
                )}>
                    {!isCurrentUser && showAvatarAndName && (
                        <p className="text-xs font-semibold mb-0.5 text-primary">{msg.senderName}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    {/* Placeholder for reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex gap-1 mt-1">
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                <Badge key={emoji} variant="secondary" className="text-xs px-1.5 py-0.5">
                                    {emoji} <span className="ml-1 text-[10px]">{userIds.length}</span>
                                </Badge>
                            ))}
                        </div>
                    )}
                     {/* Conceptual: Reaction button - needs a popover/picker */}
                    {/* <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 opacity-0 group-hover/message:opacity-100 transition-opacity">
                        <Smile className="h-3 w-3"/>
                    </Button> */}
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
            onChange={(e) => handleTyping(e.target.value)}
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
