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
import { Phone, Mail, Nfc, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userId: string) => void; // Callback on successful authentication
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rfidStatus, setRfidStatus] = useState<'idle' | 'scanning' | 'scanned' | 'error'>('idle');
  const { toast } = useToast();

  const handleSignIn = async (method: 'email' | 'phone' | 'rfid') => {
    setIsLoading(true);
    // Simulate API call
    console.log(`Attempting sign in with ${method}:`, { email, phone });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success/failure
    const success = Math.random() > 0.3; // 70% success rate

    if (success) {
      const userId = `user_${Math.random().toString(36).substring(7)}`;
      toast({ title: "Sign In Successful", description: "Welcome back!" });
      onAuthSuccess(userId);
      onClose();
    } else {
      toast({ title: "Sign In Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
    }
    setIsLoading(false);
  };

   const handleSignUp = async (method: 'email' | 'phone') => {
    setIsLoading(true);
    // Simulate API call
    console.log(`Attempting sign up with ${method}:`, { email, phone });
    await new Promise(resolve => setTimeout(resolve, 1500));

     // Simulate success/failure
    const success = Math.random() > 0.3;

    if (success) {
       const userId = `user_${Math.random().toString(36).substring(7)}`;
       toast({ title: "Sign Up Successful", description: "Your account has been created." });
       onAuthSuccess(userId);
       onClose();
    } else {
       toast({ title: "Sign Up Failed", description: "Could not create account. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };


  const handleRfidScan = async () => {
      setRfidStatus('scanning');
      // Simulate RFID scanning process (e.g., listening for an event)
       console.log("Scanning for RFID tag...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Simulate scan result
      const found = Math.random() > 0.4;
      if (found) {
          setRfidStatus('scanned');
           console.log("RFID tag scanned successfully.");
          // Automatically attempt sign-in with the scanned tag data (simulated)
          await handleSignIn('rfid');
      } else {
          setRfidStatus('error');
          console.error("RFID scan failed or timed out.");
          toast({title: "RFID Scan Failed", description: "No RFID tag detected. Please try again.", variant: "destructive"});
      }
      // Reset status after a delay if not successful sign-in
      if(rfidStatus !== 'idle') {
          setTimeout(() => {
               if (rfidStatus === 'scanning' || rfidStatus === 'error') setRfidStatus('idle');
          }, 2000);
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

              {/* Phone Sign In */}
              <div className="space-y-2">
                 <Label htmlFor="signin-phone">Phone Number</Label>
                 <Input id="signin-phone" type="tel" placeholder="+1 123 456 7890" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
              </div>
              <Button onClick={() => handleSignIn('phone')} disabled={isLoading || !phone} variant="outline" className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />} Sign In with Phone
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
               {/* Email/Password Sign Up */}
               <div className="space-y-2">
                 <Label htmlFor="signup-email">Email</Label>
                 <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading}/>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="signup-password">Password</Label>
                 <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading}/>
               </div>
                {/* Add confirm password if needed */}
               <Button onClick={() => handleSignUp('email')} disabled={isLoading || !email || !password} className="w-full">
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
                {/* Note: RFID is typically for sign-in, not sign-up unless pre-registered */}
             </div>
           </TabsContent>
        </Tabs>

        <DialogFooter>
            {/* Optionally add social logins or other methods here */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
