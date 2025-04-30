// src/components/profile/UserProfile.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { List, DollarSign, Clock, LogOut, AlertCircle, CheckCircle, Smartphone, CreditCard, Download, AlertTriangle, Car, Sparkles as SparklesIcon, Award, Users, Trophy, Star, Gift } from 'lucide-react'; // Added gamification icons
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import ReportIssueModal from './ReportIssueModal';
import { Switch } from '@/components/ui/switch'; // Import Switch
import { Label } from '@/components/ui/label'; // Import Label
import { getUserGamification, updateCarpoolEligibility, UserGamification, UserBadge } from '@/services/user-service'; // Import gamification services and types
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip


interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onLogout: () => void;
  userName?: string | null; // Added from context/props
  userAvatarUrl?: string | null; // Added from context/props
  userRole?: string | null; // Added role
}

// Mock data types and functions - Replace with actual API calls
interface UserDetails {
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  memberSince: string;
  role: string; // Add role to user details
}

interface BillingInfo {
  accountBalance: number;
  paymentMethods: {
      type: 'Card' | 'MobileMoney';
      details: string;
      isPrimary: boolean;
  }[];
  subscriptionTier?: 'Basic' | 'Premium'; // Add subscription tier
  guaranteedSpotsAvailable?: number; // Example premium feature
}

interface ParkingHistoryEntry {
  id: string;
  spotId: string;
  locationName: string;
  locationId: string;
  startTime: string;
  endTime: string;
  cost: number;
  status: 'Completed' | 'Active' | 'Upcoming';
}

// --- Mock Data Fetching Functions ---
const fetchUserDetails = async (userId: string, existingName?: string | null, existingAvatar?: string | null, existingRole?: string | null): Promise<UserDetails> => {
  await new Promise(resolve => setTimeout(resolve, 700));
  const name = existingName || `User ${userId.substring(0, 5)}`;
  const avatarUrl = existingAvatar || `https://picsum.photos/seed/${userId}/100/100`;
  const role = existingRole || 'User';

  return {
    name: name,
    email: `user_${userId.substring(0, 5)}@example.com`,
    phone: '+260 977 123 456',
    avatarUrl: avatarUrl,
    memberSince: '2024-01-15',
    role: role,
  };
};

const fetchBillingInfo = async (userId: string, role: string): Promise<BillingInfo> => {
   await new Promise(resolve => setTimeout(resolve, 500));
   const randomBalance = (Math.random() * 10) - 5;
   const isPremium = role === 'PremiumUser' || Math.random() > 0.7; // Assume Premium if role matches or randomly

   return {
       accountBalance: parseFloat(randomBalance.toFixed(2)),
       paymentMethods: [
            { type: 'Card', details: 'Visa **** 4321', isPrimary: true },
            { type: 'MobileMoney', details: 'MTN 096X XXX XXX', isPrimary: false },
            { type: 'MobileMoney', details: 'Airtel 097X XXX XXX', isPrimary: false },
       ],
       subscriptionTier: isPremium ? 'Premium' : 'Basic',
       guaranteedSpotsAvailable: isPremium ? 3 : 0, // Premium users get 3 guaranteed spots (example)
   };
};

