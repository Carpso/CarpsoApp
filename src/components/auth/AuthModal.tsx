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
import { Phone, Mail, Nfc, Loader2, Smartphone, Car, Users, LogIn, MessageSquare, ExternalLink, CheckCircle, CircleAlert, Fingerprint } from 'lucide-react'; // Added Fingerprint
import { useToast } from '@/hooks/use-toast';
import { checkPlateWithAuthority } from '@/services/authority-check'; // Import the authority check service
import { Switch } from '@/components/ui/switch'; // Import Switch

// Simulate social icons (replace with actual SVGs/components if needed)
const GoogleIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.13v2.8h5.37c-.47 1.74-2 3.05-4.27 3.05-2.57 0-4.66-2.09-4.66-4.66s2.09-4.66 4.66-4.66c1.45 0 2.7.52 3.64 1.37l2.1-2.1c-1.32-1.23-3.08-1.98-5.14-1.98C6.49 4.6 3.18 7.9 3.18 12s3.31 7.4 7.17 7.4c4.03 0 6.74-2.82 6.74-6.86 0-.46-.05-.86-.14-1.24Z"/></svg>;
const FacebookIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.04c-5.52 0-10 4.48-10 10s4.48 10 10 10s10-4.48 10-10S17.52 2.04 12 2.04zm2.5 8.46h-1.5v1.5h1.5v5H11v-5H9.5v-1.5H11V9.5c0-1.1.6-2.5 2.5-2.5h1.5v1.5h-1c-.4 0-.5.2-.5.5v.5h1.5l-.5 1.5z"/></svg>;
const AppleIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M17.5 13.77c.46 0 .98.14 1.5.41c.36-.6.54-1.25.55-1.93a4.15 4.15 0 0 0-1.26-3.03c-.8-.73-1.92-1.1-3.05-1.13c-1.43-.03-2.8.76-3.6.76c-.82 0-1.9-.77-3.17-.74c-1.63.04-3.05.88-3.86 2.22c-1.63 2.68-.39 6.67 1.24 8.88c.78 1.07 1.69 2.25 2.87 2.22c1.14-.03 1.56-.73 2.98-.73c1.4 0 1.78.73 3.02.73c1.24 0 2.04-1.07 2.77-2.17c.7-.98 1.06-2.04 1.1-2.09c-.04-.01-2.48-.95-2.48-3.01Zm-3.44-7.49a3.7 3.7 0 0 1 1.77-3c.1-.11.06-.28-.07-.32c-.9-.28-1.92.05-2.57.63c-.66.56-1.1 1.45-1.3 2.3c-.04.14.09.28.22.28c.7-.03 1.49-.33 1.95-.89Z"/></svg>;


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
  const [hasMultipleCars, setHasMultipleCars] = useState(false); // State for multiple cars toggle
  const [rfidStatus, setRfidStatus] = useState<'idle' | 'scanning' | 'scanned' | 'error'>('idle');
  const [isCheckingPlate, setIsCheckingPlate] = useState(false);
  const [plateCheckResult, setPlateCheckResult] = useState<{ registeredOwner?: string, vehicleMake?: string } | null | 'error'>(null);

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpPhone, setOtpPhone] = useState(''); // Phone used for OTP login

  const { toast } = useToast();

  // --- MOCK AUTH FUNCTIONS (Replace with real backend calls) ---

  // Mock Sign In: Returns basic user info
  const mockSignIn = async (method: 'email' | 'phone' | 'rfid' | 'mobileMoney' | 'licensePlate' | 'google' | 'facebook' | 'apple' | 'otp'): Promise<{ success: boolean, user?: { id: string, name: string, avatarUrl?: string, role: string } }> => {
    console.log(`Simulating sign in with ${method}:`, { email, phone, mobileMoneyNumber, licensePlate, otpPhone });
    setIsLoading(true); // Moved isLoading here to cover authority check
    let userFound = false;
    let simulatedUser: { id: string, name: string, avatarUrl?: string, role: string } | undefined;

    // --- Simulate specific sign-in methods ---
    if (method === 'google' || method === 'facebook' || method === 'apple') {
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
    } else if (method !== 'licensePlate' && method !== 'google' && method !== 'facebook' && method !== 'apple' && method !== 'otp') {
        // Simulate other email/password/phone/rfid methods
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
        if (method !== 'licensePlate' && method !== 'otp' && method !== 'google' && method !== 'facebook' && method !== 'apple') {
            toast({ title: "Sign In Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
        }
        return { success: false };
    }
  };

   // Mock Sign Up: Returns basic user info (Simplified Input - Only Email Method)
   const mockSignUp = async (method: 'email'): Promise<{ success: boolean, user?: { id: string, name: string, avatarUrl?: string, role: string } }> => {
      console.log(`Simulating sign up with ${method}:`, { name, email, licensePlate, ownerPhone, hasMultipleCars });
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const success = Math.random() > 0.3;
      let simulatedUser: { id: string, name: string, avatarUrl?: string, role: string } | undefined;

      if (success) {
          const userId = `user_${Math.random().toString(36).substring(7)}`;
          simulatedUser = {
              id: userId,
              name: name || email.split('@')[0] || `User ${userId.substring(0, 4)}`,
              avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
              role: 'User' // All new signups default to User
          };
          console.log(`Simulated saving essential signup data for user ${userId}:`, { licensePlate, ownerPhone, hasMultipleCars });
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


  const handleSignIn = async (method: 'email' | 'phone' | 'rfid' | 'mobileMoney' | 'licensePlate' | 'google' | 'facebook' | 'apple' | 'otp') => {
    const result = await mockSignIn(method);
    if (result.success && result.user) {
      toast({ title: "Sign In Successful", description: `Welcome back, ${result.user.name}!` });
      onAuthSuccess(result.user.id, result.user.name, result.user.avatarUrl, result.user.role);
      onClose();
    }
  };

   const handleSignUp = async (method: 'email') => { // Only email signup now
     if (!name) { toast({ title: "Missing Information", description: "Please enter your full name.", variant: "destructive" }); return; }
     if (!licensePlate) { toast({ title: "Missing Information", description: "Please enter your primary vehicle's license plate.", variant: "destructive" }); return; }
     if (!ownerPhone) { toast({ title: "Missing Information", description: "Please enter the vehicle owner's phone number.", variant: "destructive" }); return; }
     if (method === 'email' && (!email || !password)) { toast({ title: "Missing Information", description: "Please enter your email address and create a password.", variant: "destructive" }); return; }

    const result = await mockSignUp(method);
    if (result.success && result.user) {
       toast({ title: "Sign Up Successful", description: "Your account has been created." });
       onAuthSuccess(result.user.id, result.user.name, result.user.avatarUrl, result.user.role);
       onClose();
    } else {
       toast({ title: "Sign Up Failed", description: "Could not create account. Please try again.", variant: "destructive" });
    }
  };

    const handlePlateNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPlateNumber = e.target.value.toUpperCase();
        setLicensePlate(newPlateNumber);
        setPlateCheckResult(null); // Reset check result on change

        // Basic check before hitting the 'API'
        if (newPlateNumber.length >= 4) { // Example: check only if length >= 4
            setIsCheckingPlate(true);
            try {
                const result = await checkPlateWithAuthority(newPlateNumber);
                setPlateCheckResult(result);
            } catch (error) {
                console.error("Error checking plate with authority:", error);
                setPlateCheckResult('error');
            } finally {
                setIsCheckingPlate(false);
            }
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
      // Reset visual state after a delay if still scanning or error
       setTimeout(() => {
           if (rfidStatus === 'scanning' || rfidStatus === 'error') {
               setRfidStatus('idle');
           }
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
            setHasMultipleCars(false); // Reset toggle
            setRfidStatus('idle');
            setOtpSent(false); // Reset OTP state
            setOtpCode('');
            setOtpPhone('');
            setIsLoading(false);
            setPlateCheckResult(null);
            setIsCheckingPlate(false);
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
                             <Label htmlFor="signin-phone-otp">Phone Number for Login Code</Label>
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
                          <Button variant="link" size="sm" onClick={() => { setOtpSent(false); setOtpCode(''); setOtpPhone(''); setPhone(''); }} disabled={isLoading} className="text-xs h-auto p-0 mx-auto block">Use another method?</Button>
                     </>
                 )}


                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
                </div>

                {/* --- Social Logins --- */}
                 <div className="grid grid-cols-3 gap-2">
                     <Button onClick={() => handleSignIn('google')} disabled={isLoading || otpSent} variant="outline" size="icon" aria-label="Sign in with Google">
                         {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <GoogleIcon />}
                     </Button>
                     <Button onClick={() => handleSignIn('facebook')} disabled={isLoading || otpSent} variant="outline" size="icon" aria-label="Sign in with Facebook">
                         {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <FacebookIcon />}
                     </Button>
                     <Button onClick={() => handleSignIn('apple')} disabled={isLoading || otpSent} variant="outline" size="icon" aria-label="Sign in with Apple">
                         {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <AppleIcon />}
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
                    <Input id="signin-license-plate" type="text" placeholder="e.g., ABX 1234" value={licensePlate} onChange={handlePlateNumberChange} disabled={isLoading || otpSent} className="uppercase"/>
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

               {/* Biometric Sign In (Placeholder) */}
               <Button disabled={true} variant="outline" className="w-full opacity-50 cursor-not-allowed">
                 <Fingerprint className="mr-2 h-4 w-4" /> Sign In with Biometrics (Coming Soon)
               </Button>
            </div>
          </TabsContent>

          {/* Sign Up Tab - Simplified */}
           <TabsContent value="signup">
             <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">

                 {/* Name Field */}
                 <div className="space-y-2">
                   <Label htmlFor="signup-name">Full Name*</Label>
                   <Input id="signup-name" type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} required />
                 </div>

                 {/* Primary License Plate */}
                 <div className="space-y-2">
                    <Label htmlFor="signup-license-plate">Primary License Plate*</Label>
                    <Input id="signup-license-plate" type="text" placeholder="e.g., ABX 1234" value={licensePlate} onChange={handlePlateNumberChange} disabled={isLoading} className="uppercase" required />
                    {/* Plate Check Result Display */}
                     {isCheckingPlate && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/> Checking...</div>}
                     {plateCheckResult && plateCheckResult !== 'error' && !isCheckingPlate && (
                          <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Found: {plateCheckResult.vehicleMake} ({plateCheckResult.registeredOwner})</div>
                     )}
                     {plateCheckResult === null && licensePlate.length >= 4 && !isCheckingPlate && (
                          <div className="text-xs text-orange-600 flex items-center gap-1"><CircleAlert className="h-3 w-3"/> Not found in authority records.</div>
                     )}
                     {plateCheckResult === 'error' && !isCheckingPlate && (
                          <div className="text-xs text-destructive flex items-center gap-1"><CircleAlert className="h-3 w-3"/> Error checking plate.</div>
                     )}
                 </div>

                  {/* Owner Phone Number */}
                 <div className="space-y-2">
                   <Label htmlFor="signup-owner-phone">Owner's Phone Number*</Label>
                   <Input id="signup-owner-phone" type="tel" placeholder="+260 XXX XXX XXX" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} disabled={isLoading} required />
                   <p className="text-xs text-muted-foreground">Phone number associated with the vehicle owner for verification.</p>
                 </div>

                  {/* Multiple Cars Toggle */}
                  <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="multiple-cars"
                        checked={hasMultipleCars}
                        onCheckedChange={setHasMultipleCars}
                        disabled={isLoading}
                      />
                      <Label htmlFor="multiple-cars">Do you manage multiple vehicles (Fleet/Company)?</Label>
                  </div>
                  {hasMultipleCars && (
                      <p className="text-xs text-muted-foreground pl-8">You can add more vehicles in your profile after signing up.</p>
                  )}


                 {/* Email/Password Sign Up */}
                 <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="signup-email">Email Address*</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} required/>
                    <Label htmlFor="signup-password">Create Password*</Label>
                    <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} required/>
                    <Button onClick={() => handleSignUp('email')} disabled={isLoading || !name || !licensePlate || !ownerPhone || !email || !password} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Sign Up with Email
                    </Button>
                 </div>

                  {/* Social Sign Up Options (Simplified) */}
                 <div className="relative my-4">
                     <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                     <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or sign up with</span></div>
                 </div>
                  <div className="grid grid-cols-3 gap-2">
                      <Button onClick={() => handleSignIn('google')} disabled={isLoading} variant="outline" size="icon" aria-label="Sign up with Google">
                          <GoogleIcon />
                      </Button>
                      <Button onClick={() => handleSignIn('facebook')} disabled={isLoading} variant="outline" size="icon" aria-label="Sign up with Facebook">
                          <FacebookIcon />
                      </Button>
                      <Button onClick={() => handleSignIn('apple')} disabled={isLoading} variant="outline" size="icon" aria-label="Sign up with Apple">
                          <AppleIcon />
                      </Button>
                  </div>
             </div>
           </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4 border-t">
             <p className="text-xs text-muted-foreground text-center px-4">
                 By signing up or signing in, you agree to Carpso's Terms of Service and Privacy Policy.
             </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
