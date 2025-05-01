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
import { Phone, Mail, Nfc, Loader2, Smartphone, Car, Users } from 'lucide-react'; // Added Car, Users icons
import { useToast } from '@/hooks/use-toast';
import { checkPlateWithAuthority } from '@/services/authority-check'; // Import the authority check service
import { Switch } from '@/components/ui/switch'; // Import Switch for multiple cars option
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select for role/purpose


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
  const [licensePlate, setLicensePlate] = useState(''); // Added for license plate sign in/sign up
  const [ownerPhone, setOwnerPhone] = useState(''); // Separate phone for owner info during signup
  const [hasMultipleCars, setHasMultipleCars] = useState(false);
  const [signupPurpose, setSignupPurpose] = useState('personal'); // 'personal' or 'manage_lot'
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
                 // Assign role based on sign-in method/data (simplified)
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
     // Log all the signup data captured
     console.log(`Simulating sign up with ${method}:`, {
        name,
        email,
        phone, // General phone if used for signup method
        mobileMoneyNumber, // Mobile money if used for signup method
        licensePlate, // Primary license plate
        ownerPhone, // Dedicated owner phone field
        hasMultipleCars,
        signupPurpose
     });

     setIsLoading(true);
     await new Promise(resolve => setTimeout(resolve, 1500));
     const success = Math.random() > 0.3;
     let simulatedUser: { id: string, name: string, avatarUrl?: string, role: string } | undefined;

     if (success) {
         const userId = `user_${Math.random().toString(36).substring(7)}`;
         // Determine role based on signup purpose (basic simulation)
         // In reality, 'ParkingLotOwner' or 'Admin' roles should require verification/approval
         const role = signupPurpose === 'manage_lot' ? 'User' : 'User'; // Start as 'User', flag for potential owner later

         simulatedUser = {
             id: userId,
             name: name || email.split('@')[0] || phone || mobileMoneyNumber || `User ${userId.substring(0, 4)}`,
             avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
             role: role
         };
         // TODO: In a real backend, save all the collected fields (licensePlate, ownerPhone, hasMultipleCars, signupPurpose) to the user's profile
         console.log(`Simulated saving extra signup data for user ${userId}:`, { licensePlate, ownerPhone, hasMultipleCars, signupPurpose });
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
     // Basic validation for required signup fields
     if (!name) {
        toast({ title: "Missing Information", description: "Please enter your full name.", variant: "destructive" });
        return;
     }
      if (!licensePlate) {
        toast({ title: "Missing Information", description: "Please enter your primary vehicle's license plate.", variant: "destructive" });
        return;
      }
       if (!ownerPhone) {
        toast({ title: "Missing Information", description: "Please enter the vehicle owner's phone number.", variant: "destructive" });
        return;
      }
      // Check method-specific fields
      if (method === 'email' && !email) {
         toast({ title: "Missing Information", description: "Please enter your email address.", variant: "destructive" }); return;
      }
      if (method === 'phone' && !phone) {
         toast({ title: "Missing Information", description: "Please enter your phone number for signup.", variant: "destructive" }); return;
      }
       if (method === 'mobileMoney' && !mobileMoneyNumber) {
         toast({ title: "Missing Information", description: "Please enter your Mobile Money number for signup.", variant: "destructive" }); return;
      }


    // isLoading is now set inside mockSignUp
    const result = await mockSignUp(method);

    if (result.success && result.user) {
       toast({ title: "Sign Up Successful", description: "Your account has been created." });
       onAuthSuccess(result.user.id, result.user.name, result.user.avatarUrl, result.user.role); // Pass user details
       onClose();
       // Clear form fields after successful signup - Handled by handleDialogClose
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
           // Check current state before resetting, avoid resetting if confirmed/loading
           setIsLoading(loading => {
               if (rfidStatus === 'scanning' || rfidStatus === 'error') {
                   setRfidStatus('idle');
                   return false; // Ensure loading is false if we reset RFID status here
               }
               return loading; // Keep current loading state otherwise
           });
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
            setOwnerPhone('');
            setHasMultipleCars(false);
            setSignupPurpose('personal');
            setRfidStatus('idle');
            setIsLoading(false); // Ensure loading state is reset
            onClose(); // Call the original onClose handler
       }
   }


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[450px]"> {/* Slightly wider */}
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
                 <Input id="signin-phone" type="tel" placeholder="+260 XXX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
              </div>
              <Button onClick={() => handleSignIn('phone')} disabled={isLoading || !phone} variant="outline" className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />} Sign In with Phone
              </Button>

               {/* Mobile Money Sign In */}
                <div className="space-y-2">
                    <Label htmlFor="signin-mobile-money">Mobile Money Number</Label>
                    <Input id="signin-mobile-money" type="tel" placeholder="e.g., 09XX XXX XXX" value={mobileMoneyNumber} onChange={e => setMobileMoneyNumber(e.target.value)} disabled={isLoading} />
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
             <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                 {/* Purpose */}
                 <div className="space-y-2">
                    <Label htmlFor="signup-purpose">Purpose</Label>
                    <Select value={signupPurpose} onValueChange={setSignupPurpose} disabled={isLoading}>
                        <SelectTrigger id="signup-purpose">
                            <SelectValue placeholder="Why are you signing up?" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="personal">Personal Parking Use</SelectItem>
                            <SelectItem value="manage_lot">Manage Parking Lot (Verification Required)</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>

                 {/* Name Field */}
                 <div className="space-y-2">
                   <Label htmlFor="signup-name">Full Name*</Label>
                   <Input id="signup-name" type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} required />
                 </div>

                 {/* Primary License Plate */}
                 <div className="space-y-2">
                    <Label htmlFor="signup-license-plate">Primary License Plate*</Label>
                    <Input
                        id="signup-license-plate"
                        type="text"
                        placeholder="e.g., ABX 1234"
                        value={licensePlate}
                        onChange={e => setLicensePlate(e.target.value.toUpperCase())}
                        disabled={isLoading}
                        className="uppercase"
                        required
                    />
                 </div>

                  {/* Owner Phone Number */}
                 <div className="space-y-2">
                   <Label htmlFor="signup-owner-phone">Owner's Phone Number*</Label>
                   <Input id="signup-owner-phone" type="tel" placeholder="+260 XXX XXX XXX" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} disabled={isLoading} required />
                 </div>

                  {/* Multiple Cars Option */}
                 <div className="flex items-center justify-between space-x-2 pt-2">
                    <Label htmlFor="multiple-cars" className="flex flex-col space-y-1">
                        <span>Do you have multiple cars?</span>
                        <span className="font-normal leading-snug text-muted-foreground text-xs">
                            You can add more later in your profile.
                        </span>
                    </Label>
                    <Switch id="multiple-cars" checked={hasMultipleCars} onCheckedChange={setHasMultipleCars} disabled={isLoading} />
                 </div>


               {/* Email/Password Sign Up */}
               <div className="space-y-2 pt-2">
                 <Label htmlFor="signup-email">Email (Optional)</Label>
                 <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading}/>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="signup-password">Create Password (Optional)</Label>
                 <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading}/>
               </div>
               <Button onClick={() => handleSignUp('email')} disabled={isLoading || !name || !licensePlate || !ownerPhone || !email || !password} className="w-full">
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
                    <Label htmlFor="signup-phone">Your Phone Number</Label>
                    <Input id="signup-phone" type="tel" placeholder="+260 XXX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading}/>
                     <p className="text-xs text-muted-foreground">Use this if you prefer phone-based login.</p>
                </div>
               <Button onClick={() => handleSignUp('phone')} disabled={isLoading || !name || !licensePlate || !ownerPhone || !phone} variant="outline" className="w-full">
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />} Sign Up with Phone
               </Button>

               {/* Mobile Money Sign Up */}
               <div className="space-y-2">
                    <Label htmlFor="signup-mobile-money">Mobile Money Number</Label>
                    <Input id="signup-mobile-money" type="tel" placeholder="e.g., 09XX XXX XXX" value={mobileMoneyNumber} onChange={e => setMobileMoneyNumber(e.target.value)} disabled={isLoading} />
                    <p className="text-xs text-muted-foreground">Use this for Mobile Money payments and login.</p>
                </div>
                <Button onClick={() => handleSignUp('mobileMoney')} disabled={isLoading || !name || !licensePlate || !ownerPhone || !mobileMoneyNumber} variant="outline" className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />} Sign Up with Mobile Money
                </Button>
                 {/* Note: License plate sign-up is implicitly handled by sign-in if plate is recognized */}
             </div>
           </TabsContent>
        </Tabs>

        <DialogFooter>
            {/* Optional social logins or other methods here */}
             <p className="text-xs text-muted-foreground text-center px-4">
                 By signing up, you agree to Carpso's Terms of Service and Privacy Policy.
             </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
