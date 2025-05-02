
// src/components/profile/UserProfile.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import QRCode from 'qrcode.react'; // Import QRCode
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
import { List, DollarSign, Clock, AlertCircle, CheckCircle, Smartphone, CreditCard, Download, AlertTriangle, Car, Sparkles as SparklesIcon, Award, Users, Trophy, Star, Gift, Edit, Save, X, Loader2, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, PlusCircle, QrCode, Info, CarTaxiFront, Flag, BookMarked, Home as HomeIcon, Briefcase, School as SchoolIcon, GraduationCap, Edit2, Trash2, WifiOff, UserPlus, Sparkles, Landmark, Globe, RefreshCcw, MessageSquare, Contact, Printer, UsersRound, Copy, Ticket, ExternalLink, Coins } from 'lucide-react'; // Added Coins
import { AppStateContext } from '@/context/AppStateProvider';
import { useToast } from '@/hooks/use-toast';
import { getUserGamification, updateCarpoolEligibility, UserGamification, UserBadge, UserBookmark, getUserBookmarks, addBookmark, updateBookmark, deleteBookmark, getPointsTransactions, PointsTransaction, transferPoints, getReferralHistory, Referral, applyPromoCode, awardPoints, redeemPoints } from '@/services/user-service'; // Import bookmark types and functions, points transactions, transferPoints, referral functions, redeemPoints
import ReportIssueModal from '@/components/profile/ReportIssueModal';
import { useRouter } from 'next/navigation';
import { getWalletBalance, getWalletTransactions, Wallet, WalletTransaction, getExchangeRates, convertCurrency, getPaymentMethods, updatePaymentMethods, PaymentMethod } from '@/services/wallet-service'; // Import wallet service, added currency functions, payment methods
import TopUpModal from '@/components/wallet/TopUpModal'; // Import TopUpModal
import SendMoneyModal from '@/components/wallet/SendMoneyModal'; // Import SendMoneyModal
import PayForOtherModal from '@/components/wallet/PayForOtherModal'; // Import PayForOtherModal
import TransferPointsModal from '@/components/gamification/TransferPointsModal'; // Import TransferPointsModal
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components
import { cn } from '@/lib/utils'; // Import cn utility
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Import Alert components
import { Dialog, DialogTrigger, DialogContent, DialogFooter, DialogHeader as DialogHeaderSub, DialogTitle as DialogTitleSub, DialogDescription as DialogDescriptionSub, DialogClose } from "@/components/ui/dialog"; // Import Dialog components
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'; // Import Select components for currency
import { convertToCSV, getParkingRecords, ParkingRecord } from '@/services/pricing-service'; // Import parking records functions
import PaymentMethodModal from '@/components/profile/PaymentMethodModal'; // Import PaymentMethodModal

// Define Point to Kwacha Conversion Rate
const POINTS_TO_KWACHA_RATE = 0.10; // Example: 1 point = K 0.10

// Mock data types and functions (Should be moved to a shared location or replaced by API)
interface UserDetails {
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    memberSince: string;
    role: string;
    // New fields for editing
    preferredPaymentMethod?: string; // Now string to hold payment method ID
    notificationPreferences?: {
        promotions: boolean;
        updates: boolean;
    }
}

interface BillingInfo {
    // paymentMethods moved to separate state/service
    subscriptionTier?: 'Basic' | 'Premium';
    guaranteedSpotsAvailable?: number;
}

// Moved Vehicle interface outside, assuming it might be reused
export interface Vehicle { // Export Vehicle interface
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
    paymentMethods: (userId: string) => `cachedPaymentMethods_${userId}`, // Added Payment Methods cache
    gamification: (userId: string) => `cachedGamification_${userId}`,
    pointsTxns: (userId: string) => `cachedPointsTxns_${userId}`, // Added points transactions cache
    wallet: (userId: string) => `cachedUserWallet_${userId}`,
    walletTxns: (userId: string) => `cachedUserWalletTxns_${userId}`,
    bookmarks: (userId: string) => `cachedUserBookmarks_${userId}`,
    referralHistory: (userId: string) => `cachedReferralHistory_${userId}`, // Added referral history cache
    exchangeRates: 'cachedExchangeRates', // Cache key for exchange rates
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

// --- Daily Login Check ---
const checkAndAwardDailyLoginPoints = async (userId: string): Promise<number | null> => {
    if (typeof window === 'undefined') return null;
    const lastLoginKey = `lastLoginTimestamp_${userId}`;
    const lastLoginTimestamp = localStorage.getItem(lastLoginKey);
    const today = new Date().toDateString(); // Get date part only

    if (!lastLoginTimestamp || new Date(parseInt(lastLoginTimestamp)).toDateString() !== today) {
        // First login today or first login ever
        try {
            const pointsAwarded = 5; // Example: 5 points for daily login
            const newTotal = await awardPoints(userId, pointsAwarded, 'Daily Login Bonus'); // Pass description
            localStorage.setItem(lastLoginKey, Date.now().toString());
            console.log(`Awarded ${pointsAwarded} daily login points to user ${userId}.`);
            return newTotal; // Return new total points
        } catch (error) {
            console.error("Failed to award daily login points:", error);
            return null;
        }
    }
    return null; // Already logged in today
};


// Mock Data Fetching Functions (Replace with real API calls)
const fetchUserDetails = async (userId: string, existingName?: string | null, existingAvatar?: string | null, existingRole?: string | null): Promise<UserDetails> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    const name = existingName || `User ${userId.substring(0, 5)}`;
    const avatarUrl = existingAvatar || `https://picsum.photos/seed/${userId}/100/100`;
    const role = existingRole || 'User';
    // Simulate fetching other details
    const prefs = { promotions: Math.random() > 0.5, updates: true };
    const details = { name, email: `user_${userId.substring(0, 5)}@example.com`, phone: '+260 977 123 456', avatarUrl, memberSince: '2024-01-15', role, preferredPaymentMethod: 'pm_1', notificationPreferences: prefs }; // Set default preferred ID
    setCachedData(CACHE_KEYS.userDetails(userId), details);
    return details;
};

const fetchBillingInfo = async (userId: string, role: string): Promise<Omit<BillingInfo, 'accountBalance'>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const isPremium = role?.toLowerCase().includes('premium') || Math.random() > 0.7;
    // Payment methods are now fetched separately
    const billing = { subscriptionTier: isPremium ? 'Premium' : 'Basic', guaranteedSpotsAvailable: isPremium ? 3 : 0 };
    setCachedData(CACHE_KEYS.billingInfo(userId), billing);
    return billing;
};


