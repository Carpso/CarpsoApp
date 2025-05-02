// src/components/wallet/TopUpModal.tsx
'use client';

import React, { useState, useContext } from 'react';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, PlusCircle, WifiOff, Fingerprint, Nfc, CreditCard, Printer } from 'lucide-react'; // Added Printer icon
import { useToast } from '@/hooks/use-toast';
import { topUpWallet } from '@/services/wallet-service';
import { cn } from '@/lib/utils';
import { AppStateContext } from '@/context/AppStateProvider';
import Receipt from '@/components/common/Receipt'; // Import Receipt component

// Import simulated Telco/Bank Logos (replace with actual SVGs/images if needed)
const MtnLogo = () => <span className="font-bold text-yellow-500">MTN</span>;
const AirtelLogo = () => <span className="font-bold text-red-600">Airtel</span>;
const ZamtelLogo = () => <span className="font-bold text-green-600">Zamtel</span>;
const VisaLogo = () => <span className="font-bold text-blue-800 italic">VISA</span>;


interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentBalance: number;
  currency: string; // Base currency (ZMW)
  onSuccess: () => void; // Callback to refresh data
}

const PRESET_AMOUNTS_ZMW = [50, 100, 200, 500, 1000]; // Adjusted presets for ZMW
// Expanded Payment Methods for POS context
const PAYMENT_METHODS = [
    { value: 'mobile_money_mtn', label: 'MTN Mobile Money', icon: MtnLogo },
    { value: 'mobile_money_airtel', label: 'Airtel Money', icon: AirtelLogo },
    { value: 'mobile_money_zamtel', label: 'Zamtel Kwacha', icon: ZamtelLogo },
    { value: 'card_visa_contactless', label: 'Visa (Tap to Pay)', icon: Nfc }, // Tap-to-Pay
    { value: 'card_visa_chip', label: 'Visa (Chip/Swipe)', icon: CreditCard }, // Chip/Swipe
];


