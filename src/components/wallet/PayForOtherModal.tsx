// src/components/wallet/PayForOtherModal.tsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
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
import { Loader2, UserPlus, User, Phone, Car, DollarSign, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { payForOtherUser, getMockUsersForTransfer } from '@/services/wallet-service'; // Import service
import { AppStateContext } from '@/context/AppStateProvider'; // Import context

interface PayForOtherModalProps {
  isOpen: boolean;
  onClose: () => void;
  payerId: string;
  payerBalance: number;
  currency: string;
  onSuccess: () => void; // Callback to refresh data
}

interface MockUser {
    id: string;
    name: string;
}

export default function PayForOtherModal({
    isOpen,
    onClose,
    payerId,
    payerBalance,
    currency,
    onSuccess
}: PayForOtherModalProps) {
  const { isOnline } = useContext(AppStateContext)!; // Get online status
  const [recipientType, setRecipientType] = useState<'user' | 'plate'>('user');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [targetPlateNumber, setTargetPlateNumber] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [parkingRecordId, setParkingRecordId] = useState<string>(''); // Optional: To pay for a specific session
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<MockUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const { toast } = useToast();

   // Fetch mock users when component mounts or modal opens (only if online)
   useEffect(() => {
       if (isOpen && isOnline) {
           const fetchUsers = async () => {
               setIsLoadingUsers(true);
               try {
                   const users = await getMockUsersForTransfer();
                   // Filter out the current user
                   setAvailableUsers(users.filter(u => u.id !== payerId));
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
           setTargetPlateNumber('');
           setAmount('');
           setParkingRecordId('');
           setAvailableUsers([]);
       }
   }, [isOpen, payerId, toast, isOnline]); // Add isOnline dependency


  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value === '' ? '' : Number(value));
  };

  const handleSubmit = async () => {
    if (!isOnline) {
        toast({ title: "Offline", description: "Cannot complete payment while offline.", variant: "destructive" });
        return;
    }

    let targetIdentifier: string | null = null;
    if (recipientType === 'user' && selectedUserId) {
        targetIdentifier = selectedUserId;
    } else if (recipientType === 'plate' && targetPlateNumber) {
        targetIdentifier = targetPlateNumber; // Use plate number as identifier for target user
        // TODO: In a real app, you'd likely need to *resolve* the plate number to a userId or active parking session first.
        // This mock assumes the backend can handle payment by plate number directly.
    }

    if (!targetIdentifier) {
        toast({ title: "Missing Recipient Info", description: "Please select a user or enter a license plate.", variant: "destructive" });
        return;
    }

    if (amount === '' || amount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
        return;
    }

    if (amount > payerBalance) {
        toast({ title: "Insufficient Balance", description: `You only have ${currency} ${payerBalance.toFixed(2)} available.`, variant: "destructive" });
        return;
    }

    // Optional: Validate parkingRecordId format if provided
    const recordIdToPay = parkingRecordId || `auto_${targetIdentifier}_${Date.now()}`; // Generate mock ID if none provided

    setIsLoading(true);

    try {
      // Use targetIdentifier (which could be userId or plate number)
      await payForOtherUser(payerId, targetIdentifier, recordIdToPay, amount);
      toast({
          title: "Payment Successful",
          description: `${currency} ${amount.toFixed(2)} paid for ${targetIdentifier}. Your new balance: ${currency} ${(payerBalance - amount).toFixed(2)}`,
      });
      onSuccess(); // Refresh wallet data in profile
      onClose(); // Close modal
      // Reset state handled by useEffect[isOpen]
    } catch (error: any) {
      console.error("Error paying for other user:", error);
      toast({ title: "Payment Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Pay for Another User
          </DialogTitle>
          <DialogDescription>
             Pay parking fees for another user from your wallet. Balance: {currency} {payerBalance.toFixed(2)}.
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
                   <User className="mr-2 h-4 w-4" /> Select User
                </Button>
                 <Button
                    variant={recipientType === 'plate' ? 'default' : 'outline'}
                    onClick={() => setRecipientType('plate')}
                    className="flex-1"
                    disabled={isLoading || !isOnline}
                >
                   <Car className="mr-2 h-4 w-4" /> Enter Plate #
                </Button>
            </div>

            {/* Recipient Input */}
             {recipientType === 'user' ? (
                 <div className="space-y-1">
                     <Label htmlFor="targetUserPay">Select Target User</Label>
                     <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading || isLoadingUsers || !isOnline}>
                         <SelectTrigger id="targetUserPay">
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
                     <Label htmlFor="targetPlate">Target License Plate</Label>
                     <Input
                         id="targetPlate"
                         type="text"
                         value={targetPlateNumber}
                         onChange={(e) => setTargetPlateNumber(e.target.value.toUpperCase())}
                         placeholder="e.g., ABC 1234"
                         className="uppercase"
                         disabled={isLoading || !isOnline}
                     />
                  </div>
             )}

           {/* Amount Input */}
           <div className="space-y-1">
               <Label htmlFor="paymentAmount">Payment Amount ({currency})</Label>
               <Input
                    id="paymentAmount"
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    disabled={isLoading || !isOnline}
                    min="0.01"
                    step="0.01"
                    max={payerBalance}
                 />
                 {amount > payerBalance && <p className="text-xs text-destructive mt-1">Amount exceeds your available balance.</p>}
            </div>

            {/* Optional Parking Record ID */}
            <div className="space-y-1">
                <Label htmlFor="parkingRecordId">Parking Record ID (Optional)</Label>
                <Input
                    id="parkingRecordId"
                    value={parkingRecordId}
                    onChange={(e) => setParkingRecordId(e.target.value)}
                    placeholder="Enter specific record ID if known"
                    disabled={isLoading || !isOnline}
                />
           </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isOnline || amount === '' || amount <= 0 || amount > payerBalance || (recipientType === 'user' && !selectedUserId) || (recipientType === 'plate' && !targetPlateNumber)}>
             {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pay {currency} {amount || 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
