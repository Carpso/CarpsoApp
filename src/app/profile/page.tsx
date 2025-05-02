// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { List, DollarSign, Clock, AlertCircle, CheckCircle, Smartphone, CreditCard, Download, AlertTriangle, Car, Sparkles as SparklesIcon, Award, Users, Trophy, Star, Gift, Edit, Save, X, Loader2, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, PlusCircle, QrCode, Info, CarTaxiFront, Flag, BookMarked, Home as HomeIcon, Briefcase, School as SchoolIcon, GraduationCap, Edit2, Trash2, WifiOff, UserPlus, Sparkles } from 'lucide-react'; // Added Bookmark icons, Edit2, Trash2, WifiOff, UserPlus, Sparkles
import { AppStateContext } from '@/context/AppStateProvider';
import { useToast } from '@/hooks/use-toast';
import { getUserGamification, updateCarpoolEligibility, UserGamification, UserBadge, UserBookmark, getUserBookmarks, addBookmark, updateBookmark, deleteBookmark, getPointsTransactions, PointsTransaction, transferPoints } from '@/services/user-service'; // Import bookmark types and functions, points transactions, transferPoints
import ReportIssueModal from '@/components/profile/ReportIssueModal';
import { useRouter } from 'next/navigation';
import { getWalletBalance, getWalletTransactions, Wallet, WalletTransaction } from '@/services/wallet-service'; // Import wallet service
import TopUpModal from '@/components/wallet/TopUpModal'; // Import TopUpModal
import SendMoneyModal from '@/components/wallet/SendMoneyModal'; // Import SendMoneyModal
import PayForOtherModal from '@/components/wallet/PayForOtherModal'; // Import PayForOtherModal
import TransferPointsModal from '@/components/gamification/TransferPointsModal'; // Import TransferPointsModal
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components
import { cn } from '@/lib/utils'; // Import cn utility
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Import Alert components
import { Dialog, DialogTrigger, DialogContent, DialogFooter, DialogHeader as DialogHeaderSub, DialogTitle as DialogTitleSub, DialogDescription as DialogDescriptionSub, DialogClose } from "@/components/ui/dialog"; // Import Dialog components


// Mock data types and functions (Should be moved to a shared location or replaced by API)
interface UserDetails {
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    memberSince: string;
    role: string;
    // New fields for editing
    preferredPaymentMethod?: 'Card' | 'MobileMoney';
    notificationPreferences?: {
        promotions: boolean;
        updates: boolean;
    }
}

interface BillingInfo {
    paymentMethods: { id: string; type: 'Card' | 'MobileMoney'; details: string; isPrimary: boolean }[];
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

interface Vehicle {
    id: string;
    make: string;
    model: string;
    plateNumber: string;
    isPrimary: boolean;
}

// --- Cache Keys ---
const CACHE_KEYS = {
    userDetails: (userId: string) => `cachedUserDetails_${userId}`,
    billingInfo: (userId: string) => `cachedBillingInfo_${userId}`,
    parkingHistory: (userId: string) => `cachedParkingHistory_${userId}`,
    vehicles: (userId: string) => `cachedVehicles_${userId}`,
    gamification: (userId: string) => `cachedGamification_${userId}`,
    pointsTxns: (userId: string) => `cachedPointsTxns_${userId}`, // Added points transactions cache
    wallet: (userId: string) => `cachedUserWallet_${userId}`,
    walletTxns: (userId: string) => `cachedUserWalletTxns_${userId}`,
    bookmarks: (userId: string) => `cachedUserBookmarks_${userId}`,
    timestampSuffix: '_timestamp',
};

// --- Helper to get cached data ---
const getCachedData = <T>(key: string, maxAgeMs: number = 60 * 60 * 1000): T | null => {
    if (typeof window === 'undefined') return null;
    const timestampKey = key + CACHE_KEYS.timestampSuffix;
    const timestamp = localStorage.getItem(timestampKey);
    const data = localStorage.getItem(key);
    if (data && timestamp && (Date.now() - parseInt(timestamp)) < maxAgeMs) {
        try {
            return JSON.parse(data) as T;
        } catch (e) {
            console.error("Error parsing cached data:", e);
            localStorage.removeItem(key);
            localStorage.removeItem(timestampKey);
            return null;
        }
    }
    return null;
};

// --- Helper to set cached data ---
const setCachedData = <T>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(key + CACHE_KEYS.timestampSuffix, Date.now().toString());
    } catch (e) {
        console.error("Error setting cached data:", e);
        // Handle potential storage full errors
    }
};

// Mock Data Fetching Functions (Replace with real API calls)
const fetchUserDetails = async (userId: string, existingName?: string | null, existingAvatar?: string | null, existingRole?: string | null): Promise<UserDetails> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    const name = existingName || `User ${userId.substring(0, 5)}`;
    const avatarUrl = existingAvatar || `https://picsum.photos/seed/${userId}/100/100`;
    const role = existingRole || 'User';
    // Simulate fetching other details
    const prefs = { promotions: Math.random() > 0.5, updates: true };
    const details = { name, email: `user_${userId.substring(0, 5)}@example.com`, phone: '+260 977 123 456', avatarUrl, memberSince: '2024-01-15', role, preferredPaymentMethod: 'Card', notificationPreferences: prefs };
    setCachedData(CACHE_KEYS.userDetails(userId), details);
    return details;
};

const fetchBillingInfo = async (userId: string, role: string): Promise<Omit<BillingInfo, 'accountBalance'>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const isPremium = role?.toLowerCase().includes('premium') || Math.random() > 0.7;
     // Add IDs to payment methods
    const billing = { paymentMethods: [{ id:'pm_1', type: 'Card', details: 'Visa **** 4321', isPrimary: true }, { id:'pm_2', type: 'MobileMoney', details: 'MTN 096X XXX XXX', isPrimary: false }], subscriptionTier: isPremium ? 'Premium' : 'Basic', guaranteedSpotsAvailable: isPremium ? 3 : 0 };
    setCachedData(CACHE_KEYS.billingInfo(userId), billing);
    return billing;
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
     const sortedHistory = history.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
     setCachedData(CACHE_KEYS.parkingHistory(userId), sortedHistory);
    return sortedHistory;
};

const fetchVehicles = async (userId: string): Promise<Vehicle[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const plateBasedOnId = `ABC ${userId.substring(userId.length - 4)}`.toUpperCase();
    const vehicles = [
        { id: 'veh1', make: 'Toyota', model: 'Corolla', plateNumber: plateBasedOnId, isPrimary: true },
        { id: 'veh2', make: 'Nissan', model: 'Hardbody', plateNumber: 'XYZ 7890', isPrimary: false }, // Example second car
    ];
    setCachedData(CACHE_KEYS.vehicles(userId), vehicles);
    return vehicles;
};

