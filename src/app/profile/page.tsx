
// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import QRCode from 'qrcode.react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { List, DollarSign, Clock, AlertCircle, CheckCircle, Smartphone, CreditCard, Download, AlertTriangle, Car, Sparkles as SparklesIcon, Award, Users, Trophy, Star, Gift, Edit, Save, X, Loader2, Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, PlusCircle, QrCode, Info, CarTaxiFront, Flag, BookMarked, Home as HomeIcon, Briefcase, School as SchoolIcon, GraduationCap, Edit2, Trash2, WifiOff, UserPlus, Sparkles, Landmark, Globe, RefreshCcw, MessageSquare, Contact, Printer, UsersRound, Copy, Ticket, ExternalLink, Coins, Facebook, Twitter, Instagram, Youtube as TikTokIcon } from 'lucide-react';
import { AppStateContext } from '@/context/AppStateProvider';
import { useToast } from '@/hooks/use-toast';
import { getUserGamification, updateCarpoolEligibility, UserGamification, UserBadge, UserBookmark, getUserBookmarks, addBookmark, updateBookmark, deleteBookmark, getPointsTransactions, PointsTransaction, transferPoints, getReferralHistory, Referral, applyPromoCode, awardPoints, redeemPoints, UserRole } from '@/services/user-service';
import ReportIssueModal from '@/components/profile/ReportIssueModal';
import { useRouter } from 'next/navigation';
import { getWalletBalance, getWalletTransactions, Wallet, WalletTransaction, getExchangeRates, convertCurrency, getPaymentMethods, updatePaymentMethods, PaymentMethod } from '@/services/wallet-service';
import TopUpModal from '@/components/wallet/TopUpModal';
import SendMoneyModal from '@/components/wallet/SendMoneyModal';
import PayForOtherModal from '@/components/wallet/PayForOtherModal';
import TransferPointsModal from '@/components/gamification/TransferPointsModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogTrigger, DialogContent, DialogFooter, DialogHeader as DialogHeaderSub, DialogTitle as DialogTitleSub, DialogDescription as DialogDescriptionSub, DialogClose } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { convertToCSV, getParkingRecords, ParkingRecord } from '@/services/pricing-service';
import PaymentMethodModal from '@/components/profile/PaymentMethodModal';

// Define Point to Kwacha Conversion Rate
const POINTS_TO_KWACHA_RATE = 0.10; // Example: 1 point = K 0.10

// Mock data types and functions (Should be moved to a shared location or replaced by API)
interface UserDetails {
    name: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    memberSince: string;
    role: UserRole; // Use UserRole type
    preferredPaymentMethod?: string;
    notificationPreferences?: {
        promotions: boolean;
        updates: boolean;
    };
}

interface BillingInfo {
    subscriptionTier?: 'Basic' | 'Premium';
    guaranteedSpotsAvailable?: number;
}

export interface Vehicle {
    id: string;
    make: string;
    model: string;
    plateNumber: string;
    isPrimary: boolean;
}

const CACHE_KEYS = {
    userDetails: (userId: string) => `cachedUserDetails_${userId}`,
    billingInfo: (userId: string) => `cachedBillingInfo_${userId}`,
    parkingHistory: (userId: string) => `cachedParkingHistory_${userId}`,
    vehicles: (userId: string) => `cachedVehicles_${userId}`,
    paymentMethods: (userId: string) => `cachedPaymentMethods_${userId}`,
    gamification: (userId: string) => `cachedGamification_${userId}`,
    pointsTxns: (userId: string) => `cachedPointsTxns_${userId}`,
    wallet: (userId: string) => `cachedUserWallet_${userId}`,
    walletTxns: (userId: string) => `cachedUserWalletTxns_${userId}`,
    bookmarks: (userId: string) => `cachedUserBookmarks_${userId}`,
    referralHistory: (userId: string) => `cachedReferralHistory_${userId}`,
    exchangeRates: 'cachedExchangeRates',
    timestampSuffix: '_timestamp',
};

const getCachedData = <T>(key: string, maxAgeMs: number = 60 * 60 * 1000): T | null => {
    if (typeof window === 'undefined') return null;
    const timestampKey = key + CACHE_KEYS.timestampSuffix;
    const timestamp = localStorage.getItem(timestampKey);
    const data = localStorage.getItem(key);
    if (data && timestamp && (Date.now() - parseInt(timestamp)) < maxAgeMs) {
        try {
            return JSON.parse(data) as T;
        } catch (e: any) {
            console.error("Error parsing cached data:", e.message);
            localStorage.removeItem(key);
            localStorage.removeItem(timestampKey);
            return null;
        }
    }
    return null;
};

const setCachedData = <T>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(key + CACHE_KEYS.timestampSuffix, Date.now().toString());
    } catch (e: any) {
        console.error("Error setting cached data:", e.message);
    }
};

const checkAndAwardDailyLoginPoints = async (userId: string): Promise<number | null> => {
    if (typeof window === 'undefined') return null;
    const lastLoginKey = `lastLoginTimestamp_${userId}`;
    const lastLoginTimestamp = localStorage.getItem(lastLoginKey);
    const today = new Date().toDateString();

    if (!lastLoginTimestamp || new Date(parseInt(lastLoginTimestamp)).toDateString() !== today) {
        try {
            const pointsAwarded = 5;
            const newTotal = await awardPoints(userId, pointsAwarded, 'Daily Login Bonus');
            localStorage.setItem(lastLoginKey, Date.now().toString());
            console.log(`Awarded ${pointsAwarded} daily login points to user ${userId}.`);
            return newTotal;
        } catch (error: any) {
            console.error("Failed to award daily login points:", error.message);
            return null;
        }
    }
    return null;
};

const fetchUserDetails = async (userId: string, existingName?: string | null, existingAvatar?: string | null, existingRole?: UserRole | null): Promise<UserDetails> => {
    await new Promise(resolve => setTimeout(resolve, 700));
    const name = existingName || `User ${userId.substring(0, 5)}`;
    const avatarUrl = existingAvatar || `https://picsum.photos/seed/${userId}/100/100`;
    const role = existingRole || 'User';
    const prefs = { promotions: Math.random() > 0.5, updates: true };
    const details: UserDetails = { name, email: `user_${userId.substring(0, 5)}@example.com`, phone: '+260 977 123 456', avatarUrl, memberSince: '2024-01-15', role, preferredPaymentMethod: 'pm_1', notificationPreferences: prefs };
    setCachedData(CACHE_KEYS.userDetails(userId), details);
    return details;
};

const fetchBillingInfo = async (userId: string, role: UserRole): Promise<Omit<BillingInfo, 'accountBalance'>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const isPremium = role?.toLowerCase().includes('premium') || Math.random() > 0.7;
    const billing = { subscriptionTier: isPremium ? 'Premium' : ('Basic' as 'Basic' | 'Premium'), guaranteedSpotsAvailable: isPremium ? 3 : 0 };
    setCachedData(CACHE_KEYS.billingInfo(userId), billing);
    return billing;
};