const fetchParkingHistory = async (userId: string): Promise<ParkingRecord[]> => { // Use ParkingRecord type
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Use the mock data from pricing-service (adjust if needed)
    const allRecords = await getParkingRecords({ userId }); // Fetch records for the user
     // Sort records by startTime descending before caching
    const sortedRecords = allRecords.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    setCachedData(CACHE_KEYS.parkingHistory(userId), sortedRecords);
    return sortedRecords;
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

// --- Payment Methods Fetch (using wallet-service mock) ---
const fetchPaymentMethods = async (userId: string): Promise<PaymentMethod[]> => {
    const methods = await getPaymentMethods(userId); // Use the mock function from wallet-service
    setCachedData(CACHE_KEYS.paymentMethods(userId), methods);
    return methods;
}

// --- Modified Gamification Fetch to Cache ---
const fetchUserGamification = async (userId: string): Promise<UserGamification> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Use function from user-service which includes default initialization and caching
    const gamification = await getUserGamification(userId);
    // Cache is handled within getUserGamification, but let's ensure it's done
    setCachedData(CACHE_KEYS.gamification(userId), gamification);
    return gamification;
}
// --- Modified Points Transactions Fetch to Cache ---
const fetchPointsTransactions = async (userId: string, limit: number = 5): Promise<PointsTransaction[]> => {
    await new Promise(resolve => setTimeout(resolve, 350));
    const transactions = await getPointsTransactions(userId, limit); // Use function from user-service
    setCachedData(CACHE_KEYS.pointsTxns(userId), transactions); // Cache recent txns
    return transactions;
}
// --- Modified Wallet Fetch to Cache ---
const fetchUserWallet = async (userId: string): Promise<Wallet> => {
     await new Promise(resolve => setTimeout(resolve, 200));
     const wallet = await getWalletBalance(userId); // Use function from wallet-service
     setCachedData(CACHE_KEYS.wallet(userId), wallet);
     return wallet;
}
const fetchUserWalletTransactions = async (userId: string, limit: number = 5): Promise<WalletTransaction[]> => {
     await new Promise(resolve => setTimeout(resolve, 350));
     const transactions = await getWalletTransactions(userId, limit); // Use function from wallet-service
     setCachedData(CACHE_KEYS.walletTxns(userId), transactions); // Cache recent txns
     return transactions;
}
// --- Modified Bookmarks Fetch to Cache ---
const fetchUserBookmarks = async (userId: string): Promise<UserBookmark[]> => {
    await new Promise(resolve => setTimeout(resolve, 250));
    const bookmarks = await getUserBookmarks(userId); // Use function from user-service
    setCachedData(CACHE_KEYS.bookmarks(userId), bookmarks);
    return bookmarks;
}
// --- Fetch Referral History with Cache ---
const fetchReferralHistory = async (userId: string): Promise<Referral[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const history = await getReferralHistory(userId); // Use function from user-service
    setCachedData(CACHE_KEYS.referralHistory(userId), history); // Cache referral history
    return history;
}
// --- Fetch Exchange Rates with Caching ---
const fetchExchangeRates = async (): Promise<Record<string, number>> => {
    const cachedRates = getCachedData<Record<string, number>>(CACHE_KEYS.exchangeRates, 6 * 60 * 60 * 1000); // Cache for 6 hours
    if (cachedRates) {
        console.log("Using cached exchange rates.");
        return cachedRates;
    }
    console.log("Fetching fresh exchange rates...");
    const rates = await getExchangeRates(); // Fetch from service
    setCachedData(CACHE_KEYS.exchangeRates, rates);
    return rates;
}


