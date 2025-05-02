// src/components/gamification/TransferPointsModal.tsx
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
import { Loader2, Gift, Sparkles, User, WifiOff, Printer } from 'lucide-react'; // Added Printer
import { useToast } from '@/hooks/use-toast';
import { transferPoints, getMockUsersForTransfer } from '@/services/user-service'; // Import transfer service and user fetcher
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import Receipt from '@/components/common/Receipt'; // Import Receipt component

interface TransferPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderId: string;
  currentPoints: number;
  onSuccess: () => void; // Callback to refresh data
}

interface MockUser {
    id: string;
    name: string;
}

export default function TransferPointsModal({
    isOpen,
    onClose,
    senderId,
    currentPoints,
    onSuccess
}: TransferPointsModalProps) {
  const { isOnline } = useContext(AppStateContext)!; // Get online status
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<MockUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any | null>(null); // Store transaction for receipt
  const { toast } = useToast();

   // Fetch mock users when component mounts or modal opens (only if online)
   useEffect(() => {
       if (isOpen && isOnline) {
           const fetchUsers = async () => {
               setIsLoadingUsers(true);
               try {
                   const users = await getMockUsersForTransfer();
                   // Filter out the current user
                   setAvailableUsers(users.filter(u => u.id !== senderId));
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
           setSelectedUserId('');
           setAmount('');
           setAvailableUsers([]);
           setLastTransaction(null); // Clear transaction on close
       }
   }, [isOpen, senderId, toast, isOnline]); // Add isOnline dependency

   // --- Simulate Printing ---
    const handlePrintReceipt = (transaction: any) => {
        if (!transaction) return;
        console.log("Simulating print receipt for:", transaction);
        const printWindow = window.open('', '_blank', 'height=600,width=400');
        if (printWindow) {
             printWindow.document.write('<html><head><title>Print Receipt</title>');
             printWindow.document.write('<style>body{font-family:sans-serif;margin:1rem;}h2,h3{margin-bottom:0.5rem;}p{margin:0.2rem 0;}hr{border:none;border-top:1px dashed #ccc;margin:0.5rem 0;}</style>');
             printWindow.document.write('</head><body>');
             const receiptHtml = `
                 <h2>Points Transfer Receipt</h2>
                 <p><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
                 <hr />
                 <p><strong>Points Sent:</strong> ${transaction.points}</p>
                 <p><strong>To:</strong> ${transaction.recipientId}</p>
                 <hr />
                 <p><strong>Your New Points Balance:</strong> ${transaction.senderNewPoints}</p>
                 <p><strong>Transaction ID:</strong> ${transaction.id.substring(0, 8)}...</p>
                 <hr />
                 <p style="text-align:center; font-size: 0.8em;">Thank you for using Carpso!</p>
             `;
             printWindow.document.body.innerHTML = receiptHtml;
             printWindow.document.close();
             printWindow.focus();
             printWindow.print();
        } else {
            toast({ title: "Print Error", description: "Could not open print window.", variant: "destructive" });
        }
        toast({ title: "Printing Receipt...", description: "Browser print dialog should open.", duration: 3000 });
    };
    // --- End Simulate Printing ---

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow whole numbers only for points
    const points = value === '' ? '' : parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(points as number)) {
        setAmount('');
    } else {
        setAmount(points);
    }
  };

  const handleSubmit = async () => {
      setLastTransaction(null); // Clear previous transaction
    if (!isOnline) {
         toast({ title: "Offline", description: "Cannot transfer points while offline.", variant: "destructive" });
         return;
    }
    if (!selectedUserId) {
      toast({ title: "Missing Recipient", description: "Please select a recipient.", variant: "destructive" });
      return;
    }
    if (amount === '' || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive number of points.", variant: "destructive" });
      return;
    }
    if (amount > currentPoints) {
      toast({ title: "Insufficient Points", description: `You only have ${currentPoints} points available.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Assuming transferPoints now returns the transaction details
      const { senderNewPoints, recipientNewPoints, transaction } = await transferPoints(senderId, selectedUserId, amount);

       const transactionForReceipt = {
           ...transaction, // Contains id, timestamp, senderId, recipientId, points, type
           senderNewPoints,
       };
       setLastTransaction(transactionForReceipt);

      toast({
          title: "Points Transferred Successfully",
          description: (
             <div className="flex flex-col gap-2">
                 <span>
                    {amount} points sent to {availableUsers.find(u => u.id === selectedUserId)?.name || selectedUserId}.
                 </span>
                 <Button
                     variant="secondary"
                     size="sm"
                     onClick={() => handlePrintReceipt(transactionForReceipt)}
                     className="mt-2"
                 >
                    <Printer className="mr-2 h-4 w-4"/> Print Receipt
                 </Button>
             </div>
          ),
           duration: 8000,
      });
      onSuccess(); // Refresh points data in profile
      onClose(); // Close modal
      // Reset state handled by useEffect[isOpen]
    } catch (error: any) {
      console.error("Error transferring points:", error);
      toast({ title: "Transfer Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> Transfer Points
          </DialogTitle>
          <DialogDescription>
             Share your loyalty points with another Carpso user. Available Points: {currentPoints}.
             {!isOnline && <span className="text-destructive font-medium ml-1">(Offline)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
           {/* Recipient User Selection */}
           <div className="space-y-1">
              <Label htmlFor="recipientUserPoints">Select Recipient User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading || isLoadingUsers || !isOnline}>
                  <SelectTrigger id="recipientUserPoints">
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

           {/* Amount Input */}
           <div className="space-y-1">
               <Label htmlFor="pointsAmount">Points to Transfer</Label>
               <Input
                    id="pointsAmount"
                    type="number" // Use number input
                    pattern="\d*" // Allow only digits (for mobile keyboards)
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    disabled={isLoading || !isOnline}
                    min="1" // Minimum 1 point
                    max={currentPoints}
                 />
                 {amount > currentPoints && <p className="text-xs text-destructive mt-1">Amount exceeds available points.</p>}
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isOnline || amount === '' || amount <= 0 || amount > currentPoints || !selectedUserId}>
             {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Transfer Points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