const fetchParkingHistory = async (userId: string): Promise<ParkingRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const allRecords = await getParkingRecords({ userId });
    const sortedRecords = allRecords.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    setCachedData(CACHE_KEYS.parkingHistory(userId), sortedRecords);
    return sortedRecords;
};

const fetchVehicles = async (userId: string): Promise<Vehicle[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    const plateBasedOnId = `ABC ${userId.substring(userId.length - 4)}`.toUpperCase();
    const vehicles = [
        { id: 'veh1', make: 'Toyota', model: 'Corolla', plateNumber: plateBasedOnId, isPrimary: true },
        { id: 'veh2', make: 'Nissan', model: 'Hardbody', plateNumber: 'XYZ 7890', isPrimary: false },
    ];
    setCachedData(CACHE_KEYS.vehicles(userId), vehicles);
    return vehicles;
};

const fetchPaymentMethods = async (userId: string): Promise<PaymentMethod[]> => {
    const methods = await getPaymentMethods(userId);
    setCachedData(CACHE_KEYS.paymentMethods(userId), methods);
    return methods;
};

const fetchUserGamification = async (userId: string): Promise<UserGamification> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const gamification = await getUserGamification(userId);
    setCachedData(CACHE_KEYS.gamification(userId), gamification);
    return gamification;
};

const fetchPointsTransactions = async (userId: string, limit: number = 5): Promise<PointsTransaction[]> => {
    await new Promise(resolve => setTimeout(resolve, 350));
    const transactions = await getPointsTransactions(userId, limit);
    setCachedData(CACHE_KEYS.pointsTxns(userId), transactions);
    return transactions;
};

const fetchUserWallet = async (userId: string): Promise<Wallet> => {
     await new Promise(resolve => setTimeout(resolve, 200));
     const wallet = await getWalletBalance(userId);
     setCachedData(CACHE_KEYS.wallet(userId), wallet);
     return wallet;
};

const fetchUserWalletTransactions = async (userId: string, limit: number = 5): Promise<WalletTransaction[]> => {
     await new Promise(resolve => setTimeout(resolve, 350));
     const transactions = await getWalletTransactions(userId, limit);
     setCachedData(CACHE_KEYS.walletTxns(userId), transactions);
     return transactions;
};

const fetchUserBookmarks = async (userId: string): Promise<UserBookmark[]> => {
    await new Promise(resolve => setTimeout(resolve, 250));
    const bookmarks = await getUserBookmarks(userId);
    setCachedData(CACHE_KEYS.bookmarks(userId), bookmarks);
    return bookmarks;
};

const fetchReferralHistory = async (userId: string): Promise<Referral[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const history = await getReferralHistory(userId);
    setCachedData(CACHE_KEYS.referralHistory(userId), history);
    return history;
};

const fetchExchangeRates = async (): Promise<Record<string, number>> => {
    const cachedRates = getCachedData<Record<string, number>>(CACHE_KEYS.exchangeRates, 6 * 60 * 60 * 1000);
    if (cachedRates) {
        console.log("Using cached exchange rates.");
        return cachedRates;
    }
    console.log("Fetching fresh exchange rates...");
    const rates = await getExchangeRates();
    setCachedData(CACHE_KEYS.exchangeRates, rates);
    return rates;
};

const updateUserDetails = async (userId: string, updates: Partial<UserDetails>): Promise<UserDetails> => {
     await new Promise(resolve => setTimeout(resolve, 800));
     console.log("Simulating user details update:", userId, updates);
     const currentDetails = getCachedData<UserDetails>(CACHE_KEYS.userDetails(userId)) || { name: '', email: '', phone: '', avatarUrl: '', memberSince: new Date().toISOString(), role: 'User', preferredPaymentMethod: undefined, notificationPreferences: { promotions: false, updates: false } };
     const updatedDetails: UserDetails = {
         ...currentDetails,
         name: updates.name || currentDetails.name,
         email: updates.email || currentDetails.email,
         phone: updates.phone || currentDetails.phone,
         avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : currentDetails.avatarUrl,
         preferredPaymentMethod: updates.preferredPaymentMethod !== undefined ? updates.preferredPaymentMethod : currentDetails.preferredPaymentMethod,
         notificationPreferences: updates.notificationPreferences || currentDetails.notificationPreferences,
     };
     setCachedData(CACHE_KEYS.userDetails(userId), updatedDetails);
     return updatedDetails;
};

const updateUserVehicles = async (userId: string, vehicles: Vehicle[]): Promise<Vehicle[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log("Simulating updating user vehicles:", userId, vehicles);
    setCachedData(CACHE_KEYS.vehicles(userId), vehicles);
    return vehicles;
};

const updateUserPaymentMethods = async (userId: string, methods: PaymentMethod[]): Promise<PaymentMethod[]> => {
    const updatedMethods = await updatePaymentMethods(userId, methods);
    setCachedData(CACHE_KEYS.paymentMethods(userId), updatedMethods);
    return updatedMethods;
};

const getIconFromName = (iconName: string | undefined): React.ElementType => {
    switch (iconName) {
        case 'Sparkles': return SparklesIcon;
        case 'Award': return Award;
        case 'Users': return Users;
        case 'Trophy': return Trophy;
        case 'Star': return Star;
        case 'Flag': return Flag;
        case 'CheckCircle': return CheckCircle;
        case 'Gift': return Gift;
        default: return SparklesIcon;
    }
};

const getBookmarkIcon = (label: string): React.ElementType => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home')) return HomeIcon;
    if (lowerLabel.includes('work') || lowerLabel.includes('office')) return Briefcase;
    if (lowerLabel.includes('school')) return SchoolIcon;
    if (lowerLabel.includes('college') || lowerLabel.includes('university')) return GraduationCap;
    return BookMarked;
};

const getCurrencySymbol = (currencyCode: string): string => {
    switch (currencyCode.toUpperCase()) {
        case 'ZMW': return 'K';
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'ZAR': return 'R';
        default: return currencyCode;
    }
};

// Ensure these are defined at the module scope
const WHATSAPP_NUMBER_1 = "+260955202036";
const WHATSAPP_NUMBER_2 = "+260968551110";
const WHATSAPP_CHAT_LINK_1 = `https://wa.me/${WHATSAPP_NUMBER_1.replace(/\D/g, '')}`;
const FACEBOOK_LINK = process.env.NEXT_PUBLIC_FACEBOOK_LINK || "https://web.facebook.com/Carpso2020";
const TWITTER_LINK = process.env.NEXT_PUBLIC_TWITTER_LINK || "https://x.com/CarpsoApp";
const WEBSITE_LINK = process.env.NEXT_PUBLIC_WEBSITE_LINK || "https://carpso.app";
const INSTAGRAM_LINK = process.env.NEXT_PUBLIC_INSTAGRAM_LINK;
const TIKTOK_LINK = process.env.NEXT_PUBLIC_TIKTOK_LINK;