const fetchParkingHistory = async (userId: string): Promise<ParkingHistoryEntry[]> => {
   await new Promise(resolve => setTimeout(resolve, 1000));
   return [
       { id: 'res1', spotId: 'lot_A-S5', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: new Date(Date.now() - 30 * 60000).toISOString(), endTime: new Date(Date.now() + 60 * 60000).toISOString(), cost: 0, status: 'Active' },
       { id: 'hist1', spotId: 'lot_A-S5', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: '2024-07-25 10:00', endTime: '2024-07-25 11:30', cost: 3.50, status: 'Completed' },
       { id: 'hist2', spotId: 'lot_B-S22', locationName: 'Airport Lot B', locationId: 'lot_B', startTime: '2024-07-23 14:15', endTime: '2024-07-23 16:00', cost: 5.00, status: 'Completed' },
       { id: 'hist3', spotId: 'lot_A-S12', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: '2024-07-20 09:00', endTime: '2024-07-20 09:45', cost: 1.50, status: 'Completed' },
   ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};
// --- End Mock Data Fetching ---

// Helper to get Lucide icon component based on name string
const getIconFromName = (iconName: string | undefined): React.ElementType => {
    switch (iconName) {
        case 'Sparkles': return SparklesIcon;
        case 'Award': return Award;
        case 'Users': return Users;
        case 'Trophy': return Trophy;
        case 'Star': return Star;
        case 'Megaphone': return AlertTriangle; // Reusing for reporter badge
        case 'CheckCircle': return CheckCircle;
        case 'Gift': return Gift;
        // Add more cases as needed
        default: return SparklesIcon; // Default icon
    }
};


export default function UserProfile({
    isOpen,
    onClose,
    userId,
    onLogout,
    userName, // Receive from props
    userAvatarUrl, // Receive from props
    userRole // Receive from props
}: UserProfileProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [parkingHistory, setParkingHistory] = useState<ParkingHistoryEntry[] | null>(null);
  const [gamification, setGamification] = useState<UserGamification | null>(null); // State for gamification data
  const [isLoading, setIsLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null);
  const [isUpdatingCarpool, setIsUpdatingCarpool] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userId) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const roleToUse = userRole || 'User'; // Ensure role is defined
          // Fetch all data concurrently
          const [details, billing, history, gamificationData] = await Promise.all([
            fetchUserDetails(userId, userName, userAvatarUrl, roleToUse),
            fetchBillingInfo(userId, roleToUse), // Pass role for potential premium checks
            fetchParkingHistory(userId),
            getUserGamification(userId), // Fetch gamification data
          ]);
          setUserDetails(details);
          setBillingInfo(billing);
          setParkingHistory(history);
          setGamification(gamificationData);
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
  }, [isOpen, userId, userName, userAvatarUrl, userRole, toast]); // Added dependencies

  const handleOpenReportModal = (reservation: ParkingHistoryEntry) => {
      setReportingReservation(reservation);
      setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
      setIsReportModalOpen(false);
      setTimeout(() => setReportingReservation(null), 300);
  };

  const handleDownloadBilling = () => {
    console.log("Download billing statement clicked:", billingInfo);
    toast({ title: "Download Started (Simulation)", description: "Downloading billing statement."});
  };

  const handleDownloadHistory = () => {
    const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];
    console.log("Download parking history clicked:", completedHistory);
    toast({ title: "Download Started (Simulation)", description: "Downloading parking history."});
  };

   const handleCarpoolToggle = async (checked: boolean) => {
       if (!userId) return;
       setIsUpdatingCarpool(true);
       try {
           const success = await updateCarpoolEligibility(userId, checked);
           if (success) {
               // Update local state optimistically or re-fetch
               setGamification(prev => ({ ...prev!, isCarpoolEligible: checked }));
                toast({
                    title: "Carpool Status Updated",
                    description: checked ? "You are now eligible for carpooling benefits!" : "Carpooling benefits disabled.",
                });
                // Optionally award badge (handled in service for this mock)
           } else {
               throw new Error("Failed to update carpool status.");
           }
       } catch (error) {
           console.error("Failed to update carpool status:", error);
           toast({ title: "Update Failed", description: "Could not update carpool status.", variant: "destructive" });
       } finally {
           setIsUpdatingCarpool(false);
       }
   };

  const activeReservations = parkingHistory?.filter(h => h.status === 'Active') || [];
  const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];
  const userInitial = userDetails?.name ? userDetails.name.charAt(0).toUpperCase() : 'U';
  const currentTier = billingInfo?.subscriptionTier || 'Basic';
  const isPremium = currentTier === 'Premium';

  return (
    <>
    <TooltipProvider> {/* Wrap with TooltipProvider */}
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
                  <div className="flex items-start space-x-4 mb-6">
                      <Avatar className="h-16 w-16">
                          <AvatarImage src={userDetails.avatarUrl} alt={userDetails.name} />
                          <AvatarFallback>{userInitial}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 flex-grow">
                          <div className="flex justify-between items-center">
                            <p className="text-lg font-semibold">{userDetails.name}</p>
                             <Badge variant={isPremium ? "default" : "secondary"} className={isPremium ? "bg-yellow-500 text-black" : ""}>
                               {isPremium && <Star className="h-3 w-3 mr-1" />}
                               {currentTier} Tier
                             </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{userDetails.email}</p>
                          <p className="text-sm text-muted-foreground">{userDetails.phone}</p>
                          <p className="text-xs text-muted-foreground">Role: {userDetails.role}</p>
                          <p className="text-xs text-muted-foreground">Member since: {userDetails.memberSince}</p>
                      </div>
                  </div>

                   {/* Gamification Section */}
                   <div className="mb-6 space-y-3">
                       <h3 className="text-md font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-600" /> Rewards & Badges</h3>
                       <div className="flex items-center justify-between p-3 border rounded-md bg-secondary/50">
                           <div className="flex items-center gap-2">
                               <SparklesIcon className="h-5 w-5 text-primary" />
                               <span className="font-medium">Points:</span>
                           </div>
                           <span className="text-lg font-bold text-primary">{gamification?.points ?? 0}</span>
                       </div>
                       <div>
                           <p className="text-sm font-medium mb-2">Earned Badges:</p>
                           {gamification?.badges && gamification.badges.length > 0 ? (
                               <div className="flex flex-wrap gap-2">
                                   {gamification.badges.map(badge => {
                                       const IconComponent = getIconFromName(badge.iconName);
                                       return (
                                            <Tooltip key={badge.id}>
                                               <TooltipTrigger asChild>
                                                    <Badge variant="outline" className="flex items-center gap-1 p-2 cursor-default">
                                                        <IconComponent className="h-4 w-4 text-yellow-600" />
                                                        <span>{badge.name}</span>
                                                    </Badge>
                                                </TooltipTrigger>
                                               <TooltipContent>
                                                   <p className="text-sm font-medium">{badge.name}</p>
                                                   <p className="text-xs text-muted-foreground">{badge.description}</p>
                                                   <p className="text-xs text-muted-foreground">Earned: {new Date(badge.earnedDate).toLocaleDateString()}</p>
                                                </TooltipContent>
                                           </Tooltip>
                                       );
                                   })}
                               </div>
                           ) : (
                               <p className="text-xs text-muted-foreground">No badges earned yet. Keep parking!</p>
                           )}
                       </div>
                       {/* Carpooling Toggle */}
                       <div className="flex items-center justify-between p-3 border rounded-md">
                            <div className="space-y-0.5">
                               <Label htmlFor="carpool-switch" className="text-sm font-medium flex items-center gap-1.5">
                                   <Users className="h-4 w-4" /> Enable Carpooling Benefits
                                </Label>
                               <p className="text-xs text-muted-foreground">
                                   Get potential discounts by indicating you carpool.
                               </p>
                            </div>
                            <Switch
                                id="carpool-switch"
                                checked={gamification?.isCarpoolEligible ?? false}
                                onCheckedChange={handleCarpoolToggle}
                                disabled={isUpdatingCarpool}
                            />
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
                                            </div>
                                        </div>
                                        <Badge variant="default" size="sm">Active</Badge>
                                    </div>
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
                       {/* Subscription / Premium Features */}
                        <Card className="bg-secondary/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex justify-between items-center">
                                    Subscription: {currentTier}
                                     <Button variant="link" size="sm" className="text-xs h-auto p-0">
                                         {isPremium ? "Manage Plan" : "Upgrade"}
                                     </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isPremium ? (
                                    <div className="space-y-1 text-xs">
                                        <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Lower transaction fees</p>
                                        <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> {billingInfo?.guaranteedSpotsAvailable ?? 0} Guaranteed Spot passes/month</p>
                                        <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Priority Support</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">Upgrade to Premium for exclusive benefits!</p>
                                )}
                            </CardContent>
                        </Card>

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
                              {completedHistory.slice(0, 5).map((entry) => (
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
      </TooltipProvider> {/* Close TooltipProvider */}

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

// Skeleton Loader
const ProfileSkeleton = () => (
    <div className="space-y-6">
        {/* User Info Skeleton */}
        <div className="flex items-start space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-grow">
                 <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-20" />
                 </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
            </div>
        </div>
         {/* Gamification Skeleton */}
         <div className="space-y-3">
             <Skeleton className="h-5 w-36 mb-2" />
             <Skeleton className="h-12 w-full" />
             <div className="pt-2 space-y-1">
                 <Skeleton className="h-4 w-24 mb-2" />
                 <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                 </div>
             </div>
             <Skeleton className="h-16 w-full" /> {/* Carpool toggle */}
         </div>
         {/* Reservations Skeleton */}
        <div className="space-y-3">
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-24 w-full" /> {/* Increased height for button */}
        </div>
        <Separator/>
        {/* Billing Skeleton */}
         <div className="space-y-4">
             <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-24 w-full" /> {/* Subscription card */}
             <Skeleton className="h-16 w-full" /> {/* Balance card */}
             <div className="space-y-2 pt-2">
                 <Skeleton className="h-4 w-28 mb-2" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
             </div>
             <Skeleton className="h-9 w-full" /> {/* Manage button */}
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