// --- Modified Gamification Fetch to Cache ---
const fetchUserGamification = async (userId: string): Promise<UserGamification> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const gamification = userGamificationData[userId] || { points: 0, badges: [], isCarpoolEligible: false };
    setCachedData(CACHE_KEYS.gamification(userId), gamification);
    return gamification;
}
// --- Modified Points Transactions Fetch to Cache ---
const fetchPointsTransactions = async (userId: string, limit: number = 5): Promise<PointsTransaction[]> => {
    await new Promise(resolve => setTimeout(resolve, 350));
    const transactions = (pointsTransactions[userId] || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    setCachedData(CACHE_KEYS.pointsTxns(userId), transactions); // Cache recent txns
    return transactions;
}
// --- Modified Wallet Fetch to Cache ---
const fetchUserWallet = async (userId: string): Promise<Wallet> => {
     await new Promise(resolve => setTimeout(resolve, 200));
     const wallet = userWallets[userId] || { balance: 0, currency: 'ZMW' };
     setCachedData(CACHE_KEYS.wallet(userId), wallet);
     return wallet;
}
const fetchUserWalletTransactions = async (userId: string, limit: number = 5): Promise<WalletTransaction[]> => {
     await new Promise(resolve => setTimeout(resolve, 350));
     const transactions = (userTransactions[userId] || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
     setCachedData(CACHE_KEYS.walletTxns(userId), transactions); // Cache recent txns
     return transactions;
}
// --- Modified Bookmarks Fetch to Cache ---
const fetchUserBookmarks = async (userId: string): Promise<UserBookmark[]> => {
    await new Promise(resolve => setTimeout(resolve, 250));
    const bookmarks = userBookmarks[userId] || [];
    setCachedData(CACHE_KEYS.bookmarks(userId), bookmarks);
    return bookmarks;
}


// Mock Update Functions
const updateUserDetails = async (userId: string, updates: Partial<UserDetails>): Promise<UserDetails> => {
     await new Promise(resolve => setTimeout(resolve, 800));
     console.log("Simulating user details update:", userId, updates);
     // In a real app, update the backend data source
     // This mock doesn't persist changes across sessions in memory, but caches
     const currentDetails = getCachedData<UserDetails>(CACHE_KEYS.userDetails(userId)) || { name: '', email: '', phone: '', avatarUrl: '', memberSince: new Date().toISOString(), role: 'User' };
     const updatedDetails: UserDetails = {
         ...currentDetails,
         name: updates.name || currentDetails.name,
         email: updates.email || currentDetails.email,
         phone: updates.phone || currentDetails.phone,
         avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : currentDetails.avatarUrl, // Allow setting null/empty avatar
         preferredPaymentMethod: updates.preferredPaymentMethod || currentDetails.preferredPaymentMethod,
         notificationPreferences: updates.notificationPreferences || currentDetails.notificationPreferences,
     };
     setCachedData(CACHE_KEYS.userDetails(userId), updatedDetails);
     return updatedDetails;
};

const updateUserVehicles = async (userId: string, vehicles: Vehicle[]): Promise<Vehicle[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("Simulating updating user vehicles:", userId, vehicles);
    // Replace the mock data (in a real app, update backend) and cache
    setCachedData(CACHE_KEYS.vehicles(userId), vehicles);
    return vehicles;
};

// Helper to get Lucide icon component based on name string
const getIconFromName = (iconName: string | undefined): React.ElementType => {
    switch (iconName) {
        case 'Sparkles': return SparklesIcon;
        case 'Award': return Award;
        case 'Users': return Users;
        case 'Trophy': return Trophy;
        case 'Star': return Star;
        case 'Flag': return Flag; // Changed to Flag
        case 'CheckCircle': return CheckCircle;
        case 'Gift': return Gift;
        default: return SparklesIcon; // Default icon
    }
};

// Helper to get Bookmark icon based on label
const getBookmarkIcon = (label: string): React.ElementType => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home')) return HomeIcon;
    if (lowerLabel.includes('work') || lowerLabel.includes('office')) return Briefcase;
    if (lowerLabel.includes('school')) return SchoolIcon;
    if (lowerLabel.includes('college') || lowerLabel.includes('university')) return GraduationCap;
    return BookMarked; // Default bookmark icon
};

export default function ProfilePage() {
    const { isAuthenticated, userId, userName, userAvatarUrl, userRole, updateUserProfile: updateGlobalProfile, logout, isOnline } = useContext(AppStateContext)!;
    const router = useRouter();
    const { toast } = useToast();

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [billingInfo, setBillingInfo] = useState<Omit<BillingInfo, 'accountBalance'> | null>(null);
    const [parkingHistory, setParkingHistory] = useState<ParkingHistoryEntry[] | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [gamification, setGamification] = useState<UserGamification | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
    const [pointsTransactions, setPointsTransactions] = useState<PointsTransaction[]>([]); // Added state for points txns
    const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]); // State for bookmarks

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingWallet, setIsLoadingWallet] = useState(true);
    const [isLoadingGamification, setIsLoadingGamification] = useState(true); // Added gamification loading state
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
    const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true); // Loading state for bookmarks
    const [errorLoading, setErrorLoading] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null); // Track last successful fetch time

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null);
    const [isUpdatingCarpool, setIsUpdatingCarpool] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    // Editable fields states
    const [editName, setEditName] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState(''); // Added email edit state
    const [editVehicles, setEditVehicles] = useState<Vehicle[]>([]);
    const [editNotificationPrefs, setEditNotificationPrefs] = useState({ promotions: false, updates: false });

    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [isSendMoneyModalOpen, setIsSendMoneyModalOpen] = useState(false);
    const [isPayForOtherModalOpen, setIsPayForOtherModalOpen] = useState(false); // Added state
    const [isTransferPointsModalOpen, setIsTransferPointsModalOpen] = useState(false); // Added state

    // Bookmark Modal State
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [currentBookmark, setCurrentBookmark] = useState<Partial<UserBookmark> | null>(null);
    const [isSavingBookmark, setIsSavingBookmark] = useState(false);
    const [isDeletingBookmark, setIsDeletingBookmark] = useState(false);


     // Redirect if not authenticated
     useEffect(() => {
         if (typeof window !== 'undefined' && !isAuthenticated) {
              toast({ title: "Access Denied", description: "Please sign in to view your profile.", variant: "destructive" });
             router.push('/'); // Redirect to home page or login page
         }
     }, [isAuthenticated, router, toast]);


    // Combined data fetching function - Modified for offline cache
    const loadProfileData = useCallback(async (forceRefresh = false) => {
        if (!userId) return;

        setIsLoading(true);
        setIsLoadingWallet(true);
        setIsLoadingGamification(true); // Set gamification loading
        setIsLoadingVehicles(true);
        setIsLoadingBookmarks(true);
        setErrorLoading(null);

        const loadFromCache = (keyFunc: (userId: string) => string, setter: Function) => {
            const cached = getCachedData<any>(keyFunc(userId));
            if (cached) setter(cached);
            return !!cached;
        };

        // Load initial data from cache if available
        const hasCachedDetails = loadFromCache(CACHE_KEYS.userDetails, setUserDetails);
        const hasCachedBilling = loadFromCache(CACHE_KEYS.billingInfo, setBillingInfo);
        const hasCachedHistory = loadFromCache(CACHE_KEYS.parkingHistory, setParkingHistory);
        const hasCachedVehicles = loadFromCache(CACHE_KEYS.vehicles, setVehicles);
        const hasCachedGamification = loadFromCache(CACHE_KEYS.gamification, setGamification);
        const hasCachedPointsTxns = loadFromCache(CACHE_KEYS.pointsTxns, setPointsTransactions); // Load points txns cache
        const hasCachedWallet = loadFromCache(CACHE_KEYS.wallet, setWallet);
        const hasCachedTxns = loadFromCache(CACHE_KEYS.walletTxns, setWalletTransactions);
        const hasCachedBookmarks = loadFromCache(CACHE_KEYS.bookmarks, setBookmarks);

        // Immediately initialize edit states from cached/global state
        const initialDetails = getCachedData<UserDetails>(CACHE_KEYS.userDetails(userId)) || { name: userName || '', avatarUrl: userAvatarUrl || '', memberSince: '', role: userRole || 'User', phone: '', email: '', notificationPreferences: { promotions: false, updates: false } };
        setEditName(initialDetails?.name || '');
        setEditAvatarUrl(initialDetails?.avatarUrl || '');
        setEditPhone(initialDetails?.phone || '');
        setEditEmail(initialDetails?.email || '');
        setEditVehicles(getCachedData<Vehicle[]>(CACHE_KEYS.vehicles(userId)) || []);
        setEditNotificationPrefs(initialDetails?.notificationPreferences || { promotions: false, updates: false });

        if (!isOnline && hasCachedDetails && hasCachedBilling && hasCachedHistory && hasCachedVehicles && hasCachedGamification && hasCachedPointsTxns && hasCachedWallet && hasCachedTxns && hasCachedBookmarks) {
            console.log("Offline: Using cached profile data.");
            setIsLoading(false);
            setIsLoadingWallet(false);
            setIsLoadingGamification(false); // Update gamification loading
            setIsLoadingVehicles(false);
            setIsLoadingBookmarks(false);
            const ts = localStorage.getItem(CACHE_KEYS.userDetails(userId) + CACHE_KEYS.timestampSuffix);
            setLastUpdated(ts ? parseInt(ts) : null);
            return; // Stop if offline and all data loaded from cache
        }

        if (!isOnline && (!hasCachedDetails || !hasCachedBilling || !hasCachedHistory || !hasCachedVehicles || !hasCachedGamification || !hasCachedPointsTxns || !hasCachedWallet || !hasCachedTxns || !hasCachedBookmarks)) {
            console.warn("Offline: Missing some cached profile data.");
            setErrorLoading("Offline: Some profile data is unavailable.");
            // Keep loading spinners for missing sections? Or show cached data + error for missing?
            // Let's stop master loading, individual loaders will handle their state.
            setIsLoading(false);
            if (!hasCachedWallet) setIsLoadingWallet(false);
            if (!hasCachedGamification) setIsLoadingGamification(false); // Update gamification loading
            if (!hasCachedVehicles) setIsLoadingVehicles(false);
            if (!hasCachedBookmarks) setIsLoadingBookmarks(false);
             const ts = localStorage.getItem(CACHE_KEYS.userDetails(userId) + CACHE_KEYS.timestampSuffix); // Get any timestamp
             setLastUpdated(ts ? parseInt(ts) : null);
            return;
        }

        // Online: Fetch fresh data
        console.log("Online: Fetching fresh profile data...");
        try {
            const roleToUse = userRole || 'User';
            const [details, billing, history, vehiclesData, gamificationData, pointsTxnsData, walletData, transactionsData, bookmarksData] = await Promise.all([
                fetchUserDetails(userId, userName, userAvatarUrl, roleToUse),
                fetchBillingInfo(userId, roleToUse),
                fetchParkingHistory(userId),
                fetchVehicles(userId),
                fetchUserGamification(userId),
                fetchPointsTransactions(userId, 5), // Fetch points transactions
                fetchUserWallet(userId),
                fetchUserWalletTransactions(userId, 5),
                fetchUserBookmarks(userId),
            ]);
            setUserDetails(details);
            setBillingInfo(billing);
            setParkingHistory(history);
            setVehicles(vehiclesData);
            setGamification(gamificationData);
            setPointsTransactions(pointsTxnsData); // Set points transactions
            setWallet(walletData);
            setWalletTransactions(transactionsData);
            setBookmarks(bookmarksData);
            setLastUpdated(Date.now());

            // Re-Initialize edit states with fresh data
            setEditName(details.name || userName || '');
            setEditAvatarUrl(details.avatarUrl || userAvatarUrl || '');
            setEditPhone(details.phone || '');
            setEditEmail(details.email || '');
            setEditVehicles(vehiclesData);
            setEditNotificationPrefs(details.notificationPreferences || { promotions: false, updates: false });

        } catch (error) {
            console.error("Failed to load user profile data:", error);
            setErrorLoading("Could not fetch profile data. Displaying cached data if available.");
            // Keep displaying cached data if available
            if (!hasCachedDetails) setUserDetails(null);
            if (!hasCachedBilling) setBillingInfo(null);
            if (!hasCachedHistory) setParkingHistory(null);
            if (!hasCachedVehicles) setVehicles([]);
            if (!hasCachedGamification) setGamification(null);
            if (!hasCachedPointsTxns) setPointsTransactions([]); // Reset points txns on error
            if (!hasCachedWallet) setWallet(null);
            if (!hasCachedTxns) setWalletTransactions([]);
            if (!hasCachedBookmarks) setBookmarks([]);
        } finally {
            setIsLoading(false);
            setIsLoadingWallet(false);
            setIsLoadingGamification(false); // Update gamification loading
            setIsLoadingVehicles(false);
            setIsLoadingBookmarks(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, userRole, isOnline]); // userName/userAvatarUrl removed from deps, added isOnline

    // Refresh wallet data (Online only)
    const refreshWalletData = useCallback(async () => {
        if (!userId || !isOnline) {
            if (!isOnline) toast({ title: "Offline", description: "Wallet actions require an internet connection.", variant: "destructive" });
            return;
        }
        setIsLoadingWallet(true);
        try {
            const [walletData, transactionsData] = await Promise.all([
                fetchUserWallet(userId),
                fetchUserWalletTransactions(userId, 5),
            ]);
            setWallet(walletData);
            setWalletTransactions(transactionsData);
            setLastUpdated(Date.now());
        } catch (error) {
             console.error("Failed to refresh wallet data:", error);
             toast({ title: "Wallet Update Error", description: "Could not refresh wallet balance/transactions.", variant: "destructive" });
        } finally {
             setIsLoadingWallet(false);
        }
    }, [userId, toast, isOnline]);

    // Refresh gamification data (Online only) - Added refresh function
    const refreshGamificationData = useCallback(async () => {
        if (!userId || !isOnline) {
            if (!isOnline) toast({ title: "Offline", description: "Points actions require an internet connection.", variant: "destructive" });
            return;
        }
        setIsLoadingGamification(true);
        try {
            const [gamificationData, pointsTxnsData] = await Promise.all([
                fetchUserGamification(userId),
                fetchPointsTransactions(userId, 5),
            ]);
            setGamification(gamificationData);
            setPointsTransactions(pointsTxnsData);
            setLastUpdated(Date.now());
        } catch (error) {
            console.error("Failed to refresh gamification data:", error);
            toast({ title: "Points Update Error", description: "Could not refresh points balance/history.", variant: "destructive" });
        } finally {
            setIsLoadingGamification(false);
        }
    }, [userId, toast, isOnline]);

    // Refresh bookmarks (Online only)
     const refreshBookmarks = useCallback(async () => {
        if (!userId || !isOnline) {
             if (!isOnline) toast({ title: "Offline", description: "Bookmark management requires an internet connection.", variant: "destructive" });
            return;
        }
        setIsLoadingBookmarks(true);
        try {
            const bookmarksData = await fetchUserBookmarks(userId);
            setBookmarks(bookmarksData);
            setLastUpdated(Date.now());
        } catch (error) {
             console.error("Failed to refresh bookmarks:", error);
             toast({ title: "Bookmarks Update Error", description: "Could not refresh saved locations.", variant: "destructive" });
        } finally {
             setIsLoadingBookmarks(false);
        }
    }, [userId, toast, isOnline]);


    useEffect(() => {
        if (isAuthenticated) {
            loadProfileData();
        } else {
            // Clear all state if not authenticated
            setIsLoading(false);
            setIsLoadingWallet(false);
            setIsLoadingGamification(false); // Clear gamification loading
            setIsLoadingVehicles(false);
            setIsLoadingBookmarks(false);
            setUserDetails(null);
            setBillingInfo(null);
            setParkingHistory(null);
            setVehicles([]);
            setGamification(null);
            setPointsTransactions([]); // Clear points txns
            setWallet(null);
            setWalletTransactions([]);
            setBookmarks([]);
            setLastUpdated(null);
        }
    }, [isAuthenticated, loadProfileData]);

    // Re-fetch data when coming back online
    useEffect(() => {
         if (isOnline && isAuthenticated && !isLoading) {
            console.log("Back online, refreshing profile data...");
            loadProfileData(true); // Force refresh
         }
    }, [isOnline, isAuthenticated, isLoading, loadProfileData]);


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
        // TODO: Implement CSV/PDF generation
    };
     const handleDownloadHistory = () => {
         const completed = parkingHistory?.filter(h => h.status === 'Completed') || [];
         console.log("Download history (parking, wallet, points):", { parking: completed, wallet: walletTransactions, points: pointsTransactions });
         toast({ title: "Download Started (Simulation)", description: "Downloading combined history." });
         // TODO: Implement CSV/PDF generation
     };


    const handleCarpoolToggle = async (checked: boolean) => {
        if (!userId || !isOnline) {
            if (!isOnline) toast({ title: "Offline", description: "Cannot update settings while offline.", variant: "destructive" });
            return;
        }
        setIsUpdatingCarpool(true);
        try {
            const success = await updateCarpoolEligibility(userId, checked);
            if (success) {
                // Fetch updated gamification data to get latest points/badges
                const updatedGamification = await fetchUserGamification(userId);
                setGamification(updatedGamification);
                toast({ title: "Carpool Status Updated", description: checked ? "Eligible for carpooling benefits!" : "Carpooling benefits disabled." });
            } else { throw new Error("Failed to update carpool status."); }
        } catch (error) {
            console.error("Failed to update carpool status:", error);
            toast({ title: "Update Failed", variant: "destructive" });
        } finally { setIsUpdatingCarpool(false); }
    };

    // --- Edit Mode Handlers ---
    const handleSaveProfile = async () => {
        if (!isOnline) {
             toast({ title: "Offline", description: "Cannot save profile changes while offline.", variant: "destructive" });
             return;
        }
        if (!editName || !userId) {
            toast({ title: "Missing Information", description: "Name cannot be empty.", variant: "destructive" });
            return;
        }
        // Add more validation for email, phone, plates etc.
        const primaryVehicles = editVehicles.filter(v => v.isPrimary).length;
         if (primaryVehicles !== 1 && editVehicles.length > 0) { // Allow saving with zero vehicles initially
             toast({ title: "Vehicle Error", description: "Please select exactly one primary vehicle.", variant: "destructive" });
             return;
         }

        setIsSavingProfile(true);
        try {
             // Simulate updating different parts
            const updatedDetailsPromise = updateUserDetails(userId, {
                name: editName,
                avatarUrl: editAvatarUrl,
                phone: editPhone,
                email: editEmail,
                notificationPreferences: editNotificationPrefs,
            });
             const updatedVehiclesPromise = updateUserVehicles(userId, editVehicles);

             const [updatedDetails, updatedVehiclesResult] = await Promise.all([
                 updatedDetailsPromise,
                 updatedVehiclesPromise
             ]);

            // Update global state
            updateGlobalProfile(editName, editAvatarUrl);
            // Update local state
            setUserDetails(updatedDetails);
            setVehicles(updatedVehiclesResult);
            setLastUpdated(Date.now());

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
        // Reset edit states to original values (cached or fetched)
        const currentDetails = getCachedData<UserDetails>(CACHE_KEYS.userDetails(userId)) || userDetails;
        const currentVehicles = getCachedData<Vehicle[]>(CACHE_KEYS.vehicles(userId)) || vehicles;

        setEditName(currentDetails?.name || userName || '');
        setEditAvatarUrl(currentDetails?.avatarUrl || userAvatarUrl || '');
        setEditPhone(currentDetails?.phone || '');
        setEditEmail(currentDetails?.email || '');
        setEditVehicles(currentVehicles); // Reset to original vehicles fetched/cached
        setEditNotificationPrefs(currentDetails?.notificationPreferences || { promotions: false, updates: false });
        setEditMode(false);
     };

    const handleEditVehicleChange = (index: number, field: keyof Vehicle, value: string | boolean) => {
        setEditVehicles(prev =>
            prev.map((vehicle, i) =>
                i === index ? { ...vehicle, [field]: value } : vehicle
            )
        );
    };
     const handleSetPrimaryVehicle = (id: string) => {
         setEditVehicles(prev => prev.map(v => ({ ...v, isPrimary: v.id === id })));
     };
     const handleAddVehicle = () => {
        setEditVehicles(prev => [...prev, { id: `new_${Date.now()}`, make: '', model: '', plateNumber: '', isPrimary: prev.length === 0 }]);
     };
     const handleRemoveVehicle = (id: string) => {
          // Prevent removing the last vehicle if it's primary
          const vehicleToRemove = editVehicles.find(v => v.id === id);
          if (editVehicles.length === 1 && vehicleToRemove?.isPrimary) {
               toast({ title: "Cannot Remove", description: "You must have at least one vehicle. Add another before removing.", variant: "destructive" });
               return;
          }
         if (vehicleToRemove?.isPrimary) {
              toast({ title: "Cannot Remove", description: "Cannot remove the primary vehicle. Set another as primary first.", variant: "destructive" });
              return;
         }
        setEditVehicles(prev => prev.filter(v => v.id !== id));
     };
    // --- End Edit Mode Handlers ---

    // --- Bookmark Handlers ---
    const handleOpenBookmarkModal = (bookmark: UserBookmark | null = null) => {
        if (bookmark) {
            setCurrentBookmark(bookmark);
        } else {
            setCurrentBookmark({ userId: userId || '', label: '' }); // Default for new bookmark, ensure userId is string
        }
        setIsBookmarkModalOpen(true);
    };

    const handleBookmarkFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentBookmark(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveBookmark = async () => {
        if (!isOnline) {
             toast({ title: "Offline", description: "Cannot save bookmark while offline.", variant: "destructive" });
             return;
        }
        if (!userId || !currentBookmark || !currentBookmark.label) {
            toast({ title: "Missing Information", description: "Bookmark label cannot be empty.", variant: "destructive" });
            return;
        }
        // TODO: Add validation for address/coordinates if needed

        setIsSavingBookmark(true);
        try {
            if (currentBookmark.id && currentBookmark.id !== '') {
                 // Update existing bookmark
                 const updated = await updateBookmark(currentBookmark.id, {
                     label: currentBookmark.label,
                     address: currentBookmark.address,
                     latitude: currentBookmark.latitude ? Number(currentBookmark.latitude) : undefined,
                     longitude: currentBookmark.longitude ? Number(currentBookmark.longitude) : undefined,
                 });
                 if (updated) {
                     await refreshBookmarks();
                     toast({ title: "Bookmark Updated" });
                     setIsBookmarkModalOpen(false);
                 } else { throw new Error("Failed to update bookmark."); }
            } else {
                // Create new bookmark
                 const created = await addBookmark(userId, {
                     label: currentBookmark.label,
                     address: currentBookmark.address,
                     latitude: currentBookmark.latitude ? Number(currentBookmark.latitude) : undefined,
                     longitude: currentBookmark.longitude ? Number(currentBookmark.longitude) : undefined,
                 });
                 if (created) {
                     await refreshBookmarks();
                     toast({ title: "Bookmark Added" });
                     setIsBookmarkModalOpen(false);
                 } else { throw new Error("Failed to add bookmark."); }
            }
        } catch (error: any) {
            console.error("Failed to save bookmark:", error);
            toast({ title: "Save Failed", description: error.message || "Could not save the bookmark.", variant: "destructive" });
        } finally {
            setIsSavingBookmark(false);
            // Ensure currentBookmark is reset after modal closes (handled by isOpen effect/onOpenChange)
        }
    };

    const handleDeleteBookmark = async (bookmarkId: string) => {
         if (!isOnline) {
             toast({ title: "Offline", description: "Cannot delete bookmark while offline.", variant: "destructive" });
             return;
         }
         // Optional: Add confirmation dialog
         setIsDeletingBookmark(true);
         try {
             const success = await deleteBookmark(bookmarkId);
             if (success) {
                 await refreshBookmarks();
                 toast({ title: "Bookmark Deleted" });
             } else { throw new Error("Failed to delete bookmark."); }
         } catch (error: any) {
              console.error("Failed to delete bookmark:", error);
              toast({ title: "Delete Failed", description: error.message || "Could not delete the bookmark.", variant: "destructive" });
         } finally {
              setIsDeletingBookmark(false);
         }
    };

    const handleBookmarkModalClose = (open: boolean) => {
        if (!open) {
             setIsBookmarkModalOpen(false);
             // Delay reset to allow modal animation
             setTimeout(() => setCurrentBookmark(null), 300);
        } else {
             setIsBookmarkModalOpen(true);
        }
    };
    // --- End Bookmark Handlers ---

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
            case 'payment_other': return <Users className="h-4 w-4 text-purple-600" />; // Icon for paying for others
            default: return <WalletIcon className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getPointsTransactionIcon = (type: PointsTransaction['type']) => {
        switch(type) {
            case 'sent': return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
            case 'received': return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
            default: return <Sparkles className="h-4 w-4 text-yellow-500" />;
        }
    };


    const activeReservations = parkingHistory?.filter(h => h.status === 'Active') || [];
    const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];
    const displayName = userDetails?.name || userName || 'User';
    const displayAvatar = userDetails?.avatarUrl || userAvatarUrl || '';
    const userInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';
    const currentTier = billingInfo?.subscriptionTier || 'Basic';
    const isPremium = currentTier === 'Premium';

    // Render loading or empty state if not authenticated or data is loading
    if (isLoading && !userDetails) { // Show skeleton only on initial full load without cached data
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
                 {isOnline && <Button onClick={() => loadProfileData(true)} className="mt-4">Retry</Button>}
                  {!isOnline && <p className="text-sm text-muted-foreground mt-2">Connect to the internet and try again.</p>}
                 {/* Display cached data below error? Or separate component? */}
                 {userDetails && <div className="mt-6 text-left"><Card><CardContent><p>Displaying potentially outdated cached data.</p></CardContent></Card></div> /* Basic indication */}
             </div>
         );
    }

    if (!isAuthenticated || !userId) { // Keep check for authentication state consistency
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
                                <Button variant="ghost" size="icon" onClick={() => setEditMode(true)} aria-label="Edit Profile" disabled={!isOnline}>
                                     {!isOnline ? <WifiOff className="h-4 w-4 text-muted-foreground" title="Cannot edit offline"/> : <Edit className="h-4 w-4" />}
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                     <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isSavingProfile} aria-label="Cancel Edit">
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={handleSaveProfile} disabled={isSavingProfile || !isOnline} aria-label="Save Profile">
                                         {!isOnline ? <WifiOff className="h-4 w-4 text-muted-foreground" title="Cannot save offline"/> : isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <CardDescription>View and manage your account details, wallet, vehicles, and history.</CardDescription>
                          {/* Offline/Last Updated Indicator */}
                         <div className="text-xs text-muted-foreground pt-2">
                            {!isOnline ? (
                                <span className="flex items-center gap-1 text-destructive"><WifiOff className="h-3 w-3" /> Offline - Displaying cached data {lastUpdated ? `(updated ${new Date(lastUpdated).toLocaleTimeString()})` : ''}.</span>
                            ) : isLoading ? (
                                 <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Syncing...</span>
                            ) : lastUpdated ? (
                                <span>Last Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
                            ) : (
                                <span>Up to date.</span>
                            )}
                         </div>
                    </CardHeader>
                    <CardContent>
                        {/* User Details Section */}
                         <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                           {isLoading && !userDetails ? <Skeleton className="h-32 w-32 rounded-full flex-shrink-0"/> : (
                               <div className="relative flex-shrink-0">
                                 <Avatar className="h-24 w-24 md:h-32 md:w-32 border">
                                    <AvatarImage
                                        src={editMode ? editAvatarUrl : displayAvatar}
                                        alt={editMode ? editName : displayName}
                                        data-ai-hint="user profile picture" // AI Hint
                                     />
                                    <AvatarFallback className="text-4xl">{userInitial}</AvatarFallback>
                                </Avatar>
                                 {editMode && (
                                      <Input id="profile-avatar" type="text" value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} placeholder="Avatar URL..." disabled={isSavingProfile || !isOnline} className="mt-2 text-xs" />
                                 )}
                               </div>
                            )}
                            {/* Info */}
                             <div className="space-y-2 flex-grow">
                               {isLoading && !userDetails ? <><Skeleton className="h-8 w-3/4"/><Skeleton className="h-5 w-1/2"/><Skeleton className="h-4 w-1/3"/></> : (
                                 <>
                                  {editMode ? (
                                      <>
                                          <div className="space-y-1"> <Label htmlFor="profile-name">Name*</Label><Input id="profile-name" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isSavingProfile || !isOnline} required /></div>
                                          <div className="space-y-1"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="you@example.com" disabled={isSavingProfile || !isOnline} /></div>
                                          <div className="space-y-1"><Label htmlFor="profile-phone">Phone</Label><Input id="profile-phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+260 ..." disabled={isSavingProfile || !isOnline} /></div>
                                      </>
                                  ) : (
                                      <>
                                          <h2 className="text-2xl font-semibold flex items-center gap-2 flex-wrap">
                                              {displayName}
                                               <Badge variant={isPremium ? "default" : "secondary"} className={cn("text-xs", isPremium ? "bg-yellow-500 text-black hover:bg-yellow-500/90" : "")}>
                                                  {isPremium && <Star className="h-3 w-3 mr-1" />} {currentTier} Tier
                                              </Badge>
                                          </h2>
                                          {userDetails?.email && <p className="text-sm text-muted-foreground">{userDetails.email}</p>}
                                          {userDetails?.phone && <p className="text-sm text-muted-foreground">{userDetails.phone}</p>}
                                          <p className="text-xs text-muted-foreground">Role: {userDetails?.role}</p>
                                          <p className="text-xs text-muted-foreground">Member since: {userDetails?.memberSince ? new Date(userDetails.memberSince).toLocaleDateString() : 'N/A'}</p>
                                      </>
                                  )}
                                </>
                               )}
                            </div>
                        </div>


                         {/* Edit Mode - Notification Preferences */}
                          {editMode && (
                              <div className="mb-6 border-t pt-6">
                                 <h3 className="text-lg font-semibold mb-3">Notification Preferences</h3>
                                 <div className="space-y-3">
                                     <div className="flex items-center justify-between">
                                          <Label htmlFor="promo-notifications" className="flex flex-col space-y-1">
                                              <span>Promotions & Offers</span>
                                              <span className="font-normal leading-snug text-muted-foreground text-xs">Receive updates about discounts and special deals.</span>
                                          </Label>
                                          <Switch
                                            id="promo-notifications"
                                            checked={editNotificationPrefs.promotions}
                                            onCheckedChange={(checked) => setEditNotificationPrefs(prev => ({ ...prev, promotions: checked }))}
                                            disabled={isSavingProfile || !isOnline}
                                          />
                                     </div>
                                     <div className="flex items-center justify-between">
                                          <Label htmlFor="update-notifications" className="flex flex-col space-y-1">
                                              <span>App Updates & News</span>
                                              <span className="font-normal leading-snug text-muted-foreground text-xs">Get notified about new features and important updates.</span>
                                          </Label>
                                          <Switch
                                            id="update-notifications"
                                            checked={editNotificationPrefs.updates}
                                            onCheckedChange={(checked) => setEditNotificationPrefs(prev => ({ ...prev, updates: checked }))}
                                            disabled={isSavingProfile || !isOnline}
                                          />
                                     </div>
                                 </div>
                              </div>
                          )}


                         <Separator className="my-6" />

                        {/* Wallet Section */}
                        <section className="mb-6">
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><WalletIcon className="h-5 w-5 text-primary" /> Wallet</h3>
                                <Button variant="ghost" size="sm" onClick={refreshWalletData} disabled={isLoadingWallet || !isOnline}>
                                     {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoadingWallet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" /> } Refresh
                                </Button>
                             </div>
                              {isLoadingWallet && !wallet ? <Skeleton className="h-44 w-full"/> : (
                                 <>
                                     <Card className="p-4 mb-4 bg-gradient-to-br from-primary/80 to-primary text-primary-foreground rounded-lg shadow-md">
                                         <div className="flex justify-between items-start">
                                             <div>
                                                <p className="text-sm font-medium opacity-80">Available Balance</p>
                                                <p className="text-3xl font-bold">
                                                    {wallet?.currency || 'ZMW'} {wallet?.balance?.toFixed(2) ?? '0.00'}
                                                </p>
                                             </div>
                                             <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/60 -mr-2 -mt-1">
                                                 <QrCode className="h-5 w-5" />
                                                 <span className="sr-only">Show QR Code</span>
                                             </Button>
                                         </div>
                                         <div className="mt-4 flex flex-wrap gap-2"> {/* Use flex-wrap */}
                                              <Button variant="secondary" size="sm" onClick={() => setIsTopUpModalOpen(true)} disabled={!isOnline}>
                                                 <PlusCircle className="mr-1.5 h-4 w-4" /> Top Up
                                              </Button>
                                              <Button variant="secondary" size="sm" onClick={() => setIsSendMoneyModalOpen(true)} disabled={!isOnline || (wallet?.balance ?? 0) <= 0}>
                                                 <ArrowUpRight className="mr-1.5 h-4 w-4" /> Send
                                              </Button>
                                              <Button variant="secondary" size="sm" onClick={() => setIsPayForOtherModalOpen(true)} disabled={!isOnline || (wallet?.balance ?? 0) <= 0}>
                                                  <UserPlus className="mr-1.5 h-4 w-4" /> Pay for Other
                                              </Button>
                                         </div>
                                     </Card>

                                    <div>
                                         <p className="text-sm font-medium mb-2">Recent Wallet Transactions</p>
                                         {walletTransactions.length > 0 ? (
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
                                                             {txn.amount >= 0 ? '+' : ''}{wallet?.currency || 'ZMW'} {txn.amount.toFixed(2)}
                                                         </span>
                                                     </div>
                                                 ))}
                                             </div>
                                         ) : (
                                             <p className="text-sm text-muted-foreground text-center py-3">No recent wallet transactions.</p>
                                         )}
                                    </div>
                                 </>
                              )}
                        </section>

                        <Separator className="my-6" />

                         {/* Billing / Payment Methods / Carpso Card Section */}
                         <section className="mb-6">
                             <div className="flex justify-between items-center mb-3">
                                 <h3 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Billing & Plan</h3>
                                  {/* Download button might be complex offline */}
                                 <Button variant="ghost" size="sm" onClick={handleDownloadBilling} disabled={isLoading && !billingInfo}>
                                     <Download className="mr-2 h-4 w-4" /> Summary
                                 </Button>
                             </div>
                             {isLoading && !billingInfo ? <Skeleton className="h-48 w-full"/> : (
                                <>
                                     <Card className="mb-4 border-l-4 border-yellow-500">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex justify-between items-center">
                                                Subscription: {currentTier}
                                                <Button variant="link" size="sm" className="text-xs h-auto p-0" disabled={!isOnline}>
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

                                     {/* Carpso Card - Coming Soon */}
                                    <Card className="mb-4 border-dashed border-accent">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-accent"/> Carpso Card
                                                <Badge variant="outline" className="border-accent text-accent">Coming Soon</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">
                                                Get a physical Carpso Card for tap-to-pay parking and exclusive partner discounts. Register your interest!
                                            </p>
                                             <Button size="sm" variant="outline" className="mt-3" disabled={!isOnline}>Notify Me</Button>
                                        </CardContent>
                                    </Card>


                                     <div>
                                         <p className="text-sm font-medium mb-2">Payment Methods</p>
                                          {/* Display only if NOT in edit mode */}
                                          {!editMode && (
                                              <>
                                                 <div className="space-y-2 mb-3">
                                                     {billingInfo?.paymentMethods && billingInfo.paymentMethods.length > 0 ? (
                                                         billingInfo.paymentMethods.map((method) => (
                                                             <div key={method.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
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
                                                 <Button variant="outline" size="sm" className="w-full" disabled={!isOnline}>Manage Payment Methods</Button>
                                             </>
                                          )}
                                           {/* TODO: Add editable payment methods section for edit mode */}
                                            {editMode && <p className="text-sm text-muted-foreground">[Editable payment methods coming soon]</p>}
                                     </div>
                                </>
                             )}
                         </section>

                        <Separator className="my-6" />

                         {/* Vehicle Management Section */}
                        <section className="mb-6">
                           <div className="flex justify-between items-center mb-3">
                               <h3 className="text-lg font-semibold flex items-center gap-2"><CarTaxiFront className="h-5 w-5" /> My Vehicles</h3>
                               {editMode && (
                                   <Button variant="outline" size="sm" onClick={handleAddVehicle} disabled={isSavingProfile || !isOnline}>
                                       <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
                                   </Button>
                               )}
                           </div>
                            {isLoadingVehicles && !vehicles?.length ? ( // Show skeleton if loading and no cached data
                               <Skeleton className="h-20 w-full" />
                           ) : (editMode ? editVehicles : vehicles).length > 0 ? (
                               <div className="space-y-3">
                                   {(editMode ? editVehicles : vehicles).map((vehicle, index) => (
                                       <div key={vehicle.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md gap-3">
                                            <div className="flex items-start gap-3 flex-grow">
                                                <Car className="h-5 w-5 text-muted-foreground mt-1" />
                                                <div className="flex-grow">
                                                     {editMode ? (
                                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                             <div className="space-y-1"> <Label htmlFor={`veh-make-${index}`} className="text-xs">Make</Label><Input id={`veh-make-${index}`} value={vehicle.make} onChange={(e) => handleEditVehicleChange(index, 'make', e.target.value)} placeholder="e.g., Toyota" disabled={isSavingProfile || !isOnline} className="h-8"/></div>
                                                             <div className="space-y-1"> <Label htmlFor={`veh-model-${index}`} className="text-xs">Model</Label><Input id={`veh-model-${index}`} value={vehicle.model} onChange={(e) => handleEditVehicleChange(index, 'model', e.target.value)} placeholder="e.g., Corolla" disabled={isSavingProfile || !isOnline} className="h-8"/></div>
                                                             <div className="space-y-1 col-span-1 sm:col-span-2"><Label htmlFor={`veh-plate-${index}`} className="text-xs">License Plate*</Label><Input id={`veh-plate-${index}`} value={vehicle.plateNumber} onChange={(e) => handleEditVehicleChange(index, 'plateNumber', e.target.value.toUpperCase())} placeholder="e.g., ABC 1234" required disabled={isSavingProfile || !isOnline} className="h-8 uppercase"/></div>
                                                         </div>
                                                     ) : (
                                                         <div>
                                                            <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                                                            <p className="text-sm text-muted-foreground uppercase">{vehicle.plateNumber}</p>
                                                         </div>
                                                     )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0">
                                                {editMode ? (
                                                     <Button variant={vehicle.isPrimary ? "default" : "outline"} size="sm" onClick={() => handleSetPrimaryVehicle(vehicle.id)} disabled={isSavingProfile || vehicle.isPrimary || !isOnline} className="h-8">
                                                         {vehicle.isPrimary ? <CheckCircle className="h-4 w-4 sm:mr-1"/> : null}
                                                          <span className="hidden sm:inline">{vehicle.isPrimary ? 'Primary' : 'Set Primary'}</span>
                                                     </Button>
                                                ) : (
                                                     vehicle.isPrimary && <Badge variant="outline" size="sm">Primary</Badge>
                                                )}
                                                 {editMode && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveVehicle(vehicle.id)} disabled={isSavingProfile || !isOnline}>
                                                        <X className="h-4 w-4" />
                                                        <span className="sr-only">Remove</span>
                                                    </Button>
                                                 )}
                                            </div>
                                       </div>
                                   ))}
                               </div>
                           ) : (
                               <p className="text-sm text-muted-foreground text-center py-4">{editMode ? 'Click "Add Vehicle" to get started.' : 'No vehicles added yet.'}</p>
                           )}
                       </section>


                        <Separator className="my-6" />

                        {/* Saved Locations (Bookmarks) Section */}
                         <section className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><BookMarked className="h-5 w-5" /> Saved Locations</h3>
                                <Button variant="outline" size="sm" onClick={() => handleOpenBookmarkModal()} disabled={isLoadingBookmarks || !isOnline}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Location
                                </Button>
                            </div>
                             {isLoadingBookmarks && !bookmarks?.length ? ( // Show skeleton if loading and no cached data
                                <Skeleton className="h-24 w-full" />
                            ) : bookmarks.length > 0 ? (
                                <div className="space-y-3">
                                    {bookmarks.map(bookmark => {
                                        const Icon = getBookmarkIcon(bookmark.label);
                                        return (
                                            <div key={bookmark.id} className="flex items-center justify-between p-3 border rounded-md gap-3">
                                                <div className="flex items-start gap-3 flex-grow overflow-hidden">
                                                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                                    <div className="flex-grow truncate">
                                                        <p className="font-medium truncate">{bookmark.label}</p>
                                                        {bookmark.address && <p className="text-xs text-muted-foreground truncate">{bookmark.address}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenBookmarkModal(bookmark)} aria-label={`Edit ${bookmark.label}`} disabled={!isOnline}>
                                                        <Edit2 className="h-4 w-4" />
                                                     </Button>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteBookmark(bookmark.id)} disabled={isDeletingBookmark || !isOnline} aria-label={`Delete ${bookmark.label}`}>
                                                        {isDeletingBookmark ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                                     </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No saved locations yet. Add your home, work, or other frequent destinations.</p>
                            )}
                        </section>


                        <Separator className="my-6" />


                        {/* Gamification Section */}
                        <section className="mb-6">
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-600" /> Rewards & Points</h3>
                                <Button variant="ghost" size="sm" onClick={refreshGamificationData} disabled={isLoadingGamification || !isOnline}>
                                    {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoadingGamification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Refresh
                                </Button>
                             </div>
                             {isLoadingGamification && !gamification ? <Skeleton className="h-48 w-full"/> : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                                            <Switch id="carpool-switch" checked={gamification?.isCarpoolEligible ?? false} onCheckedChange={handleCarpoolToggle} disabled={isUpdatingCarpool || !isOnline} />
                                        </Card>
                                    </div>
                                    <Button
                                        variant="outline" size="sm" className="w-full mb-4"
                                        onClick={() => setIsTransferPointsModalOpen(true)}
                                        disabled={!isOnline || (gamification?.points ?? 0) <= 0}
                                    >
                                        <Gift className="mr-2 h-4 w-4" /> Transfer Points to Friend
                                    </Button>
                                     <div className="mt-4">
                                        <p className="text-sm font-medium mb-2">Recent Points Activity:</p>
                                         {pointsTransactions.length > 0 ? (
                                             <div className="space-y-2">
                                                 {pointsTransactions.map(txn => (
                                                     <div key={txn.id} className="flex items-center justify-between p-2 border rounded-md text-sm bg-background hover:bg-muted/50">
                                                         <div className="flex items-center gap-2 overflow-hidden">
                                                             {getPointsTransactionIcon(txn.type)}
                                                             <div className="flex-1 truncate">
                                                                  <p className="text-xs font-medium truncate">
                                                                     {txn.type === 'sent' ? `Sent to ${txn.recipientId.substring(0,8)}...` : `Received from ${txn.senderId.substring(0,8)}...`}
                                                                 </p>
                                                                 <p className="text-xs text-muted-foreground">{new Date(txn.timestamp).toLocaleString()}</p>
                                                             </div>
                                                         </div>
                                                         <span className={cn(
                                                             "font-semibold text-xs whitespace-nowrap",
                                                             txn.type === 'received' ? "text-green-600" : "text-red-600"
                                                         )}>
                                                             {txn.type === 'received' ? '+' : '-'}{txn.points} points
                                                         </span>
                                                     </div>
                                                 ))}
                                             </div>
                                         ) : (
                                             <p className="text-sm text-muted-foreground text-center py-3">No recent points activity.</p>
                                         )}
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
                                </>
                             )}
                        </section>

                        <Separator className="my-6" />

                        {/* Active Reservations Section */}
                         <section className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Car className="h-5 w-5" /> Active Reservations</h3>
                             {isLoading && !parkingHistory ? <Skeleton className="h-24 w-full"/> : activeReservations.length > 0 ? (
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

                        {/* Parking History Section */}
                         <section>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><List className="h-5 w-5" /> Parking History</h3>
                                 {/* Download might not work well offline */}
                                <Button variant="ghost" size="sm" onClick={handleDownloadHistory} disabled={isLoading && !parkingHistory}>
                                    <Download className="mr-2 h-4 w-4" /> Download
                                </Button>
                            </div>
                             <ScrollArea className="h-[250px] pr-3">
                                 {isLoading && !parkingHistory ? <Skeleton className="h-full w-full"/> : completedHistory.length > 0 ? (
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
                userId={userId || ''} // Pass userId or empty string
            />
             {/* Top Up Modal */}
            <TopUpModal
                isOpen={isTopUpModalOpen}
                onClose={() => setIsTopUpModalOpen(false)}
                userId={userId || ''} // Pass userId or empty string
                currentBalance={wallet?.balance ?? 0}
                currency={wallet?.currency ?? 'ZMW'}
                onSuccess={refreshWalletData} // Refresh data on success
            />
             {/* Send Money Modal */}
            <SendMoneyModal
                isOpen={isSendMoneyModalOpen}
                onClose={() => setIsSendMoneyModalOpen(false)}
                userId={userId || ''} // Pass userId or empty string
                currentBalance={wallet?.balance ?? 0}
                currency={wallet?.currency ?? 'ZMW'}
                onSuccess={refreshWalletData} // Refresh data on success
            />
             {/* Pay for Other Modal */}
             <PayForOtherModal
                isOpen={isPayForOtherModalOpen}
                onClose={() => setIsPayForOtherModalOpen(false)}
                payerId={userId || ''} // Pass userId or empty string
                payerBalance={wallet?.balance ?? 0}
                currency={wallet?.currency ?? 'ZMW'}
                onSuccess={refreshWalletData} // Refresh payer's wallet data
            />
             {/* Transfer Points Modal */}
             <TransferPointsModal
                isOpen={isTransferPointsModalOpen}
                onClose={() => setIsTransferPointsModalOpen(false)}
                senderId={userId || ''} // Pass userId or empty string
                currentPoints={gamification?.points ?? 0}
                onSuccess={refreshGamificationData} // Refresh sender's points data
            />


             {/* Add/Edit Bookmark Modal */}
             <Dialog open={isBookmarkModalOpen} onOpenChange={handleBookmarkModalClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeaderSub>
                        <DialogTitleSub>{currentBookmark?.id ? 'Edit' : 'Add'} Saved Location</DialogTitleSub>
                        <DialogDescriptionSub>Save frequently visited locations for quick access.</DialogDescriptionSub>
                    </DialogHeaderSub>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <Label htmlFor="bookmark-label">Label*</Label>
                            <Input id="bookmark-label" name="label" value={currentBookmark?.label || ''} onChange={handleBookmarkFormChange} placeholder="e.g., Home, Work, Gym" disabled={isSavingBookmark || !isOnline} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="bookmark-address">Address (Optional)</Label>
                            <Input id="bookmark-address" name="address" value={currentBookmark?.address || ''} onChange={handleBookmarkFormChange} placeholder="123 Main St, Anytown" disabled={isSavingBookmark || !isOnline} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                 <Label htmlFor="bookmark-lat">Latitude (Optional)</Label>
                                 <Input id="bookmark-lat" name="latitude" type="number" value={currentBookmark?.latitude ?? ''} onChange={handleBookmarkFormChange} placeholder="e.g., 34.0522" disabled={isSavingBookmark || !isOnline} step="any"/>
                             </div>
                             <div className="space-y-1">
                                 <Label htmlFor="bookmark-lon">Longitude (Optional)</Label>
                                 <Input id="bookmark-lon" name="longitude" type="number" value={currentBookmark?.longitude ?? ''} onChange={handleBookmarkFormChange} placeholder="e.g., -118.2437" disabled={isSavingBookmark || !isOnline} step="any"/>
                             </div>
                        </div>
                    </div>
                    <DialogFooter>
                         <DialogClose asChild><Button type="button" variant="outline" disabled={isSavingBookmark}>Cancel</Button></DialogClose>
                         <Button type="submit" onClick={handleSaveBookmark} disabled={isSavingBookmark || !currentBookmark?.label || !isOnline}>
                             {isSavingBookmark ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             {currentBookmark?.id ? 'Save Changes' : 'Add Bookmark'}
                         </Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
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
            <Skeleton className="h-36 w-full mb-4 rounded-lg" /> {/* Balance card + buttons */}
            <Skeleton className="h-5 w-1/3 mb-2"/> {/* Transactions Title */}
            <Skeleton className="h-10 w-full rounded-md"/>
            <Skeleton className="h-10 w-full rounded-md"/>
         </div>
        <Separator />
        {/* Billing/Plan/Card Skeleton */}
        <div className="space-y-4">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <Skeleton className="h-24 w-full mb-4 rounded-md"/> {/* Subscription */}
             <Skeleton className="h-28 w-full mb-4 rounded-md"/> {/* Carpso Card */}
             <Skeleton className="h-5 w-1/3 mb-2"/> {/* Payment Methods Title */}
             <Skeleton className="h-12 w-full rounded-md"/>
             <Skeleton className="h-12 w-full rounded-md"/>
             <Skeleton className="h-9 w-full mt-1 rounded-md"/> {/* Manage Button */}
        </div>
        <Separator />
         {/* Vehicle Skeleton */}
         <div className="space-y-4">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <Skeleton className="h-20 w-full rounded-md"/>
         </div>
        <Separator />
        {/* Bookmarks Skeleton */}
         <div className="space-y-4">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <Skeleton className="h-16 w-full rounded-md"/>
             <Skeleton className="h-16 w-full rounded-md"/>
         </div>
        <Separator />
        {/* Rewards Skeleton */}
        <div className="space-y-4">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
            </div>
             <Skeleton className="h-9 w-full mt-2 rounded-md"/> {/* Transfer Button */}
            <Skeleton className="h-5 w-1/4 mt-4" /> {/* History Title */}
             <Skeleton className="h-10 w-full rounded-md"/> {/* History Item */}
            <Skeleton className="h-5 w-1/4 mt-4" /> {/* Badges Title */}
            <div className="flex gap-2"> <Skeleton className="h-8 w-20 rounded-full"/> <Skeleton className="h-8 w-24 rounded-full"/></div>
        </div>
         <Separator />
         {/* Active Reservation Skeleton */}
         <div className="space-y-3">
             <Skeleton className="h-6 w-1/3 mb-3" />
             <Skeleton className="h-24 w-full rounded-md" />
         </div>
        <Separator />
        {/* History Skeleton */}
        <div className="space-y-3">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
        </div>
    </div>
);
