// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { List, DollarSign, Clock, AlertCircle, CheckCircle, Smartphone, CreditCard, Download, AlertTriangle, Car, Sparkles as SparklesIcon, Award, Users, Trophy, Star, Gift, Edit, Save, X } from 'lucide-react';
import { AppStateContext } from '@/context/AppStateProvider';
import { useToast } from '@/hooks/use-toast';
import { getUserGamification, updateCarpoolEligibility, UserGamification, UserBadge } from '@/services/user-service';
import ReportIssueModal from '@/components/profile/ReportIssueModal'; // Keep for reporting from history
import { useRouter } from 'next/navigation'; // Use for redirection

// Mock data types and functions (same as UserProfile sheet - should be moved to a shared location)
interface UserDetails {
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    memberSince: string;
    role: string;
}

interface BillingInfo {
    accountBalance: number;
    paymentMethods: { type: 'Card' | 'MobileMoney'; details: string; isPrimary: boolean }[];
    subscriptionTier?: 'Basic' | 'Premium';
    guaranteedSpotsAvailable?: number;
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

// Mock Data Fetching Functions (Should be replaced with real API calls)
const fetchUserDetails = async (userId: string, existingName?: string | null, existingAvatar?: string | null, existingRole?: string | null): Promise<UserDetails> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    const name = existingName || `User ${userId.substring(0, 5)}`;
    const avatarUrl = existingAvatar || `https://picsum.photos/seed/${userId}/100/100`;
    const role = existingRole || 'User';
    return { name, email: `user_${userId.substring(0, 5)}@example.com`, phone: '+260 977 123 456', avatarUrl, memberSince: '2024-01-15', role };
};

const fetchBillingInfo = async (userId: string, role: string): Promise<BillingInfo> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const randomBalance = (Math.random() * 10) - 5;
    // Ensure role check covers variations
    const isPremium = role?.toLowerCase().includes('premium') || Math.random() > 0.7;
    return { accountBalance: parseFloat(randomBalance.toFixed(2)), paymentMethods: [{ type: 'Card', details: 'Visa **** 4321', isPrimary: true }, { type: 'MobileMoney', details: 'MTN 096X XXX XXX', isPrimary: false }], subscriptionTier: isPremium ? 'Premium' : 'Basic', guaranteedSpotsAvailable: isPremium ? 3 : 0 };
};

const fetchParkingHistory = async (userId: string): Promise<ParkingHistoryEntry[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
     // More realistic history
    const now = Date.now();
    const history: ParkingHistoryEntry[] = [
      { id: 'res1', spotId: 'lot_A-S5', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: new Date(now - 30 * 60000).toISOString(), endTime: new Date(now + 60 * 60000).toISOString(), cost: 0, status: 'Active' },
      { id: 'hist1', spotId: 'lot_A-S5', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: new Date(now - 2 * 24 * 60 * 60000).toISOString(), endTime: new Date(now - (2 * 24 - 1.5) * 60 * 60000).toISOString(), cost: 3.50, status: 'Completed' },
      { id: 'hist2', spotId: 'lot_B-S22', locationName: 'Airport Lot B', locationId: 'lot_B', startTime: new Date(now - 5 * 24 * 60 * 60000).toISOString(), endTime: new Date(now - (5 * 24 - 2) * 60 * 60000).toISOString(), cost: 5.00, status: 'Completed' },
      { id: 'hist3', spotId: 'lot_A-S12', locationName: 'Downtown Garage', locationId: 'lot_A', startTime: new Date(now - 7 * 24 * 60 * 60000).toISOString(), endTime: new Date(now - (7 * 24 - 0.75) * 60 * 60000).toISOString(), cost: 1.50, status: 'Completed' },
      { id: 'hist4', spotId: 'lot_C-S100', locationName: 'Mall Parking Deck', locationId: 'lot_C', startTime: new Date(now - 10 * 24 * 60 * 60000).toISOString(), endTime: new Date(now - (10 * 24 - 3) * 60 * 60000).toISOString(), cost: 7.00, status: 'Completed' },
    ];
    return history.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};

// Helper to get Lucide icon component based on name string
const getIconFromName = (iconName: string | undefined): React.ElementType => {
    switch (iconName) {
        case 'Sparkles': return SparklesIcon;
        case 'Award': return Award;
        case 'Users': return Users;
        case 'Trophy': return Trophy;
        case 'Star': return Star;
        case 'Megaphone': return AlertTriangle;
        case 'CheckCircle': return CheckCircle;
        case 'Gift': return Gift;
        default: return SparklesIcon;
    }
};