export default function ProfilePage() {
    const { isAuthenticated, userId, userName, userAvatarUrl, userRole, updateUserProfile: updateGlobalProfile, logout, isOnline } = useContext(AppStateContext)!;
    const router = useRouter();
    const { toast } = useToast();

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const [billingInfo, setBillingInfo] = useState<Omit<BillingInfo, 'accountBalance'> | null>(null);
    const [parkingHistory, setParkingHistory] = useState<ParkingRecord[] | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [gamification, setGamification] = useState<UserGamification | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
    const [pointsTransactions, setPointsTransactions] = useState<PointsTransaction[]>([]);
    const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);
    const [referralHistory, setReferralHistory] = useState<Referral[]>([]);
    const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
    const [displayCurrency, setDisplayCurrency] = useState<string>('ZMW');

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingWallet, setIsLoadingWallet] = useState(true);
    const [isLoadingGamification, setIsLoadingGamification] = useState(true);
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
    const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);
    const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
    const [isLoadingReferrals, setIsLoadingReferrals] = useState(true);
    const [isLoadingRates, setIsLoadingRates] = useState(true);
    const [errorLoading, setErrorLoading] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportingReservation, setReportingReservation] = useState<ParkingRecord | null>(null);
    const [isUpdatingCarpool, setIsUpdatingCarpool] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editVehicles, setEditVehicles] = useState<Vehicle[]>([]);
    const [editNotificationPrefs, setEditNotificationPrefs] = useState({ promotions: false, updates: false });
    const [editPreferredPaymentMethod, setEditPreferredPaymentMethod] = useState<string | undefined>(undefined);

    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [isSendMoneyModalOpen, setIsSendMoneyModalOpen] = useState(false);
    const [isPayForOtherModalOpen, setIsPayForOtherModalOpen] = useState(false);
    const [isTransferPointsModalOpen, setIsTransferPointsModalOpen] = useState(false);
    const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
    const [isRedeemPointsModalOpen, setIsRedeemPointsModalOpen] = useState(false);
    const [pointsToRedeem, setPointsToRedeem] = useState<number | ''>('');
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [currentBookmark, setCurrentBookmark] = useState<Partial<UserBookmark> | null>(null);
    const [isSavingBookmark, setIsSavingBookmark] = useState(false);
    const [isDeletingBookmark, setIsDeletingBookmark] = useState(false);

     useEffect(() => {
         if (typeof window !== 'undefined' && !isAuthenticated) {
              toast({ title: "Access Denied", description: "Please sign in to view your profile.", variant: "destructive" });
             router.push('/');
         }
     }, [isAuthenticated, router, toast]);

    const loadProfileData = useCallback(async (forceRefresh = false) => {
        if (!userId) return;

        setIsLoading(true);
        setIsLoadingWallet(true);
        setIsLoadingGamification(true);
        setIsLoadingVehicles(true);
        setIsLoadingPaymentMethods(true);
        setIsLoadingBookmarks(true);
        setIsLoadingReferrals(true);
        setIsLoadingRates(true);
        setErrorLoading(null);

        const loadFromCache = <T>(keyFunc: (userId: string) => string, setter: (data: T) => void): boolean => {
            const cached = getCachedData<T>(keyFunc(userId));
            if (cached) setter(cached);
            return !!cached;
        };

        const hasCachedDetails = loadFromCache(CACHE_KEYS.userDetails, setUserDetails);
        const hasCachedBilling = loadFromCache(CACHE_KEYS.billingInfo, (data) => setBillingInfo(data as Omit<BillingInfo, 'accountBalance'>));
        const hasCachedHistory = loadFromCache(CACHE_KEYS.parkingHistory, setParkingHistory);
        const hasCachedVehicles = loadFromCache(CACHE_KEYS.vehicles, setVehicles);
        const hasCachedPaymentMethods = loadFromCache(CACHE_KEYS.paymentMethods, setPaymentMethods);
        const hasCachedGamification = loadFromCache(CACHE_KEYS.gamification, setGamification);
        const hasCachedPointsTxns = loadFromCache(CACHE_KEYS.pointsTxns, setPointsTransactions);
        const hasCachedReferrals = loadFromCache(CACHE_KEYS.referralHistory, setReferralHistory);
        const hasCachedWallet = loadFromCache(CACHE_KEYS.wallet, setWallet);
        const hasCachedTxns = loadFromCache(CACHE_KEYS.walletTxns, setWalletTransactions);
        const hasCachedBookmarks = loadFromCache(CACHE_KEYS.bookmarks, setBookmarks);
        const cachedRatesData = getCachedData<Record<string, number>>(CACHE_KEYS.exchangeRates);
        if (cachedRatesData) setExchangeRates(cachedRatesData);
        const hasCachedRates = !!cachedRatesData;


        const initialDetails = getCachedData<UserDetails>(CACHE_KEYS.userDetails(userId)) || { name: userName || '', avatarUrl: userAvatarUrl || '', memberSince: '', role: userRole || 'User', phone: '', email: '', notificationPreferences: { promotions: false, updates: false }, preferredPaymentMethod: undefined };
        setEditName(initialDetails?.name || '');
        setEditAvatarUrl(initialDetails?.avatarUrl || '');
        setEditPhone(initialDetails?.phone || '');
        setEditEmail(initialDetails?.email || '');
        setEditVehicles(getCachedData<Vehicle[]>(CACHE_KEYS.vehicles(userId)) || []);
        setEditNotificationPrefs(initialDetails?.notificationPreferences || { promotions: false, updates: false });
        setEditPreferredPaymentMethod(initialDetails?.preferredPaymentMethod);

        const needsFullRefresh = forceRefresh || !hasCachedDetails || !hasCachedBilling || !hasCachedHistory || !hasCachedVehicles || !hasCachedPaymentMethods || !hasCachedGamification || !hasCachedPointsTxns || !hasCachedReferrals || !hasCachedWallet || !hasCachedTxns || !hasCachedBookmarks || !hasCachedRates;

        if (!isOnline && !needsFullRefresh) {
            console.log("Offline: Using cached profile data.");
            setIsLoading(false); setIsLoadingWallet(false); setIsLoadingGamification(false); setIsLoadingVehicles(false); setIsLoadingPaymentMethods(false); setIsLoadingBookmarks(false); setIsLoadingReferrals(false); setIsLoadingRates(false);
            const ts = localStorage.getItem(CACHE_KEYS.userDetails(userId) + CACHE_KEYS.timestampSuffix);
            setLastUpdated(ts ? parseInt(ts) : null);
            return;
        }

        if (!isOnline && needsFullRefresh) {
            console.warn("Offline: Missing some cached profile data.");
            setErrorLoading("Offline: Some profile data is unavailable.");
            setIsLoading(false);
            if (!hasCachedWallet) setIsLoadingWallet(false);
            if (!hasCachedGamification) setIsLoadingGamification(false);
            if (!hasCachedVehicles) setIsLoadingVehicles(false);
            if (!hasCachedPaymentMethods) setIsLoadingPaymentMethods(false);
            if (!hasCachedBookmarks) setIsLoadingBookmarks(false);
            if (!hasCachedReferrals) setIsLoadingReferrals(false);
            if (!hasCachedRates) setIsLoadingRates(false);
             const ts = localStorage.getItem(CACHE_KEYS.userDetails(userId) + CACHE_KEYS.timestampSuffix);
             setLastUpdated(ts ? parseInt(ts) : null);
            return;
        }

        console.log("Online: Fetching fresh profile data...");
        try {
            const roleToUse = userRole || 'User';
            const dailyLoginResult = await checkAndAwardDailyLoginPoints(userId);
            if (dailyLoginResult !== null) {
                 toast({ title: "Daily Login Bonus!", description: `+5 points added. Keep it up!`, duration: 3000 });
            }

            const [details, billing, history, vehiclesData, paymentMethodsData, gamificationData, pointsTxnsData, referralsData, walletData, transactionsData, bookmarksData, ratesData] = await Promise.all([
                fetchUserDetails(userId, userName, userAvatarUrl, roleToUse),
                fetchBillingInfo(userId, roleToUse),
                fetchParkingHistory(userId),
                fetchVehicles(userId),
                fetchPaymentMethods(userId),
                fetchUserGamification(userId),
                fetchPointsTransactions(userId, 5),
                fetchReferralHistory(userId),
                fetchUserWallet(userId),
                fetchUserWalletTransactions(userId, 5),
                fetchUserBookmarks(userId),
                fetchExchangeRates(),
            ]);
            setUserDetails(details);
            setBillingInfo(billing);
            setParkingHistory(history);
            setVehicles(vehiclesData);
            setPaymentMethods(paymentMethodsData);
            setGamification(gamificationData);
            setPointsTransactions(pointsTxnsData);
            setReferralHistory(referralsData);
            setWallet(walletData);
            setWalletTransactions(transactionsData);
            setBookmarks(bookmarksData);
            setExchangeRates(ratesData);
            setLastUpdated(Date.now());

            setEditName(details.name || userName || '');
            setEditAvatarUrl(details.avatarUrl || userAvatarUrl || '');
            setEditPhone(details.phone || '');
            setEditEmail(details.email || '');
            setEditVehicles(vehiclesData);
            setEditNotificationPrefs(details.notificationPreferences || { promotions: false, updates: false });
            setEditPreferredPaymentMethod(details.preferredPaymentMethod);

        } catch (error: any) {
            console.error("Failed to load user profile data:", error.message);
            setErrorLoading("Could not fetch profile data. Displaying cached data if available.");
            if (!hasCachedDetails) setUserDetails(null);
            if (!hasCachedBilling) setBillingInfo(null);
            if (!hasCachedHistory) setParkingHistory(null);
            if (!hasCachedVehicles) setVehicles([]);
            if (!hasCachedPaymentMethods) setPaymentMethods([]);
            if (!hasCachedGamification) setGamification(null);
            if (!hasCachedPointsTxns) setPointsTransactions([]);
            if (!hasCachedReferrals) setReferralHistory([]);
            if (!hasCachedWallet) setWallet(null);
            if (!hasCachedTxns) setWalletTransactions([]);
            if (!hasCachedBookmarks) setBookmarks([]);
            if (!hasCachedRates) setExchangeRates(null);
        } finally {
            setIsLoading(false); setIsLoadingWallet(false); setIsLoadingGamification(false); setIsLoadingVehicles(false); setIsLoadingPaymentMethods(false); setIsLoadingBookmarks(false); setIsLoadingReferrals(false); setIsLoadingRates(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, userRole, isOnline, toast]); // Removed userName & userAvatarUrl

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
            toast({ title: "Wallet Refreshed", description: `Balance: ${getCurrencySymbol(walletData.currency)} ${walletData.balance.toFixed(2)}`});
        } catch (error: any) {
             console.error("Failed to refresh wallet data:", error.message);
             toast({ title: "Wallet Update Error", description: "Could not refresh wallet balance/transactions.", variant: "destructive" });
        } finally {
             setIsLoadingWallet(false);
        }
    }, [userId, toast, isOnline]);

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
                fetchReferralHistory(userId),
            ]);
            setGamification(gamificationData);
            setPointsTransactions(pointsTxnsData);
            setReferralHistory(referralsData);
            setLastUpdated(Date.now());
             toast({ title: "Rewards & Referrals Refreshed", description: `Points: ${gamificationData.points}`});
        } catch (error: any) {
            console.error("Failed to refresh gamification/referral data:", error.message);
            toast({ title: "Rewards Update Error", description: "Could not refresh points/referral data.", variant: "destructive" });
        } finally {
            setIsLoadingGamification(false);
        }
    }, [userId, toast, isOnline]);

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
        } catch (error: any) {
             console.error("Failed to refresh bookmarks:", error.message);
             toast({ title: "Bookmarks Update Error", description: "Could not refresh saved locations.", variant: "destructive" });
        } finally {
             setIsLoadingBookmarks(false);
        }
    }, [userId, toast, isOnline]);

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
        } catch (error: any) {
             console.error("Failed to refresh exchange rates:", error.message);
             toast({ title: "Rates Update Error", description: "Could not refresh currency rates.", variant: "destructive" });
        } finally {
             setIsLoadingRates(false);
        }
    }, [isOnline, toast]);

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
        } catch (error: any) {
             console.error("Failed to refresh payment methods:", error.message);
             toast({ title: "Payment Methods Update Error", description: "Could not refresh payment methods.", variant: "destructive" });
        } finally {
             setIsLoadingPaymentMethods(false);
        }
    }, [userId, toast, isOnline]);

    useEffect(() => {
        if (isAuthenticated) {
            loadProfileData();
        } else {
            setIsLoading(false); setIsLoadingWallet(false); setIsLoadingGamification(false); setIsLoadingVehicles(false); setIsLoadingPaymentMethods(false); setIsLoadingBookmarks(false); setIsLoadingReferrals(false); setIsLoadingRates(false);
            setUserDetails(null); setBillingInfo(null); setParkingHistory(null); setVehicles([]); setPaymentMethods([]); setGamification(null); setPointsTransactions([]); setReferralHistory([]); setWallet(null); setWalletTransactions([]); setBookmarks([]); setExchangeRates(null); setLastUpdated(null);
        }
    }, [isAuthenticated, loadProfileData]);

    useEffect(() => {
         if (isOnline && isAuthenticated && !isLoading) {
            console.log("Back online, refreshing profile data...");
            loadProfileData(true);
         }
    }, [isOnline, isAuthenticated, isLoading, loadProfileData]);

    const handleOpenReportModal = (reservation: ParkingRecord) => {
        if (!isAuthenticated) {
            toast({ title: "Sign In Required", description: "Please sign in to report an issue.", variant: "destructive"});
            return;
        }
        setReportingReservation(reservation);
        setIsReportModalOpen(true);
    };

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
         downloadCSV(billingData, `carpso-plan-summary-${userId}.csv`);
         downloadCSV(paymentMethodsData, `carpso-payment-methods-${userId}.csv`);
     };

     const handleDownloadHistory = () => {
         const parkingData = parkingHistory?.map(h => ({
             recordId: h.recordId, locationName: h.lotName, spotId: h.spotId, startTime: h.startTime, endTime: h.endTime || 'N/A', durationMinutes: h.durationMinutes || 'N/A', cost: h.cost, currency: 'ZMW', status: h.status, paymentMethod: h.paymentMethod || 'N/A', appliedPricingRule: h.appliedPricingRule || 'N/A',
         })) || [];
         const walletData = walletTransactions.map(t => ({
             transactionId: t.id, type: t.type, amount: t.amount, currency: wallet?.currency || 'ZMW', description: t.description, timestamp: t.timestamp, relatedUserId: t.relatedUserId || 'N/A', partnerId: t.partnerId || 'N/A',
         }));
         const pointsData = pointsTransactions.map(t => ({
             transactionId: t.id, type: t.type, points: t.points, description: t.description, senderId: t.senderId, recipientId: t.recipientId, timestamp: t.timestamp,
         }));
         const referralsData = referralHistory.map(r => ({
              referringUserId: r.referringUserId, referredUserId: r.referredUserId, referredUserName: r.referredUserName || 'N/A', signupTimestamp: r.signupTimestamp, bonusAwarded: r.bonusAwarded,
         }));

         downloadCSV(parkingData, `carpso-parking-history-${userId}.csv`);
         downloadCSV(walletData, `carpso-wallet-history-${userId}.csv`);
         downloadCSV(pointsData, `carpso-points-history-${userId}.csv`);
         downloadCSV(referralsData, `carpso-referral-history-${userId}.csv`);
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
        } catch (error: any) {
            console.error("Failed to generate or download CSV:", error.message);
            toast({ title: "Download Failed", description: "Could not generate the spreadsheet.", variant: "destructive" });
        }
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
                const updatedGamification = await getUserGamification(userId);
                setGamification(updatedGamification);
                toast({ title: "Carpool Status Updated", description: checked ? "Eligible for carpooling benefits!" : "Carpooling benefits disabled." });
            } else { throw new Error("Failed to update carpool status."); }
        } catch (error: any) {
            console.error("Failed to update carpool status:", error.message);
            toast({ title: "Update Failed", variant: "destructive" });
        } finally { setIsUpdatingCarpool(false); }
    };

    const handleSaveProfile = async () => {
        if (!isOnline) {
             toast({ title: "Offline", description: "Cannot save profile changes while offline.", variant: "destructive" });
             return;
        }
        if (!editName || !userId) {
            toast({ title: "Missing Information", description: "Name cannot be empty.", variant: "destructive" });
            return;
        }
        const primaryVehicles = editVehicles.filter(v => v.isPrimary).length;
         if (primaryVehicles !== 1 && editVehicles.length > 0) {
             toast({ title: "Vehicle Error", description: "Please select exactly one primary vehicle.", variant: "destructive" });
             return;
         }

        setIsSavingProfile(true);
        try {
            const updatedDetailsPromise = updateUserDetails(userId, {
                name: editName, avatarUrl: editAvatarUrl, phone: editPhone, email: editEmail, notificationPreferences: editNotificationPrefs, preferredPaymentMethod: editPreferredPaymentMethod,
            });
             const updatedVehiclesPromise = updateUserVehicles(userId, editVehicles);
             const [updatedDetails, updatedVehiclesResult] = await Promise.all([ updatedDetailsPromise, updatedVehiclesPromise ]);

            updateGlobalProfile(editName, editAvatarUrl);
            setUserDetails(updatedDetails);
            setVehicles(updatedVehiclesResult);
            setLastUpdated(Date.now());

            toast({ title: "Profile Updated" });
            setEditMode(false);
        } catch (error: any) {
            console.error("Failed to save profile:", error.message);
            toast({ title: "Save Failed", variant: "destructive" });
        } finally {
            setIsSavingProfile(false);
        }
    };

     const handleCancelEdit = () => {
        const currentDetails = getCachedData<UserDetails>(CACHE_KEYS.userDetails(userId!)) || userDetails; // Added non-null assertion for userId
        const currentVehicles = getCachedData<Vehicle[]>(CACHE_KEYS.vehicles(userId!)) || vehicles; // Added non-null assertion for userId

        setEditName(currentDetails?.name || userName || '');
        setEditAvatarUrl(currentDetails?.avatarUrl || userAvatarUrl || '');
        setEditPhone(currentDetails?.phone || '');
        setEditEmail(currentDetails?.email || '');
        setEditVehicles(currentVehicles);
        setEditNotificationPrefs(currentDetails?.notificationPreferences || { promotions: false, updates: false });
        setEditPreferredPaymentMethod(currentDetails?.preferredPaymentMethod);
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

    const handleOpenBookmarkModal = (bookmark: UserBookmark | null = null) => {
        if (bookmark) {
            setCurrentBookmark(bookmark);
        } else {
            setCurrentBookmark({ userId: userId || '', label: '' });
        }
        setIsBookmarkModalOpen(true);
    };

    const handleBookmarkFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
         if (name === 'latitude' || name === 'longitude') {
             const isValidNumber = /^-?\d*\.?\d*$/.test(value);
             if (isValidNumber || value === '') {
                 setCurrentBookmark(prev => ({ ...prev, [name]: value }));
             }
             return;
         }
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
        setIsSavingBookmark(true);
        try {
            if (currentBookmark.id && currentBookmark.id !== '') {
                 const updated = await updateBookmark(currentBookmark.id, {
                     label: currentBookmark.label, address: currentBookmark.address, latitude: currentBookmark.latitude ? Number(currentBookmark.latitude) : undefined, longitude: currentBookmark.longitude ? Number(currentBookmark.longitude) : undefined,
                 });
                 if (updated) {
                     await refreshBookmarks();
                     toast({ title: "Bookmark Updated" });
                     setIsBookmarkModalOpen(false);
                 } else { throw new Error("Failed to update bookmark."); }
            } else {
                 const created = await addBookmark(userId, {
                     label: currentBookmark.label, address: currentBookmark.address, latitude: currentBookmark.latitude ? Number(currentBookmark.latitude) : undefined, longitude: currentBookmark.longitude ? Number(currentBookmark.longitude) : undefined,
                 });
                 if (created) {
                     await refreshBookmarks();
                     toast({ title: "Bookmark Added" });
                     setIsBookmarkModalOpen(false);
                 } else { throw new Error("Failed to add bookmark."); }
            }
        } catch (error: any) {
            console.error("Failed to save bookmark:", error.message);
            toast({ title: "Save Failed", description: error.message || "Could not save the bookmark.", variant: "destructive" });
        } finally {
            setIsSavingBookmark(false);
        }
    };

    const handleDeleteBookmark = async (bookmarkId: string) => {
         if (!isOnline) {
             toast({ title: "Offline", description: "Cannot delete bookmark while offline.", variant: "destructive" });
             return;
         }
         setIsDeletingBookmark(true);
         try {
             const success = await deleteBookmark(bookmarkId);
             if (success) {
                 await refreshBookmarks();
                 toast({ title: "Bookmark Deleted" });
             } else { throw new Error("Failed to delete bookmark."); }
         } catch (error: any) {
              console.error("Failed to delete bookmark:", error.message);
              toast({ title: "Delete Failed", description: error.message || "Could not delete the bookmark.", variant: "destructive" });
         } finally {
              setIsDeletingBookmark(false);
         }
    };

    const handleBookmarkModalClose = (open: boolean) => {
        if (!open) {
             setIsBookmarkModalOpen(false);
             setTimeout(() => setCurrentBookmark(null), 300);
        } else {
             setIsBookmarkModalOpen(true);
        }
    };

     const handleOpenPaymentMethodModal = () => {
        if (!isOnline) {
            toast({ title: "Offline", description: "Cannot manage payment methods offline.", variant: "destructive" });
            return;
        }
        setIsPaymentMethodModalOpen(true);
     };

     const handleSavePaymentMethods = async (updatedMethodsFromModal: PaymentMethod[], newPreferredId: string | undefined) => {
         if (!userId || !isOnline) return;
         setIsSavingProfile(true);
         try {
             const persistedMethods = await updateUserPaymentMethods(userId, updatedMethodsFromModal);
             const newPersistedPreferred = persistedMethods.find(pm => pm.isPrimary)?.id;
             if (userDetails?.preferredPaymentMethod !== newPersistedPreferred) {
                await updateUserDetails(userId, { preferredPaymentMethod: newPersistedPreferred });
             }
             setPaymentMethods(persistedMethods);
             setUserDetails(prev => ({...prev!, preferredPaymentMethod: newPersistedPreferred }));
             setEditPreferredPaymentMethod(newPersistedPreferred);
             setLastUpdated(Date.now());
             toast({ title: "Payment Methods Updated" });
             setIsPaymentMethodModalOpen(false);
         } catch (error: any) {
             console.error("Failed to save payment methods:", error.message);
             toast({ title: "Save Failed", variant: "destructive" });
         } finally {
             setIsSavingProfile(false);
         }
     };

     const handleOpenChat = () => {
         if (typeof window !== 'undefined' && (window as any).Tawk_API && (window as any).Tawk_API.maximize) {
            (window as any).Tawk_API.maximize();
         } else if (typeof window !== 'undefined' && (window as any).Tawk_API) {
              (window as any).Tawk_API.showWidget?.();
              (window as any).Tawk_API.openChat?.();
              toast({ title: "Opening Chat...", description: "Attempting to open the chat widget.", variant: "default" });
         }
         else {
             toast({ title: "Chat Unavailable", description: "Live chat support is currently unavailable. Please try again later or use WhatsApp.", variant: "default" });
         }
     };

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
                   setPromoCodeInput('');
                    if (result.pointsAwarded) {
                        await refreshGamificationData();
                    }
               } else {
                   toast({ title: "Invalid Code", description: result.message, variant: "destructive" });
               }
           } catch (error: any) {
               console.error("Error applying promo code:", error.message);
               toast({ title: "Error", description: "Could not apply promo code.", variant: "destructive" });
           } finally {
               setIsApplyingPromo(false);
           }
      };

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

            setIsSavingProfile(true);
            try {
                 const redemptionResult = await redeemPoints(userId, pointsToRedeem);
                 if (redemptionResult) {
                     const { redeemedAmount } = redemptionResult;
                     toast({
                         title: "Points Redeemed!",
                         description: `${pointsToRedeem} points redeemed for K ${redeemedAmount.toFixed(2)} wallet credit.`,
                     });
                     await refreshGamificationData();
                     await refreshWalletData();
                     setIsRedeemPointsModalOpen(false);
                     setPointsToRedeem('');
                 } else {
                     throw new Error("Points redemption failed.");
                 }
            } catch (error: any) {
                 console.error("Error redeeming points:", error.message);
                 toast({ title: "Redemption Failed", description: error.message, variant: "destructive" });
            } finally {
                 setIsSavingProfile(false);
            }
      };

    const handleLogout = () => {
        logout();
        toast({ title: "Logged Out"});
        router.push('/');
    };

    const getTransactionIcon = (type: WalletTransaction['type']) => {
        switch(type) {
            case 'top-up': return <PlusCircle className="h-4 w-4 text-green-600" />;
            case 'send': return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
            case 'receive': return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
            case 'payment': return <DollarSign className="h-4 w-4 text-red-600" />;
            case 'payment_other': return <Users className="h-4 w-4 text-purple-600" />;
            case 'points_redemption': return <Coins className="h-4 w-4 text-yellow-500" />;
            default: return <WalletIcon className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getPointsTransactionIcon = (type: PointsTransaction['type']) => {
        switch(type) {
            case 'sent': return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
            case 'received': return <ArrowDownLeft className="h-4 w-4 text-blue-600" />;
            case 'earned': return <PlusCircle className="h-4 w-4 text-green-600" />;
            case 'redeemed': return <DollarSign className="h-4 w-4 text-red-600" />;
            default: return <Sparkles className="h-4 w-4 text-yellow-500" />;
        }
    };

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
    const preferredMethod = paymentMethods.find(pm => pm.id === userDetails?.preferredPaymentMethod);
    const receivePaymentQrValue = userId ? `carpso_pay:${userId}` : 'carpso_pay:unknown_user';
    const currentPointsValue = gamification?.points ?? 0;
    const pointsKwachaValue = (currentPointsValue * POINTS_TO_KWACHA_RATE).toFixed(2);

    if (isLoading && !userDetails) {
        return (
            <div className="container py-8 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
                <ProfileSkeleton />
            </div>
        );
    }

    if (errorLoading && !userDetails && !paymentMethods.length && !parkingHistory) {
         return (
             <div className="container py-8 px-4 md:px-6 lg:px-8 text-center">
                 <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-4" />
                 <p className="text-destructive">{errorLoading}</p>
                 {isOnline && <Button onClick={() => loadProfileData(true)} className="mt-4">Retry</Button>}
                  {!isOnline && <p className="text-sm text-muted-foreground mt-2">Connect to the internet and try again.</p>}
             </div>
         );
    }

    if (!isAuthenticated || !userId) {
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
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                             <div>
                                 <CardTitle className="text-2xl">My Profile</CardTitle>
                                 <CardDescription>View and manage your account details, wallet, vehicles, and history.</CardDescription>
                             </div>
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
                         <div className="text-xs text-muted-foreground pt-2">
                            {!isOnline ? (
                                <span className="flex items-center gap-1 text-destructive"><WifiOff className="h-3 w-3" /> Offline - Displaying cached data {lastUpdated ? `(updated ${new Date(lastUpdated).toLocaleTimeString()})` : ''}.</span>
                            ) : isLoading ? (
                                 <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Syncing...</span>
                            ) : lastUpdated ? (
                                <span>Last Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
                            ) : (
                                <span>Updating...</span>
                            )}
                         </div>
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
                         <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
                           {isLoading && !userDetails ? <Skeleton className="h-32 w-32 rounded-full flex-shrink-0"/> : (
                               <div className="relative flex-shrink-0">
                                 <Avatar className="h-24 w-24 md:h-32 md:w-32 border">
                                    <AvatarImage
                                        src={editMode ? editAvatarUrl : displayAvatar}
                                        alt={editMode ? editName : displayName}
                                        data-ai-hint="user profile picture"
                                     />
                                    <AvatarFallback className="text-4xl">{userInitial}</AvatarFallback>
                                </Avatar>
                                 {editMode && (
                                      <Input id="profile-avatar" type="text" value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} placeholder="Avatar URL..." disabled={isSavingProfile || !isOnline} className="mt-2 text-xs" />
                                 )}
                               </div>
                            )}
                             <div className="space-y-2 flex-grow">
                               {isLoading && !userDetails ? <><Skeleton className="h-8 w-3/4"/><Skeleton className="h-5 w-1/2"/><Skeleton className="h-4 w-1/3"/></> : (
                                 <>
                                  {editMode ? (
                                      <>
                                          <div className="space-y-1"> <Label htmlFor="profile-name">Name*</Label><Input id="profile-name" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isSavingProfile || !isOnline} required /></div>
                                          <div className="space-y-1"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="you@example.com" disabled={isSavingProfile || !isOnline} /></div>
                                          <div className="space-y-1"><Label htmlFor="profile-phone">Phone</Label><Input id="profile-phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+260 ..." disabled={isSavingProfile || !isOnline} /></div>
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

                        <section className="mb-6">
                             <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><WalletIcon className="h-5 w-5 text-primary" /> Wallet</h3>
                                <div className="flex items-center gap-2">
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
                                         {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />} Refresh
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
                                                    {formatAmount(wallet?.balance ?? 0)}
                                                </p>
                                                {wallet?.currency && displayCurrency !== wallet.currency && (
                                                    <p className="text-xs opacity-70 mt-1">
                                                        (Base: {getCurrencySymbol(wallet.currency)} {(wallet?.balance ?? 0).toFixed(2)})
                                                    </p>
                                                )}
                                             </div>
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
                                                          {typeof window !== 'undefined' ? (
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
                                         <div className="mt-4 flex flex-wrap gap-2">
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

                         <section className="mb-6">
                             <div className="flex justify-between items-center mb-3">
                                 <h3 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Billing & Plan</h3>
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

                        <section className="mb-6">
                           <div className="flex justify-between items-center mb-3">
                               <h3 className="text-lg font-semibold flex items-center gap-2"><CarTaxiFront className="h-5 w-5" /> My Vehicles</h3>
                               {editMode && (
                                   <Button variant="outline" size="sm" onClick={handleAddVehicle} disabled={isSavingProfile || !isOnline}>
                                       <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
                                   </Button>
                               )}
                           </div>
                            {isLoadingVehicles && !vehicles?.length ? (
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

                         <section className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><BookMarked className="h-5 w-5" /> Saved Locations</h3>
                                <Button variant="outline" size="sm" onClick={() => handleOpenBookmarkModal()} disabled={isLoadingBookmarks || !isOnline}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Location
                                </Button>
                            </div>
                             {isLoadingBookmarks && !bookmarks?.length ? (
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

                        <section className="mb-6">
                             <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-600" /> Rewards & Referrals</h3>
                                <Button variant="outline" size="sm" onClick={refreshGamificationData} disabled={isLoadingGamification || !isOnline}>
                                    {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoadingGamification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />} Refresh
                                </Button>
                             </div>
                             {isLoadingGamification && !gamification ? <Skeleton className="h-64 w-full"/> : (
                                <>
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
                                    <Button
                                        variant="outline" size="sm" className="w-full mb-4"
                                        onClick={() => setIsTransferPointsModalOpen(true)}
                                        disabled={!isOnline || (gamification?.points ?? 0) <= 0}
                                    >
                                        <Gift className="mr-2 h-4 w-4" /> Transfer Points to Friend
                                    </Button>

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

                         <section>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><List className="h-5 w-5" /> Parking History</h3>
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

                         <section className="mb-6">
                             <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Contact className="h-5 w-5" /> Support & Socials</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <Button variant="outline" onClick={handleOpenChat} className="w-full justify-start text-left h-auto py-3">
                                       <MessageSquare className="mr-3 h-5 w-5 text-blue-600" />
                                       <div>
                                           <p className="font-medium">Live Chat</p>
                                           <p className="text-xs text-muted-foreground">Get help via Tawk.to.</p>
                                       </div>
                                   </Button>
                                   <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                       <a href={WHATSAPP_CHAT_LINK_1} target="_blank" rel="noopener noreferrer">
                                          <MessageSquare className="mr-3 h-5 w-5 text-green-600" />
                                          <div>
                                             <p className="font-medium">WhatsApp Chat</p>
                                             <p className="text-xs text-muted-foreground">Via WhatsApp ({WHATSAPP_NUMBER_1}).</p>
                                          </div>
                                          <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                       </a>
                                   </Button>
                                   <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                       <a href={`tel:${WHATSAPP_NUMBER_2}`}>
                                          <Smartphone className="mr-3 h-5 w-5" />
                                          <div>
                                             <p className="font-medium">Call Support</p>
                                             <p className="text-xs text-muted-foreground">({WHATSAPP_NUMBER_2}).</p>
                                          </div>
                                          <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                       </a>
                                   </Button>
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
                                    <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                        <a href={FACEBOOK_LINK} target="_blank" rel="noopener noreferrer">
                                           <Facebook className="mr-3 h-5 w-5 text-blue-700" />
                                           <div>
                                               <p className="font-medium">Facebook</p>
                                               <p className="text-xs text-muted-foreground">Connect with us on Facebook.</p>
                                           </div>
                                           <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                        </a>
                                    </Button>
                                    <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                        <a href={TWITTER_LINK} target="_blank" rel="noopener noreferrer">
                                           <Twitter className="mr-3 h-5 w-5 text-sky-500" />
                                           <div>
                                               <p className="font-medium">Twitter / X</p>
                                               <p className="text-xs text-muted-foreground">Follow us on X.</p>
                                           </div>
                                           <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                        </a>
                                    </Button>
                                    {INSTAGRAM_LINK && (
                                        <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                            <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer">
                                                <Instagram className="mr-3 h-5 w-5 text-pink-600" />
                                                <div>
                                                    <p className="font-medium">Instagram</p>
                                                    <p className="text-xs text-muted-foreground">Follow us on Instagram.</p>
                                                </div>
                                                <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                            </a>
                                        </Button>
                                    )}
                                    {TIKTOK_LINK && (
                                        <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3">
                                            <a href={TIKTOK_LINK} target="_blank" rel="noopener noreferrer">
                                                 <TikTokIcon className="mr-3 h-5 w-5" />
                                                 <div>
                                                    <p className="font-medium">TikTok</p>
                                                    <p className="text-xs text-muted-foreground">Follow us on TikTok.</p>
                                                 </div>
                                                 <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                            </a>
                                        </Button>
                                    )}
                                     <Button variant="outline" asChild className="w-full justify-start text-left h-auto py-3 col-span-1 md:col-span-2">
                                         <a href={WEBSITE_LINK} target="_blank" rel="noopener noreferrer">
                                            <Globe className="mr-3 h-5 w-5 text-primary" />
                                            <div>
                                                <p className="font-medium">Official Website</p>
                                                <p className="text-xs text-muted-foreground">Visit carpso.app for more info.</p>
                                            </div>
                                            <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />
                                         </a>
                                     </Button>
                             </div>
                         </section>

                         <Separator className="my-6" />

                         <div className="flex justify-center mt-6">
                             <Button variant="destructive" onClick={handleLogout}>
                                Log Out
                             </Button>
                         </div>
                    </CardContent>
                </Card>
            </div>

            <ReportIssueModal
                isOpen={isReportModalOpen}
                onClose={() => {
                    setIsReportModalOpen(false);
                    setTimeout(() => setReportingReservation(null), 300);
                }}
                reservation={reportingReservation}
                userId={userId || ''}
            />
            <TopUpModal
                isOpen={isTopUpModalOpen}
                onClose={() => setIsTopUpModalOpen(false)}
                userId={userId || ''}
                currentBalance={wallet?.balance ?? 0}
                currency={wallet?.currency ?? 'ZMW'}
                onSuccess={refreshWalletData}
            />
            <SendMoneyModal
                isOpen={isSendMoneyModalOpen}
                onClose={() => setIsSendMoneyModalOpen(false)}
                userId={userId || ''}
                currentBalance={wallet?.balance ?? 0}
                currency={wallet?.currency ?? 'ZMW'}
                onSuccess={refreshWalletData}
            />
             <PayForOtherModal
                isOpen={isPayForOtherModalOpen}
                onClose={() => setIsPayForOtherModalOpen(false)}
                payerId={userId || ''}
                payerBalance={wallet?.balance ?? 0}
                currency={wallet?.currency ?? 'ZMW'}
                onSuccess={refreshWalletData}
            />
             <TransferPointsModal
                isOpen={isTransferPointsModalOpen}
                onClose={() => setIsTransferPointsModalOpen(false)}
                senderId={userId || ''}
                currentPoints={gamification?.points ?? 0}
                onSuccess={refreshGamificationData}
            />
              <PaymentMethodModal
                  isOpen={isPaymentMethodModalOpen}
                  onClose={() => setIsPaymentMethodModalOpen(false)}
                  userId={userId || ''}
                  currentMethods={paymentMethods}
                  preferredMethodId={editPreferredPaymentMethod}
                  onSave={handleSavePaymentMethods}
              />

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
         <div className="space-y-4">
            <Skeleton className="h-6 w-1/4 mb-3" />
            <Skeleton className="h-36 w-full mb-4 rounded-lg" />
            <Skeleton className="h-5 w-1/3 mb-2"/>
            <Skeleton className="h-10 w-full rounded-md"/>
            <Skeleton className="h-10 w-full rounded-md"/>
         </div>
        <Separator />
        <div className="space-y-4">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <Skeleton className="h-24 w-full mb-4 rounded-md"/>
             <Skeleton className="h-28 w-full mb-4 rounded-md"/>
             <Skeleton className="h-5 w-1/3 mb-2"/>
             <Skeleton className="h-12 w-full rounded-md"/>
             <Skeleton className="h-9 w-full mt-1 rounded-md"/>
        </div>
        <Separator />
         <div className="space-y-4">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <Skeleton className="h-20 w-full rounded-md"/>
         </div>
        <Separator />
         <div className="space-y-4">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <Skeleton className="h-16 w-full rounded-md"/>
         </div>
        <Separator />
        <div className="space-y-4">
            <Skeleton className="h-6 w-1/3 mb-3" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Skeleton className="h-20 w-full rounded-md" />
                 <Skeleton className="h-20 w-full rounded-md" />
             </div>
             <Skeleton className="h-9 w-full mt-2 rounded-md"/>
             <Skeleton className="h-24 w-full rounded-md" />
             <Skeleton className="h-20 w-full rounded-md" />
             <Skeleton className="h-5 w-1/4 mt-4" />
             <Skeleton className="h-10 w-full rounded-md"/>
            <Skeleton className="h-5 w-1/4 mt-4" />
            <div className="flex gap-2"> <Skeleton className="h-8 w-20 rounded-full"/> <Skeleton className="h-8 w-24 rounded-full"/></div>
             <Skeleton className="h-5 w-1/3 mt-4" />
             <Skeleton className="h-24 w-full rounded-md" />
        </div>
         <Separator />
         <div className="space-y-3">
             <Skeleton className="h-6 w-1/3 mb-3" />
             <Skeleton className="h-24 w-full rounded-md" />
         </div>
        <Separator />
        <div className="space-y-3">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
        </div>
        <Separator />
         <div className="space-y-3">
             <Skeleton className="h-6 w-1/4 mb-3" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Skeleton className="h-20 w-full rounded-md" />
                 <Skeleton className="h-20 w-full rounded-md" />
             </div>
         </div>
    </div>
);

