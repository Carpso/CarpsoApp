// src/components/profile/UserProfile.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { List, DollarSign, Clock, LogOut, AlertCircle, CheckCircle, Smartphone, CreditCard } from 'lucide-react'; // Added Smartphone, CreditCard
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onLogout: () => void;
}

// Mock data types and functions - Replace with actual API calls
interface UserDetails {
  name: string;
  email?: string;
  phone?: string; // Standard phone
  avatarUrl?: string;
  memberSince: string;
}

interface BillingInfo {
  accountBalance: number; // Positive for credit, negative for arrears
  paymentMethods: {
      type: 'Card' | 'MobileMoney';
      details: string; // e.g., 'Visa **** 1234' or 'MTN 07XX XXX XXX'
      isPrimary: boolean;
  }[];
}

interface ParkingHistoryEntry {
  id: string;
  spotId: string;
  locationName: string;
  startTime: string;
  endTime: string;
  cost: number;
}

const fetchUserDetails = async (userId: string): Promise<UserDetails> => {
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate fetch delay
  // Replace with actual API call
  return {
    name: `User ${userId.substring(0, 5)}`,
    email: `user_${userId.substring(0, 5)}@example.com`,
    phone: '+1 555 123 4567',
    avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
    memberSince: '2024-01-15',
  };
};

const fetchBillingInfo = async (userId: string): Promise<BillingInfo> => {
   await new Promise(resolve => setTimeout(resolve, 500));
   // Replace with actual API call
   const randomBalance = (Math.random() * 10) - 5; // Random balance between -5 and +5
   return {
       accountBalance: parseFloat(randomBalance.toFixed(2)),
       paymentMethods: [
            { type: 'Card', details: 'Visa **** 4321', isPrimary: true },
            { type: 'MobileMoney', details: 'Airtel 075X XXX XXX', isPrimary: false },
       ],
   };
};

const fetchParkingHistory = async (userId: string): Promise<ParkingHistoryEntry[]> => {
   await new Promise(resolve => setTimeout(resolve, 1000));
   // Replace with actual API call
   return [
       { id: 'hist1', spotId: 'lot_A-S5', locationName: 'Downtown Garage', startTime: '2024-07-25 10:00', endTime: '2024-07-25 11:30', cost: 3.50 },
       { id: 'hist2', spotId: 'lot_B-S22', locationName: 'Airport Lot B', startTime: '2024-07-23 14:15', endTime: '2024-07-23 16:00', cost: 5.00 },
       { id: 'hist3', spotId: 'lot_A-S12', locationName: 'Downtown Garage', startTime: '2024-07-20 09:00', endTime: '2024-07-20 09:45', cost: 1.50 },
   ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()); // Sort descending
};


export default function UserProfile({ isOpen, onClose, userId, onLogout }: UserProfileProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [parkingHistory, setParkingHistory] = useState<ParkingHistoryEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [details, billing, history] = await Promise.all([
            fetchUserDetails(userId),
            fetchBillingInfo(userId),
            fetchParkingHistory(userId),
          ]);
          setUserDetails(details);
          setBillingInfo(billing);
          setParkingHistory(history);
        } catch (error) {
          console.error("Failed to load user profile data:", error);
          // Handle error state, maybe show a toast
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen, userId]);


  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-full flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle>User Profile</SheetTitle>
          <SheetDescription>Manage your account details and view history.</SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        <ScrollArea className="flex-grow pr-6 -mr-6"> {/* Add padding for scrollbar */}
            {isLoading ? (
                 <ProfileSkeleton />
            ) : (
             <>
                 {/* User Info */}
                <div className="flex items-center space-x-4 mb-6">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={userDetails?.avatarUrl} alt={userDetails?.name} />
                        <AvatarFallback>{userDetails?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <p className="text-lg font-semibold">{userDetails?.name}</p>
                        <p className="text-sm text-muted-foreground">{userDetails?.email}</p>
                        <p className="text-sm text-muted-foreground">{userDetails?.phone}</p>
                        <p className="text-xs text-muted-foreground">Member since: {userDetails?.memberSince}</p>
                    </div>
                </div>

                {/* Billing Info */}
                <div className="mb-6 space-y-4">
                    <h3 className="text-md font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Billing</h3>
                     <div className="flex justify-between items-center p-3 border rounded-md bg-secondary/50">
                         <div>
                            <p className="text-sm text-muted-foreground">Account Balance</p>
                            <p className={`text-xl font-bold ${billingInfo && billingInfo.accountBalance < 0 ? 'text-destructive' : 'text-primary'}`}>
                                ${billingInfo?.accountBalance.toFixed(2)}
                            </p>
                         </div>
                         {billingInfo && billingInfo.accountBalance < 0 ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Arrears
                              </Badge>
                         ) : (
                              <Badge variant="default" className="flex items-center gap-1 bg-green-600 text-white"> {/* Ensure contrast */}
                                  <CheckCircle className="h-3 w-3" /> Paid Up
                              </Badge>
                         )}
                     </div>
                     {/* Payment Methods List */}
                     <div>
                        <p className="text-sm font-medium mb-2">Payment Methods</p>
                        <div className="space-y-2">
                            {billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0 ? (
                                billingInfo.paymentMethods.map((method, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 border rounded-md text-sm">
                                        <div className="flex items-center gap-2">
                                            {method.type === 'Card' ? <CreditCard className="h-4 w-4 text-muted-foreground" /> : <Smartphone className="h-4 w-4 text-muted-foreground" />}
                                            <span>{method.details}</span>
                                        </div>
                                        {method.isPrimary && <Badge variant="secondary" size="sm">Primary</Badge>}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground">No payment methods added.</p>
                            )}
                        </div>
                     </div>

                    <Button variant="outline" size="sm" className="w-full">Manage Payment Methods</Button>
                </div>

                <Separator className="my-4" />

                {/* Parking History */}
                <div className="mb-6">
                    <h3 className="text-md font-semibold mb-3 flex items-center gap-2"><List className="h-4 w-4" /> Parking History</h3>
                    {parkingHistory && parkingHistory.length > 0 ? (
                        <div className="space-y-3">
                            {parkingHistory.map((entry) => (
                                <div key={entry.id} className="p-3 border rounded-md text-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium">{entry.locationName} (Spot {entry.spotId.split('-')[1]})</span>
                                        <span className="font-semibold text-primary">-${entry.cost.toFixed(2)}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{entry.startTime} to {entry.endTime}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No parking history found.</p>
                    )}
                </div>
             </>
            )}
        </ScrollArea>


        <SheetFooter className="mt-auto pt-4 border-t">
             <SheetClose asChild>
                 <Button variant="destructive" onClick={onLogout} className="w-full">
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                 </Button>
             </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


// Skeleton Loader for Profile
const ProfileSkeleton = () => (
    <div className="space-y-6">
        {/* User Info Skeleton */}
        <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
        {/* Billing Skeleton */}
         <div className="space-y-4">
             <Skeleton className="h-5 w-20 mb-2" />
             <Skeleton className="h-16 w-full" />
             <div className="space-y-2 pt-2">
                 <Skeleton className="h-4 w-28 mb-2" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
             </div>
             <Skeleton className="h-9 w-full" />
         </div>
         <Separator/>
         {/* History Skeleton */}
          <div className="space-y-3">
             <Skeleton className="h-5 w-28 mb-3" />
             <Skeleton className="h-16 w-full" />
             <Skeleton className="h-16 w-full" />
             <Skeleton className="h-16 w-full" />
         </div>
    </div>
);
