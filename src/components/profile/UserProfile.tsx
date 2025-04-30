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
import { List, DollarSign, Clock, LogOut, AlertCircle, CheckCircle, Smartphone, CreditCard, Download, AlertTriangle, Car } from 'lucide-react'; // Added AlertTriangle, Car
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import ReportIssueModal from './ReportIssueModal'; // Import the new modal

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
  accountBalance: number;
  paymentMethods: {
      type: 'Card' | 'MobileMoney';
      details: string;
      isPrimary: boolean;
  }[];
}

interface ParkingHistoryEntry {
  id: string;
  spotId: string;
  locationName: string;
  locationId: string; // Added locationId for reporting context
  startTime: string;
  endTime: string;
  cost: number;
  status: 'Completed' | 'Active' | 'Upcoming'; // Added status
}

// --- Mock Data Fetching Functions ---
const fetchUserDetails = async (userId: string): Promise<UserDetails> => {
  await new Promise(resolve => setTimeout(resolve, 700));
  return {
    name: `User ${userId.substring(0, 5)}`,
    email: `user_${userId.substring(0, 5)}@example.com`,
    phone: '+260 977 123 456', // Example Zambian number format
    avatarUrl: `https://picsum.photos/seed/${userId}/100/100`,
    memberSince: '2024-01-15',
  };
};

const fetchBillingInfo = async (userId: string): Promise<BillingInfo> => {
   await new Promise(resolve => setTimeout(resolve, 500));
   const randomBalance = (Math.random() * 10) - 5;
   return {
       accountBalance: parseFloat(randomBalance.toFixed(2)),
       paymentMethods: [
            { type: 'Card', details: 'Visa **** 4321', isPrimary: true },
            { type: 'MobileMoney', details: 'MTN 096X XXX XXX', isPrimary: false }, // Example MTN Zambia
            { type: 'MobileMoney', details: 'Airtel 097X XXX XXX', isPrimary: false }, // Example Airtel Zambia
       ],
   };
};

