// src/components/chat/ChatView.tsx
import React, { useRef, useEffect } from 'react';
import type { ChatConversation, ChatMessage, ConversationParticipant } from '@/services/chat-service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Paperclip, WifiOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  const [newMessage, setNewMessage] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherParticipant = conversation.participants?.find(p => p.userId !== currentUserId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !isOnline) return;
    await onSendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center space-x-3">
        <Avatar className="h-10 w-10">
           <AvatarImage src={otherParticipant?.userAvatarUrl || `https://picsum.photos/seed/${otherParticipant?.userId || 'other'}/40/40`} alt={otherParticipant?.userName} data-ai-hint="profile avatar" />
           <AvatarFallback>{otherParticipant?.userName?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold">{otherParticipant?.userName || 'Chat'}</h2>
          <p className="text-xs text-muted-foreground">
            {otherParticipant?.userRole || 'User'}
            {!isOnline && <span className="text-destructive ml-2">(Offline)</span>}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 space-y-4">
        {isLoadingMessages && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg, index) => {
          const isCurrentUser = msg.senderId === currentUserId;
          // Group messages by same sender if sent close in time
          const prevMessage = messages[index - 1];
          const showAvatarAndName = !prevMessage || prevMessage.senderId !== msg.senderId || 
            (msg.timestamp.toDate().getTime() - prevMessage.timestamp.toDate().getTime()) > 5 * 60 * 1000; // 5 minutes threshold

          return (
            <div
              key={msg.id || index}
              className={cn(
                'flex items-end space-x-2 max-w-[85%] md:max-w-[75%]',
                isCurrentUser ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
              )}
            >
              {!isCurrentUser && showAvatarAndName && (
                <Avatar className="h-8 w-8 self-start">
                  <AvatarImage src={conversation.participants.find(p=>p.userId === msg.senderId)?.userAvatarUrl || `https://picsum.photos/seed/${msg.senderId}/40/40`} alt={msg.senderName} data-ai-hint="profile avatar small"/>
                  <AvatarFallback>{msg.senderName?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
              )}
               {!isCurrentUser && !showAvatarAndName && <div className="w-8 h-8 mr-2 shrink-0"></div>} {/* Placeholder for consistent spacing */}

              <div className={cn("p-3 rounded-lg shadow-sm",
                isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-muted-foreground rounded-bl-none'
              )}>
                {!isCurrentUser && showAvatarAndName && (
                    <p className="text-xs font-semibold mb-0.5">{msg.senderName}</p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground/70")}>
                  {format(msg.timestamp.toDate(), 'p')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input Area */}
      <div className="p-4 border-t bg-background">
         {!isOnline && (
             <div className="flex items-center justify-center text-sm text-destructive mb-2">
                 <WifiOff className="h-4 w-4 mr-2" /> You are offline. Messages cannot be sent.
             </div>
         )}
        <div className="flex items-center space-x-2">
          {/* <Button variant="ghost" size="icon" disabled={!isOnline}> <Paperclip className="h-5 w-5" /> </Button> */}
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (handleSend(), e.preventDefault())}
            disabled={!isOnline}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || !isOnline}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