export default function TopUpModal({
    isOpen,
    onClose,
    userId,
    currentBalance,
    currency, // Base currency (should be ZMW)
    onSuccess
}: TopUpModalProps) {
  const { isOnline } = useContext(AppStateContext)!;
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedMethod, setSelectedMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [customAmountSelected, setCustomAmountSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [posStatus, setPosStatus] = useState<string | null>(null); // Status for POS interactions
  const [lastTransaction, setLastTransaction] = useState<any | null>(null); // Store last successful transaction for receipt
  const { toast } = useToast();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value === '' ? '' : Number(value));
    setCustomAmountSelected(true); // Select custom amount if typed
  };

  const handlePresetAmountClick = (preset: number) => {
      setAmount(preset);
      setCustomAmountSelected(false); // Deselect custom amount
  };

  const handleMethodChange = (value: string) => {
      setSelectedMethod(value);
      setPosStatus(null); // Reset POS status when method changes
  };

  // --- Simulate Printing ---
   const handlePrintReceipt = (transaction: any) => {
       if (!transaction) return;

       // In a real app:
       // 1. Check if running in a native POS context. If yes, use the POS SDK to print.
       // 2. Check if running in a native mobile context. If yes, use Bluetooth printer plugin/SDK.
       // 3. If web-based, generate HTML receipt and use window.print().

       console.log("Simulating print receipt for:", transaction);
       // Render Receipt component to a hidden iframe or new window for printing
       const printWindow = window.open('', '_blank', 'height=600,width=400');
       if (printWindow) {
            printWindow.document.write('<html><head><title>Print Receipt</title>');
            // Add minimal styles for printing
            printWindow.document.write('<style>body{font-family:sans-serif;margin:1rem;}h2,h3{margin-bottom:0.5rem;}p{margin:0.2rem 0;}hr{border:none;border-top:1px dashed #ccc;margin:0.5rem 0;}</style>');
            printWindow.document.write('</head><body>');
            // Create a temporary div to render the React component into
            const receiptContainer = printWindow.document.createElement('div');
            printWindow.document.body.appendChild(receiptContainer);

            // Use ReactDOM.render (or createRoot for React 18+) to render the component
            // This is a simplified example; direct DOM manipulation might be easier here
            // For simplicity, just write the HTML content directly (less clean)
            const receiptHtml = `
                <h2>Top-Up Receipt</h2>
                <p><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
                <hr />
                <p><strong>Amount:</strong> K ${transaction.amount.toFixed(2)}</p> {/* Use K symbol */}
                <p><strong>Method:</strong> ${transaction.paymentMethodLabel}</p>
                <hr />
                <p><strong>New Balance:</strong> K ${transaction.newBalance.toFixed(2)}</p> {/* Use K symbol */}
                <p><strong>Transaction ID:</strong> ${transaction.id.substring(0, 8)}...</p>
                <hr />
                <p style="text-align:center; font-size: 0.8em;">Thank you for using Carpso!</p>
            `;
            printWindow.document.body.innerHTML = receiptHtml; // Overwrite body with generated HTML
            printWindow.document.close(); // Necessary for some browsers
            printWindow.focus(); // Necessary for some browsers
            printWindow.print();
            // printWindow.close(); // Optionally close window after print dialog
       } else {
           toast({ title: "Print Error", description: "Could not open print window. Check browser pop-up settings.", variant: "destructive" });
       }

       toast({ title: "Printing Receipt...", description: "Browser print dialog should open.", duration: 3000 });
   };
   // --- End Simulate Printing ---

  const handleSubmit = async () => {
    setLastTransaction(null); // Clear previous transaction before starting
    // Simulate POS interaction for specific methods BEFORE calling the service
    if (selectedMethod.includes('card_') || selectedMethod.includes('fingerprint')) {
        // --- NATIVE POS INTEGRATION REQUIRED ---
        // This block simulates what would happen in the native Android wrapper
        setPosStatus(`Waiting for ${selectedMethod.split('_').slice(1).join(' ')}...`); // e.g., "Waiting for card tap..."
        console.log(`Simulating POS action for method: ${selectedMethod}`);
        await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate hardware interaction time
        const posSuccess = Math.random() > 0.15; // Simulate POS success/failure
        if (!posSuccess) {
             setPosStatus(`POS ${selectedMethod.split('_').slice(1).join(' ')} failed. Try again.`);
             toast({ title: "POS Interaction Failed", description: "Could not complete payment via POS.", variant: "destructive" });
             setIsLoading(false); // Allow retry
             return;
        }
        setPosStatus(`${selectedMethod.split('_').slice(1).join(' ')} successful! Processing...`);
        console.log("Simulated POS action successful.");
        // --- END NATIVE POS INTEGRATION SIMULATION ---
    }

    // Proceed with the top-up logic (calling the mock service)
    if (!isOnline) {
         toast({ title: "Offline", description: "Cannot top up wallet while offline.", variant: "destructive" });
         setPosStatus(null); // Clear POS status if offline
         return;
    }
    if (amount === '' || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
       setPosStatus(null);
      return;
    }
    if (!selectedMethod) {
         toast({ title: "No Method Selected", description: "Please select a payment method.", variant: "destructive" });
          setPosStatus(null);
         return;
    }

    setIsLoading(true);
    const methodLabel = PAYMENT_METHODS.find(m => m.value === selectedMethod)?.label || 'Unknown Method';

    try {
      // Pass the specific method value (e.g., 'card_visa_contactless')
      const { newBalance, transaction } = await topUpWallet(userId, amount, selectedMethod); // Assume service returns transaction details

      // Store transaction details for printing
       const transactionForReceipt = {
           ...transaction,
           newBalance, // Add new balance for receipt context
           currency: 'ZMW', // Assuming base currency is ZMW
           paymentMethodLabel: methodLabel,
       };
       setLastTransaction(transactionForReceipt);


      toast({
          title: "Top Up Successful",
          description: (
             <div className="flex flex-col gap-2">
                 <span>
                    K {amount.toFixed(2)} added via {methodLabel}. New balance: K {newBalance.toFixed(2)} {/* Use K symbol */}
                 </span>
                 {/* Add Print Button to Toast */}
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
          duration: 8000, // Increase duration to allow printing
      });

      onSuccess(); // Refresh wallet data in profile
      onClose(); // Close modal
      // Reset form state after closing
        setTimeout(() => {
            setAmount('');
            setSelectedMethod(PAYMENT_METHODS[0].value);
            setCustomAmountSelected(false);
            setPosStatus(null);
        }, 300);
    } catch (error: any) {
      console.error("Error topping up wallet:", error);
      toast({ title: "Top Up Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      setPosStatus(null); // Clear POS status on error
    } finally {
      setIsLoading(false);
      // Don't clear POS status immediately on finally if it indicates success
    }
  };

  // Determine if the button should show POS interaction text
   const isPosInteractionMethod = selectedMethod.includes('card_') || selectedMethod.includes('fingerprint');
   const buttonText = isPosInteractionMethod ? `Initiate POS Payment` : `Proceed to Top Up K ${amount || 0}`; // Use K symbol


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !posStatus?.startsWith('Waiting') && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" /> Top Up Wallet
          </DialogTitle>
          <DialogDescription>
             Current Balance: K {currentBalance.toFixed(2)}. Add funds to your Carpso wallet. {/* Use K symbol */}
              {!isOnline && <span className="text-destructive font-medium ml-1">(Offline)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
           {/* Amount Selection */}
            <div className="space-y-2">
               <Label>Amount (K)</Label> {/* Use K symbol */}
               <div className="flex flex-wrap gap-2">
                  {PRESET_AMOUNTS_ZMW.map(preset => (
                      <Button
                          key={preset}
                          variant={amount === preset && !customAmountSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePresetAmountClick(preset)}
                          disabled={isLoading || !!posStatus || !isOnline}
                          className="flex-1 min-w-[60px]"
                      >
                         {preset}
                      </Button>
                  ))}
               </div>
                <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder={`Or enter custom amount`}
                    disabled={isLoading || !!posStatus || !isOnline}
                    min="1" // Example minimum top-up
                    step="0.01"
                    className={cn("mt-2", customAmountSelected && "border-primary ring-1 ring-primary")}
                 />
            </div>

           {/* Payment Method Selection */}
           <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup value={selectedMethod} onValueChange={handleMethodChange} disabled={isLoading || !!posStatus || !isOnline}>
                     {PAYMENT_METHODS.map(method => {
                         const Icon = method.icon;
                         const isPosOnly = method.value.includes('fingerprint'); // Add more POS-only methods if needed
                         return (
                             <Label
                                key={method.value}
                                htmlFor={method.value}
                                className={cn(
                                    "flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                                    selectedMethod === method.value && "border-primary ring-1 ring-primary bg-muted/50",
                                    (isLoading || !!posStatus || !isOnline) && "opacity-50 cursor-not-allowed" // Simplified disable logic
                                )}
                             >
                                <RadioGroupItem value={method.value} id={method.value} disabled={isLoading || !!posStatus || !isOnline} /> {/* Simplified disable logic */}
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{method.label}</span>
                             </Label>
                         );
                     })}
                     {/* Placeholder/Info for Fingerprint - Requires Native */}
                    <div
                        className={cn(
                            "flex items-center space-x-3 p-3 border rounded-md opacity-50 cursor-not-allowed"
                        )}
                        title="Requires native POS integration"
                    >
                        <RadioGroupItem value="fingerprint_auth" id="fingerprint_auth" disabled={true} />
                        <Fingerprint className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Fingerprint Auth</span>
                        <span className="text-xs text-muted-foreground ml-auto">(POS Device Required)</span>
                    </div>
                </RadioGroup>
           </div>
            <p className="text-xs text-muted-foreground">
                {isPosInteractionMethod
                    ? "Payment will be processed via the connected POS terminal."
                    : "You may be redirected or prompted by your provider to complete the payment."}
            </p>
             {/* POS Status Indicator */}
            {posStatus && (
                 <div className="text-sm font-medium text-center text-primary flex items-center justify-center gap-2 mt-2">
                     {posStatus.startsWith('Waiting') || posStatus.includes('Processing') ? <Loader2 className="h-4 w-4 animate-spin"/> : null}
                     {posStatus}
                 </div>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading || !!posStatus?.startsWith('Waiting')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !!posStatus || !isOnline || amount === '' || amount <= 0}>
             {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : (isLoading || !!posStatus) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
             {posStatus && !posStatus.includes('failed') ? 'Processing...' : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