const fetchParkingHistory = async (userId: string): Promise<ParkingHistoryEntry[]> => {
   await new Promise(resolve => setTimeout(resolve, 1000));
   // Added locationId and status
   return [
       { id: 'res1', spotId: 'lot_A-S5', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: new Date(Date.now() - 30 * 60000).toISOString(), endTime: new Date(Date.now() + 60 * 60000).toISOString(), cost: 0, status: 'Active' }, // Active reservation
       { id: 'hist1', spotId: 'lot_A-S5', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: '2024-07-25 10:00', endTime: '2024-07-25 11:30', cost: 3.50, status: 'Completed' },
       { id: 'hist2', spotId: 'lot_B-S22', locationName: 'Airport Lot B', locationId: 'lot_B', startTime: '2024-07-23 14:15', endTime: '2024-07-23 16:00', cost: 5.00, status: 'Completed' },
       { id: 'hist3', spotId: 'lot_A-S12', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: '2024-07-20 09:00', endTime: '2024-07-20 09:45', cost: 1.50, status: 'Completed' },
   ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};
// --- End Mock Data Fetching ---


export default function UserProfile({ isOpen, onClose, userId, onLogout }: UserProfileProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [parkingHistory, setParkingHistory] = useState<ParkingHistoryEntry[] | null>(null); // Includes reservations
  const [isLoading, setIsLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userId) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [details, billing, history] = await Promise.all([
            fetchUserDetails(userId),
            fetchBillingInfo(userId),
            fetchParkingHistory(userId), // Fetches history and active reservations
          ]);
          setUserDetails(details);
          setBillingInfo(billing);
          setParkingHistory(history);
        } catch (error) {
          console.error("Failed to load user profile data:", error);
          toast({
              title: "Error Loading Profile",
              description: "Could not fetch your profile data. Please try again later.",
              variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen, userId, toast]);

  const handleOpenReportModal = (reservation: ParkingHistoryEntry) => {
      setReportingReservation(reservation);
      setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
      setIsReportModalOpen(false);
      // Delay clearing to allow modal fade out
      setTimeout(() => setReportingReservation(null), 300);
  };

  const handleDownloadBilling = () => {
    console.log("Download billing statement clicked:", billingInfo);
    toast({ title: "Download Started (Simulation)", description: "Downloading billing statement."});
    // Example: generateCSV/PDF(billingInfo, `billing_statement_${userId}.csv`);
  };

  const handleDownloadHistory = () => {
    const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];
    console.log("Download parking history clicked:", completedHistory);
    toast({ title: "Download Started (Simulation)", description: "Downloading parking history."});
    // Example: generateCSV(completedHistory, `parking_history_${userId}.csv`);
  };

  const activeReservations = parkingHistory?.filter(h => h.status === 'Active') || [];
  const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-md w-full flex flex-col">
          <SheetHeader className="text-left">
            <SheetTitle>User Profile</SheetTitle>
            <SheetDescription>Manage your account details and view history.</SheetDescription>
          </SheetHeader>

          <Separator className="my-4" />

          <ScrollArea className="flex-grow pr-6 -mr-6">
              {isLoading ? (
                  <ProfileSkeleton />
              ) : !userDetails ? (
                  <div className="text-center text-muted-foreground py-10">
                      <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                      Could not load profile data.
                  </div>
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

                  {/* My Reservations */}
                  <div className="mb-6 space-y-3">
                        <h3 className="text-md font-semibold flex items-center gap-2"><Car className="h-4 w-4" /> My Active Reservations</h3>
                        {activeReservations.length > 0 ? (
                            activeReservations.map((res) => (
                                <div key={res.id} className="p-3 border rounded-md text-sm bg-primary/5">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <span className="font-medium">{res.locationName} (Spot {res.spotId.split('-')[1]})</span>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Clock className="h-3 w-3" />
                                                <span>Ends: {new Date(res.endTime).toLocaleTimeString()}</span>
                                                {/* Add time remaining countdown if desired */}
                                            </div>
                                        </div>
                                        <Badge variant="default" size="sm">Active</Badge>
                                    </div>
                                     {/* Add View Live Location button here if needed */}
                                     <Button
                                         variant="outline"
                                         size="sm"
                                         className="w-full mt-2 text-xs"
                                         onClick={() => handleOpenReportModal(res)}
                                     >
                                         <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Report Spot Occupied
                                     </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No active reservations.</p>
                        )}
                  </div>

                   <Separator className="my-4" />

                  {/* Billing Info */}
                  <div className="mb-6 space-y-4">
                      <div className="flex justify-between items-center">
                          <h3 className="text-md font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Billing</h3>
                            <Button variant="ghost" size="sm" onClick={handleDownloadBilling}>
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Download Billing Statement</span>
                            </Button>
                      </div>
                      <div className="flex justify-between items-center p-3 border rounded-md bg-secondary/50">
                          <div>
                              <p className="text-sm text-muted-foreground">Account Balance</p>
                              <p className={`text-xl font-bold ${billingInfo && billingInfo.accountBalance < 0 ? 'text-destructive' : 'text-primary'}`}>
                                  ${billingInfo?.accountBalance?.toFixed(2) ?? '0.00'}
                              </p>
                          </div>
                          {billingInfo && billingInfo.accountBalance < 0 ? (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Outstanding
                                </Badge>
                          ) : (
                                <Badge variant="default" className="flex items-center gap-1 bg-green-600 text-white hover:bg-green-700">
                                    <CheckCircle className="h-3 w-3" /> Paid Up
                                </Badge>
                          )}
                      </div>
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
                      <div className="flex justify-between items-center mb-3">
                          <h3 className="text-md font-semibold flex items-center gap-2"><List className="h-4 w-4" /> Parking History</h3>
                          <Button variant="ghost" size="sm" onClick={handleDownloadHistory}>
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download Parking History</span>
                          </Button>
                      </div>
                      {completedHistory.length > 0 ? (
                          <div className="space-y-3">
                              {completedHistory.slice(0, 5).map((entry) => ( // Show recent 5 history items
                                  <div key={entry.id} className="p-3 border rounded-md text-sm">
                                      <div className="flex justify-between items-center mb-1">
                                          <span className="font-medium">{entry.locationName} (Spot {entry.spotId.split('-')[1]})</span>
                                          <span className="font-semibold text-primary">-${entry.cost.toFixed(2)}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          <span>{new Date(entry.startTime).toLocaleString()} to {new Date(entry.endTime).toLocaleString()}</span>
                                      </div>
                                  </div>
                              ))}
                              {completedHistory.length > 5 && <Button variant="link" size="sm" className="w-full text-center">View Full History</Button>}
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

      {/* Report Issue Modal */}
      <ReportIssueModal
          isOpen={isReportModalOpen}
          onClose={handleCloseReportModal}
          reservation={reportingReservation}
          userId={userId}
      />
    </>
  );
}

// Skeleton Loader remains the same
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
         {/* Reservations Skeleton */}
        <div className="space-y-3">
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-20 w-full" />
        </div>
        <Separator/>
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
         </div>
    </div>
);
