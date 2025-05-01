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
import { List, DollarSign, Clock, AlertCircle, CheckCircle, Smartphone, CreditCard, Download, AlertTriangle, Car, Sparkles as SparklesIcon, Award, Users, Trophy, Star, Gift, Edit, Save, X, Loader2, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, PlusCircle, QrCode } from 'lucide-react'; // Added Wallet icons
import { AppStateContext } from '@/context/AppStateProvider';
import { useToast } from '@/hooks/use-toast';
import { getUserGamification, updateCarpoolEligibility, UserGamification, UserBadge } from '@/services/user-service';
import ReportIssueModal from '@/components/profile/ReportIssueModal';
import { useRouter } from 'next/navigation';
import { getWalletBalance, getWalletTransactions, Wallet, WalletTransaction } from '@/services/wallet-service'; // Import wallet service
import TopUpModal from '@/components/wallet/TopUpModal'; // Import TopUpModal
import SendMoneyModal from '@/components/wallet/SendMoneyModal'; // Import SendMoneyModal
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components
import { cn } from '@/lib/utils'; // Import cn utility


// Mock data types and functions (Should be moved to a shared location or replaced by API)
interface UserDetails {
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    memberSince: string;
    role: string;
}

interface BillingInfo {
    accountBalance: number; // This might become deprecated in favor of wallet balance
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

// Mock Data Fetching Functions (Replace with real API calls)
const fetchUserDetails = async (userId: string, existingName?: string | null, existingAvatar?: string | null, existingRole?: string | null): Promise<UserDetails> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    const name = existingName || `User ${userId.substring(0, 5)}`;
    const avatarUrl = existingAvatar || `https://picsum.photos/seed/${userId}/100/100`;
    const role = existingRole || 'User';
    return { name, email: `user_${userId.substring(0, 5)}@example.com`, phone: '+260 977 123 456', avatarUrl, memberSince: '2024-01-15', role };
};

// Billing info might only contain payment methods now, balance is in wallet
const fetchBillingInfo = async (userId: string, role: string): Promise<Omit<BillingInfo, 'accountBalance'>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const isPremium = role?.toLowerCase().includes('premium') || Math.random() > 0.7;
    return { paymentMethods: [{ type: 'Card', details: 'Visa **** 4321', isPrimary: true }, { type: 'MobileMoney', details: 'MTN 096X XXX XXX', isPrimary: false }], subscriptionTier: isPremium ? 'Premium' : 'Basic', guaranteedSpotsAvailable: isPremium ? 3 : 0 };
};


const fetchParkingHistory = async (userId: string): Promise<ParkingHistoryEntry[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
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
        case 'Megaphone': return AlertTriangle; // Changed for reporting issue badge
        case 'CheckCircle': return CheckCircle;
        case 'Gift': return Gift;
        default: return SparklesIcon; // Default icon
    }
};

