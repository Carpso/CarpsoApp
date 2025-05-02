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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, PlusCircle, Smartphone, CreditCard, WifiOff, Fingerprint, Nfc } from 'lucide-react'; // Added Fingerprint, Nfc
import { useToast } from '@/hooks/use-toast';
import { topUpWallet } from '@/services/wallet-service';
import { cn } from '@/lib/utils';
import { AppStateContext } from '@/context/AppStateProvider';

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
  currency: string;
  onSuccess: () => void; // Callback to refresh data
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];
// Expanded Payment Methods for POS context
const PAYMENT_METHODS = [
    { value: 'mobile_money_mtn', label: 'MTN Mobile Money', icon: MtnLogo },
    { value: 'mobile_money_airtel', label: 'Airtel Money', icon: AirtelLogo },
    { value: 'mobile_money_zamtel', label: 'Zamtel Kwacha', icon: ZamtelLogo },
    { value: 'card_visa_contactless', label: 'Visa (Tap to Pay)', icon: Nfc }, // Tap-to-Pay
    { value: 'card_visa_chip', label: 'Visa (Chip/Swipe)', icon: CreditCard }, // Chip/Swipe
    // { value: 'fingerprint_auth', label: 'Fingerprint (POS Only)', icon: Fingerprint }, // Fingerprint - Requires native POS integration
];


export default function TopUpModal({
    isOpen,
    onClose,
    userId,
    currentBalance,
    currency,
    onSuccess
}: TopUpModalProps) {
  const { isOnline } = useContext(AppStateContext)!;
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedMethod, setSelectedMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [customAmountSelected, setCustomAmountSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [posStatus, setPosStatus] = useState<string | null>(null); // Status for POS interactions
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

  const handleSubmit = async () => {
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
      const newBalance = await topUpWallet(userId, amount, selectedMethod);
      toast({
          title: "Top Up Successful",
          description: `${currency} ${amount.toFixed(2)} added via ${methodLabel}. New balance: ${currency} ${newBalance.toFixed(2)}`,
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
   const buttonText = isPosInteractionMethod ? `Initiate POS Payment` : `Proceed to Top Up ${currency} ${amount || 0}`;


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !posStatus?.startsWith('Waiting') && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" /> Top Up Wallet
          </DialogTitle>
          <DialogDescription>
             Current Balance: {currency} {currentBalance.toFixed(2)}. Add funds to your Carpso wallet.
              {!isOnline && <span className="text-destructive font-medium ml-1">(Offline)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
           {/* Amount Selection */}
            <div className="space-y-2">
               <Label>Amount ({currency})</Label>
               <div className="flex flex-wrap gap-2">
                  {PRESET_AMOUNTS.map(preset => (
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
                                    (isLoading || !!posStatus || !isOnline || isPosOnly /* Disable POS only methods in web view */) && "opacity-50 cursor-not-allowed"
                                )}
                             >
                                <RadioGroupItem value={method.value} id={method.value} disabled={isLoading || !!posStatus || !isOnline || isPosOnly} />
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{method.label}</span>
                                {/* {isPosOnly && <span className="text-xs text-muted-foreground ml-auto">(POS Only)</span>} */}
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

    