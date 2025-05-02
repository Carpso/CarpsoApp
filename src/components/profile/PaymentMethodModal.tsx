// src/components/profile/PaymentMethodModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Trash2, CreditCard, Smartphone, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod } from '@/services/wallet-service'; // Import type
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentMethods: PaymentMethod[];
  preferredMethodId?: string;
  onSave: (updatedMethods: PaymentMethod[], newPreferredId?: string) => Promise<void>; // Updated save handler
}

export default function PaymentMethodModal({
    isOpen,
    onClose,
    userId,
    currentMethods,
    preferredMethodId,
    onSave
}: PaymentMethodModalProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [newMethodType, setNewMethodType] = useState<'Card' | 'MobileMoney'>('Card');
  const [newMethodDetails, setNewMethodDetails] = useState('');
  const [editingPreferredId, setEditingPreferredId] = useState<string | undefined>(preferredMethodId); // Local state for editing preference
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false); // State for adding loading
  const [showAddForm, setShowAddForm] = useState(false); // Toggle add form visibility
  const { toast } = useToast();

  useEffect(() => {
    // Initialize local state when modal opens or current methods change
    if (isOpen) {
      setMethods([...currentMethods]); // Use spread to create a copy
      setEditingPreferredId(preferredMethodId); // Reset preferred selection on open
      setShowAddForm(false); // Hide add form initially
      setNewMethodDetails(''); // Clear add form details
    }
  }, [isOpen, currentMethods, preferredMethodId]);

  const handleAddMethod = () => {
    if (!newMethodDetails) {
      toast({ title: "Missing Details", description: "Please enter payment method details.", variant: "destructive" });
      return;
    }
    setIsAdding(true); // Start adding loader

    // Simulate adding - in real app, call API to add and verify method
    const newId = `pm_${Date.now()}`;
    const newMethod: PaymentMethod = {
      id: newId,
      type: newMethodType,
      details: newMethodDetails,
      isPrimary: methods.length === 0, // Make first added method primary by default
    };

    // Simulate delay
    setTimeout(() => {
      setMethods(prev => [...prev, newMethod]);
      // If this is the first method added, also update the preferred ID locally
      if (methods.length === 0) {
          setEditingPreferredId(newId);
      }
      setNewMethodDetails(''); // Clear input
      setShowAddForm(false); // Hide form after adding
      setIsAdding(false); // Stop adding loader
      toast({ title: "Method Added", description: `${newMethodType} ending in ${newMethodDetails.slice(-4)} added.`});
    }, 500);
  };

  const handleRemoveMethod = (id: string) => {
     // Prevent removing the last method or the primary method (optional, enforce having one?)
     if (methods.length <= 1) {
          toast({ title: "Cannot Remove", description: "You must have at least one payment method.", variant: "destructive" });
          return;
     }
     if (id === editingPreferredId) {
          toast({ title: "Cannot Remove", description: "Cannot remove the primary payment method. Set another as primary first.", variant: "destructive" });
          return;
     }
     setMethods(prev => prev.filter(method => method.id !== id));
     toast({ title: "Method Removed"});
  };

  const handleSetPrimary = (id: string) => {
    setEditingPreferredId(id); // Update local state for primary selection
  };

  const handleSaveChanges = async () => {
      // Check if a primary method is selected if there are methods
      if (methods.length > 0 && !editingPreferredId) {
           toast({ title: "Primary Method Required", description: "Please select a primary payment method.", variant: "destructive" });
           return;
      }

      setIsSaving(true);
      // Update isPrimary flag based on local editingPreferredId
      const finalMethods = methods.map(m => ({ ...m, isPrimary: m.id === editingPreferredId }));
      try {
          await onSave(finalMethods, editingPreferredId); // Pass both updated methods and the preferred ID
          // onSuccess toast is handled in ProfilePage after successful save
          onClose(); // Close modal on successful save
      } catch (error) {
           // Error toast handled in ProfilePage
           console.error("Error saving payment methods:", error);
      } finally {
           setIsSaving(false);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Payment Methods</DialogTitle>
          <DialogDescription>
            Add, remove, or set your primary payment method.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="py-4 space-y-4">
                {/* List Current Methods */}
                {methods.length > 0 ? (
                    <RadioGroup value={editingPreferredId} onValueChange={handleSetPrimary} disabled={isSaving}>
                        <Label className="mb-2 block text-sm font-medium">Select Primary Method:</Label>
                        {methods.map((method) => (
                            <div key={method.id} className="flex items-center justify-between p-3 border rounded-md">
                                <Label htmlFor={`pm-${method.id}`} className="flex items-center gap-3 cursor-pointer flex-grow">
                                    <RadioGroupItem value={method.id} id={`pm-${method.id}`} disabled={isSaving}/>
                                    {method.type === 'Card' ? <CreditCard className="h-5 w-5 text-muted-foreground" /> : <Smartphone className="h-5 w-5 text-muted-foreground" />}
                                    <span className="text-sm">{method.details}</span>
                                    {method.id === editingPreferredId && <Star className="h-4 w-4 text-yellow-500 ml-1" />}
                                </Label>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive flex-shrink-0"
                                    onClick={() => handleRemoveMethod(method.id)}
                                    disabled={isSaving || method.id === editingPreferredId || methods.length <= 1}
                                    aria-label={`Remove ${method.details}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </RadioGroup>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No payment methods added yet.</p>
                )}

                {/* Add New Method Form Toggle */}
                {!showAddForm ? (
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)} disabled={isSaving || isAdding} className="w-full mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Method
                    </Button>
                ) : (
                    <Card className="mt-4 p-4 border-dashed">
                        <h4 className="text-sm font-medium mb-3">Add New Payment Method</h4>
                        <div className="space-y-3">
                            <Select value={newMethodType} onValueChange={(value) => setNewMethodType(value as 'Card' | 'MobileMoney')} disabled={isAdding}>
                                <SelectTrigger><SelectValue placeholder="Select method type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="MobileMoney">Mobile Money</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                value={newMethodDetails}
                                onChange={(e) => setNewMethodDetails(e.target.value)}
                                placeholder={newMethodType === 'Card' ? "Card Number (e.g., **** **** **** 1234)" : "Phone Number (e.g., 09...)"}
                                disabled={isAdding}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} disabled={isAdding}>Cancel</Button>
                                <Button size="sm" onClick={handleAddMethod} disabled={isAdding || !newMethodDetails}>
                                    {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Add Method
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSaveChanges} disabled={isSaving || (methods.length > 0 && !editingPreferredId)}>
             {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