export default function ProfilePage() {
    const { isAuthenticated, userId, userName, userAvatarUrl, userRole, updateUserProfile, logout } = useContext(AppStateContext)!; // Added logout
    const router = useRouter();
    const { toast } = useToast();

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [billingInfo, setBillingInfo] = useState<Omit<BillingInfo, 'accountBalance'> | null>(null); // Exclude accountBalance
    const [parkingHistory, setParkingHistory] = useState<ParkingHistoryEntry[] | null>(null);
    const [gamification, setGamification] = useState<UserGamification | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null); // Wallet state
    const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]); // Wallet transactions state
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingWallet, setIsLoadingWallet] = useState(true); // Specific loading for wallet
    const [errorLoading, setErrorLoading] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null);
    const [isUpdatingCarpool, setIsUpdatingCarpool] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false); // Specific state for saving profile
    const [newName, setNewName] = useState('');
    const [newAvatarUrl, setNewAvatarUrl] = useState('');
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false); // State for TopUpModal
    const [isSendMoneyModalOpen, setIsSendMoneyModalOpen] = useState(false); // State for SendMoneyModal

     // Redirect if not authenticated
     useEffect(() => {
         if (typeof window !== 'undefined' && !isAuthenticated) {
              toast({ title: "Access Denied", description: "Please sign in to view your profile.", variant: "destructive" });
             router.push('/'); // Redirect to home page or login page
         }
     }, [isAuthenticated, router, toast]);


    // Combined data fetching function
    const loadProfileData = useCallback(async () => {
        if (userId) {
            setIsLoading(true);
            setIsLoadingWallet(true); // Start wallet loading
            setErrorLoading(null);
            try {
                const roleToUse = userRole || 'User';
                const [details, billing, history, gamificationData, walletData, transactionsData] = await Promise.all([
                    fetchUserDetails(userId, userName, userAvatarUrl, roleToUse),
                    fetchBillingInfo(userId, roleToUse),
                    fetchParkingHistory(userId),
                    getUserGamification(userId),
                    getWalletBalance(userId), // Fetch wallet balance
                    getWalletTransactions(userId, 5), // Fetch recent transactions
                ]);
                setUserDetails(details);
                setBillingInfo(billing);
                setParkingHistory(history);
                setGamification(gamificationData);
                setWallet(walletData); // Set wallet state
                setWalletTransactions(transactionsData); // Set transactions state
                setNewName(details.name || userName || '');
                setNewAvatarUrl(details.avatarUrl || userAvatarUrl || '');
            } catch (error) {
                console.error("Failed to load user profile data:", error);
                setErrorLoading("Could not fetch profile data.");
                toast({ title: "Error Loading Profile", description: "Could not fetch some profile data.", variant: "destructive" });
            } finally {
                setIsLoading(false);
                setIsLoadingWallet(false); // End wallet loading
            }
        } else {
             setIsLoading(false);
             setIsLoadingWallet(false);
             if (isAuthenticated) {
                setErrorLoading("User ID not found. Please try logging in again.");
             }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, userRole, toast]); // userName/userAvatarUrl removed from deps

    // Refetch wallet balance and transactions after modal actions
    const refreshWalletData = useCallback(async () => {
        if (!userId) return;
        setIsLoadingWallet(true);
        try {
            const [walletData, transactionsData] = await Promise.all([
                getWalletBalance(userId),
                getWalletTransactions(userId, 5),
            ]);
            setWallet(walletData);
            setWalletTransactions(transactionsData);
        } catch (error) {
             console.error("Failed to refresh wallet data:", error);
             toast({ title: "Wallet Update Error", description: "Could not refresh wallet balance/transactions.", variant: "destructive" });
        } finally {
             setIsLoadingWallet(false);
        }
    }, [userId, toast]);


    useEffect(() => {
        if (isAuthenticated) {
            loadProfileData();
        } else {
            setIsLoading(false);
            setIsLoadingWallet(false);
            setUserDetails(null);
            setBillingInfo(null);
            setParkingHistory(null);
            setGamification(null);
            setWallet(null);
            setWalletTransactions([]);
        }
    }, [isAuthenticated, loadProfileData]);


    const handleOpenReportModal = (reservation: ParkingHistoryEntry) => {
        if (!isAuthenticated) {
            toast({ title: "Sign In Required", description: "Please sign in to report an issue.", variant: "destructive"});
            return;
        }
        setReportingReservation(reservation);
        setIsReportModalOpen(true);
    };

    const handleDownloadBilling = () => {
        console.log("Download billing statement (payment methods, subscriptions):", billingInfo);
        toast({ title: "Download Started (Simulation)", description: "Downloading billing summary." });
        // TODO: Implement actual CSV/spreadsheet generation and download
    };
     // Update download history to potentially include wallet txns if relevant
     const handleDownloadHistory = () => {
         console.log("Download history (parking & wallet):", { parking: completedHistory, wallet: walletTransactions });
         toast({ title: "Download Started (Simulation)", description: "Downloading combined history." });
         // TODO: Implement combined CSV/spreadsheet generation
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
        setIsSavingProfile(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log("Simulating profile update for:", userId, { name: newName, avatarUrl: newAvatarUrl });
            updateUserProfile(newName, newAvatarUrl);
            setUserDetails(prev => prev ? { ...prev, name: newName, avatarUrl: newAvatarUrl } : null);
            toast({ title: "Profile Updated" });
            setEditMode(false);
        } catch (error) {
            console.error("Failed to save profile:", error);
            toast({ title: "Save Failed", variant: "destructive" });
        } finally {
            setIsSavingProfile(false);
        }
    };

     const handleCancelEdit = () => {
        const originalName = userDetails?.name || userName || '';
        const originalAvatar = userDetails?.avatarUrl || userAvatarUrl || '';
        setNewName(originalName);
        setNewAvatarUrl(originalAvatar);
        setEditMode(false);
     };

    const handleLogout = () => {
        logout();
        toast({ title: "Logged Out"});
        router.push('/'); // Redirect to home after logout
    };

    const getTransactionIcon = (type: WalletTransaction['type']) => {
        switch(type) {
            case 'top-up': return <PlusCircle className="h-4 w-4 text-green-600" />;
            case 'send': return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
            case 'receive': return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
            case 'payment': return <DollarSign className="h-4 w-4 text-red-600" />;
            default: return <WalletIcon className="h-4 w-4 text-muted-foreground" />;
        }
    };


    const activeReservations = parkingHistory?.filter(h => h.status === 'Active') || [];
    const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];
    const displayName = editMode ? newName : (userDetails?.name || userName || 'User');
    const displayAvatar = editMode ? newAvatarUrl : (userDetails?.avatarUrl || userAvatarUrl || '');
    const userInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';
    const currentTier = billingInfo?.subscriptionTier || 'Basic';
    const isPremium = currentTier === 'Premium';

    // Render loading or empty state if not authenticated or data is loading
    if (isLoading) {
        return (
            <div className="container py-8 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
                <ProfileSkeleton />
            </div>
        );
    }

    if (errorLoading) {
         return (
             <div className="container py-8 px-4 md:px-6 lg:px-8 text-center">
                 <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-4" />
                 <p className="text-destructive">{errorLoading}</p>
                 <Button onClick={loadProfileData} className="mt-4">Retry</Button>
             </div>
         );
    }

    if (!isAuthenticated || !userId || !userDetails) {
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
                                     <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isSavingProfile} aria-label="Cancel Edit">
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={handleSaveProfile} disabled={isSavingProfile} aria-label="Save Profile">
                                        {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <CardDescription>View and manage your account details, wallet, and history.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* User Details Section */}
                        <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                            <Avatar className="h-24 w-24 md:h-32 md:w-32 flex-shrink-0 border">
                                <AvatarImage src={displayAvatar} alt={displayName} />
                                <AvatarFallback className="text-4xl">{userInitial}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-2 flex-grow">
                                {editMode ? (
                                    <>
                                        <div className="space-y-1">
                                            <Label htmlFor="profile-name">Name</Label>
                                            <Input id="profile-name" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={isSavingProfile} />
                                        </div>
                                        <div className="space-y-1">
                                             <Label htmlFor="profile-avatar">Avatar URL</Label>
                                             <Input id="profile-avatar" value={newAvatarUrl} onChange={(e) => setNewAvatarUrl(e.target.value)} placeholder="https://..." disabled={isSavingProfile} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-semibold flex items-center gap-2 flex-wrap">
                                            {displayName}
                                             <Badge variant={isPremium ? "default" : "secondary"} className={isPremium ? "bg-yellow-500 text-black hover:bg-yellow-500/90" : ""}>
                                                {isPremium && <Star className="h-3 w-3 mr-1" />} {currentTier} Tier
                                            </Badge>
                                        </h2>
                                        {userDetails.email && <p className="text-sm text-muted-foreground">{userDetails.email}</p>}
                                        {userDetails.phone && <p className="text-sm text-muted-foreground">{userDetails.phone}</p>}
                                        <p className="text-xs text-muted-foreground">Role: {userDetails.role}</p>
                                        <p className="text-xs text-muted-foreground">Member since: {new Date(userDetails.memberSince).toLocaleDateString()}</p>
                                    </>
                                )}
                            </div>
                        </div>

                         <Separator className="my-6" />

                        {/* Wallet Section */}
                        <section className="mb-6">
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><WalletIcon className="h-5 w-5 text-primary" /> Wallet</h3>
                                <Button variant="ghost" size="sm" onClick={refreshWalletData} disabled={isLoadingWallet}>
                                    {isLoadingWallet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" /> } Refresh
                                </Button>
                             </div>
                             <Card className="p-4 mb-4 bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                                 <div className="flex justify-between items-start">
                                     <div>
                                        <p className="text-sm font-medium opacity-80">Available Balance</p>
                                        {isLoadingWallet ? (
                                             <Skeleton className="h-8 w-24 mt-1 bg-primary/50" />
                                        ) : (
                                            <p className="text-3xl font-bold">
                                                {wallet?.currency} {wallet?.balance?.toFixed(2) ?? '0.00'}
                                            </p>
                                        )}
                                     </div>
                                     <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/60 -mr-2 -mt-1">
                                         <QrCode className="h-5 w-5" />
                                         <span className="sr-only">Show QR Code</span>
                                     </Button>
                                 </div>
                                 <div className="mt-4 flex gap-2">
                                      <Button variant="secondary" size="sm" onClick={() => setIsTopUpModalOpen(true)} disabled={isLoadingWallet}>
                                         <PlusCircle className="mr-1.5 h-4 w-4" /> Top Up
                                      </Button>
                                      <Button variant="secondary" size="sm" onClick={() => setIsSendMoneyModalOpen(true)} disabled={isLoadingWallet || (wallet?.balance ?? 0) <= 0}>
                                         <ArrowUpRight className="mr-1.5 h-4 w-4" /> Send
                                      </Button>
                                      {/* Add Receive/Scan button here */}
                                 </div>
                             </Card>

                            <div>
                                 <p className="text-sm font-medium mb-2">Recent Transactions</p>
                                 {isLoadingWallet ? (
                                     <div className="space-y-2">
                                         <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                                     </div>
                                 ) : walletTransactions.length > 0 ? (
                                     <div className="space-y-2">
                                         {walletTransactions.map(txn => (
                                             <div key={txn.id} className="flex items-center justify-between p-2 border rounded-md text-sm bg-background hover:bg-muted/50">
                                                 <div className="flex items-center gap-2 overflow-hidden">
                                                     {getTransactionIcon(txn.type)}
                                                     <div className="flex-1 truncate">
                                                         <p className="text-xs font-medium truncate">{txn.description}</p>
                                                         <p className="text-xs text-muted-foreground">{new Date(txn.timestamp).toLocaleString()}</p>
                                                     </div>
                                                 </div>
                                                 <span className={cn(
                                                     "font-semibold text-xs whitespace-nowrap",
                                                     txn.amount >= 0 ? "text-green-600" : "text-red-600"
                                                 )}>
                                                     {txn.amount >= 0 ? '+' : ''}{wallet?.currency} {txn.amount.toFixed(2)}
                                                 </span>
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <p className="text-sm text-muted-foreground text-center py-3">No recent wallet transactions.</p>
                                 )}
                            </div>
                        </section>

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
                                                    {/* TODO: Add cancel reservation button */}
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

                        {/* Billing / Payment Methods Section */}
                        <section className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Billing & Plan</h3>
                                <Button variant="ghost" size="sm" onClick={handleDownloadBilling}>
                                    <Download className="mr-2 h-4 w-4" /> Summary
                                </Button>
                            </div>
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
                                    ) : !isPremium ? (
                                        <p className="text-sm text-muted-foreground">Upgrade for exclusive benefits like guaranteed spots!</p>
                                    ) : null}
                                </CardContent>
                             </Card>

                             {/* Removed Account Balance card - now part of Wallet */}

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
                                                {/* TODO: Add button to remove payment method */}
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
                             <ScrollArea className="h-[250px] pr-3">
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

                         <Separator className="my-6" />

                         {/* Logout Button */}
                         <div className="flex justify-center mt-6">
                             <Button variant="destructive" onClick={handleLogout}>
                                Log Out
                             </Button>
                         </div>
                    </CardContent>
                </Card>
            </div>

            {/* Report Issue Modal */}
            <ReportIssueModal
                isOpen={isReportModalOpen}
                onClose={() => {
                    setIsReportModalOpen(false);
                    setTimeout(() => setReportingReservation(null), 300);
                }}
                reservation={reportingReservation}
                userId={userId}
            />
             {/* Top Up Modal */}
            <TopUpModal
                isOpen={isTopUpModalOpen}
                onClose={() => setIsTopUpModalOpen(false)}
                userId={userId}
                currentBalance={wallet?.balance ?? 0}
                currency={wallet?.currency ?? 'ZMW'}
                onSuccess={refreshWalletData} // Refresh data on success
            />
             {/* Send Money Modal */}
            <SendMoneyModal
                isOpen={isSendMoneyModalOpen}
                onClose={() => setIsSendMoneyModalOpen(false)}
                userId={userId}
                currentBalance={wallet?.balance ?? 0}
                currency={wallet?.currency ?? 'ZMW'}
                onSuccess={refreshWalletData} // Refresh data on success
            />
        </TooltipProvider>
    );
}


// Skeleton Loader Component
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
         {/* Wallet Skeleton */}
         <div className="space-y-4">
            <Skeleton className="h-6 w-1/4 mb-3" />
            <Skeleton className="h-32 w-full mb-4" /> {/* Balance card */}
            <Skeleton className="h-5 w-1/3 mb-2"/> {/* Transactions Title */}
            <Skeleton className="h-10 w-full"/>
            <Skeleton className="h-10 w-full"/>
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
        {/* Billing/Plan Skeleton */}
        <div className="space-y-4">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <Skeleton className="h-24 w-full mb-4"/> {/* Subscription */}
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