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
import { Loader2, ArrowUpRight, User, Phone, Users, WifiOff, Printer, CircleAlert } from 'lucide-react'; // Added Printer, CircleAlert
import { useToast } from '@/hooks/use-toast';
import { sendMoney, getMockUsersForTransfer, checkUserOrPlateExists } from '@/services/wallet-service'; // Import service, added checkUserOrPlateExists
import { cn } from '@/lib/utils';
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import Receipt from '@/components/common/Receipt'; // Import Receipt component
import { Alert, AlertDescription as AlertDescriptionSub } from '@/components/ui/alert'; // Use AlertDescription alias

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentBalance: number;
  currency: string; // Base currency (ZMW)
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
    currency, // Base currency (ZMW)
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
           setLastTransaction(null); // Clear transaction on close
           setTargetCheckResult(null); // Reset check result
           setTargetIdentifier(''); // Reset identifier
       }
   }, [isOpen, userId, toast, isOnline]); // Add isOnline dependency

   // --- Simulate Printing ---
    const handlePrintReceipt = (transaction: any) => {
        if (!transaction) return;
        console.log("Simulating print receipt for:", transaction);
        const printWindow = window.open('', '_blank', 'height=600,width=400');
        if (printWindow) {
             printWindow.document.write('<html><head><title>Print Receipt</title>');
             printWindow.document.write('<style>body{font-family:sans-serif;margin:1rem;}h2,h3{margin-bottom:0.5rem;}p{margin:0.2rem 0;}hr{border:none;border-top:1px dashed #ccc;margin:0.5rem 0;}</style>');
             printWindow.document.write('</head><body>');
             const recipientDisplay = availableUsers.find(u => u.id === transaction.relatedUserId)?.name || transaction.relatedUserId;
             const receiptHtml = `
                 <h2>Money Sent Receipt</h2>
                 <p><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
                 <hr />
                 <p><strong>Amount Sent:</strong> K ${Math.abs(transaction.amount).toFixed(2)}</p> {/* Use K symbol */}
                 <p><strong>To:</strong> ${recipientDisplay}</p>
                 ${transaction.note ? `<p><strong>Note:</strong> ${transaction.note}</p>` : ''}
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

    // --- Check Target User/Phone Existence ---
    const checkTarget = async () => {
        let identifier: string | null = null;
        if (recipientType === 'user' && selectedUserId) {
            identifier = selectedUserId;
        } else if (recipientType === 'phone' && recipientPhone && recipientPhone.length >= 9) { // Check phone only if >= 9 digits
            identifier = recipientPhone;
        } else {
             setTargetCheckResult(null); // Clear result if input is invalid/empty
             setTargetIdentifier('');
            return;
        }

        setTargetIdentifier(identifier); // Store the identifier being checked
        setIsCheckingTarget(true);
        setTargetCheckResult(null); // Reset before check
        try {
            const exists = await checkUserOrPlateExists(identifier); // Use the same check function
            setTargetCheckResult(exists ? 'valid' : 'invalid');
        } catch (error) {
            console.error("Error checking target:", error);
            setTargetCheckResult('error');
        } finally {
            setIsCheckingTarget(false);
        }
    };

   // Trigger check when user ID or phone number changes (with debounce/blur would be better)
   useEffect(() => {
      if (isOpen && isOnline) {
         checkTarget();
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedUserId, recipientPhone, recipientType, isOpen, isOnline]);


  const handleSubmit = async () => {
       setLastTransaction(null); // Clear previous transaction
      if (!isOnline) {
          toast({ title: "Offline", description: "Cannot send money while offline.", variant: "destructive" });
          return;
      }

      // Use the stored targetIdentifier that was checked
      if (!targetIdentifier) {
          toast({ title: "Missing Recipient", description: "Please select or enter a recipient.", variant: "destructive" });
          return;
      }

       // Re-check target validity before proceeding
       if (targetCheckResult !== 'valid') {
         let errorMsg = "Recipient could not be verified.";
         if (targetCheckResult === 'invalid') errorMsg = `User/Phone "${targetIdentifier}" not found in Carpso system.`;
         if (targetCheckResult === 'error') errorMsg = `Error verifying recipient/phone "${targetIdentifier}".`;
         toast({ title: "Recipient Not Found", description: errorMsg, variant: "destructive" });
         return;
       }


      if (amount === '' || amount <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
        return;
      }

      if (amount > currentBalance) {
          toast({ title: "Insufficient Balance", description: `You only have K ${currentBalance.toFixed(2)} available.`, variant: "destructive" }); // Use K symbol
          return;
      }


    setIsLoading(true);

    try {
      // Assuming sendMoney now returns the transaction details along with the new balance
      const { newBalance, transaction } = await sendMoney(userId, targetIdentifier, amount, note);

      const transactionForReceipt = {
           ...transaction,
           newBalance,
           currency: 'ZMW', // Assuming base currency is ZMW
           note: note, // Include note for receipt
      };
      setLastTransaction(transactionForReceipt);

      const recipientName = availableUsers.find(u => u.id === recipientIdentifier)?.name || recipientIdentifier;

      toast({
          title: "Money Sent Successfully",
          description: (
               <div className="flex flex-col gap-2">
                  <span>
                     K {amount.toFixed(2)} sent to {recipientName}. New balance: K {newBalance.toFixed(2)} {/* Use K symbol */}
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
       // Reset form state after closing handled by useEffect[isOpen]
    } catch (error: any) {
      console.error("Error sending money:", error);
      toast({ title: "Send Money Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

    // Determine if submit button should be disabled
    const canSubmit = !isLoading &&
                       isOnline &&
                       amount !== '' &&
                       amount > 0 &&
                       amount <= currentBalance &&
                       targetIdentifier !== '' &&
                       targetCheckResult === 'valid'; // Target must be valid

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" /> Send Money
          </DialogTitle>
          <DialogDescription>
             Send funds from your Carpso wallet. Balance: K {currentBalance.toFixed(2)}. {/* Use K symbol */}
             {!isOnline && <span className="text-destructive font-medium ml-1">(Offline)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
            {/* Recipient Type Selection */}
            <div className="flex gap-2">
                <Button
                    variant={recipientType === 'user' ? 'default' : 'outline'}
                    onClick={() => { setRecipientType('user'); setRecipientPhone(''); setTargetCheckResult(null); }} // Clear other field on switch
                    className="flex-1"
                    disabled={isLoading || !isOnline}
                >
                   <Users className="mr-2 h-4 w-4" /> Select User
                </Button>
                 <Button
                    variant={recipientType === 'phone' ? 'default' : 'outline'}
                    onClick={() => { setRecipientType('phone'); setSelectedUserId(''); setTargetCheckResult(null); }} // Clear other field on switch
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
                     <div className="relative">
                        <Input
                            id="recipientPhone"
                            type="tel"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            placeholder="e.g., 09XXXXXXXX"
                            disabled={isLoading || !isOnline}
                            className="pr-8" // Add padding for loader
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
                          {targetCheckResult === 'valid' && `User/Phone "${targetIdentifier}" found.`}
                          {targetCheckResult === 'invalid' && `User/Phone "${targetIdentifier}" not found in Carpso system.`}
                          {targetCheckResult === 'error' && `Error verifying recipient/phone "${targetIdentifier}".`}
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
               <Label htmlFor="amount">Amount (K)</Label> {/* Use K symbol */}
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
          <Button onClick={handleSubmit} disabled={!canSubmit}> {/* Use derived canSubmit state */}
             {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send K {amount || 0} {/* Use K symbol */}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
