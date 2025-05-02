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
import { Loader2, UserPlus, User, Phone, Car, DollarSign, WifiOff, Printer, Search, CircleAlert } from 'lucide-react'; // Added Search, CircleAlert
import { useToast } from '@/hooks/use-toast';
import { payForOtherUser, getMockUsersForTransfer, checkUserOrPlateExists } from '@/services/wallet-service'; // Import service, added checkUserOrPlateExists
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import Receipt from '@/components/common/Receipt'; // Import Receipt component
import { Alert, AlertDescription as AlertDescriptionSub } from '@/components/ui/alert'; // Use AlertDescription alias

interface PayForOtherModalProps {
  isOpen: boolean;
  onClose: () => void;
  payerId: string;
  payerBalance: number;
  currency: string; // Base currency (ZMW)
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
    currency, // Base currency (ZMW)
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
  const [lastTransaction, setLastTransaction] = useState<any | null>(null); // Store transaction for receipt
  const [isCheckingTarget, setIsCheckingTarget] = useState(false); // State for checking target existence
  const [targetCheckResult, setTargetCheckResult] = useState<'valid' | 'invalid' | 'error' | null>(null); // State for check result
  const [targetIdentifier, setTargetIdentifier] = useState<string>(''); // Store the identifier being checked/used
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
           setLastTransaction(null); // Clear transaction on close
           setTargetCheckResult(null); // Reset check result
           setTargetIdentifier(''); // Reset identifier
       }
   }, [isOpen, payerId, toast, isOnline]); // Add isOnline dependency

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
                 <h2>Payment Receipt (For Other)</h2>
                 <p><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
                 <hr />
                 <p><strong>Amount Paid:</strong> K ${Math.abs(transaction.amount).toFixed(2)}</p> {/* Use K symbol */}
                 <p><strong>For User/Plate:</strong> ${transaction.relatedUserId || transaction.targetIdentifier}</p>
                 ${transaction.parkingRecordId ? `<p><strong>Parking Ref:</strong> ${transaction.parkingRecordId.substring(0, 10)}...</p>` : ''}
                 <hr />
                 <p><strong>Your New Balance:</strong> K ${transaction.newBalance.toFixed(2)}</p> {/* Use K symbol */}
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
    setAmount(value === '' ? '' : Number(value));
  };

    // --- Check Target User/Plate Existence ---
    const checkTarget = async () => {
        let identifier: string | null = null;
        if (recipientType === 'user' && selectedUserId) {
            identifier = selectedUserId;
        } else if (recipientType === 'plate' && targetPlateNumber && targetPlateNumber.length >= 3) { // Check plate only if >= 3 chars
            identifier = targetPlateNumber;
        } else {
             setTargetCheckResult(null); // Clear result if input is invalid/empty
             setTargetIdentifier('');
            return;
        }

        setTargetIdentifier(identifier); // Store the identifier being checked
        setIsCheckingTarget(true);
        setTargetCheckResult(null); // Reset before check
        try {
            const exists = await checkUserOrPlateExists(identifier);
            setTargetCheckResult(exists ? 'valid' : 'invalid');
        } catch (error) {
            console.error("Error checking target:", error);
            setTargetCheckResult('error');
        } finally {
            setIsCheckingTarget(false);
        }
    };

   // Trigger check when user ID or plate number changes (with debounce/blur would be better in real app)
   useEffect(() => {
      if (isOpen && isOnline) {
         // Optional: Add a debounce here to avoid checking on every keystroke
         checkTarget();
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedUserId, targetPlateNumber, recipientType, isOpen, isOnline]);


  const handleSubmit = async () => {
      setLastTransaction(null); // Clear previous transaction
    if (!isOnline) {
        toast({ title: "Offline", description: "Cannot complete payment while offline.", variant: "destructive" });
        return;
    }

    // Use the stored targetIdentifier that was checked
    if (!targetIdentifier) {
        toast({ title: "Missing Recipient Info", description: "Please select a user or enter a license plate.", variant: "destructive" });
        return;
    }

    // Re-check target validity before proceeding (important if user changes input quickly)
    if (targetCheckResult !== 'valid') {
         let errorMsg = "Target recipient/plate could not be verified.";
         if (targetCheckResult === 'invalid') errorMsg = `User or Plate "${targetIdentifier}" not found in Carpso system.`;
         if (targetCheckResult === 'error') errorMsg = `Error verifying recipient/plate "${targetIdentifier}".`;
         toast({ title: "Recipient Not Found", description: errorMsg, variant: "destructive" });
         return;
    }


    if (amount === '' || amount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
        return;
    }

    if (amount > payerBalance) {
        toast({ title: "Insufficient Balance", description: `You only have K ${payerBalance.toFixed(2)} available.`, variant: "destructive" }); // Use K symbol
        return;
    }

    // Optional: Validate parkingRecordId format if provided
    const recordIdToPay = parkingRecordId || `auto_${targetIdentifier}_${Date.now()}`; // Generate mock ID if none provided

    setIsLoading(true);

    try {
      // Use targetIdentifier (which could be userId or plate number)
      const { newBalance, transaction } = await payForOtherUser(payerId, targetIdentifier, recordIdToPay, amount); // Assume service returns transaction

       const transactionForReceipt = {
           ...transaction,
           newBalance,
           currency: 'ZMW', // Assuming base currency is ZMW
           targetIdentifier: targetIdentifier, // Pass identifier used
       };
       setLastTransaction(transactionForReceipt);


      toast({
          title: "Payment Successful",
          description: (
              <div className="flex flex-col gap-2">
                 <span>
                    K {amount.toFixed(2)} paid for {targetIdentifier}. Your new balance: K {newBalance.toFixed(2)} {/* Use K symbol */}
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

  // Determine if submit button should be disabled
  const canSubmit = !isLoading &&
                     isOnline &&
                     amount !== '' &&
                     amount > 0 &&
                     amount <= payerBalance &&
                     targetIdentifier !== '' &&
                     targetCheckResult === 'valid'; // Target must be valid


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Pay for Another User
          </DialogTitle>
          <DialogDescription>
             Pay parking fees for another user from your wallet. Balance: K {payerBalance.toFixed(2)}. {/* Use K symbol */}
             {!isOnline && <span className="text-destructive font-medium ml-1">(Offline)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
            {/* Recipient Type Selection */}
            <div className="flex gap-2">
                <Button
                    variant={recipientType === 'user' ? 'default' : 'outline'}
                    onClick={() => { setRecipientType('user'); setTargetPlateNumber(''); setTargetCheckResult(null); }} // Clear other field on switch
                    className="flex-1"
                    disabled={isLoading || !isOnline}
                >
                   <User className="mr-2 h-4 w-4" /> Select User
                </Button>
                 <Button
                    variant={recipientType === 'plate' ? 'default' : 'outline'}
                    onClick={() => { setRecipientType('plate'); setSelectedUserId(''); setTargetCheckResult(null); }} // Clear other field on switch
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
                      <div className="relative">
                         <Input
                             id="targetPlate"
                             type="text"
                             value={targetPlateNumber}
                             onChange={(e) => setTargetPlateNumber(e.target.value.toUpperCase())}
                             placeholder="e.g., ABC 1234"
                             className="uppercase pr-8" // Add padding for loader
                             disabled={isLoading || !isOnline}
                         />
                          {isCheckingTarget && isOnline && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                  </div>
             )}

             {/* Target Check Result Indicator */}
            {isOnline && targetIdentifier && !isCheckingTarget && targetCheckResult !== null && (
                 <Alert variant={targetCheckResult === 'valid' ? 'default' : 'destructive'} className="mt-[-8px]">
                     {targetCheckResult === 'valid' ? <User className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                      <AlertDescriptionSub className="text-xs">
                          {targetCheckResult === 'valid' && `User/Plate "${targetIdentifier}" found.`}
                          {targetCheckResult === 'invalid' && `User/Plate "${targetIdentifier}" not found in Carpso system.`}
                          {targetCheckResult === 'error' && `Error verifying recipient/plate "${targetIdentifier}".`}
                      </AlertDescriptionSub>
                 </Alert>
            )}
            {!isOnline && (
                 <Alert variant="warning" className="mt-[-8px]">
                    <WifiOff className="h-4 w-4" />
                    <AlertDescriptionSub className="text-xs">Offline: Recipient verification unavailable.</AlertDescriptionSub>
                 </Alert>
            )}


           {/* Amount Input */}
           <div className="space-y-1">
               <Label htmlFor="paymentAmount">Payment Amount (K)</Label> {/* Use K symbol */}
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
          <Button onClick={handleSubmit} disabled={!canSubmit}> {/* Use derived canSubmit state */}
             {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pay K {amount || 0} {/* Use K symbol */}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
