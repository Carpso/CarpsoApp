// src/components/auth/AuthModal.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, Nfc, Loader2, Smartphone, Car } from 'lucide-react'; // Added Car icon for license plate
import { useToast } from '@/hooks/use-toast';
import { checkPlateWithAuthority } from '@/services/authority-check'; // Import the authority check service

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userId: string, name?: string, avatarUrl?: string, role?: string) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Added for sign up
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [licensePlate, setLicensePlate] = useState(''); // Added for license plate sign in
  const [rfidStatus, setRfidStatus] = useState<'idle' | 'scanning' | 'scanned' | 'error'>('idle');
  const { toast } = useToast();

  // --- MOCK AUTH FUNCTIONS (Replace with real backend calls) ---

  // Mock Sign In: Returns basic user info
  const mockSignIn = async (method: 'email' | 'phone' | 'rfid' | 'mobileMoney' | 'licensePlate'): Promise<{ success: boolean, user?: { id: string, name: string, avatarUrl?: string, role: string } }> => {
    console.log(`Simulating sign in with ${method}:`, { email, phone, mobileMoneyNumber, licensePlate });
    setIsLoading(true); // Moved isLoading here to cover authority check
    let userFound = false;
    let simulatedUser: { id: string, name: string, avatarUrl?: string, role: string } | undefined;

    // Simulate checking with authority API for license plate
    if (method === 'licensePlate' && licensePlate) {
        try {
            const plateDetails = await checkPlateWithAuthority(licensePlate);
            if (plateDetails) {
                // Simulate finding a user associated with this plate
                 const userId = `user_plate_${licensePlate.replace(/\s+/g, '')}`;
                 simulatedUser = {
                     id: userId,
                     name: plateDetails.registeredOwner || `Driver ${licensePlate}`,
                     avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
                     role: 'User' // Or fetch actual role if available
                 };
                 userFound = true;
                 console.log("User found via license plate:", simulatedUser);
            } else {
                 console.log("License plate not found or no associated user.");
            }
        } catch (error) {
            console.error("Error during license plate check:", error);
            toast({ title: "Sign In Error", description: "Could not verify license plate. Please try another method.", variant: "destructive" });
            setIsLoading(false);
            return { success: false };
        }
    } else if (method !== 'licensePlate') {
         // Simulate other sign-in methods
         await new Promise(resolve => setTimeout(resolve, 1500));
         userFound = Math.random() > 0.3; // 70% success rate for other methods
         if (userFound) {
             const userId = `user_${Math.random().toString(36).substring(7)}`;
             simulatedUser = {
                 id: userId,
                 name: email.split('@')[0] || phone || mobileMoneyNumber || `User ${userId.substring(0, 4)}`,
                 avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
                 role: email.includes('admin') ? 'Admin' : email.includes('owner') ? 'ParkingLotOwner' : 'User'
             };
         }
    }

    setIsLoading(false);

    if (userFound && simulatedUser) {
        return { success: true, user: simulatedUser };
    } else {
        return { success: false };
    }
  };

  // Mock Sign Up: Returns basic user info
  const mockSignUp = async (method: 'email' | 'phone' | 'mobileMoney'): Promise<{ success: boolean, user?: { id: string, name: string, avatarUrl?: string, role: string } }> => {
     console.log(`Simulating sign up with ${method}:`, { name, email, phone, mobileMoneyNumber });
     setIsLoading(true);
     await new Promise(resolve => setTimeout(resolve, 1500));
     const success = Math.random() > 0.3;
     let simulatedUser: { id: string, name: string, avatarUrl?: string, role: string } | undefined;

     if (success) {
         const userId = `user_${Math.random().toString(36).substring(7)}`;
         simulatedUser = {
             id: userId,
             name: name || email.split('@')[0] || phone || mobileMoneyNumber || `User ${userId.substring(0, 4)}`,
             avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
             role: 'User'
         };
     }
     setIsLoading(false);

     if (success && simulatedUser) {
         return { success: true, user: simulatedUser };
     } else {
         return { success: false };
     }
  };
  // --- END MOCK AUTH FUNCTIONS ---


  const handleSignIn = async (method: 'email' | 'phone' | 'rfid' | 'mobileMoney' | 'licensePlate') => {
    // isLoading is now set inside mockSignIn
    const result = await mockSignIn(method);

    if (result.success && result.user) {
      toast({ title: "Sign In Successful", description: `Welcome back, ${result.user.name}!` });
      onAuthSuccess(result.user.id, result.user.name, result.user.avatarUrl, result.user.role); // Pass user details
      onClose();
    } else {
      toast({ title: "Sign In Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
    }
    // isLoading is reset inside mockSignIn
  };

   const handleSignUp = async (method: 'email' | 'phone' | 'mobileMoney') => {
     if (method === 'email' && !name) {
        toast({ title: "Missing Information", description: "Please enter your name.", variant: "destructive" });
        return;
     }

    // isLoading is now set inside mockSignUp
    const result = await mockSignUp(method);

    if (result.success && result.user) {
       toast({ title: "Sign Up Successful", description: "Your account has been created." });
       onAuthSuccess(result.user.id, result.user.name, result.user.avatarUrl, result.user.role); // Pass user details
       onClose();
       // Clear form fields after successful signup
        setName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setMobileMoneyNumber('');
        setLicensePlate(''); // Clear license plate too
    } else {
       toast({ title: "Sign Up Failed", description: "Could not create account. Please try again.", variant: "destructive" });
    }
    // isLoading is reset inside mockSignUp
  };


  const handleRfidScan = async () => {
      setRfidStatus('scanning');
      setIsLoading(true); // Disable other buttons during scan
       console.log("Scanning for RFID tag...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      const found = Math.random() > 0.4;
      if (found) {
          setRfidStatus('scanned');
           console.log("RFID tag scanned successfully.");
           setIsLoading(false); // Re-enable buttons
          await handleSignIn('rfid'); // Attempt sign-in with simulated tag data
      } else {
          setRfidStatus('error');
          console.error("RFID scan failed or timed out.");
          toast({title: "RFID Scan Failed", description: "No RFID tag detected. Please try again.", variant: "destructive"});
          setIsLoading(false); // Re-enable buttons
      }
      // Reset status after a short delay if still scanning or error
      setTimeout(() => {
           if (rfidStatus === 'scanning' || rfidStatus === 'error') setRfidStatus('idle');
      }, 2000);
  }

   // Reset form state when dialog closes
   const handleDialogClose = (open: boolean) => {
       if (!open) {
            setName('');
            setEmail('');
            setPassword('');
            setPhone('');
            setMobileMoneyNumber('');
            setLicensePlate('');
            setRfidStatus('idle');
            setIsLoading(false); // Ensure loading state is reset
            onClose(); // Call the original onClose handler
       }
   }


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign In / Sign Up</DialogTitle>
          <DialogDescription>
            Access your Carpso account or create a new one.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* Sign In Tab */}
          <TabsContent value="signin">
            <div className="space-y-4 py-4">
               {/* Email/Password Sign In */}
               <div className="space-y-2">
                 <Label htmlFor="signin-email">Email</Label>
                 <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="signin-password">Password</Label>
                 <Input id="signin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
               </div>
               <Button onClick={() => handleSignIn('email')} disabled={isLoading || !email || !password} className="w-full">
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Sign In with Email
               </Button>

               <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
              </div>

               {/* License Plate Sign In */}
                <div className="space-y-2">
                    <Label htmlFor="signin-license-plate">License Plate</Label>
                    <Input
                        id="signin-license-plate"
                        type="text"
                        placeholder="e.g., ABX 1234"
                        value={licensePlate}
                        onChange={e => setLicensePlate(e.target.value.toUpperCase())}
                        disabled={isLoading}
                        className="uppercase"
                    />
                </div>
                <Button onClick={() => handleSignIn('licensePlate')} disabled={isLoading || !licensePlate} variant="outline" className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Car className="mr-2 h-4 w-4" />} Sign In with License Plate
                </Button>

              {/* Phone Sign In */}
              <div className="space-y-2">
                 <Label htmlFor="signin-phone">Phone Number</Label>
                 <Input id="signin-phone" type="tel" placeholder="+1 123 456 7890" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
              </div>
              <Button onClick={() => handleSignIn('phone')} disabled={isLoading || !phone} variant="outline" className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />} Sign In with Phone
              </Button>

               {/* Mobile Money Sign In */}
                <div className="space-y-2">
                    <Label htmlFor="signin-mobile-money">Mobile Money Number</Label>
                    <Input id="signin-mobile-money" type="tel" placeholder="e.g., 07XX XXX XXX" value={mobileMoneyNumber} onChange={e => setMobileMoneyNumber(e.target.value)} disabled={isLoading} />
                </div>
                <Button onClick={() => handleSignIn('mobileMoney')} disabled={isLoading || !mobileMoneyNumber} variant="outline" className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />} Sign In with Mobile Money
                </Button>

               {/* RFID Sign In */}
                <Button onClick={handleRfidScan} disabled={isLoading || rfidStatus === 'scanning'} variant="secondary" className="w-full">
                 {rfidStatus === 'scanning' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Nfc className="mr-2 h-4 w-4" />}
                 {rfidStatus === 'scanning' ? 'Scanning RFID...' : rfidStatus === 'scanned' ? 'Tag Scanned!' : rfidStatus === 'error' ? 'Scan Failed' : 'Sign In with RFID'}
               </Button>
               {rfidStatus === 'scanning' && <p className="text-xs text-center text-muted-foreground">Hold your RFID tag near the reader...</p>}
            </div>
          </TabsContent>

          {/* Sign Up Tab */}
           <TabsContent value="signup">
             <div className="space-y-4 py-4">
                 {/* Name Field */}
                 <div className="space-y-2">
                   <Label htmlFor="signup-name">Full Name</Label>
                   <Input id="signup-name" type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} disabled={isLoading}/>
                 </div>

               {/* Email/Password Sign Up */}
               <div className="space-y-2">
                 <Label htmlFor="signup-email">Email</Label>
                 <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading}/>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="signup-password">Password</Label>
                 <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading}/>
               </div>
               <Button onClick={() => handleSignUp('email')} disabled={isLoading || !email || !password || !name} className="w-full">
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Sign Up with Email
               </Button>

               <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or sign up with</span>
                  </div>
              </div>

                {/* Phone Sign Up */}
                <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <Input id="signup-phone" type="tel" placeholder="+1 123 456 7890" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading}/>
                </div>
               <Button onClick={() => handleSignUp('phone')} disabled={isLoading || !phone} variant="outline" className="w-full">
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />} Sign Up with Phone
               </Button>

               {/* Mobile Money Sign Up */}
               <div className="space-y-2">
                    <Label htmlFor="signup-mobile-money">Mobile Money Number</Label>
                    <Input id="signup-mobile-money" type="tel" placeholder="e.g., 07XX XXX XXX" value={mobileMoneyNumber} onChange={e => setMobileMoneyNumber(e.target.value)} disabled={isLoading} />
                </div>
                <Button onClick={() => handleSignUp('mobileMoney')} disabled={isLoading || !mobileMoneyNumber} variant="outline" className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />} Sign Up with Mobile Money
                </Button>
                 {/* Note: License plate sign-up is implicitly handled by sign-in if plate is recognized */}
             </div>
           </TabsContent>
        </Tabs>

        <DialogFooter>
            {/* Optional social logins or other methods here */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