// Mock Update Functions
const updateUserDetails = async (userId: string, updates: Partial<UserDetails>): Promise<UserDetails> => {
     await new Promise(resolve => setTimeout(resolve, 800));
     console.log("Simulating user details update:", userId, updates);
     // In a real app, update the backend data source
     // This mock doesn't persist changes across sessions in memory, but caches
     const currentDetails = getCachedData<UserDetails>(CACHE_KEYS.userDetails(userId)) || { name: '', email: '', phone: '', avatarUrl: '', memberSince: new Date().toISOString(), role: 'User', preferredPaymentMethod: undefined, notificationPreferences: { promotions: false, updates: false } };
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

// --- Payment Method Update Function ---
const updateUserPaymentMethods = async (userId: string, methods: PaymentMethod[]): Promise<PaymentMethod[]> => {
    // Use the imported update function from wallet-service
    const updatedMethods = await updatePaymentMethods(userId, methods);
    setCachedData(CACHE_KEYS.paymentMethods(userId), updatedMethods); // Update cache
    return updatedMethods;
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

// Function to get currency symbol (simplified)
const getCurrencySymbol = (currencyCode: string): string => {
    switch (currencyCode.toUpperCase()) {
        case 'ZMW': return 'K';
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'ZAR': return 'R';
        default: return currencyCode; // Fallback to code
    }
};

// WhatsApp Support Numbers (adjust country code as needed)
const WHATSAPP_NUMBER_1 = "+260955202036"; // +260 is Zambia's code
const WHATSAPP_NUMBER_2 = "+260968551110";
// You can construct the WhatsApp click-to-chat link
// Example: https://wa.me/<number_without_plus_or_spaces>
// Using a primary number for the main link for simplicity:
const WHATSAPP_CHAT_LINK_1 = `https://wa.me/${WHATSAPP_NUMBER_1.replace(/\D/g, '')}`;


export default function ProfilePage() {
    const { isAuthenticated, userId, userName, userAvatarUrl, userRole, updateUserProfile: updateGlobalProfile, logout, isOnline } = useContext(AppStateContext)!;
    const router = useRouter();
    const { toast } = useToast();

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [billingInfo, setBillingInfo] = useState<Omit<BillingInfo, 'accountBalance'> | null>(null);
    const [parkingHistory, setParkingHistory] = useState<ParkingRecord[] | null>(null); // Use ParkingRecord
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]); // Added state for payment methods
    const [gamification, setGamification] = useState<UserGamification | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
    const [pointsTransactions, setPointsTransactions] = useState<PointsTransaction[]>([]); // Added state for points txns
    const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]); // State for bookmarks
    const [referralHistory, setReferralHistory] = useState<Referral[]>([]); // State for referral history
    const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null); // State for exchange rates
    const [displayCurrency, setDisplayCurrency] = useState<string>('ZMW'); // State for selected display currency

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingWallet, setIsLoadingWallet] = useState(true);
    const [isLoadingGamification, setIsLoadingGamification] = useState(true); // Added gamification loading state
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
    const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true); // Added loading state
    const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true); // Loading state for bookmarks
    const [isLoadingReferrals, setIsLoadingReferrals] = useState(true); // Loading state for referrals
    const [isLoadingRates, setIsLoadingRates] = useState(true); // Loading state for rates
    const [errorLoading, setErrorLoading] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null); // Track last successful fetch time

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingReservation, setReportingReservation] = useState<ParkingRecord | null>(null); // Use ParkingRecord
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
    const [editPreferredPaymentMethod, setEditPreferredPaymentMethod] = useState<string | undefined>(undefined); // Track preferred payment method ID

    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [isSendMoneyModalOpen, setIsSendMoneyModalOpen] = useState(false);
    const [isPayForOtherModalOpen, setIsPayForOtherModalOpen] = useState(false); // Added state
    const [isTransferPointsModalOpen, setIsTransferPointsModalOpen] = useState(false); // Added state
    const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false); // State for payment method modal
    const [isRedeemPointsModalOpen, setIsRedeemPointsModalOpen] = useState(false); // State for redeeming points
    const [pointsToRedeem, setPointsToRedeem] = useState<number | ''>(''); // State for points redemption amount

    // Promo Code State
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);


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
        setIsLoadingPaymentMethods(true); // Set payment methods loading
        setIsLoadingBookmarks(true);
        setIsLoadingReferrals(true); // Set referrals loading
        setIsLoadingRates(true); // Set rates loading
        setErrorLoading(null);

        const loadFromCache = <T>(keyFunc: (userId: string) => string, setter: (data: T) => void): boolean => {
            const cached = getCachedData<T>(keyFunc(userId));
            if (cached) setter(cached);
            return !!cached;
        };


        // Load initial data from cache if available
        const hasCachedDetails = loadFromCache(CACHE_KEYS.userDetails, setUserDetails);
        const hasCachedBilling = loadFromCache(CACHE_KEYS.billingInfo, setBillingInfo);
        const hasCachedHistory = loadFromCache(CACHE_KEYS.parkingHistory, setParkingHistory);
        const hasCachedVehicles = loadFromCache(CACHE_KEYS.vehicles, setVehicles);
        const hasCachedPaymentMethods = loadFromCache(CACHE_KEYS.paymentMethods, setPaymentMethods); // Load payment methods cache
        const hasCachedGamification = loadFromCache(CACHE_KEYS.gamification, setGamification);
        const hasCachedPointsTxns = loadFromCache(CACHE_KEYS.pointsTxns, setPointsTransactions); // Load points txns cache
        const hasCachedReferrals = loadFromCache(CACHE_KEYS.referralHistory, setReferralHistory); // Load referral history cache
        const hasCachedWallet = loadFromCache(CACHE_KEYS.wallet, setWallet);
        const hasCachedTxns = loadFromCache(CACHE_KEYS.walletTxns, setWalletTransactions);
        const hasCachedBookmarks = loadFromCache(CACHE_KEYS.bookmarks, setBookmarks);
        const hasCachedRates = !!getCachedData<Record<string, number>>(CACHE_KEYS.exchangeRates); // Check if rates are cached
        if (hasCachedRates) setExchangeRates(getCachedData<Record<string, number>>(CACHE_KEYS.exchangeRates));

        // Immediately initialize edit states from cached/global state
        const initialDetails = getCachedData<UserDetails>(CACHE_KEYS.userDetails(userId)) || { name: userName || '', avatarUrl: userAvatarUrl || '', memberSince: '', role: userRole || 'User', phone: '', email: '', notificationPreferences: { promotions: false, updates: false }, preferredPaymentMethod: undefined };
        setEditName(initialDetails?.name || '');
        setEditAvatarUrl(initialDetails?.avatarUrl || '');
        setEditPhone(initialDetails?.phone || '');
        setEditEmail(initialDetails?.email || '');
        setEditVehicles(getCachedData<Vehicle[]>(CACHE_KEYS.vehicles(userId)) || []);
        setEditNotificationPrefs(initialDetails?.notificationPreferences || { promotions: false, updates: false });
        setEditPreferredPaymentMethod(initialDetails?.preferredPaymentMethod); // Initialize preferred payment method

        // Determine if full refresh is needed
        const needsFullRefresh = forceRefresh || !hasCachedDetails || !hasCachedBilling || !hasCachedHistory || !hasCachedVehicles || !hasCachedPaymentMethods || !hasCachedGamification || !hasCachedPointsTxns || !hasCachedReferrals || !hasCachedWallet || !hasCachedTxns || !hasCachedBookmarks || !hasCachedRates;


        if (!isOnline && !needsFullRefresh) {
            console.log("Offline: Using cached profile data.");
            setIsLoading(false);
            setIsLoadingWallet(false);
            setIsLoadingGamification(false);
            setIsLoadingVehicles(false);
            setIsLoadingPaymentMethods(false); // Update payment methods loading
            setIsLoadingBookmarks(false);
            setIsLoadingReferrals(false); // Update referrals loading
            setIsLoadingRates(false);
            const ts = localStorage.getItem(CACHE_KEYS.userDetails(userId) + CACHE_KEYS.timestampSuffix);
            setLastUpdated(ts ? parseInt(ts) : null);
            return; // Stop if offline and all data loaded from cache
        }

        if (!isOnline && needsFullRefresh) {
            console.warn("Offline: Missing some cached profile data.");
            setErrorLoading("Offline: Some profile data is unavailable.");
            // Keep loading spinners for missing sections? Or show cached data + error for missing?
            // Let's stop master loading, individual loaders will handle their state.
            setIsLoading(false);
            if (!hasCachedWallet) setIsLoadingWallet(false);
            if (!hasCachedGamification) setIsLoadingGamification(false); // Update gamification loading
            if (!hasCachedVehicles) setIsLoadingVehicles(false);
            if (!hasCachedPaymentMethods) setIsLoadingPaymentMethods(false); // Update payment methods loading
            if (!hasCachedBookmarks) setIsLoadingBookmarks(false);
            if (!hasCachedReferrals) setIsLoadingReferrals(false); // Update referrals loading
            if (!hasCachedRates) setIsLoadingRates(false);
             const ts = localStorage.getItem(CACHE_KEYS.userDetails(userId) + CACHE_KEYS.timestampSuffix); // Get any timestamp
             setLastUpdated(ts ? parseInt(ts) : null);
            return;
        }

        // Online: Fetch fresh data
        console.log("Online: Fetching fresh profile data...");
        try {
            const roleToUse = userRole || 'User';
            // --- Daily Login Check ---
            const dailyLoginResult = await checkAndAwardDailyLoginPoints(userId);
            if (dailyLoginResult !== null) {
                 // If points were awarded, show a subtle toast
                 toast({
                     title: "Daily Login Bonus!",
                     description: `+5 points added. Keep it up!`,
                     duration: 3000,
                 });
                 // We need to refetch gamification data or update it locally
                 // Let's trigger a specific refresh for gamification after the main load
                 // Or update the state directly if the function returns the new total
                 // setGamification(prev => ({ ...(prev!), points: dailyLoginResult }));
            }
             // --- End Daily Login Check ---


            const [details, billing, history, vehiclesData, paymentMethodsData, gamificationData, pointsTxnsData, referralsData, walletData, transactionsData, bookmarksData, ratesData] = await Promise.all([
                fetchUserDetails(userId, userName, userAvatarUrl, roleToUse),
                fetchBillingInfo(userId, roleToUse),
                fetchParkingHistory(userId),
                fetchVehicles(userId),
                fetchPaymentMethods(userId), // Fetch payment methods
                fetchUserGamification(userId), // Fetch potentially updated gamification data
                fetchPointsTransactions(userId, 5), // Fetch points transactions
                fetchReferralHistory(userId), // Fetch referral history
                fetchUserWallet(userId),
                fetchUserWalletTransactions(userId, 5),
                fetchUserBookmarks(userId),
                fetchExchangeRates(), // Fetch exchange rates
            ]);
            setUserDetails(details);
            setBillingInfo(billing);
            setParkingHistory(history);
            setVehicles(vehiclesData);
            setPaymentMethods(paymentMethodsData); // Set payment methods
            setGamification(gamificationData); // Set the potentially updated gamification data
            setPointsTransactions(pointsTxnsData); // Set points transactions
            setReferralHistory(referralsData); // Set referral history
            setWallet(walletData);
            setWalletTransactions(transactionsData);
            setBookmarks(bookmarksData);
            setExchangeRates(ratesData); // Set exchange rates
            setLastUpdated(Date.now());

            // Re-Initialize edit states with fresh data
            setEditName(details.name || userName || '');
            setEditAvatarUrl(details.avatarUrl || userAvatarUrl || '');
            setEditPhone(details.phone || '');
            setEditEmail(details.email || '');
            setEditVehicles(vehiclesData);
            setEditNotificationPrefs(details.notificationPreferences || { promotions: false, updates: false });
             setEditPreferredPaymentMethod(details.preferredPaymentMethod); // Re-initialize preferred payment method

        } catch (error) {
            console.error("Failed to load user profile data:", error);
            setErrorLoading("Could not fetch profile data. Displaying cached data if available.");
            // Keep displaying cached data if available
            if (!hasCachedDetails) setUserDetails(null);
            if (!hasCachedBilling) setBillingInfo(null);
            if (!hasCachedHistory) setParkingHistory(null);
            if (!hasCachedVehicles) setVehicles([]);
            if (!hasCachedPaymentMethods) setPaymentMethods([]); // Reset payment methods on error
            if (!hasCachedGamification) setGamification(null);
            if (!hasCachedPointsTxns) setPointsTransactions([]); // Reset points txns on error
            if (!hasCachedReferrals) setReferralHistory([]); // Reset referrals on error
            if (!hasCachedWallet) setWallet(null);
            if (!hasCachedTxns) setWalletTransactions([]);
            if (!hasCachedBookmarks) setBookmarks([]);
            if (!hasCachedRates) setExchangeRates(null); // Reset rates on error
        } finally {
            setIsLoading(false);
            setIsLoadingWallet(false);
            setIsLoadingGamification(false); // Update gamification loading
            setIsLoadingVehicles(false);
            setIsLoadingPaymentMethods(false); // Update payment methods loading
            setIsLoadingBookmarks(false);
            setIsLoadingReferrals(false); // Update referrals loading
            setIsLoadingRates(false); // Update rates loading
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
            toast({ title: "Wallet Refreshed", description: `Balance: ${getCurrencySymbol(walletData.currency)} ${walletData.balance.toFixed(2)}`}); // Confirmation toast
        } catch (error) {
             console.error("Failed to refresh wallet data:", error);
             toast({ title: "Wallet Update Error", description: "Could not refresh wallet balance/transactions.", variant: "destructive" });
        } finally {
             setIsLoadingWallet(false);
        }
    }, [userId, toast, isOnline]); // Added toast

    // Refresh gamification data (Online only) - Added refresh function
    const refreshGamificationData = useCallback(async () => {
        if (!userId || !isOnline) {
            if (!isOnline) toast({ title: "Offline", description: "Rewards actions require an internet connection.", variant: "destructive" });
            return;
        }
        setIsLoadingGamification(true);
        try {
            const [gamificationData, pointsTxnsData, referralsData] = await Promise.all([
                fetchUserGamification(userId),
                fetchPointsTransactions(userId, 5),
                fetchReferralHistory(userId), // Refresh referrals too
            ]);
            setGamification(gamificationData);
            setPointsTransactions(pointsTxnsData);
            setReferralHistory(referralsData); // Update referral state
            setLastUpdated(Date.now());
             toast({ title: "Rewards & Referrals Refreshed", description: `Points: ${gamificationData.points}`});
        } catch (error) {
            console.error("Failed to refresh gamification/referral data:", error);
            toast({ title: "Rewards Update Error", description: "Could not refresh points/referral data.", variant: "destructive" });
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
             toast({ title: "Bookmarks Refreshed" });
        } catch (error) {
             console.error("Failed to refresh bookmarks:", error);
             toast({ title: "Bookmarks Update Error", description: "Could not refresh saved locations.", variant: "destructive" });
        } finally {
             setIsLoadingBookmarks(false);
        }
    }, [userId, toast, isOnline]);

     // Refresh exchange rates (Online only)
    const refreshExchangeRates = useCallback(async () => {
        if (!isOnline) {
             toast({ title: "Offline", description: "Cannot refresh exchange rates.", variant: "destructive" });
            return;
        }
        setIsLoadingRates(true);
        try {
            const ratesData = await fetchExchangeRates();
            setExchangeRates(ratesData);
            setLastUpdated(Date.now());
            toast({ title: "Currency Rates Refreshed" });
        } catch (error) {
             console.error("Failed to refresh exchange rates:", error);
             toast({ title: "Rates Update Error", description: "Could not refresh currency rates.", variant: "destructive" });
        } finally {
             setIsLoadingRates(false);
        }
    }, [isOnline, toast]);

    // Refresh payment methods (Online only)
    const refreshPaymentMethods = useCallback(async () => {
        if (!userId || !isOnline) {
            if (!isOnline) toast({ title: "Offline", description: "Cannot manage payment methods offline.", variant: "destructive" });
            return;
        }
        setIsLoadingPaymentMethods(true);
        try {
            const methodsData = await fetchPaymentMethods(userId);
            setPaymentMethods(methodsData);
            setLastUpdated(Date.now());
             toast({ title: "Payment Methods Refreshed" });
        } catch (error) {
             console.error("Failed to refresh payment methods:", error);
             toast({ title: "Payment Methods Update Error", description: "Could not refresh payment methods.", variant: "destructive" });
        } finally {
             setIsLoadingPaymentMethods(false);
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
            setIsLoadingPaymentMethods(false); // Clear payment methods loading
            setIsLoadingBookmarks(false);
            setIsLoadingReferrals(false); // Clear referrals loading
            setIsLoadingRates(false); // Clear rates loading
            setUserDetails(null);
            setBillingInfo(null);
            setParkingHistory(null);
            setVehicles([]);
            setPaymentMethods([]); // Clear payment methods
            setGamification(null);
            setPointsTransactions([]); // Clear points txns
            setReferralHistory([]); // Clear referrals
            setWallet(null);
            setWalletTransactions([]);
            setBookmarks([]);
            setExchangeRates(null); // Clear rates
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


    const handleOpenReportModal = (reservation: ParkingRecord) => { // Use ParkingRecord type
        if (!isAuthenticated) {
            toast({ title: "Sign In Required", description: "Please sign in to report an issue.", variant: "destructive"});
            return;
        }
        setReportingReservation(reservation);
        setIsReportModalOpen(true);
    };

    // --- Download Functions ---
     const handleDownloadBilling = () => {
         const billingData = [{
             subscriptionTier: billingInfo?.subscriptionTier || 'Basic',
             guaranteedSpotsAvailable: billingInfo?.guaranteedSpotsAvailable || 0,
         }];
         const paymentMethodsData = paymentMethods.map(pm => ({
             id: pm.id,
             type: pm.type,
             details: pm.details,
             isPrimary: pm.isPrimary,
         }));
         // Combine or create separate files
         downloadCSV(billingData, `carpso-plan-summary-${userId}.csv`);
         downloadCSV(paymentMethodsData, `carpso-payment-methods-${userId}.csv`);
     };

     const handleDownloadHistory = () => {
         const parkingData = parkingHistory?.map(h => ({
             recordId: h.recordId,
             locationName: h.lotName, // Use lotName from record
             spotId: h.spotId,
             startTime: h.startTime,
             endTime: h.endTime || 'N/A',
             durationMinutes: h.durationMinutes || 'N/A',
             cost: h.cost,
             currency: 'ZMW', // Assuming ZMW
             status: h.status,
             paymentMethod: h.paymentMethod || 'N/A',
             appliedPricingRule: h.appliedPricingRule || 'N/A',
         })) || [];
         const walletData = walletTransactions.map(t => ({
             transactionId: t.id,
             type: t.type,
             amount: t.amount,
             currency: wallet?.currency || 'ZMW',
             description: t.description,
             timestamp: t.timestamp,
             relatedUserId: t.relatedUserId || 'N/A',
             partnerId: t.partnerId || 'N/A',
         }));
         const pointsData = pointsTransactions.map(t => ({
             transactionId: t.id,
             type: t.type,
             points: t.points,
             description: t.description, // Include description from awardPoints
             senderId: t.senderId,
             recipientId: t.recipientId,
             timestamp: t.timestamp,
         }));
         const referralsData = referralHistory.map(r => ({ // Include referrals in download
              referringUserId: r.referringUserId,
              referredUserId: r.referredUserId,
              referredUserName: r.referredUserName || 'N/A',
              signupTimestamp: r.signupTimestamp,
              bonusAwarded: r.bonusAwarded,
         }));

         downloadCSV(parkingData, `carpso-parking-history-${userId}.csv`);
         downloadCSV(walletData, `carpso-wallet-history-${userId}.csv`);
         downloadCSV(pointsData, `carpso-points-history-${userId}.csv`);
         downloadCSV(referralsData, `carpso-referral-history-${userId}.csv`); // Add referral download
     };

      const downloadCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            toast({ title: "No Data", description: "Nothing to download.", variant: "default" });
            return;
        }
        try {
            const csvContent = convertToCSV(data);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Download Complete", description: `${filename} has been downloaded.` });
        } catch (error) {
            console.error("Failed to generate or download CSV:", error);
            toast({ title: "Download Failed", description: "Could not generate the spreadsheet.", variant: "destructive" });
        }
      };
     // --- End Download Functions ---


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
                const updatedGamification = await getUserGamification(userId);
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
                preferredPaymentMethod: editPreferredPaymentMethod, // Save preferred method ID
            });
             const updatedVehiclesPromise = updateUserVehicles(userId, editVehicles);
             // Note: Payment methods are updated via their dedicated modal now

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
        setEditPreferredPaymentMethod(currentDetails?.preferredPaymentMethod); // Reset preferred payment method
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

    // --- Payment Method Management ---
     const handleOpenPaymentMethodModal = () => {
        if (!isOnline) {
            toast({ title: "Offline", description: "Cannot manage payment methods offline.", variant: "destructive" });
            return;
        }
        setIsPaymentMethodModalOpen(true);
     };

     const handleSavePaymentMethods = async (updatedMethods: PaymentMethod[], newPreferredId: string | undefined) => {
         if (!userId || !isOnline) return;
         setIsSavingProfile(true); // Reuse saving state
         try {
             // Save the methods first
             await updateUserPaymentMethods(userId, updatedMethods);
             // Then update the preferred ID in user details
             const updatedDetails = await updateUserDetails(userId, { preferredPaymentMethod: newPreferredId });

             // Update local state
             setPaymentMethods(updatedMethods);
             setUserDetails(updatedDetails); // Update details with new preferred ID
             setEditPreferredPaymentMethod(newPreferredId); // Update edit state too
             setLastUpdated(Date.now());
             toast({ title: "Payment Methods Updated" });
             setIsPaymentMethodModalOpen(false);
         } catch (error) {
             console.error("Failed to save payment methods:", error);
             toast({ title: "Save Failed", variant: "destructive" });
         } finally {
             setIsSavingProfile(false);
         }
     };
    // --- End Payment Method Management ---

     // --- Tawk.to Chat Integration ---
     const handleOpenChat = () => {
         if (typeof window !== 'undefined' && (window as any).Tawk_API && (window as any).Tawk_API.maximize) {
            (window as any).Tawk_API.maximize();
         } else if (typeof window !== 'undefined' && (window as any).Tawk_API) {
              // Fallback if maximize isn't available? Maybe toggle or show?
              (window as any).Tawk_API.showWidget?.();
              (window as any).Tawk_API.openChat?.();
              toast({ title: "Opening Chat...", description: "Attempting to open the chat widget.", variant: "default" });
         }
         else {
             // Fallback or error message if Tawk API isn't available
             toast({ title: "Chat Unavailable", description: "Live chat support is currently unavailable. Please try again later or use WhatsApp.", variant: "default" });
         }
     };
     // --- End Tawk.to Chat Integration ---

     // --- Referral Code Copy ---
      const handleCopyReferralCode = () => {
          if (gamification?.referralCode && typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(gamification.referralCode)
                 .then(() => toast({ title: "Referral Code Copied!" }))
                 .catch(err => {
                      console.error("Failed to copy referral code:", err);
                      toast({ title: "Copy Failed", variant: "destructive" });
                 });
          }
      };
      // --- End Referral Code Copy ---

      // --- Promo Code Apply ---
      const handleApplyPromoCode = async () => {
           if (!promoCodeInput || !userId || !isOnline) {
               if (!isOnline) toast({ title: "Offline", description: "Cannot apply promo codes offline.", variant: "destructive" });
               else toast({ title: "Missing Code", description: "Please enter a promo code.", variant: "destructive" });
               return;
           }
           setIsApplyingPromo(true);
           try {
               const result = await applyPromoCode(promoCodeInput, userId);
               if (result.success) {
                   toast({ title: "Success!", description: result.message });
                   setPromoCodeInput(''); // Clear input on success
                   // Refresh relevant data (e.g., points if points were awarded)
                    if (result.pointsAwarded) {
                        await refreshGamificationData();
                    }
                    // If discount applied, it might need to be stored locally or fetched with next cost calculation
               } else {
                   toast({ title: "Invalid Code", description: result.message, variant: "destructive" });
               }
           } catch (error: any) {
               console.error("Error applying promo code:", error);
               toast({ title: "Error", description: "Could not apply promo code.", variant: "destructive" });
           } finally {
               setIsApplyingPromo(false);
           }
      };
      // --- End Promo Code Apply ---

      // --- Points Redemption ---
      const handleRedeemPoints = async () => {
           if (!userId || !isOnline) {
               if (!isOnline) toast({ title: "Offline", description: "Cannot redeem points while offline.", variant: "destructive" });
               return;
           }
            if (pointsToRedeem === '' || pointsToRedeem <= 0) {
                toast({ title: "Invalid Amount", description: "Please enter a valid number of points to redeem.", variant: "destructive" });
                return;
            }
            if (pointsToRedeem > (gamification?.points || 0)) {
                 toast({ title: "Insufficient Points", description: `You only have ${gamification?.points || 0} points.`, variant: "destructive" });
                 return;
            }

            setIsSavingProfile(true); // Reuse saving state as loading indicator
            try {
                 const redemptionResult = await redeemPoints(userId, pointsToRedeem);
                 if (redemptionResult) {
                     const { redeemedAmount, newPointsBalance, newWalletBalance, transaction } = redemptionResult;
                     toast({
                         title: "Points Redeemed!",
                         description: `${pointsToRedeem} points redeemed for K ${redeemedAmount.toFixed(2)} wallet credit.`,
                     });
                     // Refresh both gamification and wallet data
                     await refreshGamificationData();
                     await refreshWalletData();
                     setIsRedeemPointsModalOpen(false); // Close modal on success
                     setPointsToRedeem(''); // Reset input
                 } else {
                     throw new Error("Points redemption failed.");
                 }
            } catch (error: any) {
                 console.error("Error redeeming points:", error);
                 toast({ title: "Redemption Failed", description: error.message, variant: "destructive" });
            } finally {
                 setIsSavingProfile(false);
            }
      };
     // --- End Points Redemption ---


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
            case 'points_redemption': return <Coins className="h-4 w-4 text-yellow-500" />; // Icon for points redemption
            default: return <WalletIcon className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getPointsTransactionIcon = (type: PointsTransaction['type']) => {
        switch(type) {
            case 'sent': return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
            case 'received': return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
            case 'earned': return <PlusCircle className="h-4 w-4 text-green-600" />; // Added 'earned' type
            case 'redeemed': return <DollarSign className="h-4 w-4 text-red-600" />; // Added 'redeemed' type
            default: return <Sparkles className="h-4 w-4 text-yellow-500" />;
        }
    };

    // Format currency based on selected display currency
    const formatAmount = (amount: number): string => {
        const baseCurrency = wallet?.currency || 'ZMW';
        if (displayCurrency === baseCurrency) {
            return `${getCurrencySymbol(baseCurrency)} ${amount.toFixed(2)}`;
        }
        if (!exchangeRates || isLoadingRates) {
            return `${getCurrencySymbol(baseCurrency)} ${amount.toFixed(2)} (Converting...)`;
        }
        const convertedAmount = convertCurrency(amount, displayCurrency, exchangeRates);
        if (convertedAmount === null) {
            return `${getCurrencySymbol(baseCurrency)} ${amount.toFixed(2)} (Rate N/A)`;
        }
        return `${getCurrencySymbol(displayCurrency)} ${convertedAmount.toFixed(2)}`;
    };


    const activeReservations = parkingHistory?.filter(h => h.status === 'Active') || [];
    const completedHistory = parkingHistory?.filter(h => h.status === 'Completed') || [];
    const displayName = userDetails?.name || userName || 'User';
    const displayAvatar = userDetails?.avatarUrl || userAvatarUrl || '';
    const userInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';
    const currentTier = billingInfo?.subscriptionTier || 'Basic';
    const isPremium = currentTier === 'Premium';
     const preferredMethod = paymentMethods.find(pm => pm.id === userDetails?.preferredPaymentMethod); // Find preferred method details
    const receivePaymentQrValue = userId ? `carpso_pay:${userId}` : 'carpso_pay:unknown_user'; // QR Code value
    const currentPointsValue = gamification?.points ?? 0;
    const pointsKwachaValue = (currentPointsValue * POINTS_TO_KWACHA_RATE).toFixed(2); // Calculate Kwacha equivalent

    // Render loading or empty state if not authenticated or data is loading
    if (isLoading && !userDetails) { // Show skeleton only on initial full load without cached data
        return (
            <div className="container py-8 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
                <ProfileSkeleton />
            </div>
        );
    }

    if (errorLoading && !userDetails && !paymentMethods.length && !parkingHistory) { // Only show full error if no cached data at all
         return (
             <div className="container py-8 px-4 md:px-6 lg:px-8 text-center">
                 <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-4" />
                 <p className="text-destructive">{errorLoading}</p>
                 {isOnline && <Button onClick={() => loadProfileData(true)} className="mt-4">Retry</Button>}
                  {!isOnline && <p className="text-sm text-muted-foreground mt-2">Connect to the internet and try again.</p>}
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
                        <div className="flex items-start justify-between gap-4 flex-wrap"> {/* Allow wrapping */}
                             <div>
                                 <CardTitle className="text-2xl">My Profile</CardTitle>
                                 <CardDescription>View and manage your account details, wallet, vehicles, and history.</CardDescription>
                             </div>
                             {/* Action Buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" onClick={() => loadProfileData(true)} disabled={isLoading || !isOnline}>
                                    {!isOnline ? <WifiOff className="h-4 w-4 mr-1.5" /> : isLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-1.5" />}
                                    Refresh
                                </Button>
                                {!editMode ? (
                                    <Button variant="ghost" size="icon" onClick={() => setEditMode(true)} aria-label="Edit Profile" disabled={!isOnline}>
                                         {!isOnline ? <WifiOff className="h-4 w-4 text-muted-foreground" title="Cannot edit offline"/> : <Edit className="h-4 w-4" />}
                                    </Button>
                                ) : (
                                    <div className="flex gap-1">
                                         <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={isSavingProfile} aria-label="Cancel Edit">
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={handleSaveProfile} disabled={isSavingProfile || !isOnline} aria-label="Save Profile">
                                             {!isOnline ? <WifiOff className="h-4 w-4 text-muted-foreground" title="Cannot save offline"/> : isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                          {/* Offline/Last Updated Indicator */}
                         <div className="text-xs text-muted-foreground pt-2">
                            {!isOnline ? (
                                <span className="flex items-center gap-1 text-destructive"><WifiOff className="h-3 w-3" /> Offline - Displaying cached data {lastUpdated ? `(updated ${new Date(lastUpdated).toLocaleTimeString()})` : ''}.</span>
                            ) : isLoading ? (
                                 <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Syncing...</span>
                            ) : lastUpdated ? (
                                <span>Last Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
                            ) : (
                                <span>Updating...</span> // Show if online but no timestamp yet
                            )}
                         </div>
                          {/* Display error if loading failed but some cached data exists */}
                         {errorLoading && (isLoadingPaymentMethods || isLoadingVehicles || isLoadingGamification || isLoadingWallet || isLoadingReferrals) && (
                              <Alert variant="warning" className="mt-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertTitle>Loading Issue</AlertTitle>
                                  <AlertDescription>
                                      {errorLoading} Displaying best available data.
                                  </AlertDescription>
                              </Alert>
                         )}
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
                                          {/* Preferred Payment Method Selector in Edit Mode */}
                                          <div className="space-y-1">
                                               <Label htmlFor="preferred-payment">Preferred Payment</Label>
                                               <Select
                                                   value={editPreferredPaymentMethod || ''}
                                                   onValueChange={setEditPreferredPaymentMethod}
                                                   disabled={isSavingProfile || isLoadingPaymentMethods || !isOnline}
                                                >
                                                   <SelectTrigger id="preferred-payment">
                                                        <SelectValue placeholder="Select preferred method..." />
                                                   </SelectTrigger>
                                                   <SelectContent>
                                                       {paymentMethods.length === 0 && <SelectItem value="" disabled>No methods saved</SelectItem>}
                                                       {paymentMethods.map(pm => (
                                                           <SelectItem key={pm.id} value={pm.id}>
                                                               {pm.type === 'Card' ? <CreditCard className="inline h-4 w-4 mr-2" /> : <Smartphone className="inline h-4 w-4 mr-2" />} {pm.details}
                                                           </SelectItem>
                                                       ))}
                                                   </SelectContent>
                                               </Select>
                                          </div>
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
                                           <p className="text-xs text-muted-foreground">
                                               Preferred Payment: {preferredMethod ? `${preferredMethod.type} (${preferredMethod.details})` : 'Not Set'}
                                           </p>
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
                             <div className="flex justify-between items-center mb-3 flex-wrap gap-2"> {/* Added flex-wrap and gap */}
                                <h3 className="text-lg font-semibold flex items-center gap-2"><WalletIcon className="h-5 w-5 text-primary" /> Wallet</h3>
                                <div className="flex items-center gap-2">
                                     {/* Currency Selector */}
                                     <Select
                                        value={displayCurrency}
                                        onValueChange={setDisplayCurrency}
                                        disabled={isLoadingRates || !exchangeRates || !isOnline}
                                     >
                                        <SelectTrigger className="w-[90px] h-8 text-xs" aria-label="Select display currency">
                                             <SelectValue placeholder="Currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                             {exchangeRates ? Object.keys(exchangeRates).map(curr => (
                                                  <SelectItem key={curr} value={curr} className="text-xs">
                                                     {curr} ({getCurrencySymbol(curr)})
                                                 </SelectItem>
                                             )) : <SelectItem value="ZMW" disabled>ZMW (K)</SelectItem>}
                                        </SelectContent>
                                     </Select>
                                    <Button variant="outline" size="sm" onClick={refreshWalletData} disabled={isLoadingWallet || !isOnline}>
                                         {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoadingWallet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />} Refresh
                                    </Button>
                                </div>
                             </div>
                              {isLoadingWallet && !wallet ? <Skeleton className="h-44 w-full"/> : (
                                 <>
                                     <Card className="p-4 mb-4 bg-gradient-to-br from-primary/80 to-primary text-primary-foreground rounded-lg shadow-md">
                                         <div className="flex justify-between items-start">
                                             <div>
                                                <p className="text-sm font-medium opacity-80">Available Balance</p>
                                                <p className="text-3xl font-bold">
                                                    {/* Format balance based on selected display currency */}
                                                    {formatAmount(wallet?.balance ?? 0)}
                                                </p>
                                                 {/* Show base currency if different */}
                                                {wallet?.currency && displayCurrency !== wallet.currency && (
                                                    <p className="text-xs opacity-70 mt-1">
                                                        (Base: {getCurrencySymbol(wallet.currency)} {(wallet?.balance ?? 0).toFixed(2)})
                                                    </p>
                                                )}
                                             </div>
                                             {/* QR Code Trigger */}
                                              <Dialog>
                                                  <DialogTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/60 -mr-2 -mt-1">
                                                          <QrCode className="h-5 w-5" />
                                                          <span className="sr-only">Show QR Code</span>
                                                      </Button>
                                                  </DialogTrigger>
                                                  <DialogContent className="sm:max-w-xs">
                                                      <DialogHeaderSub>
                                                          <DialogTitleSub>Receive Payment</DialogTitleSub>
                                                          <DialogDescriptionSub>
                                                              Scan this code to send Carpso Wallet funds to {displayName}.
                                                          </DialogDescriptionSub>
                                                      </DialogHeaderSub>
                                                      <div className="flex justify-center py-4">
                                                          {typeof window !== 'undefined' ? ( // Ensure QRCode renders client-side
                                                              <QRCode value={receivePaymentQrValue} size={180} />
                                                          ) : (
                                                               <Skeleton className="h-[180px] w-[180px]" />
                                                          )}
                                                      </div>
                                                      <p className="text-center text-sm text-muted-foreground">User ID: {userId}</p>
                                                      <p className="text-center text-xs text-muted-foreground">Value: {receivePaymentQrValue}</p>
                                                  </DialogContent>
                                              </Dialog>
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
                                                             {/* Format transaction amount */}
                                                             {txn.amount >= 0 ? '+' : ''}{formatAmount(Math.abs(txn.amount))}
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

                         {/* Billing / Payment Methods Section */}
                         <section className="mb-6">
                             <div className="flex justify-between items-center mb-3">
                                 <h3 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Billing & Plan</h3>
                                  {/* Download button might be complex offline */}
                                 <Button variant="ghost" size="sm" onClick={handleDownloadBilling} disabled={isLoadingPaymentMethods || isLoading}>
                                     <Download className="mr-2 h-4 w-4" /> Summary
                                 </Button>
                             </div>
                             {isLoading && !billingInfo ? <Skeleton className="h-48 w-full"/> : (
                                <>
                                     <Card className="mb-4 border-l-4 border-yellow-500">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex justify-between items-center">
                                                Subscription: {currentTier}
                                                {/* Link to upgrade/manage subscription */}
                                                <Button variant="link" size="sm" className="text-xs h-auto p-0" disabled={!isOnline}>
                                                    {isPremium ? "Manage Plan" : "Upgrade to Premium"}
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
                                                <Landmark className="h-4 w-4 text-accent"/> Carpso Card
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
                                         {isLoadingPaymentMethods && !paymentMethods?.length ? <Skeleton className="h-24 w-full"/> : (
                                              <>
                                                 <div className="space-y-2 mb-3">
                                                     {paymentMethods.length > 0 ? (
                                                         paymentMethods.map((method) => (
                                                             <div key={method.id} className="flex items-center justify-between p-3 border rounded-md text-sm">
                                                                 <div className="flex items-center gap-2">
                                                                     {method.type === 'Card' ? <CreditCard className="h-4 w-4 text-muted-foreground" /> : <Smartphone className="h-4 w-4 text-muted-foreground" />}
                                                                     <span>{method.details}</span>
                                                                 </div>
                                                                  {method.id === userDetails?.preferredPaymentMethod && <Badge variant="outline" size="sm">Primary</Badge>}
                                                             </div>
                                                         ))
                                                     ) : (
                                                         <p className="text-sm text-muted-foreground">No payment methods saved.</p>
                                                     )}
                                                 </div>
                                                  {/* Manage Button - Opens Modal */}
                                                  <Button variant="outline" size="sm" className="w-full" onClick={handleOpenPaymentMethodModal} disabled={isLoadingPaymentMethods || !isOnline}>
                                                      {isLoadingPaymentMethods ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Manage Payment Methods
                                                  </Button>
                                             </>
                                         )}
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
                                                        <Trash2 className="h-4 w-4" />
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


                        {/* Rewards & Referrals Section */}
                        <section className="mb-6">
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-600" /> Rewards & Referrals</h3>
                                <Button variant="outline" size="sm" onClick={refreshGamificationData} disabled={isLoadingGamification || !isOnline}>
                                    {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoadingGamification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />} Refresh
                                </Button>
                             </div>
                             {isLoadingGamification && !gamification ? <Skeleton className="h-64 w-full"/> : (
                                <>
                                    {/* Points and Carpool */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <Card className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Coins className="h-5 w-5 text-primary" />
                                                    <span className="font-medium">Points Balance</span>
                                                </div>
                                                 <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setIsRedeemPointsModalOpen(true)} disabled={!isOnline || currentPointsValue <= 0}>
                                                     Redeem
                                                 </Button>
                                            </div>
                                             <p className="text-2xl font-bold text-primary">{currentPointsValue}</p>
                                             <p className="text-xs text-muted-foreground">(≈ K {pointsKwachaValue})</p>
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
                                    {/* Transfer Points */}
                                    <Button
                                        variant="outline" size="sm" className="w-full mb-4"
                                        onClick={() => setIsTransferPointsModalOpen(true)}
                                        disabled={!isOnline || (gamification?.points ?? 0) <= 0}
                                    >
                                        <Gift className="mr-2 h-4 w-4" /> Transfer Points to Friend
                                    </Button>

                                    {/* Referral Code */}
                                     <Card className="mb-4 border-dashed border-primary/50">
                                         <CardHeader className="pb-3">
                                             <CardTitle className="text-base flex items-center gap-2">
                                                  <UsersRound className="h-4 w-4 text-primary" /> Your Referral Code
                                             </CardTitle>
                                         </CardHeader>
                                         <CardContent>
                                             <div className="flex items-center justify-between gap-2 p-2 border rounded-md bg-muted">
                                                 <span className="font-mono text-sm font-semibold text-primary truncate">{gamification?.referralCode || 'Loading...'}</span>
                                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={handleCopyReferralCode} disabled={!gamification?.referralCode || typeof navigator === 'undefined' || !navigator.clipboard}>
                                                     <Copy className="h-4 w-4" />
                                                     <span className="sr-only">Copy Code</span>
                                                 </Button>
                                             </div>
                                             <p className="text-xs text-muted-foreground mt-2">Share this code with friends! You both get bonus points when they sign up and complete their first parking.</p>
                                             <p className="text-xs font-medium mt-1">Referrals Completed: {gamification?.referralsCompleted ?? 0}</p>
                                         </CardContent>
                                     </Card>

                                    {/* Promo Code Input */}
                                     <Card className="mb-4">
                                         <CardHeader className="pb-3">
                                             <CardTitle className="text-base flex items-center gap-2">
                                                 <Ticket className="h-4 w-4 text-accent"/> Apply Promo Code
                                             </CardTitle>
                                         </CardHeader>
                                         <CardContent>
                                             <div className="flex items-center gap-2">
                                                 <Input
                                                    id="promo-code"
                                                    value={promoCodeInput}
                                                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                                                    placeholder="Enter code"
                                                    disabled={isApplyingPromo || !isOnline}
                                                    className="flex-grow uppercase"
                                                 />
                                                  <Button onClick={handleApplyPromoCode} disabled={isApplyingPromo || !isOnline || !promoCodeInput}>
                                                     {isApplyingPromo ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Apply
                                                 </Button>
                                             </div>
                                         </CardContent>
                                     </Card>

                                     {/* Recent Points Activity */}
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
                                                                      {txn.description || (
                                                                          txn.type === 'sent' ? `Sent to ${txn.recipientId.substring(0,8)}...` :
                                                                          txn.type === 'received' ? `Received from ${txn.senderId.substring(0,8)}...` :
                                                                          txn.type === 'earned' ? 'Points Earned' :
                                                                          txn.type === 'redeemed' ? 'Points Redeemed' :
                                                                          'System Update'
                                                                      )}
                                                                 </p>
                                                                 <p className="text-xs text-muted-foreground">{new Date(txn.timestamp).toLocaleString()}</p>
                                                             </div>
                                                         </div>
                                                         <span className={cn(
                                                             "font-semibold text-xs whitespace-nowrap",
                                                             (txn.type === 'received' || txn.type === 'earned') ? "text-green-600" : (txn.type === 'sent' || txn.type === 'redeemed') ? "text-red-600" : "text-primary"
                                                         )}>
                                                             {(txn.type === 'received' || txn.type === 'earned') ? '+' : (txn.type === 'sent' || txn.type === 'redeemed') ? '-' : ''}{txn.points} points
                                                         </span>
                                                     </div>
                                                 ))}
                                             </div>
                                         ) : (
                                             <p className="text-sm text-muted-foreground text-center py-3">No recent points activity.</p>
                                         )}
                                    </div>
                                     {/* Earned Badges */}
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
                                     {/* Referral History (Optional/Collapsible) */}
                                      <div className="mt-4">
                                          <p className="text-sm font-medium mb-2">Referral History ({gamification?.referralsCompleted ?? 0} Completed):</p>
                                           {isLoadingReferrals ? <Skeleton className="h-16 w-full"/> : referralHistory.length > 0 ? (
                                                <ScrollArea className="h-[150px] border rounded-md p-2">
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead className="h-8 text-xs">Referred User</TableHead><TableHead className="h-8 text-xs">Date</TableHead><TableHead className="h-8 text-xs text-right">Bonus Awarded</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {referralHistory.map((ref, index) => (
                                                                <TableRow key={index}>
                                                                    <TableCell className="py-1 text-xs">{ref.referredUserName || ref.referredUserId.substring(0, 8)}...</TableCell>
                                                                    <TableCell className="py-1 text-xs">{new Date(ref.signupTimestamp).toLocaleDateString()}</TableCell>
                                                                    <TableCell className="py-1 text-xs text-right">{ref.bonusAwarded ? <CheckCircle className="h-4 w-4 text-green-600 inline"/> : 'Pending'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                           ) : (
                                               <p className="text-sm text-muted-foreground text-center py-3">No referral history yet.</p>
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
                                        <Card key={res.recordId} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div>
                                                <p className="font-medium">{res.lotName} (Spot {res.spotId.split('-')[1]})</p>
                                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Started: {new Date(res.startTime).toLocaleTimeString()}</span>
                                                    {/* TODO: Add cancel reservation button */}
                                                </div>
                                            </div>
                                            <Button variant="destructive" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0" onClick={() => handleOpenReportModal(res)} disabled={!isOnline}>
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
                                <Button variant="ghost" size="sm" onClick={handleDownloadHistory} disabled={isLoading}>
                                    <Download className="mr-2 h-4 w-4" /> Download History
                                </Button>
                            </div>
                             <ScrollArea className="h-[250px] pr-3">
                                 {isLoading && !parkingHistory ? <Skeleton className="h-full w-full"/> : completedHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {completedHistory.map((entry) => (
                                            <Card key={entry.recordId} className="p-3 text-sm flex flex-col sm:flex-row justify-between items-start gap-2">
                                                 <div className="flex-grow">
                                                    <p className="font-medium">{entry.lotName} (Spot {entry.spotId.split('-')[1]})</p>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Clock className="h-3 w-3" />
                                                         <span>{new Date(entry.startTime).toLocaleString()} {entry.endTime ? ` - ${new Date(entry.endTime).toLocaleTimeString()}` : ''}</span>
                                                        {entry.durationMinutes !== undefined && ` (${entry.durationMinutes} min)`}
                                                    </div>
                                                     <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                         <CreditCard className="h-3 w-3" />
                                                         <span>Paid via {entry.paymentMethod || 'N/A'}</span>
                                                          {entry.appliedPricingRule && `(${entry.appliedPricingRule})`}
                                                     </div>
                                                 </div>
                                                <div className="flex-shrink-0 sm:text-right">
                                                     <span className="font-semibold text-sm block">{formatAmount(entry.cost)}</span>
                                                      {/* Button to view/print receipt for this specific entry */}
                                                     {/* <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-1">View Receipt</Button> */}
                                                 </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No completed parking history.</p>
                                )}
                            </ScrollArea>
                        </section>

                        <Separator className="my-6" />

                        {/* Support Section */}
                         <section className="mb-6">
                             <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Contact className="h-5 w-5" /> Support</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Live Chat Button */}
                                   <Button variant="outline" onClick={handleOpenChat} className="w-full justify-start text-left h-auto py-3">
                                       <MessageSquare className="mr-3 h-5 w-5 text-blue-600" />
                                       <div>
                                           <p className="font-medium">Live Chat</p>
                                           <p className="text-xs text-muted-foreground">Get help via Tawk.to.</p>
                                       </div>
                                   </Button>
                                   {/* WhatsApp Button */}
                                   <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                       <a href={WHATSAPP_CHAT_LINK_1} target="_blank" rel="noopener noreferrer">
                                          <MessageSquare className="mr-3 h-5 w-5 text-green-600" /> {/* Can reuse icon or use specific WhatsApp icon */}
                                          <div>
                                             <p className="font-medium">WhatsApp Chat</p>
                                             <p className="text-xs text-muted-foreground">Via WhatsApp (+260 95...).</p>
                                          </div>
                                          <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                       </a>
                                   </Button>
                                   {/* Phone Call Link (Second Number) - Example */}
                                   <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                       <a href={`tel:${WHATSAPP_NUMBER_2}`}>
                                          <Smartphone className="mr-3 h-5 w-5" />
                                          <div>
                                             <p className="font-medium">Call Support</p>
                                             <p className="text-xs text-muted-foreground">(+260 96...).</p>
                                          </div>
                                          <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                       </a>
                                   </Button>
                                   {/* Link to FAQ or Help Center */}
                                   <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                       <a href="/help" target="_blank" rel="noopener noreferrer">
                                          <Info className="mr-3 h-5 w-5" />
                                          <div>
                                              <p className="font-medium">Help Center</p>
                                              <p className="text-xs text-muted-foreground">Find answers to common questions.</p>
                                          </div>
                                          <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                       </a>
                                   </Button>
                             </div>
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
             {/* Payment Method Management Modal */}
              <PaymentMethodModal
                  isOpen={isPaymentMethodModalOpen}
                  onClose={() => setIsPaymentMethodModalOpen(false)}
                  userId={userId || ''}
                  currentMethods={paymentMethods}
                  preferredMethodId={editPreferredPaymentMethod} // Pass the editable preferred ID
                  onSave={handleSavePaymentMethods}
              />

             {/* Redeem Points Modal */}
              <Dialog open={isRedeemPointsModalOpen} onOpenChange={setIsRedeemPointsModalOpen}>
                 <DialogContent className="sm:max-w-md">
                     <DialogHeaderSub>
                         <DialogTitleSub>Redeem Points</DialogTitleSub>
                         <DialogDescriptionSub>
                             Convert your points into wallet credit (K {POINTS_TO_KWACHA_RATE.toFixed(2)} per point).
                             Available Points: {currentPointsValue}.
                         </DialogDescriptionSub>
                     </DialogHeaderSub>
                     <div className="grid gap-4 py-4">
                         <div className="space-y-1">
                             <Label htmlFor="redeem-points">Points to Redeem</Label>
                             <Input
                                 id="redeem-points"
                                 type="number"
                                 value={pointsToRedeem}
                                 onChange={(e) => setPointsToRedeem(e.target.value === '' ? '' : Number(e.target.value))}
                                 placeholder="0"
                                 min="1"
                                 max={currentPointsValue}
                                 disabled={isSavingProfile || !isOnline}
                             />
                             {pointsToRedeem !== '' && pointsToRedeem > 0 && (
                                 <p className="text-sm text-muted-foreground mt-1">
                                     ≈ K {(pointsToRedeem * POINTS_TO_KWACHA_RATE).toFixed(2)} Wallet Credit
                                 </p>
                             )}
                             {pointsToRedeem !== '' && pointsToRedeem > currentPointsValue && (
                                  <p className="text-xs text-destructive mt-1">Amount exceeds available points.</p>
                             )}
                         </div>
                     </div>
                     <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline" disabled={isSavingProfile}>Cancel</Button></DialogClose>
                          <Button
                             onClick={handleRedeemPoints}
                             disabled={isSavingProfile || !isOnline || pointsToRedeem === '' || pointsToRedeem <= 0 || pointsToRedeem > currentPointsValue}
                         >
                             {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             Redeem {pointsToRedeem || 0} Points
                         </Button>
                     </DialogFooter>
                 </DialogContent>
              </Dialog>


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
         </div>
        <Separator />
        {/* Rewards & Referrals Skeleton */}
        <div className="space-y-4">
            <Skeleton className="h-6 w-1/3 mb-3" />
            {/* Points & Carpool */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Skeleton className="h-20 w-full rounded-md" />
                 <Skeleton className="h-20 w-full rounded-md" />
             </div>
             <Skeleton className="h-9 w-full mt-2 rounded-md"/> {/* Transfer Button */}
             <Skeleton className="h-24 w-full rounded-md" /> {/* Referral Code Card */}
             <Skeleton className="h-20 w-full rounded-md" /> {/* Promo Code Card */}
             <Skeleton className="h-5 w-1/4 mt-4" /> {/* History Title */}
             <Skeleton className="h-10 w-full rounded-md"/> {/* History Item */}
            <Skeleton className="h-5 w-1/4 mt-4" /> {/* Badges Title */}
            <div className="flex gap-2"> <Skeleton className="h-8 w-20 rounded-full"/> <Skeleton className="h-8 w-24 rounded-full"/></div>
             <Skeleton className="h-5 w-1/3 mt-4" /> {/* Referral History Title */}
             <Skeleton className="h-24 w-full rounded-md" /> {/* Referral History Table */}
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
        </div>
        <Separator />
        {/* Support Skeleton */}
         <div className="space-y-3">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Skeleton className="h-20 w-full rounded-md" />
                 <Skeleton className="h-20 w-full rounded-md" />
             </div>
         </div>
    </div>
);

