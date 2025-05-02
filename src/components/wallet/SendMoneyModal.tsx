// src/components/wallet/SendMoneyModal.tsx
'use client';

import React, { useState, useEffect, useContext } from 'react'; // Added useContext
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowUpRight, User, Phone, Users, WifiOff } from 'lucide-react'; // Added WifiOff
import { useToast } from '@/hooks/use-toast';
import { sendMoney, getMockUsersForTransfer } from '@/services/wallet-service'; // Import service
import { cn } from '@/lib/utils';
import { AppStateContext } from '@/context/AppStateProvider'; // Import context

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentBalance: number;
  currency: string;
  onSuccess: () => void; // Callback to refresh data
}

interface MockUser {
    id: string;
    name: string;
}

export default function SendMoneyModal({
    isOpen,
    onClose,
    userId,
    currentBalance,
    currency,
    onSuccess
}: SendMoneyModalProps) {
  const { isOnline } = useContext(AppStateContext)!; // Get online status
  const [recipientType, setRecipientType] = useState<'user' | 'phone'>('user');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [note, setNote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<MockUser[]>([]); // State for user list
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const { toast } = useToast();

   // Fetch mock users when component mounts or modal opens (only if online)
   useEffect(() => {
       if (isOpen && isOnline) {
           const fetchUsers = async () => {
               setIsLoadingUsers(true);
               try {
                   const users = await getMockUsersForTransfer();
                   // Filter out the current user if they appear in the list
                   setAvailableUsers(users.filter(u => u.id !== userId));
               } catch (error) {
                   console.error("Failed to fetch user list:", error);
                   toast({ title: "Error", description: "Could not load recipient list.", variant: "destructive"});
               } finally {
                   setIsLoadingUsers(false);
               }
           };
           fetchUsers();
       } else if (isOpen && !isOnline) {
            setIsLoadingUsers(false);
            setAvailableUsers([]); // Clear user list if offline
       } else {
           // Reset state when modal closes
           setRecipientType('user');
           setSelectedUserId('');
           setRecipientPhone('');
           setAmount('');
           setNote('');
           setAvailableUsers([]);
       }
   }, [isOpen, userId, toast, isOnline]); // Add isOnline dependency


  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value === '' ? '' : Number(value));
  };

  const handleSubmit = async () => {
      if (!isOnline) {
          toast({ title: "Offline", description: "Cannot send money while offline.", variant: "destructive" });
          return;
      }

      let recipientIdentifier: string | null = null;
      if (recipientType === 'user' && selectedUserId) {
          recipientIdentifier = selectedUserId;
      } else if (recipientType === 'phone' && recipientPhone) {
          recipientIdentifier = recipientPhone; // Use phone number as identifier
      }

      if (!recipientIdentifier) {
          toast({ title: "Missing Recipient", description: "Please select or enter a recipient.", variant: "destructive" });
          return;
      }

      if (amount === '' || amount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
        return;
      }

      if (amount > currentBalance) {
          toast({ title: "Insufficient Balance", description: `You only have ${currency} ${currentBalance.toFixed(2)} available.`, variant: "destructive" });
          return;
      }


    setIsLoading(true);

    try {
      const newBalance = await sendMoney(userId, recipientIdentifier, amount, note);
      toast({
          title: "Money Sent Successfully",
          description: `${currency} ${amount.toFixed(2)} sent to ${recipientIdentifier}. New balance: ${currency} ${newBalance.toFixed(2)}`,
      });
      onSuccess(); // Refresh wallet data in profile
      onClose(); // Close modal
       // Reset form state after closing handled by useEffect[isOpen]
    } catch (error: any) {
      console.error("Error sending money:", error);
      toast({ title: "Send Money Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" /> Send Money
          </DialogTitle>
          <DialogDescription>
             Send funds from your Carpso wallet. Balance: {currency} {currentBalance.toFixed(2)}.
             {!isOnline && <span className="text-destructive font-medium ml-1">(Offline)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
            {/* Recipient Type Selection */}
            <div className="flex gap-2">
                <Button
                    variant={recipientType === 'user' ? 'default' : 'outline'}
                    onClick={() => setRecipientType('user')}
                    className="flex-1"
                    disabled={isLoading || !isOnline}
                >
                   <Users className="mr-2 h-4 w-4" /> Select User
                </Button>
                 <Button
                    variant={recipientType === 'phone' ? 'default' : 'outline'}
                    onClick={() => setRecipientType('phone')}
                    className="flex-1"
                    disabled={isLoading || !isOnline}
                >
                   <Phone className="mr-2 h-4 w-4" /> Enter Phone
                </Button>
            </div>


           {/* Recipient Input */}
            {recipientType === 'user' ? (
                <div className="space-y-1">
                    <Label htmlFor="recipientUser">Select Recipient User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading || isLoadingUsers || !isOnline}>
                        <SelectTrigger id="recipientUser">
                            <SelectValue placeholder={!isOnline ? "Unavailable Offline" : isLoadingUsers ? "Loading users..." : "Select a user..."} />
                        </SelectTrigger>
                        <SelectContent>
                             {!isOnline ? <SelectItem value="none" disabled>Unavailable Offline</SelectItem> :
                             availableUsers.length > 0 ? availableUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.name} ({user.id.substring(0, 8)}...)
                                </SelectItem>
                            )) : <SelectItem value="none" disabled>No users available</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                 <div className="space-y-1">
                    <Label htmlFor="recipientPhone">Recipient Phone Number</Label>
                    <Input
                        id="recipientPhone"
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="e.g., 09XXXXXXXX"
                        disabled={isLoading || !isOnline}
                    />
                 </div>
            )}


           {/* Amount Input */}
           <div className="space-y-1">
               <Label htmlFor="amount">Amount ({currency})</Label>
               <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    disabled={isLoading || !isOnline}
                    min="0.01" // Example minimum send amount
                    step="0.01"
                    max={currentBalance}
                 />
                 {amount > currentBalance && <p className="text-xs text-destructive mt-1">Amount exceeds available balance.</p>}
            </div>

           {/* Note Input */}
           <div className="space-y-1">
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note for the recipient..."
                    disabled={isLoading || !isOnline}
                    rows={2}
                />
           </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isOnline || amount === '' || amount <= 0 || amount > currentBalance || (recipientType === 'user' && !selectedUserId) || (recipientType === 'phone' && !recipientPhone)}>
             {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send {currency} {amount || 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
