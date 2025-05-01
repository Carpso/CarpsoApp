// src/components/wallet/TopUpModal.tsx
'use client';

import React, { useState } from 'react';
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
import { Loader2, PlusCircle, Smartphone, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { topUpWallet } from '@/services/wallet-service';
import { cn } from '@/lib/utils';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentBalance: number;
  currency: string;
  onSuccess: () => void; // Callback to refresh data
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];
const PAYMENT_METHODS = [
    { value: 'mobile_money_mtn', label: 'MTN Mobile Money', icon: Smartphone },
    { value: 'mobile_money_airtel', label: 'Airtel Money', icon: Smartphone },
    { value: 'card_visa', label: 'Visa Card', icon: CreditCard },
];

export default function TopUpModal({
    isOpen,
    onClose,
    userId,
    currentBalance,
    currency,
    onSuccess
}: TopUpModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedMethod, setSelectedMethod] = useState<string>(PAYMENT_METHODS[0].value);
  const [customAmountSelected, setCustomAmountSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
  };

  const handleSubmit = async () => {
    if (amount === '' || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
      return;
    }
    if (!selectedMethod) {
         toast({ title: "No Method Selected", description: "Please select a payment method.", variant: "destructive" });
         return;
    }

    setIsLoading(true);
    const methodLabel = PAYMENT_METHODS.find(m => m.value === selectedMethod)?.label || 'Unknown Method';

    try {
      const newBalance = await topUpWallet(userId, amount, methodLabel);
      toast({
          title: "Top Up Successful",
          description: `${currency} ${amount.toFixed(2)} added. New balance: ${currency} ${newBalance.toFixed(2)}`,
      });
      onSuccess(); // Refresh wallet data in profile
      onClose(); // Close modal
      // Reset form state after closing
        setTimeout(() => {
            setAmount('');
            setSelectedMethod(PAYMENT_METHODS[0].value);
            setCustomAmountSelected(false);
        }, 300);
    } catch (error: any) {
      console.error("Error topping up wallet:", error);
      toast({ title: "Top Up Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" /> Top Up Wallet
          </DialogTitle>
          <DialogDescription>
             Current Balance: {currency} {currentBalance.toFixed(2)}. Add funds to your Carpso wallet.
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
                          disabled={isLoading}
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
                    disabled={isLoading}
                    min="1" // Example minimum top-up
                    step="0.01"
                    className={cn("mt-2", customAmountSelected && "border-primary ring-1 ring-primary")}
                 />
            </div>

           {/* Payment Method Selection */}
           <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup value={selectedMethod} onValueChange={handleMethodChange} disabled={isLoading}>
                     {PAYMENT_METHODS.map(method => {
                         const Icon = method.icon;
                         return (
                             <Label
                                key={method.value}
                                htmlFor={method.value}
                                className={cn(
                                    "flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                                    selectedMethod === method.value && "border-primary ring-1 ring-primary bg-muted/50",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                )}
                             >
                                <RadioGroupItem value={method.value} id={method.value} disabled={isLoading} />
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">{method.label}</span>
                             </Label>
                         );
                     })}
                </RadioGroup>
           </div>
            <p className="text-xs text-muted-foreground">
                You will be redirected or prompted by your provider to complete the payment.
            </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || amount === '' || amount <= 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Proceed to Top Up {currency} {amount || 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}