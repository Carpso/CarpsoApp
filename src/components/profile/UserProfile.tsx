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
import { List, DollarSign, Clock, LogOut, AlertCircle, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  phone?: string;
  avatarUrl?: string;
  memberSince: string;
}

interface BillingInfo {
  balance: number; // Positive for credit, negative for arrears
  paymentMethod?: string; // e.g., 'Visa **** 1234'
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
    avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
    memberSince: '2024-01-15',
  };
};

const fetchBillingInfo = async (userId: string): Promise<BillingInfo> => {
   await new Promise(resolve => setTimeout(resolve, 500));
   // Replace with actual API call
   const randomBalance = (Math.random() * 10) - 5; // Random balance between -5 and +5
   return {
       balance: parseFloat(randomBalance.toFixed(2)),
       paymentMethod: 'Visa **** 4321',
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
                        <p className="text-xs text-muted-foreground">Member since: {userDetails?.memberSince}</p>
                    </div>
                </div>

                {/* Billing Info */}
                <div className="mb-6 space-y-2">
                    <h3 className="text-md font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Billing</h3>
                     <div className="flex justify-between items-center p-3 border rounded-md bg-secondary/50">
                         <div>
                            <p className="text-sm text-muted-foreground">Account Balance</p>
                            <p className={`text-xl font-bold ${billingInfo && billingInfo.balance < 0 ? 'text-destructive' : 'text-primary'}`}>
                                ${billingInfo?.balance.toFixed(2)}
                            </p>
                         </div>
                         {billingInfo && billingInfo.balance < 0 ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Arrears
                              </Badge>
                         ) : (
                              <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                                  <CheckCircle className="h-3 w-3" /> Paid Up
                              </Badge>
                         )}
                     </div>
                    <p className="text-xs text-muted-foreground">Payment Method: {billingInfo?.paymentMethod || 'Not set'}</p>
                    {/* Add button to manage payment methods */}
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
             <Button variant="destructive" onClick={onLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" /> Log Out
             </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


// Skeleton Loader for Profile
const ProfileSkeleton = () => (
    <div className="space-y-6">
        <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
            </div>
        </div>
         <div className="space-y-2">
             <Skeleton className="h-5 w-20 mb-2" />
             <Skeleton className="h-16 w-full" />
             <Skeleton className="h-4 w-32" />
             <Skeleton className="h-9 w-full" />
         </div>
         <Separator/>
          <div className="space-y-3">
             <Skeleton className="h-5 w-28 mb-3" />
             <Skeleton className="h-16 w-full" />
             <Skeleton className="h-16 w-full" />
             <Skeleton className="h-16 w-full" />
         </div>
    </div>
);