export default function ProfilePage() {
    const { isAuthenticated, userId, userName, userAvatarUrl, userRole, updateUserProfile } = useContext(AppStateContext)!;
    const router = useRouter();
    const { toast } = useToast();

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
    const [parkingHistory, setParkingHistory] = useState<ParkingHistoryEntry[] | null>(null);
    const [gamification, setGamification] = useState<UserGamification | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null);
    const [isUpdatingCarpool, setIsUpdatingCarpool] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAvatarUrl, setNewAvatarUrl] = useState('');

     // Redirect if not authenticated
     useEffect(() => {
         // Run check only on client side after mount
         if (typeof window !== 'undefined' && !isAuthenticated) {
              toast({ title: "Access Denied", description: "Please sign in to view your profile.", variant: "destructive" });
             router.push('/'); // Redirect to home page or login page
         }
     }, [isAuthenticated, router, toast]);


    // Fetch data when authenticated user ID is available
    useEffect(() => {
        if (userId) {
            const loadData = async () => {
                setIsLoading(true);
                try {
                    const roleToUse = userRole || 'User';
                    const [details, billing, history, gamificationData] = await Promise.all([
                        fetchUserDetails(userId, userName, userAvatarUrl, roleToUse),
                        fetchBillingInfo(userId, roleToUse),
                        fetchParkingHistory(userId),
                        getUserGamification(userId),
                    ]);
                    setUserDetails(details);
                    setBillingInfo(billing);
                    setParkingHistory(history);
                    setGamification(gamificationData);
                    setNewName(details.name);
                    setNewAvatarUrl(details.avatarUrl || '');
                } catch (error) {
                    console.error("Failed to load user profile data:", error);
                    toast({ title: "Error Loading Profile", description: "Could not fetch profile data.", variant: "destructive" });
                } finally {
                    setIsLoading(false);
                }
            };
            loadData();
        } else {
             setIsLoading(false); // Stop loading if no userId (handles case where user logs out)
        }
    }, [userId, userName, userAvatarUrl, userRole, toast]);

    const handleOpenReportModal = (reservation: ParkingHistoryEntry) => {
        setReportingReservation(reservation);
        setIsReportModalOpen(true);
    };

    const handleDownloadBilling = () => {
        console.log("Download billing statement:", billingInfo);
        toast({ title: "Download Started (Simulation)", description: "Downloading billing statement." });
    };

    const handleDownloadHistory = () => {
        const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];
        console.log("Download parking history:", completedHistory);
        toast({ title: "Download Started (Simulation)", description: "Downloading parking history." });
    };

    const handleCarpoolToggle = async (checked: boolean) => {
        if (!userId) return;
        setIsUpdatingCarpool(true);
        try {
            const success = await updateCarpoolEligibility(userId, checked);
            if (success) {
                setGamification(prev => prev ? ({ ...prev, isCarpoolEligible: checked }) : ({ points: 0, badges: [], isCarpoolEligible: checked }));
                toast({ title: "Carpool Status Updated", description: checked ? "Eligible for carpooling benefits!" : "Carpooling benefits disabled." });
            } else { throw new Error("Failed to update carpool status."); }
        } catch (error) {
            console.error("Failed to update carpool status:", error);
            toast({ title: "Update Failed", variant: "destructive" });
        } finally { setIsUpdatingCarpool(false); }
    };

    const handleSaveProfile = async () => {
        if (!newName || !userId) {
            toast({ title: "Missing Information", description: "Name cannot be empty.", variant: "destructive" });
            return;
        }
        setIsLoading(true); // Indicate saving process
        try {
            // Simulate backend update call
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log("Simulating profile update for:", userId, { name: newName, avatarUrl: newAvatarUrl });

            // Update global state via context
            updateUserProfile(newName, newAvatarUrl);

            // Update local state
            setUserDetails(prev => prev ? { ...prev, name: newName, avatarUrl: newAvatarUrl } : null);

            toast({ title: "Profile Updated" });
            setEditMode(false);
        } catch (error) {
            console.error("Failed to save profile:", error);
            toast({ title: "Save Failed", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

     const handleCancelEdit = () => {
        // Reset form fields to original values
        if(userDetails) {
            setNewName(userDetails.name);
            setNewAvatarUrl(userDetails.avatarUrl || '');
        }
        setEditMode(false);
     };

    const activeReservations = parkingHistory?.filter(h => h.status === 'Active') || [];
    const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];
    const userInitial = userDetails?.name ? userDetails.name.charAt(0).toUpperCase() : '?';
    const currentTier = billingInfo?.subscriptionTier || 'Basic';
    const isPremium = currentTier === 'Premium';

    // Render loading or empty state if not authenticated or data is loading
    if (isLoading) {
        return (
            <div className="container py-8 px-4 md:px-6 lg:px-8">
                <ProfileSkeleton />
            </div>
        );
    }

    if (!isAuthenticated || !userId || !userDetails) {
        // This case should ideally be handled by the redirect, but as a fallback:
        return (
            <div className="container py-8 px-4 md:px-6 lg:px-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Please sign in to view your profile.</p>
                 <Button onClick={() => router.push('/')} className="mt-4">Go to Home</Button>
            </div>
        );
    }


    return (
        <TooltipProvider>
            <div className="container py-8 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl">My Profile</CardTitle>
                            {!editMode ? (
                                <Button variant="ghost" size="icon" onClick={() => setEditMode(true)} aria-label="Edit Profile">
                                    <Edit className="h-4 w-4" />
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                     <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isLoading} aria-label="Cancel Edit">
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={handleSaveProfile} disabled={isLoading} aria-label="Save Profile">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <CardDescription>View and manage your account details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                            <Avatar className="h-24 w-24 md:h-32 md:w-32 flex-shrink-0">
                                <AvatarImage src={newAvatarUrl || userDetails.avatarUrl} alt={newName || userDetails.name} />
                                <AvatarFallback className="text-4xl">{userInitial}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-2 flex-grow">
                                {editMode ? (
                                    <>
                                        <div className="space-y-1">
                                            <Label htmlFor="profile-name">Name</Label>
                                            <Input id="profile-name" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={isLoading} />
                                        </div>
                                        <div className="space-y-1">
                                             <Label htmlFor="profile-avatar">Avatar URL</Label>
                                             <Input id="profile-avatar" value={newAvatarUrl} onChange={(e) => setNewAvatarUrl(e.target.value)} placeholder="https://..." disabled={isLoading} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                                            {userDetails.name}
                                             <Badge variant={isPremium ? "default" : "secondary"} className={isPremium ? "bg-yellow-500 text-black" : ""}>
                                                {isPremium && <Star className="h-3 w-3 mr-1" />} {currentTier} Tier
                                            </Badge>
                                        </h2>
                                        <p className="text-sm text-muted-foreground">{userDetails.email}</p>
                                        <p className="text-sm text-muted-foreground">{userDetails.phone}</p>
                                        <p className="text-xs text-muted-foreground">Role: {userDetails.role}</p>
                                        <p className="text-xs text-muted-foreground">Member since: {new Date(userDetails.memberSince).toLocaleDateString()}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <Separator className="my-6" />

                        {/* Gamification Section */}
                        <section className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-600" /> Rewards & Badges</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <SparklesIcon className="h-6 w-6 text-primary" />
                                        <span className="font-medium">Points Balance</span>
                                    </div>
                                    <span className="text-2xl font-bold text-primary">{gamification?.points ?? 0}</span>
                                </Card>
                                <Card className="flex items-center justify-between p-4">
                                     <div className="space-y-0.5">
                                        <Label htmlFor="carpool-switch" className="font-medium flex items-center gap-1.5">
                                            <Users className="h-4 w-4" /> Carpooling Eligible
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Enable for potential discounts.</p>
                                    </div>
                                    <Switch id="carpool-switch" checked={gamification?.isCarpoolEligible ?? false} onCheckedChange={handleCarpoolToggle} disabled={isUpdatingCarpool} />
                                </Card>
                            </div>
                             <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Earned Badges:</p>
                                {gamification?.badges && gamification.badges.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {gamification.badges.map(badge => {
                                            const IconComponent = getIconFromName(badge.iconName);
                                            return (
                                                <Tooltip key={badge.id}>
                                                    <TooltipTrigger asChild>
                                                        <Badge variant="outline" className="flex items-center gap-1.5 p-2 cursor-default text-xs">
                                                            <IconComponent className="h-4 w-4 text-yellow-600" />
                                                            {badge.name}
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-sm font-medium">{badge.name}</p>
                                                        <p className="text-xs text-muted-foreground max-w-xs">{badge.description}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Earned: {new Date(badge.earnedDate).toLocaleDateString()}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No badges earned yet. Keep parking!</p>
                                )}
                            </div>
                        </section>

                        <Separator className="my-6" />

                        {/* Active Reservations Section */}
                         <section className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Car className="h-5 w-5" /> Active Reservations</h3>
                            {activeReservations.length > 0 ? (
                                <div className="space-y-3">
                                    {activeReservations.map((res) => (
                                        <Card key={res.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div>
                                                <p className="font-medium">{res.locationName} (Spot {res.spotId.split('-')[1]})</p>
                                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Ends: {new Date(res.endTime).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                            <Button variant="destructive" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0" onClick={() => handleOpenReportModal(res)}>
                                                <AlertTriangle className="mr-1.5 h-4 w-4" /> Report Issue
                                            </Button>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No active reservations found.</p>
                            )}
                        </section>


                        <Separator className="my-6" />

                        {/* Billing Section */}
                        <section className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Billing</h3>
                                <Button variant="ghost" size="sm" onClick={handleDownloadBilling}>
                                    <Download className="mr-2 h-4 w-4" /> Statement
                                </Button>
                            </div>
                             {/* Subscription / Premium Features */}
                             <Card className="mb-4 border-l-4 border-yellow-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex justify-between items-center">
                                        Subscription: {currentTier}
                                        <Button variant="link" size="sm" className="text-xs h-auto p-0">
                                            {isPremium ? "Manage Plan" : "Upgrade"}
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isPremium && billingInfo?.guaranteedSpotsAvailable !== undefined ? (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4 text-green-600"/> You have {billingInfo.guaranteedSpotsAvailable} guaranteed spot passes remaining.
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Upgrade for exclusive benefits like guaranteed spots!</p>
                                    )}
                                </CardContent>
                             </Card>

                            <Card className="flex justify-between items-center p-4 mb-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Account Balance</p>
                                    <p className={`text-2xl font-bold ${billingInfo && billingInfo.accountBalance < 0 ? 'text-destructive' : 'text-primary'}`}>
                                        ${billingInfo?.accountBalance?.toFixed(2) ?? '0.00'}
                                    </p>
                                </div>
                                {billingInfo && billingInfo.accountBalance < 0 ? (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Overdue
                                    </Badge>
                                ) : (
                                    <Button variant="outline" size="sm">Add Funds</Button>
                                )}
                            </Card>
                            <div>
                                <p className="text-sm font-medium mb-2">Payment Methods</p>
                                <div className="space-y-2 mb-3">
                                    {billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0 ? (
                                        billingInfo.paymentMethods.map((method, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 border rounded-md text-sm">
                                                <div className="flex items-center gap-2">
                                                    {method.type === 'Card' ? <CreditCard className="h-4 w-4 text-muted-foreground" /> : <Smartphone className="h-4 w-4 text-muted-foreground" />}
                                                    <span>{method.details}</span>
                                                </div>
                                                {method.isPrimary && <Badge variant="outline" size="sm">Primary</Badge>}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No payment methods saved.</p>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" className="w-full">Manage Payment Methods</Button>
                            </div>
                        </section>

                        <Separator className="my-6" />

                        {/* Parking History Section */}
                         <section>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><List className="h-5 w-5" /> Parking History</h3>
                                <Button variant="ghost" size="sm" onClick={handleDownloadHistory}>
                                    <Download className="mr-2 h-4 w-4" /> Download
                                </Button>
                            </div>
                             <ScrollArea className="h-[250px] pr-3"> {/* Limit height and add scroll */}
                                {completedHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {completedHistory.map((entry) => (
                                            <Card key={entry.id} className="p-3 text-sm flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{entry.locationName} (Spot {entry.spotId.split('-')[1]})</p>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{new Date(entry.startTime).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-sm">${entry.cost.toFixed(2)}</span>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No completed parking history.</p>
                                )}
                            </ScrollArea>
                        </section>
                    </CardContent>
                </Card>
            </div>

            {/* Report Issue Modal */}
            <ReportIssueModal
                isOpen={isReportModalOpen}
                onClose={() => {
                    setIsReportModalOpen(false);
                    setTimeout(() => setReportingReservation(null), 300); // Delay clearing
                }}
                reservation={reportingReservation}
                userId={userId}
            />
        </TooltipProvider>
    );
}


// Skeleton Loader Component (Simplified)
const ProfileSkeleton = () => (
    <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-start space-x-6">
            <Skeleton className="h-32 w-32 rounded-full flex-shrink-0" />
            <div className="space-y-3 flex-grow mt-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
            </div>
        </div>
        <Separator />
        {/* Rewards Skeleton */}
        <div className="space-y-4">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-5 w-1/4 mt-4" />
            <div className="flex gap-2"> <Skeleton className="h-8 w-20"/> <Skeleton className="h-8 w-24"/></div>
        </div>
         <Separator />
         {/* Active Reservation Skeleton */}
         <div className="space-y-3">
             <Skeleton className="h-6 w-1/3 mb-3" />
             <Skeleton className="h-24 w-full" />
         </div>
        <Separator />
        {/* Billing Skeleton */}
        <div className="space-y-4">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <Skeleton className="h-24 w-full mb-4"/> {/* Subscription */}
             <Skeleton className="h-20 w-full mb-4"/> {/* Balance */}
             <Skeleton className="h-5 w-1/3 mb-2"/> {/* Payment Methods Title */}
             <Skeleton className="h-12 w-full"/>
             <Skeleton className="h-12 w-full"/>
             <Skeleton className="h-9 w-full mt-1"/> {/* Manage Button */}
        </div>
        <Separator />
        {/* History Skeleton */}
        <div className="space-y-3">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
    </div>
);
