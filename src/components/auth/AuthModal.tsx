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
import { Phone, Mail, Nfc, Loader2, Smartphone, Car, Users, LogIn, MessageSquare, ExternalLink } from 'lucide-react'; // Added LogIn, MessageSquare, ExternalLink
import { useToast } from '@/hooks/use-toast';
import { checkPlateWithAuthority } from '@/services/authority-check'; // Import the authority check service

// Simulate social icons (replace with actual SVGs/components if needed)
const GoogleIcon = () => <ExternalLink className="h-4 w-4" />; // Placeholder
const FacebookIcon = () => <ExternalLink className="h-4 w-4" />; // Placeholder


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
  const [licensePlate, setLicensePlate] = useState(''); // Primary license plate for sign up/sign in
  const [ownerPhone, setOwnerPhone] = useState(''); // Owner's phone for sign up
  const [rfidStatus, setRfidStatus] = useState<'idle' | 'scanning' | 'scanned' | 'error'>('idle');

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpPhone, setOtpPhone] = useState(''); // Phone used for OTP login

  const { toast } = useToast();

  // --- MOCK AUTH FUNCTIONS (Replace with real backend calls) ---

  // Mock Sign In: Returns basic user info
  const mockSignIn = async (method: 'email' | 'phone' | 'rfid' | 'mobileMoney' | 'licensePlate' | 'google' | 'facebook' | 'otp'): Promise<{ success: boolean, user?: { id: string, name: string, avatarUrl?: string, role: string } }> => {
    console.log(`Simulating sign in with ${method}:`, { email, phone, mobileMoneyNumber, licensePlate, otpPhone });
    setIsLoading(true); // Moved isLoading here to cover authority check
    let userFound = false;
    let simulatedUser: { id: string, name: string, avatarUrl?: string, role: string } | undefined;

    // --- Simulate specific sign-in methods ---
    if (method === 'google' || method === 'facebook') {
        // Simulate social login success
        await new Promise(resolve => setTimeout(resolve, 1000));
        const socialProvider = method.charAt(0).toUpperCase() + method.slice(1);
        const userId = `user_${method}_${Math.random().toString(36).substring(7)}`;
        simulatedUser = {
            id: userId,
            name: `${socialProvider} User`, // Example name
            avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
            role: 'User'
        };
        userFound = true;
    } else if (method === 'otp') {
        // Simulate OTP verification
        await new Promise(resolve => setTimeout(resolve, 800));
        if (otpCode === '123456') { // Simulate correct OTP
            const userId = `user_phone_${otpPhone.replace(/\D/g, '')}`;
            simulatedUser = {
                id: userId,
                name: `User ${otpPhone.slice(-4)}`,
                avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
                role: 'User'
            };
            userFound = true;
        } else {
             toast({ title: "Invalid OTP", description: "The code you entered is incorrect.", variant: "destructive" });
        }
    } else if (method === 'licensePlate' && licensePlate) {
        try {
            const plateDetails = await checkPlateWithAuthority(licensePlate);
            if (plateDetails) {
                const userId = `user_plate_${licensePlate.replace(/\s+/g, '')}`;
                simulatedUser = {
                    id: userId,
                    name: plateDetails.registeredOwner || `Driver ${licensePlate}`,
                    avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
                    role: 'User'
                };
                userFound = true;
            } else {
                toast({ title: "Plate Not Found", description: `License plate ${licensePlate} not found. Please sign up or try another sign-in method.`, variant: "destructive" });
            }
        } catch (error) {
            console.error("Error during license plate check:", error);
            toast({ title: "Sign In Error", description: "Could not verify license plate. Please try another method.", variant: "destructive" });
        }
    } else if (method !== 'licensePlate' && method !== 'google' && method !== 'facebook' && method !== 'otp') {
        // Simulate other email/password/phone methods
        await new Promise(resolve => setTimeout(resolve, 1500));
        userFound = Math.random() > 0.3;
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
        if (method !== 'licensePlate' && method !== 'otp' && method !== 'google' && method !== 'facebook') {
            toast({ title: "Sign In Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
        }
        return { success: false };
    }
  };

   // Mock Sign Up: Returns basic user info (Simplified Input)
   const mockSignUp = async (method: 'email' | 'phone' | 'mobileMoney'): Promise<{ success: boolean, user?: { id: string, name: string, avatarUrl?: string, role: string } }> => {
      console.log(`Simulating sign up with ${method}:`, { name, email, phone, mobileMoneyNumber, licensePlate, ownerPhone });
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
              role: 'User' // All new signups default to User
          };
          console.log(`Simulated saving essential signup data for user ${userId}:`, { licensePlate, ownerPhone });
      }
      setIsLoading(false);

      if (success && simulatedUser) {
          return { success: true, user: simulatedUser };
      } else {
          return { success: false };
      }
   };

   // Mock Sending OTP
   const mockSendOtp = async (phoneNumber: string): Promise<boolean> => {
       console.log(`Simulating sending OTP to ${phoneNumber}`);
       setIsLoading(true);
       await new Promise(resolve => setTimeout(resolve, 1000));
       setIsLoading(false);
       const success = Math.random() > 0.1; // 90% success rate
       if (success) {
            toast({ title: "OTP Sent", description: `A verification code was sent to ${phoneNumber}. (Mock: 123456)` });
            setOtpSent(true);
            setOtpPhone(phoneNumber); // Store phone number used for OTP
            return true;
       } else {
            toast({ title: "Failed to Send OTP", description: "Could not send verification code. Please try again.", variant: "destructive" });
            return false;
       }
   }

  // --- END MOCK AUTH FUNCTIONS ---


  const handleSignIn = async (method: 'email' | 'phone' | 'rfid' | 'mobileMoney' | 'licensePlate' | 'google' | 'facebook' | 'otp') => {
    const result = await mockSignIn(method);
    if (result.success && result.user) {
      toast({ title: "Sign In Successful", description: `Welcome back, ${result.user.name}!` });
      onAuthSuccess(result.user.id, result.user.name, result.user.avatarUrl, result.user.role);
      onClose();
    }
  };

   const handleSignUp = async (method: 'email' | 'phone' | 'mobileMoney') => {
     if (!name) { toast({ title: "Missing Information", description: "Please enter your full name.", variant: "destructive" }); return; }
     if (!licensePlate) { toast({ title: "Missing Information", description: "Please enter your primary vehicle's license plate.", variant: "destructive" }); return; }
     if (!ownerPhone) { toast({ title: "Missing Information", description: "Please enter the vehicle owner's phone number.", variant: "destructive" }); return; }
     if (method === 'email' && !email) { toast({ title: "Missing Information", description: "Please enter your email address.", variant: "destructive" }); return; }
     if (method === 'phone' && !phone) { toast({ title: "Missing Information", description: "Please enter your phone number for signup.", variant: "destructive" }); return; }
     if (method === 'mobileMoney' && !mobileMoneyNumber) { toast({ title: "Missing Information", description: "Please enter your Mobile Money number for signup.", variant: "destructive" }); return; }

    const result = await mockSignUp(method);
    if (result.success && result.user) {
       toast({ title: "Sign Up Successful", description: "Your account has been created." });
       onAuthSuccess(result.user.id, result.user.name, result.user.avatarUrl, result.user.role);
       onClose();
    } else {
       toast({ title: "Sign Up Failed", description: "Could not create account. Please try again.", variant: "destructive" });
    }
  };


  const handleRfidScan = async () => {
      setRfidStatus('scanning');
      setIsLoading(true);
       console.log("Scanning for RFID tag...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      const found = Math.random() > 0.4;
      if (found) {
          setRfidStatus('scanned');
           console.log("RFID tag scanned successfully.");
           setIsLoading(false);
          await handleSignIn('rfid');
      } else {
          setRfidStatus('error');
          console.error("RFID scan failed or timed out.");
          toast({title: "RFID Scan Failed", description: "No RFID tag detected. Please try again.", variant: "destructive"});
          setIsLoading(false);
      }
      setTimeout(() => {
           setIsLoading(loading => {
               if (rfidStatus === 'scanning' || rfidStatus === 'error') {
                   setRfidStatus('idle');
                   return false;
               }
               return loading;
           });
      }, 2000);
  }

  // Handle Sending OTP
  const handleSendOtpClick = () => {
      if (!phone) {
           toast({ title: "Missing Information", description: "Please enter your phone number.", variant: "destructive" });
           return;
      }
      mockSendOtp(phone);
  }

  // Handle Verifying OTP
   const handleVerifyOtpClick = () => {
      if (!otpCode || otpCode.length !== 6) { // Example: 6 digit OTP
           toast({ title: "Invalid OTP", description: "Please enter the 6-digit code.", variant: "destructive" });
           return;
      }
      handleSignIn('otp'); // Use the 'otp' method for mockSignIn
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
            setRfidStatus('idle');
            setOtpSent(false); // Reset OTP state
            setOtpCode('');
            setOtpPhone('');
            setIsLoading(false);
            onClose();
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
                {/* --- OTP Login --- */}
                 {!otpSent ? (
                      <>
                          <div className="space-y-2">
                             <Label htmlFor="signin-phone-otp">Phone Number for OTP</Label>
                             <Input id="signin-phone-otp" type="tel" placeholder="+260 XXX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
                          </div>
                          <Button onClick={handleSendOtpClick} disabled={isLoading || !phone} variant="outline" className="w-full">
                             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />} Send Login Code
                          </Button>
                      </>
                 ) : (
                     <>
                          <p className="text-sm text-center text-muted-foreground">Enter the 6-digit code sent to {otpPhone}.</p>
                           <div className="space-y-2">
                             <Label htmlFor="signin-otp-code">Verification Code</Label>
                             <Input id="signin-otp-code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="123456" value={otpCode} onChange={e => setOtpCode(e.target.value)} disabled={isLoading} />
                          </div>
                          <Button onClick={handleVerifyOtpClick} disabled={isLoading || !otpCode || otpCode.length !== 6} className="w-full">
                             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />} Verify Code & Sign In
                          </Button>
                          <Button variant="link" size="sm" onClick={() => setOtpSent(false)} disabled={isLoading} className="text-xs h-auto p-0 mx-auto block">Use another method?</Button>
                     </>
                 )}


                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
                </div>

                {/* --- Social Logins --- */}
                 <div className="grid grid-cols-2 gap-2">
                     <Button onClick={() => handleSignIn('google')} disabled={isLoading} variant="outline">
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <GoogleIcon />} Google
                     </Button>
                     <Button onClick={() => handleSignIn('facebook')} disabled={isLoading} variant="outline">
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FacebookIcon />} Facebook
                     </Button>
                 </div>

               {/* Email/Password Sign In */}
               <div className="space-y-2">
                 <Label htmlFor="signin-email">Email</Label>
                 <Input id="signin-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading || otpSent} />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="signin-password">Password</Label>
                 <Input id="signin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading || otpSent} />
               </div>
               <Button onClick={() => handleSignIn('email')} disabled={isLoading || !email || !password || otpSent} className="w-full">
                 {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Sign In with Email
               </Button>


               {/* License Plate Sign In */}
                <div className="space-y-2">
                    <Label htmlFor="signin-license-plate">License Plate</Label>
                    <Input id="signin-license-plate" type="text" placeholder="e.g., ABX 1234" value={licensePlate} onChange={e => setLicensePlate(e.target.value.toUpperCase())} disabled={isLoading || otpSent} className="uppercase"/>
                </div>
                <Button onClick={() => handleSignIn('licensePlate')} disabled={isLoading || !licensePlate || otpSent} variant="outline" className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Car className="mr-2 h-4 w-4" />} Sign In with License Plate
                </Button>


               {/* Mobile Money Sign In */}
                <div className="space-y-2">
                    <Label htmlFor="signin-mobile-money">Mobile Money Number</Label>
                    <Input id="signin-mobile-money" type="tel" placeholder="e.g., 09XX XXX XXX" value={mobileMoneyNumber} onChange={e => setMobileMoneyNumber(e.target.value)} disabled={isLoading || otpSent} />
                </div>
                <Button onClick={() => handleSignIn('mobileMoney')} disabled={isLoading || !mobileMoneyNumber || otpSent} variant="outline" className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />} Sign In with Mobile Money
                </Button>

               {/* RFID Sign In */}
                <Button onClick={handleRfidScan} disabled={isLoading || rfidStatus === 'scanning' || otpSent} variant="secondary" className="w-full">
                 {rfidStatus === 'scanning' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Nfc className="mr-2 h-4 w-4" />}
                 {rfidStatus === 'scanning' ? 'Scanning RFID...' : rfidStatus === 'scanned' ? 'Tag Scanned!' : rfidStatus === 'error' ? 'Scan Failed' : 'Sign In with RFID'}
               </Button>
               {rfidStatus === 'scanning' && <p className="text-xs text-center text-muted-foreground">Hold your RFID tag near the reader...</p>}
            </div>
          </TabsContent>

          {/* Sign Up Tab - Simplified */}
           <TabsContent value="signup">
             <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">

                 {/* Name Field */}
                 <div className="space-y-2">
                   <Label htmlFor="signup-name">Full Name*</Label>
                   <Input id="signup-name" type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} required />
                 </div>

                 {/* Primary License Plate */}
                 <div className="space-y-2">
                    <Label htmlFor="signup-license-plate">Primary License Plate*</Label>
                    <Input id="signup-license-plate" type="text" placeholder="e.g., ABX 1234" value={licensePlate} onChange={e => setLicensePlate(e.target.value.toUpperCase())} disabled={isLoading} className="uppercase" required />
                 </div>

                  {/* Owner Phone Number */}
                 <div className="space-y-2">
                   <Label htmlFor="signup-owner-phone">Owner's Phone Number*</Label>
                   <Input id="signup-owner-phone" type="tel" placeholder="+260 XXX XXX XXX" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} disabled={isLoading} required />
                   <p className="text-xs text-muted-foreground">Phone number associated with the vehicle owner.</p>
                 </div>

               {/* Choose Auth Method Section */}
                <p className="text-sm font-medium text-muted-foreground pt-2">Choose your preferred sign-up method:</p>

               {/* Email/Password Sign Up */}
               <div className="space-y-2 pt-2 border-t">
                 <Label htmlFor="signup-email">Email</Label>
                 <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading}/>
                 <Label htmlFor="signup-password">Create Password</Label>
                 <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading}/>
                 <Button onClick={() => handleSignUp('email')} disabled={isLoading || !name || !licensePlate || !ownerPhone || !email || !password} className="w-full">
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Sign Up with Email
                 </Button>
               </div>

                {/* Phone Sign Up */}
                <div className="space-y-2 border-t pt-2">
                    <Label htmlFor="signup-phone">Your Phone Number</Label>
                    <Input id="signup-phone" type="tel" placeholder="+260 XXX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading}/>
                    <p className="text-xs text-muted-foreground">Use this if you prefer phone-based login/OTP.</p>
                    <Button onClick={() => handleSignUp('phone')} disabled={isLoading || !name || !licensePlate || !ownerPhone || !phone} variant="outline" className="w-full">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />} Sign Up with Phone
                    </Button>
                </div>

               {/* Mobile Money Sign Up */}
               <div className="space-y-2 border-t pt-2">
                    <Label htmlFor="signup-mobile-money">Mobile Money Number</Label>
                    <Input id="signup-mobile-money" type="tel" placeholder="e.g., 09XX XXX XXX" value={mobileMoneyNumber} onChange={e => setMobileMoneyNumber(e.target.value)} disabled={isLoading} />
                    <p className="text-xs text-muted-foreground">Use this for Mobile Money payments and login.</p>
                    <Button onClick={() => handleSignUp('mobileMoney')} disabled={isLoading || !name || !licensePlate || !ownerPhone || !mobileMoneyNumber} variant="outline" className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />} Sign Up with Mobile Money
                    </Button>
                </div>
             </div>
           </TabsContent>
        </Tabs>

        <DialogFooter>
             <p className="text-xs text-muted-foreground text-center px-4">
                 By signing up or signing in, you agree to Carpso's Terms of Service and Privacy Policy.
             </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
