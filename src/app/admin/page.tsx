// src/app/admin/page.tsx
'use client'; // Required for state and effects

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, UserCog, LayoutDashboard, BarChart as BarChartIcon, Settings, MapPin, Loader2, Download, Sparkles, Fuel, SprayCan, Wifi, BadgeCent, PlusCircle, Trash2, Megaphone, Image as ImageIcon, Calendar, Bath, ConciergeBell, DollarSign, Clock, Users, Tag, FileSpreadsheet, PackageCheck, PackageX, History, CalendarClock, TrendingUp, UsersRound, Activity, MessageSquare, Link as LinkIcon, Award } from "lucide-react"; // Renamed BarChart to BarChartIcon to avoid conflict, Added FileSpreadsheet, PackageCheck, PackageX, History, CalendarClock, TrendingUp, UsersRound, Activity, MessageSquare, LinkIcon, Award
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot';
import { getAvailableParkingLots, updateParkingLotServices, updateLotSubscriptionStatus, startLotTrial } from '@/services/parking-lot'; // Added subscription functions
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Advertisement } from '@/services/advertisement';
import { getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement } from '@/services/advertisement';
import type { PricingRule, UserPass } from '@/services/pricing-service'; // Import UserPass
import { getAllPricingRules, savePricingRule, deletePricingRule, convertToCSV, getParkingRecords, getActiveUserPasses, getAvailablePassDefinitions, purchasePass } from '@/services/pricing-service'; // Import pricing services + CSV util + records service + pass functions
import Image from "next/image";
import { AppStateContext } from '@/context/AppStateProvider';
import { Input as ShadInput } from "@/components/ui/input";
import { MultiSelect } from '@/components/ui/multi-select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatePicker } from '@/components/ui/date-picker'; // Import DatePicker
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, LineChart, Line } from 'recharts'; // Import Recharts components, aliased BarChart and Tooltip/Legend
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'; // Import ShadCN chart components
import { getLinkedLoyaltyPrograms, linkLoyaltyProgram, unlinkLoyaltyProgram, LinkedLoyaltyProgram } from '@/services/loyalty-service'; // Import loyalty service

// Sample user data - replace with actual authentication and user management
const sampleUsers = [
  { id: 'usr_1', name: 'Alice Smith', email: 'alice@example.com', role: 'User', associatedLots: ['lot_A'] },
  { id: 'usr_2', name: 'Bob Johnson', email: 'bob@example.com', role: 'ParkingLotOwner', associatedLots: ['lot_B', 'lot_D'] }, // Owns B and D
  { id: 'usr_3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', associatedLots: ['lot_A', 'lot_C'] },
  { id: 'usr_4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', associatedLots: ['*'] }, // '*' means all lots
  { id: 'usr_5', name: 'Eve Adams', email: 'eve@example.com', role: 'ParkingLotOwner', associatedLots: ['lot_C'] }, // Owns C
];

// Enhanced Sample Analytics Data (Structure - will be filtered)
const sampleAnalyticsData: Record<string, {
    revenue: number;
    avgOccupancy: number;
    activeReservations: number;
    peakHours: { hour: string; occupancy: number }[]; // Added for chart
    dailyRevenue: { day: string; revenue: number }[]; // Added for chart
    userSignups?: { day: string; signups: number }[]; // Admin only
}> = {
    'lot_A': {
        revenue: 543.21, avgOccupancy: 80, activeReservations: 5,
        peakHours: [ { hour: '09:00', occupancy: 70 }, { hour: '12:00', occupancy: 85 }, { hour: '17:00', occupancy: 90 }, { hour: '20:00', occupancy: 50 } ],
        dailyRevenue: [ { day: 'Mon', revenue: 60 }, { day: 'Tue', revenue: 75 }, { day: 'Wed', revenue: 80 }, { day: 'Thu', revenue: 90 }, { day: 'Fri', revenue: 110 }, { day: 'Sat', revenue: 78 }, { day: 'Sun', revenue: 50 } ],
    },
    'lot_B': {
        revenue: 1234.56, avgOccupancy: 75, activeReservations: 15,
        peakHours: [ { hour: '07:00', occupancy: 60 }, { hour: '11:00', occupancy: 80 }, { hour: '16:00', occupancy: 85 }, { hour: '19:00', occupancy: 65 } ],
        dailyRevenue: [ { day: 'Mon', revenue: 150 }, { day: 'Tue', revenue: 160 }, { day: 'Wed', revenue: 175 }, { day: 'Thu', revenue: 180 }, { day: 'Fri', revenue: 200 }, { day: 'Sat', revenue: 190 }, { day: 'Sun', revenue: 179.56 } ],
    },
    'lot_C': {
        revenue: 987.65, avgOccupancy: 90, activeReservations: 10,
         peakHours: [ { hour: '10:00', occupancy: 80 }, { hour: '13:00', occupancy: 95 }, { hour: '18:00', occupancy: 98 }, { hour: '21:00', occupancy: 70 } ],
         dailyRevenue: [ { day: 'Mon', revenue: 100 }, { day: 'Tue', revenue: 110 }, { day: 'Wed', revenue: 120 }, { day: 'Thu', revenue: 130 }, { day: 'Fri', revenue: 150 }, { day: 'Sat', revenue: 197.65 }, { day: 'Sun', revenue: 180 } ],
    },
    'lot_D': {
        revenue: 321.98, avgOccupancy: 60, activeReservations: 3,
         peakHours: [ { hour: '08:00', occupancy: 50 }, { hour: '13:00', occupancy: 70 }, { hour: '16:00', occupancy: 65 }, { hour: '18:00', occupancy: 55 } ],
         dailyRevenue: [ { day: 'Mon', revenue: 40 }, { day: 'Tue', revenue: 45 }, { day: 'Wed', revenue: 50 }, { day: 'Thu', revenue: 55 }, { day: 'Fri', revenue: 60 }, { day: 'Sat', revenue: 41.98 }, { day: 'Sun', revenue: 30 } ],
    },
    'all': { // Aggregate - Simple sum for revenue/res, avg for occupancy (could be more complex)
        revenue: 3087.40, avgOccupancy: 76, activeReservations: 33,
         // Peak hours aggregation is complex, maybe show overall trend line
         peakHours: [ { hour: '09:00', occupancy: 65 }, { hour: '12:00', occupancy: 82 }, { hour: '17:00', occupancy: 85 }, { hour: '20:00', occupancy: 60 } ],
         // Sum daily revenues
         dailyRevenue: [
              { day: 'Mon', revenue: 350 }, { day: 'Tue', revenue: 390 }, { day: 'Wed', revenue: 425 }, { day: 'Thu', revenue: 455 }, { day: 'Fri', revenue: 520 }, { day: 'Sat', revenue: 507.63 }, { day: 'Sun', revenue: 439.56 }
         ],
         userSignups: [ { day: 'Mon', signups: 5 }, { day: 'Tue', signups: 8 }, { day: 'Wed', signups: 6 }, { day: 'Thu', signups: 10 }, { day: 'Fri', signups: 12 }, { day: 'Sat', signups: 7 }, { day: 'Sun', signups: 4 } ],
    },
};

// Recharts Config for Analytics
const chartConfigBase = {
  revenue: { label: "Revenue (ZMW)", color: "hsl(var(--chart-1))" },
  occupancy: { label: "Occupancy (%)", color: "hsl(var(--chart-2))" },
  signups: { label: "Signups", color: "hsl(var(--chart-3))" },
};

// Available services that can be added/managed
const allAvailableServices: ParkingLotService[] = ['EV Charging', 'Car Wash', 'Mobile Money Agent', 'Valet', 'Restroom', 'Wifi'];
const userTiers = ['Basic', 'Premium']; // Available subscription tiers
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const daysOfWeekOptions = daysOfWeek.map(day => ({ value: day, label: day }));
const userTierOptions = userTiers.map(tier => ({ value: tier, label: tier }));

// Initial state for the Ad form
const initialAdFormState: Partial<Advertisement> = {
    title: '', description: '', imageUrl: '', targetLocationId: '', startDate: '', endDate: '', associatedService: undefined, status: 'active',
};
// Initial state for the Pricing Rule form
const initialPricingRuleFormState: Partial<PricingRule> = {
    ruleId: '', lotId: '', description: '', baseRatePerHour: undefined, flatRate: undefined, flatRateDurationMinutes: undefined, discountPercentage: undefined, timeCondition: { daysOfWeek: [], startTime: '', endTime: '' }, eventCondition: '', userTierCondition: [], priority: 100,
};
// Initial state for Subscription Status editing
const initialSubscriptionFormState = {
    lotId: '', status: 'inactive' as ParkingLot['subscriptionStatus'], trialEndDate: undefined as Date | undefined,
};

export default function AdminDashboardPage() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('all');
  const [isLoadingLots, setIsLoadingLots] = useState(true);
  const [errorLoadingLots, setErrorLoadingLots] = useState<string | null>(null);
  const [isUpdatingServices, setIsUpdatingServices] = useState(false);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [errorLoadingAds, setErrorLoadingAds] = useState<string | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [currentAd, setCurrentAd] = useState<Partial<Advertisement>>(initialAdFormState);
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [isDeletingAd, setIsDeletingAd] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [errorLoadingRules, setErrorLoadingRules] = useState<string | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Partial<PricingRule>>(initialPricingRuleFormState);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false); // State for subscription modal
  const [currentSubscription, setCurrentSubscription] = useState(initialSubscriptionFormState); // State for editing subscription
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [linkedLoyalty, setLinkedLoyalty] = useState<LinkedLoyaltyProgram[]>([]); // State for loyalty programs
  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState(true); // Loading state for loyalty programs
  const { toast } = useToast();
  const { userRole, userId } = useContext(AppStateContext)!;
  const [reportData, setReportData] = useState<any[]>([]); // State for report data
  const [isDownloading, setIsDownloading] = useState(false); // State for download process

  const [recordsSearchUserId, setRecordsSearchUserId] = useState('');
  const [recordsStartDate, setRecordsStartDate] = useState<Date | undefined>(undefined);
  const [recordsEndDate, setRecordsEndDate] = useState<Date | undefined>(undefined);


  const isParkingLotOwner = userRole === 'ParkingLotOwner';
  const isAdmin = userRole === 'Admin';

  // --- Data Fetching ---
  const fetchLots = useCallback(async () => {
      setIsLoadingLots(true);
      setErrorLoadingLots(null);
      try {
          // Pass user role and ID to potentially get filtered lots based on ownership AND status visibility
          let lots = await getAvailableParkingLots(userRole, userId);
          setParkingLots(lots);

          // Adjust default selection based on role and fetched lots
          if (isParkingLotOwner && !isAdmin && lots.length > 0) {
              if (lots.length === 1) {
                  setSelectedLotId(lots[0].id);
              } else if (!lots.some(lot => lot.id === selectedLotId)) { // If current selection is invalid (e.g., 'all')
                  setSelectedLotId(lots[0].id); // Select the first owned lot
              }
          } else if (!isAdmin && !isParkingLotOwner) {
              // Standard user shouldn't be here, but prevent 'all' selection
              setSelectedLotId('');
          }
          // Admin keeps 'all' or their selection

      } catch (err) {
        console.error("Failed to fetch parking lots:", err);
        setErrorLoadingLots("Could not load parking lots.");
         toast({ title: "Error Loading Lots", description: "Could not fetch parking lot data.", variant: "destructive" });
      } finally {
        setIsLoadingLots(false);
      }
    }, [userRole, userId, toast, isAdmin, isParkingLotOwner, selectedLotId]); // Added dependencies


  const fetchAds = useCallback(async (scopeId: string) => {
      setIsLoadingAds(true);
      setErrorLoadingAds(null);
      try {
           // Fetch all ads, filtering will happen client-side based on role/scope
           let ads = await getAdvertisements();
           let filteredAds = ads;

           if (isParkingLotOwner && !isAdmin && userId) {
               const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
               const ownerLots = ownerUser?.associatedLots || [];
               if (!ownerLots.includes('*')) {
                   // Owner sees global ads and ads specifically for their lots
                   filteredAds = ads.filter(ad => !ad.targetLocationId || ownerLots.includes(ad.targetLocationId));
               }
           }
           // If scope is specific lot, further filter the ads (Admin or Owner view)
            if (scopeId !== 'all') {
                filteredAds = filteredAds.filter(ad => ad.targetLocationId === scopeId || !ad.targetLocationId);
            }

          const adsWithLocationNames = filteredAds.map(ad => ({ ...ad, targetLotName: parkingLots.find(lot => lot.id === ad.targetLocationId)?.name || (ad.targetLocationId ? 'Unknown Lot' : 'Global') }));
          setAdvertisements(adsWithLocationNames);
      } catch (err) {
          console.error("Failed to fetch advertisements:", err);
          setErrorLoadingAds("Could not load advertisements.");
          toast({ title: "Error Loading Ads", description: "Could not fetch advertisement data.", variant: "destructive" });
      } finally {
          setIsLoadingAds(false);
      }
  }, [isParkingLotOwner, isAdmin, userId, parkingLots, toast]); // Added isAdmin

  const fetchPricingRules = useCallback(async (scopeId: string) => {
      setIsLoadingRules(true);
      setErrorLoadingRules(null);
      try {
          // Fetch all rules, filter client-side based on role/scope
          let rules = await getAllPricingRules();
          let filteredRules = rules;

           if (isParkingLotOwner && !isAdmin && userId) {
               const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
               const ownerLots = ownerUser?.associatedLots || [];
                if (!ownerLots.includes('*')) {
                    // Owner sees global rules and rules for their lots
                    filteredRules = rules.filter(rule => !rule.lotId || ownerLots.includes(rule.lotId));
               }
          }
           // If scope is specific lot, further filter the rules (Admin or Owner view)
            if (scopeId !== 'all') {
                filteredRules = filteredRules.filter(rule => rule.lotId === scopeId || !rule.lotId);
            }

          setPricingRules(filteredRules.map(rule => ({ ...rule, lotName: parkingLots.find(lot => lot.id === rule.lotId)?.name || 'Global' }))); // Add lot name
      } catch (err) {
          console.error("Failed to fetch pricing rules:", err);
          setErrorLoadingRules("Could not load pricing rules.");
          toast({ title: "Error Loading Rules", description: "Could not fetch pricing rule data.", variant: "destructive" });
      } finally {
          setIsLoadingRules(false);
      }
  }, [isParkingLotOwner, isAdmin, userId, parkingLots, toast]); // Added isAdmin

    // Fetch Linked Loyalty Programs
    const fetchLinkedLoyalty = useCallback(async (currentUserId: string) => {
        setIsLoadingLoyalty(true);
        try {
            const programs = await getLinkedLoyaltyPrograms(currentUserId);
            setLinkedLoyalty(programs);
        } catch (err) {
            console.error("Failed to fetch linked loyalty programs:", err);
            toast({ title: "Error", description: "Could not fetch loyalty program data.", variant: "destructive" });
        } finally {
            setIsLoadingLoyalty(false);
        }
    }, [toast]);

    useEffect(() => {
        if (userId) { // Only fetch if userId is available
            fetchLinkedLoyalty(userId);
        }
    }, [userId, fetchLinkedLoyalty]);


  useEffect(() => {
    // Only fetch if authorized
     if (isAdmin || isParkingLotOwner) {
        fetchLots();
    } else {
         setIsLoadingLots(false); // Not authorized, stop loading
    }
  }, [fetchLots, isAdmin, isParkingLotOwner]);

  useEffect(() => {
    // Fetch ads/rules only if authorized and lots are available
     // Also ensure parkingLots is populated before fetching things that depend on it (like names)
    if ((isAdmin || isParkingLotOwner) && !isLoadingLots && parkingLots.length >= 0) {
         fetchAds(selectedLotId);
         fetchPricingRules(selectedLotId);
    }
  }, [selectedLotId, parkingLots, fetchAds, fetchPricingRules, isAdmin, isParkingLotOwner, isLoadingLots]); // Added isLoadingLots


  // --- Component State & Logic ---
  const selectedLot = parkingLots.find(lot => lot.id === selectedLotId);
  const displayedUsers = selectedLotId === 'all'
    ? (isAdmin ? sampleUsers : []) // Only Admin sees all users
    : sampleUsers.filter(user => (isAdmin || isParkingLotOwner) && (user.associatedLots.includes(selectedLotId) || user.associatedLots.includes('*')));

   // Use enhanced analytics data
   const displayedAnalytics = selectedLotId === 'all'
    ? (isAdmin ? sampleAnalyticsData['all'] : { revenue: 0, avgOccupancy: 0, activeReservations: 0, peakHours: [], dailyRevenue: [], userSignups: [] }) // Only Admin sees all analytics
    : sampleAnalyticsData[selectedLotId] || { revenue: 0, avgOccupancy: 0, activeReservations: 0, peakHours: [], dailyRevenue: [], userSignups: [] }; // Default for owner/empty

   const displayedPricingRules = pricingRules; // Use state directly, as it's filtered during fetch/scope change

   // --- Helper to generate and download CSV ---
   const downloadCSV = (data: any[], filename: string) => {
       setIsDownloading(true);
       try {
           const csvContent = convertToCSV(data);
           if (!csvContent) {
               toast({ title: "No Data", description: "There is no data to download.", variant: "default"});
               setIsDownloading(false); // Stop loading if no data
               return;
           }
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
       } finally {
            setIsDownloading(false);
       }
   };

    // --- Report Download Handlers ---
    const handleDownloadUsers = () => {
        const scope = selectedLot ? selectedLot.name : 'all-locations';
        downloadCSV(displayedUsers, `carpso-users-${scope}.csv`);
    };
    const handleDownloadLots = () => {
        downloadCSV(getDisplayLots(), `carpso-parking-lots.csv`);
    };
    const handleDownloadAnalytics = () => {
         // Prepare data for download, potentially flatten nested data for CSV
        const dataToDownload: Record<string, any>[] = [];
        const scope = selectedLot ? selectedLot.name : 'All Locations';

        if (selectedLotId === 'all' && isAdmin) {
            dataToDownload.push({ scope: scope, revenue: displayedAnalytics.revenue, avgOccupancy: displayedAnalytics.avgOccupancy, activeReservations: displayedAnalytics.activeReservations });
            // Add daily revenue and signups if needed
            // displayedAnalytics.dailyRevenue?.forEach(d => dataToDownload.push({ scope: scope, metric: 'Daily Revenue', day: d.day, value: d.revenue }));
            // displayedAnalytics.userSignups?.forEach(d => dataToDownload.push({ scope: scope, metric: 'User Signups', day: d.day, value: d.signups }));
        } else if (selectedLot) {
            dataToDownload.push({ scope: scope, revenue: displayedAnalytics.revenue, avgOccupancy: displayedAnalytics.avgOccupancy, activeReservations: displayedAnalytics.activeReservations });
            // Add daily revenue if needed
            // displayedAnalytics.dailyRevenue?.forEach(d => dataToDownload.push({ scope: scope, metric: 'Daily Revenue', day: d.day, value: d.revenue }));
        }

        const filenameScope = selectedLot ? selectedLot.name : 'all-locations';
        downloadCSV(dataToDownload, `carpso-analytics-${filenameScope}.csv`);
    };
    const handleDownloadAds = () => {
        const scope = selectedLot ? selectedLot.name : 'all-locations';
         downloadCSV(advertisements, `carpso-advertisements-${scope}.csv`);
    };
    const handleDownloadRules = () => {
         const scope = selectedLot ? selectedLot.name : 'all-locations';
        downloadCSV(displayedPricingRules, `carpso-pricing-rules-${scope}.csv`);
    };
    // New handler for Parking Records
    const handleDownloadRecords = async () => {
        setIsDownloading(true);
         const scopeLotId = selectedLotId === 'all' ? undefined : selectedLotId;
         const scopeName = selectedLot ? selectedLot.name : 'all-locations';
         try {
            // Fetch records based on current filters
             const filters = {
                lotId: scopeLotId,
                userId: recordsSearchUserId || undefined, // Use state value
                startDate: recordsStartDate?.toISOString(),
                endDate: recordsEndDate?.toISOString(),
            };
            console.log("Fetching records with filters:", filters);
            const records = await getParkingRecords(filters);
            downloadCSV(records, `carpso-parking-records-${scopeName}.csv`);
         } catch (error) {
             console.error("Failed to fetch records for download:", error);
             toast({ title: "Download Failed", description: "Could not fetch parking records.", variant: "destructive" });
             setIsDownloading(false);
         }
         // downloadCSV handles setting isDownloading to false on completion/error
    };
     // Handler for Loyalty Programs Download
    const handleDownloadLoyalty = () => {
        // In admin, might need to fetch ALL linked programs, or filter based on scope?
        // Assuming download for current view (all if admin, or filtered by user if context allows)
        // For now, downloading the currently loaded `linkedLoyalty` state
        const dataToDownload = linkedLoyalty.map(lp => ({ ...lp, userName: sampleUsers.find(u => u.id === lp.userId)?.name || lp.userId })); // Add user name for clarity
        downloadCSV(dataToDownload, `carpso-linked-loyalty-programs.csv`);
    };
    // --- End Report Download Handlers ---

   // --- Service Management ---
    const handleServiceToggle = async (service: ParkingLotService, isChecked: boolean) => {
        if (!selectedLot || (!isAdmin && !isParkingLotOwner)) return;
        setIsUpdatingServices(true);
        const currentServices = selectedLot.services || [];
        const updatedServices = isChecked
            ? [...currentServices, service]
            : currentServices.filter(s => s !== service);
        try {
            const success = await updateParkingLotServices(selectedLot.id, updatedServices);
            if (success) {
                // Update local state immediately
                setParkingLots(prevLots => prevLots.map(lot =>
                    lot.id === selectedLotId ? { ...lot, services: updatedServices } : lot
                ));
                toast({ title: "Services Updated", description: `${service} ${isChecked ? 'added to' : 'removed from'} ${selectedLot.name}.` });
            } else { throw new Error("Backend update failed."); }
        } catch (error) {
            console.error("Failed to update services:", error);
            toast({ title: "Update Failed", description: `Could not update services for ${selectedLot.name}.`, variant: "destructive" });
        } finally {
            setIsUpdatingServices(false);
        }
    };
   // --- End Service Management ---

    // --- Advertisement Management ---
    const handleOpenAdModal = (ad: Advertisement | null = null) => {
         const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
         const ownerLots = ownerUser?.associatedLots || [];

         if (ad && isParkingLotOwner && !isAdmin && ad.targetLocationId && !ownerLots.includes('*') && !ownerLots.includes(ad.targetLocationId)) {
              toast({ title: "Unauthorized", description: "You can only edit ads associated with your parking lots.", variant: "destructive" }); return;
          }
         if (ad && isParkingLotOwner && !isAdmin && !ad.targetLocationId && !ownerLots.includes('*')) {
              toast({ title: "Unauthorized", description: "You cannot edit global advertisements.", variant: "destructive" }); return;
         }

        if (ad) {
            setCurrentAd({ ...ad, targetLocationId: ad.targetLocationId || 'all' });
        } else {
            setCurrentAd({
                ...initialAdFormState,
                targetLocationId: selectedLotId !== 'all' && (isAdmin || (isParkingLotOwner && ownerLots.includes(selectedLotId))) ? selectedLotId : (isAdmin ? 'all' : ''),
            });
        }
        setIsAdModalOpen(true);
    };
    const handleAdFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
       setCurrentAd(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleAdSelectChange = (name: keyof Advertisement, value: string) => {
        // Treat 'none' value as undefined for the associatedService
        setCurrentAd(prev => ({
            ...prev,
            [name]: value === 'none' ? undefined : value
        }));
    };
    const handleSaveAd = async () => {
        if (!currentAd.title || !currentAd.description) { toast({ title: "Missing Info", description: "Title and description required.", variant: "destructive" }); return; }
         const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
         const ownerLots = ownerUser?.associatedLots || [];
         const targetLocation = currentAd.targetLocationId === 'all' ? '' : currentAd.targetLocationId;
         if (isParkingLotOwner && !isAdmin && !ownerLots.includes('*')) {
             if (!targetLocation) { toast({ title: "Unauthorized", description: "Only Admins can create global ads.", variant: "destructive" }); return; }
             if (targetLocation && !ownerLots.includes(targetLocation)) { toast({ title: "Invalid Location", description: "Select one of your assigned lots.", variant: "destructive" }); return; }
         }
        setIsSavingAd(true);
        try {
             // Ensure associatedService is correctly passed (should be undefined if 'none' was selected)
             const adDataToSave = {
                 ...currentAd,
                 targetLocationId: targetLocation,
                 targetLotName: undefined // Remove transient property before saving
             };
            const savedAd = currentAd.id ? await updateAdvertisement(currentAd.id, adDataToSave) : await createAdvertisement(adDataToSave);
            if (savedAd) {
                 await fetchAds(selectedLotId);
                toast({ title: "Ad Saved", description: `"${savedAd.title}" ${currentAd.id ? 'updated' : 'created'}.` });
                setIsAdModalOpen(false);
            } else { throw new Error("Backend save failed."); }
        } catch (error) { console.error("Save Ad Error:", error); toast({ title: "Save Failed", variant: "destructive" }); }
        finally { setIsSavingAd(false); }
    };
    const handleDeleteAd = async (adId: string) => {
         const adToDelete = advertisements.find(ad => ad.id === adId);
         if (!adToDelete) return;
         const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
         const ownerLots = ownerUser?.associatedLots || [];
         if (isParkingLotOwner && !isAdmin && !ownerLots.includes('*')) {
            if (!adToDelete.targetLocationId) { toast({ title: "Unauthorized", description: "Cannot delete global ads.", variant: "destructive" }); return; }
            if (adToDelete.targetLocationId && !ownerLots.includes(adToDelete.targetLocationId)) { toast({ title: "Unauthorized", description: "Can only delete ads for your lots.", variant: "destructive" }); return; }
         }
        setIsDeletingAd(true);
        try {
            const success = await deleteAdvertisement(adId);
            if (success) { setAdvertisements(prevAds => prevAds.filter(ad => ad.id !== adId)); toast({ title: "Ad Deleted" }); }
            else { throw new Error("Backend delete failed."); }
        } catch (error) { console.error("Delete Ad Error:", error); toast({ title: "Deletion Failed", variant: "destructive" }); }
        finally { setIsDeletingAd(false); }
    };
    // --- End Advertisement Management ---

    // --- Pricing Rule Management ---
    const handleOpenRuleModal = (rule: PricingRule | null = null) => {
          const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
         const ownerLots = ownerUser?.associatedLots || [];
         if (rule && isParkingLotOwner && !isAdmin && !ownerLots.includes('*')) {
             if (!rule.lotId) { toast({ title: "Unauthorized", description: "Cannot manage global rules.", variant: "destructive" }); return; }
              if (rule.lotId && !ownerLots.includes(rule.lotId)) { toast({ title: "Unauthorized", description: "Can only manage rules for your lots.", variant: "destructive" }); return; }
         }
        if (rule) {
            setCurrentRule({
                ...rule, lotId: rule.lotId || 'all',
                timeCondition: rule.timeCondition || { daysOfWeek: [], startTime: '', endTime: '' },
                userTierCondition: rule.userTierCondition || [],
            });
        } else {
             const newRuleId = `rule_${Date.now()}`;
            setCurrentRule({
                ...initialPricingRuleFormState, ruleId: newRuleId,
                lotId: selectedLotId !== 'all' && (isAdmin || (isParkingLotOwner && ownerLots.includes(selectedLotId))) ? selectedLotId : (isAdmin ? 'all' : ''),
                priority: 100, timeCondition: { daysOfWeek: [], startTime: '', endTime: '' }, userTierCondition: [],
            });
        }
        setIsRuleModalOpen(true);
    };
    const handleRuleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setCurrentRule(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value }));
    };
    const handleRuleSelectChange = (name: keyof PricingRule, value: string | string[]) => {
       setCurrentRule(prev => ({ ...prev, [name]: value }));
    };
    const handleRuleTimeConditionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentRule(prev => ({ ...prev, timeCondition: { ...(prev?.timeCondition || {}), [name]: value } }));
    };
    const handleRuleDaysOfWeekChange = (selectedDays: string[]) => {
        setCurrentRule(prev => ({ ...prev, timeCondition: { ...(prev?.timeCondition || {}), daysOfWeek: selectedDays as any } }));
    };
    const handleRuleUserTiersChange = (selectedTiers: string[]) => {
        setCurrentRule(prev => ({ ...prev, userTierCondition: selectedTiers as ('Basic' | 'Premium')[] }));
    };
    const handleSaveRule = async () => {
        if (!currentRule.description || currentRule.priority === undefined) { toast({ title: "Missing Info", description: "Description and priority required.", variant: "destructive" }); return; }
        if (currentRule.baseRatePerHour === undefined && currentRule.flatRate === undefined && currentRule.discountPercentage === undefined) { toast({ title: "Invalid Rule", description: "Must define base rate, flat rate, or discount.", variant: "destructive" }); return; }
         const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
         const ownerLots = ownerUser?.associatedLots || [];
         const targetLotId = currentRule.lotId === 'all' ? '' : currentRule.lotId;
          if (isParkingLotOwner && !isAdmin && !ownerLots.includes('*')) {
             if (!targetLotId) { toast({ title: "Unauthorized", description: "Cannot save global rules.", variant: "destructive" }); return; }
             if (targetLotId && !ownerLots.includes(targetLotId)) { toast({ title: "Invalid Location", description: "Select one of your assigned lots.", variant: "destructive" }); return; }
         }
        setIsSavingRule(true);
        try {
            const ruleToSave: PricingRule = {
                ...(currentRule as PricingRule), lotId: targetLotId || undefined,
                 timeCondition: (currentRule.timeCondition?.daysOfWeek?.length || currentRule.timeCondition?.startTime || currentRule.timeCondition?.endTime) ? currentRule.timeCondition : undefined,
                 userTierCondition: currentRule.userTierCondition?.length ? currentRule.userTierCondition : undefined,
                 eventCondition: currentRule.eventCondition || undefined,
            };
            const savedRule = await savePricingRule(ruleToSave);
            if (savedRule) {
                 await fetchPricingRules(selectedLotId);
                toast({ title: "Rule Saved", description: `Rule "${savedRule.description}" saved.` });
                setIsRuleModalOpen(false);
            } else { throw new Error("Backend save failed."); }
        } catch (error) { console.error("Save Rule Error:", error); toast({ title: "Save Failed", variant: "destructive" }); }
        finally { setIsSavingRule(false); }
    };
    const handleDeleteRule = async (ruleId: string) => {
          const ruleToDelete = pricingRules.find(r => r.ruleId === ruleId);
         if (!ruleToDelete) return;
           const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
           const ownerLots = ownerUser?.associatedLots || [];
           if (isParkingLotOwner && !isAdmin && !ownerLots.includes('*')) {
              if (!ruleToDelete.lotId) { toast({ title: "Unauthorized", description: "Cannot delete global rules.", variant: "destructive" }); return; }
               if (ruleToDelete.lotId && !ownerLots.includes(ruleToDelete.lotId)) { toast({ title: "Unauthorized", description: "Cannot delete rules for other lots.", variant: "destructive" }); return; }
           }
         setIsDeletingRule(true);
         try {
             const success = await deletePricingRule(ruleId);
             if (success) { setPricingRules(prevRules => prevRules.filter(r => r.ruleId !== ruleId)); toast({ title: "Rule Deleted" }); }
             else { throw new Error("Backend delete failed."); }
         } catch (error) { console.error("Delete Rule Error:", error); toast({ title: "Deletion Failed", variant: "destructive" }); }
         finally { setIsDeletingRule(false); }
     };
    // --- End Pricing Rule Management ---

    // --- Subscription Management ---
    const handleOpenSubscriptionModal = (lot: ParkingLot) => {
        if (!isAdmin) { // Only Admin can manage subscriptions
             toast({ title: "Unauthorized", description: "Only Admins can manage subscriptions.", variant: "destructive" });
             return;
         }
        setCurrentSubscription({
            lotId: lot.id,
            status: lot.subscriptionStatus,
            trialEndDate: lot.trialEndDate ? new Date(lot.trialEndDate) : undefined,
        });
        setIsSubscriptionModalOpen(true);
    };
    const handleSubscriptionFormChange = (name: keyof typeof initialSubscriptionFormState, value: any) => {
        setCurrentSubscription(prev => ({ ...prev, [name]: value }));
    };
    const handleSaveSubscription = async () => {
         if (!currentSubscription.lotId || !currentSubscription.status) {
             toast({ title: "Missing Info", description: "Status is required.", variant: "destructive" }); return;
         }
          if (currentSubscription.status === 'trial' && !currentSubscription.trialEndDate) {
             toast({ title: "Missing Info", description: "Trial end date is required for trial status.", variant: "destructive" }); return;
         }
         if (!isAdmin) return; // Redundant check

         setIsSavingSubscription(true);
         try {
             const success = await updateLotSubscriptionStatus(
                 currentSubscription.lotId,
                 currentSubscription.status,
                 currentSubscription.trialEndDate?.toISOString() // Pass ISO string
             );
             if (success) {
                 await fetchLots(); // Refresh lot list
                 toast({ title: "Subscription Updated" });
                 setIsSubscriptionModalOpen(false);
             } else { throw new Error("Backend update failed."); }
         } catch (error) {
             console.error("Subscription Save Error:", error);
             toast({ title: "Update Failed", variant: "destructive" });
         } finally {
             setIsSavingSubscription(false);
         }
    };
    const handleStartTrial = async (lotId: string) => {
         if (!isAdmin) return;
         setIsSavingSubscription(true); // Reuse saving state
         try {
             const success = await startLotTrial(lotId, 14); // Default 14-day trial
             if (success) {
                 await fetchLots();
                 toast({ title: "Trial Started", description: "14-day trial activated." });
             } else { throw new Error("Failed to start trial."); }
         } catch (error) {
             console.error("Start Trial Error:", error);
             toast({ title: "Operation Failed", variant: "destructive" });
         } finally {
             setIsSavingSubscription(false);
         }
    };
    // --- End Subscription Management ---


   // --- Helper Functions ---
   const getServiceIcon = (service: ParkingLotService | undefined, className: string = "h-4 w-4 mr-2") => {
     switch (service) {
       case 'EV Charging': return <Fuel className={className} />;
       case 'Car Wash': return <SprayCan className={className} />;
       case 'Mobile Money Agent': return <BadgeCent className={className} />;
       case 'Wifi': return <Wifi className={className} />;
       case 'Restroom': return <Bath className={className} />;
       case 'Valet': return <ConciergeBell className={className} />;
       default: return <Sparkles className={className} />;
     }
   };

    const getSubscriptionStatusBadge = (status: ParkingLot['subscriptionStatus'], trialEndDate?: string) => {
        const isExpired = status === 'trial' && trialEndDate && new Date(trialEndDate) < new Date();
        const displayStatus = isExpired ? 'expired' : status;

        switch(displayStatus) {
            case 'active': return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><PackageCheck className="mr-1 h-3 w-3"/> Active</Badge>;
            case 'trial': return <Badge variant="secondary"><CalendarClock className="mr-1 h-3 w-3"/> Trial</Badge>;
            case 'inactive': return <Badge variant="outline"><PackageX className="mr-1 h-3 w-3"/> Inactive</Badge>;
            case 'expired': return <Badge variant="destructive"><PackageX className="mr-1 h-3 w-3"/> Expired</Badge>;
            default: return <Badge variant="outline">Unknown</Badge>;
        }
    };

    const isAuthorizedForLot = (lotId: string) => {
         if (isAdmin) return true;
         if (isParkingLotOwner && userId) {
            const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
            const ownerLots = ownerUser?.associatedLots || [];
            return ownerLots.includes('*') || ownerLots.includes(lotId);
         }
         return false;
     };

   const getDisplayLots = () => {
       if (isAdmin) return parkingLots;
       if (isParkingLotOwner && userId) {
          const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
          const ownerLots = ownerUser?.associatedLots || [];
          if (ownerLots.includes('*')) return parkingLots; // Owner with wildcard sees all
          return parkingLots.filter(lot => ownerLots.includes(lot.id));
       }
       return []; // Standard user sees no lots in admin panel
    };

   const calculateAverageRevenue = () => {
         const lots = getDisplayLots();
         if (!lots || lots.length === 0) return 0;
         const totalRevenue = lots.reduce((sum, lot) => sum + (sampleAnalyticsData[lot.id]?.revenue || 0), 0);
         return totalRevenue / lots.length;
    };
    const averageRevenue = calculateAverageRevenue();
   // --- End Helper Functions ---

  // Handle unauthorized access
  if (!isAdmin && !isParkingLotOwner) {
      return (
         <div className="container py-8 px-4 md:px-6 lg:px-8 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
              <p className="text-muted-foreground">You do not have permission to view this page.</p>
          </div>
      );
  }

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <Card className="w-full max-w-7xl mx-auto"> {/* Increased max-width */}
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
             <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    {isAdmin ? "Admin" : "Owner"} Dashboard
                </CardTitle>
                <CardDescription>
                    Manage users, lots, services, ads, pricing, and view analytics.
                    {selectedLotId !== 'all' && selectedLot ? ` (Viewing: ${selectedLot.name})` : isAdmin ? ' (Viewing: All Locations)' : ''}
                </CardDescription>
                 <Badge variant="secondary">{userRole}</Badge>
             </div>
             {/* Parking Lot Selector */}
             {(isAdmin || (isParkingLotOwner && getDisplayLots().length > 1)) && (
             <div className="min-w-[250px]">
                 {isLoadingLots ? ( <Skeleton className="h-10 w-full" /> )
                  : errorLoadingLots ? ( <p className="text-sm text-destructive">{errorLoadingLots}</p> )
                  : (
                    <Select value={selectedLotId} onValueChange={(value) => setSelectedLotId(value)} disabled={!isAdmin && !isParkingLotOwner}>
                        <SelectTrigger aria-label="Select location scope"><SelectValue placeholder="Select location scope..." /></SelectTrigger>
                        <SelectContent>
                            {isAdmin && <SelectItem value="all">All Locations</SelectItem>}
                            {getDisplayLots().map((lot) => (
                                <SelectItem key={lot.id} value={lot.id}>
                                    <span className="flex items-center gap-2"> <MapPin className="h-4 w-4 text-muted-foreground" /> {lot.name} </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 )}
             </div>
             )}
          </div>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="users" className="w-full">
             <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 mb-6 overflow-x-auto"> {/* Adjusted grid cols */}
               <TabsTrigger value="users"><UserCog className="mr-2 h-4 w-4"/>Users</TabsTrigger>
               <TabsTrigger value="lots"><LayoutDashboard className="mr-2 h-4 w-4"/>Lots</TabsTrigger>
               <TabsTrigger value="services"><Sparkles className="mr-2 h-4 w-4"/>Services</TabsTrigger>
               <TabsTrigger value="ads"><Megaphone className="mr-2 h-4 w-4"/>Ads</TabsTrigger>
               <TabsTrigger value="pricing"><DollarSign className="mr-2 h-4 w-4"/>Pricing</TabsTrigger>
               <TabsTrigger value="records"><History className="mr-2 h-4 w-4"/>Records</TabsTrigger> {/* Added Records Tab */}
               <TabsTrigger value="loyalty"><Award className="mr-2 h-4 w-4"/>Loyalty</TabsTrigger> {/* Added Loyalty Tab */}
               <TabsTrigger value="analytics"><BarChartIcon className="mr-2 h-4 w-4"/>Analytics</TabsTrigger>
               <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/>Settings</TabsTrigger>
             </TabsList>

             {/* User Management Tab */}
             <TabsContent value="users">
               <Card>
                 <CardHeader>
                   <CardTitle>User Management {selectedLotId !== 'all' && selectedLot ? ` - ${selectedLot.name}` : isAdmin ? ' - All Locations' : ''}</CardTitle>
                   <CardDescription>View, edit, or remove users and manage their roles {selectedLotId !== 'all' && selectedLot ? ` associated with ${selectedLot.name}` : (isAdmin ? 'across all locations' : '')}.</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search users..." className="max-w-sm" /> <Button>Search</Button>
                        {isAdmin && (
                            <div className="ml-auto flex gap-2">
                                <Button variant="outline" onClick={handleDownloadUsers} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Download List
                                </Button>
                                <Button variant="outline"> <PlusCircle className="mr-2 h-4 w-4" /> Add User</Button>
                            </div>
                        )}
                    </div>
                 </CardHeader>
                 <CardContent>
                    {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) ? (
                       displayedUsers.length > 0 ? (
                           <Table>
                             <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>{selectedLotId === 'all' && <TableHead>Associated Lots</TableHead>}<TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                             <TableBody>
                               {displayedUsers.map((user) => (
                                 <TableRow key={user.id}>
                                   <TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role}</TableCell>
                                   {selectedLotId === 'all' && <TableCell>{user.associatedLots.join(', ')}</TableCell>}
                                   <TableCell className="text-right space-x-1">
                                     <Button variant="ghost" size="sm" disabled={!isAdmin && !(isParkingLotOwner && user.associatedLots.includes(selectedLotId!))}>Edit</Button> {/* Allow owner to edit users for their lot */}
                                     <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={!isAdmin}> <Trash2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Delete</span> </Button>
                                   </TableCell>
                                 </TableRow>
                               ))}
                             </TableBody>
                           </Table>
                       ) : ( <p className="text-muted-foreground text-center py-4">No users found matching the current filter.</p> )
                    ) : ( <p className="text-muted-foreground text-center py-4">User management is available for specific lots or by Admins for all locations.</p> )}
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Parking Lot Management Tab */}
              <TabsContent value="lots">
               <Card>
                 <CardHeader>
                   <CardTitle>Parking Lot Management</CardTitle>
                   <CardDescription>Monitor status, subscription, and manage parking lots you have access to.</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search lots..." className="max-w-sm" /> <Button>Search</Button>
                         {(isAdmin) && (
                             <div className="ml-auto flex gap-2">
                                 <Button variant="outline" onClick={handleDownloadLots} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Download List
                                 </Button>
                                 <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Lot</Button>
                             </div>
                         )}
                    </div>
                 </CardHeader>
                 <CardContent>
                    {isLoadingLots ? ( <div className="space-y-2"> <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /> </div> )
                     : errorLoadingLots ? ( <p className="text-destructive text-center py-4">{errorLoadingLots}</p> )
                     : getDisplayLots().length > 0 ? (
                       <Table>
                         <TableHeader><TableRow><TableHead>Lot Name</TableHead><TableHead>Owner</TableHead><TableHead>Capacity</TableHead><TableHead>Occupancy</TableHead><TableHead>Subscription</TableHead><TableHead>Services</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                         <TableBody>
                           {getDisplayLots().map((lot) => {
                               const owner = sampleUsers.find(u => u.id === lot.ownerUserId);
                               const isTrialExpired = lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date();
                               const displayStatus = isTrialExpired ? 'expired' : lot.subscriptionStatus;
                               return (
                                 <TableRow key={lot.id}>
                                   <TableCell className="font-medium">{lot.name}</TableCell>
                                   <TableCell className="text-xs text-muted-foreground">{owner?.name || 'N/A'}</TableCell>
                                   <TableCell>{lot.capacity}</TableCell>
                                   <TableCell>{lot.currentOccupancy ?? 'N/A'} ({lot.currentOccupancy !== undefined && lot.capacity > 0 ? `${((lot.currentOccupancy / lot.capacity) * 100).toFixed(0)}%` : 'N/A'})</TableCell>
                                   <TableCell>{getSubscriptionStatusBadge(displayStatus, lot.trialEndDate)} {displayStatus === 'trial' && lot.trialEndDate ? `(Ends ${new Date(lot.trialEndDate).toLocaleDateString()})` : displayStatus === 'expired' && lot.trialEndDate ? `(Ended ${new Date(lot.trialEndDate).toLocaleDateString()})` : ''}</TableCell>
                                   <TableCell>
                                       <div className="flex flex-wrap gap-1">
                                          {(lot.services && lot.services.length > 0) ? lot.services.map(service => (<Badge key={service} variant="secondary" size="sm" className="flex items-center whitespace-nowrap">{getServiceIcon(service)} {service}</Badge>)) : <span className="text-xs text-muted-foreground">None</span>}
                                       </div>
                                    </TableCell>
                                   <TableCell className="text-right space-x-1">
                                      <Button variant="ghost" size="sm">Details</Button>
                                      {isAdmin && <Button variant="ghost" size="sm" onClick={() => handleOpenSubscriptionModal(lot)}>Manage Sub</Button>}
                                      {isAdmin && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"> <Trash2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Disable</span> </Button>}
                                   </TableCell>
                                 </TableRow>
                               );
                           })}
                         </TableBody>
                       </Table>
                    ) : ( <p className="text-muted-foreground text-center py-4">No parking lots found matching your access.</p> )}
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Services Management Tab */}
              <TabsContent value="services">
                <Card>
                  <CardHeader><CardTitle>Manage Lot Services {selectedLotId !== 'all' && selectedLot ? ` - ${selectedLot.name}` : ''}</CardTitle><CardDescription>{selectedLotId !== 'all' && selectedLot ? `Enable or disable services offered at ${selectedLot.name}.` : 'Please select a specific parking lot to manage its services.'}</CardDescription></CardHeader>
                  <CardContent>
                      {isLoadingLots ? ( <Skeleton className="h-24 w-full" /> )
                      : errorLoadingLots ? ( <p className="text-destructive text-center py-4">{errorLoadingLots}</p> )
                      : selectedLotId === 'all' ? ( <p className="text-muted-foreground text-center py-4">Select a specific parking lot from the dropdown above to manage services.</p> )
                      : !selectedLot ? ( <p className="text-muted-foreground text-center py-4">Selected lot not found or not accessible.</p> )
                      : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {allAvailableServices.map((service) => {
                                const isChecked = selectedLot.services?.includes(service) ?? false;
                                const checkboxId = `service-${service}-${selectedLot.id}`; // Unique ID per lot context
                                return (
                                   <div key={service} className="flex items-center space-x-3 p-3 border rounded-md bg-background hover:bg-accent/10 transition-colors">
                                       <Checkbox
                                           id={checkboxId}
                                           checked={isChecked}
                                           onCheckedChange={(checked) => handleServiceToggle(service, !!checked)}
                                           disabled={isUpdatingServices || (!isAdmin && !isParkingLotOwner)}
                                           aria-labelledby={`${checkboxId}-label`} // Associate checkbox with label
                                       />
                                       <label
                                            id={`${checkboxId}-label`} // Match aria-labelledby
                                            htmlFor={checkboxId}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center cursor-pointer"
                                        >
                                           {getServiceIcon(service)} {service}
                                       </label>
                                       {isUpdatingServices && isChecked !== (selectedLot.services?.includes(service) ?? false) && ( <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" /> )}
                                   </div> );
                             })}
                         </div> )}
                  </CardContent>
                </Card>
              </TabsContent>

             {/* Advertisement Management Tab */}
             <TabsContent value="ads">
               <Card>
                 <CardHeader>
                   <CardTitle>Advertisement Management {selectedLotId !== 'all' && selectedLot ? ` - ${selectedLot.name}` : isAdmin ? ' - All Locations' : ''}</CardTitle>
                   <CardDescription>Create and manage advertisements shown to users.</CardDescription>
                   <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search ads by title..." className="max-w-sm" /> <Button>Search</Button>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={handleDownloadAds} disabled={isDownloading}>
                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Download List
                            </Button>
                            <Button variant="default" onClick={() => handleOpenAdModal()}> <PlusCircle className="mr-2 h-4 w-4" /> Create Ad </Button>
                        </div>
                   </div>
                 </CardHeader>
                 <CardContent>
                   {isLoadingAds ? ( <Skeleton className="h-32 w-full" /> )
                   : errorLoadingAds ? ( <p className="text-destructive text-center py-4">{errorLoadingAds}</p> )
                   : advertisements.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead className="w-[80px]">Image</TableHead><TableHead>Title</TableHead>{selectedLotId === 'all' && <TableHead>Target Location</TableHead>}<TableHead>Runs</TableHead><TableHead>Associated Service</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {advertisements.map((ad) => {
                                     const targetLotName = ad.targetLotName; // Already calculated
                                     const statusColor = ad.status === 'active' ? 'text-green-600' : ad.status === 'inactive' ? 'text-orange-600' : 'text-gray-500';
                                      const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
                                      const ownerLots = ownerUser?.associatedLots || [];
                                      const canEdit = isAdmin || (isParkingLotOwner && (ownerLots.includes('*') || (ad.targetLocationId && ownerLots.includes(ad.targetLocationId)) || (!ad.targetLocationId && ownerLots.includes('*'))));
                                      const canDelete = canEdit;
                                      const adHint = ad.associatedService ? `parking ${ad.associatedService.toLowerCase()}` : 'parking business advertisement'; // Hint for AI
                                     return (
                                        <TableRow key={ad.id}>
                                            <TableCell>
                                                <Image
                                                    src={ad.imageUrl || `https://picsum.photos/seed/${ad.id}/100/50`}
                                                    alt={ad.title}
                                                    width={80} height={40}
                                                    className="rounded object-cover aspect-[2/1]"
                                                    data-ai-hint={adHint} // Add AI Hint
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{ad.title}</TableCell>
                                            {selectedLotId === 'all' && <TableCell>{targetLotName}</TableCell>}
                                            <TableCell className="text-xs">{ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'N/A'} - {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Ongoing'}</TableCell>
                                             <TableCell className="text-xs"> {ad.associatedService ? (<Badge variant="outline" size="sm" className="flex items-center w-fit">{getServiceIcon(ad.associatedService, "h-3 w-3 mr-1")} {ad.associatedService}</Badge>) : <span className="text-muted-foreground">None</span>} </TableCell>
                                            <TableCell className={`text-xs font-medium ${statusColor}`}>{ad.status?.charAt(0).toUpperCase() + ad.status?.slice(1) || 'Unknown'}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenAdModal(ad)} disabled={!canEdit}>Edit</Button>
                                                 <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAd(ad.id)} disabled={isDeletingAd || !canDelete}> {isDeletingAd ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 sm:mr-1" />} <span className="hidden sm:inline">Delete</span> </Button>
                                            </TableCell>
                                        </TableRow> );
                                })}
                            </TableBody>
                        </Table>
                   ) : (
                       <div className="text-center py-10 text-muted-foreground">
                            <Megaphone className="mx-auto h-10 w-10 mb-2" /> <p>No advertisements found for {selectedLotId !== 'all' && selectedLot ? selectedLot.name : 'the selected scope'}.</p>
                             <Button size="sm" className="mt-4" onClick={() => handleOpenAdModal()}> <PlusCircle className="mr-2 h-4 w-4" /> Create First Ad </Button>
                       </div> )}
                 </CardContent>
               </Card>
             </TabsContent>

            {/* Pricing Rules Tab */}
            <TabsContent value="pricing">
               <Card>
                 <CardHeader>
                   <CardTitle>Dynamic Pricing Rules {selectedLotId !== 'all' && selectedLot ? ` - ${selectedLot.name}` : isAdmin ? ' - All Locations' : ''}</CardTitle>
                   <CardDescription>Manage pricing rules based on time, events, or user tiers.</CardDescription>
                   <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search rules by description..." className="max-w-sm" /> <Button>Search</Button>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={handleDownloadRules} disabled={isDownloading}>
                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Download Rules
                            </Button>
                            {(isAdmin || isParkingLotOwner) && ( <Button variant="default" onClick={() => handleOpenRuleModal(null)}> <PlusCircle className="mr-2 h-4 w-4" /> Create Rule </Button> )}
                        </div>
                   </div>
                 </CardHeader>
                 <CardContent>
                    {isLoadingRules ? ( <Skeleton className="h-32 w-full" /> )
                    : errorLoadingRules ? ( <p className="text-destructive text-center py-4">{errorLoadingRules}</p> )
                    : displayedPricingRules.length > 0 ? (
                        <Table>
                           <TableHeader><TableRow><TableHead>Description</TableHead>{selectedLotId === 'all' && <TableHead>Lot Scope</TableHead>}<TableHead>Rate/Discount</TableHead><TableHead>Conditions</TableHead><TableHead>Priority</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                           <TableBody>
                             {displayedPricingRules.map((rule) => {
                                const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
                                const ownerLots = ownerUser?.associatedLots || [];
                                const canEdit = isAdmin || (isParkingLotOwner && (ownerLots.includes('*') || (rule.lotId && ownerLots.includes(rule.lotId)) || (!rule.lotId && ownerLots.includes('*'))));
                                const canDelete = canEdit;
                                return (
                                   <TableRow key={rule.ruleId}>
                                     <TableCell className="font-medium">{rule.description}</TableCell>
                                     {selectedLotId === 'all' && <TableCell>{rule.lotName}</TableCell>}
                                     <TableCell className="text-xs">
                                         {rule.baseRatePerHour !== undefined && `$${rule.baseRatePerHour.toFixed(2)}/hr`} {rule.flatRate !== undefined && `$${rule.flatRate.toFixed(2)}${rule.flatRateDurationMinutes ? `/${rule.flatRateDurationMinutes}min` : ''}`} {rule.discountPercentage !== undefined && `-${rule.discountPercentage}%`}
                                     </TableCell>
                                     <TableCell className="text-xs space-y-0.5">
                                          {rule.timeCondition && (rule.timeCondition.daysOfWeek?.length || rule.timeCondition.startTime || rule.timeCondition.endTime) ? ( <div className="flex items-center gap-1 text-muted-foreground"> <Clock className="h-3 w-3"/> <span>{rule.timeCondition.daysOfWeek?.join(', ') || 'Any Day'} {rule.timeCondition.startTime || ''}{rule.timeCondition.startTime && rule.timeCondition.endTime ? '-' : ''}{rule.timeCondition.endTime || ''}</span> </div> ) : null}
                                           {rule.userTierCondition?.length > 0 && ( <div className="flex items-center gap-1 text-muted-foreground"> <Users className="h-3 w-3"/> <span>{rule.userTierCondition.join(', ')} Tier</span> </div> )}
                                           {rule.eventCondition && ( <div className="flex items-center gap-1 text-muted-foreground"> <Tag className="h-3 w-3"/> <span>Event: {rule.eventCondition}</span> </div> )}
                                           {!rule.timeCondition && !rule.userTierCondition?.length && !rule.eventCondition && <span className="text-muted-foreground">Always</span>}
                                     </TableCell>
                                     <TableCell>{rule.priority}</TableCell>
                                     <TableCell className="text-right space-x-1">
                                         <Button variant="ghost" size="sm" onClick={() => handleOpenRuleModal(rule)} disabled={!canEdit}>Edit</Button>
                                         <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteRule(rule.ruleId)} disabled={isDeletingRule || !canDelete}> {isDeletingRule ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 sm:mr-1" />} <span className="hidden sm:inline">Delete</span> </Button>
                                     </TableCell>
                                   </TableRow> );
                             })}
                           </TableBody>
                        </Table>
                     ) : (
                         <div className="text-center py-10 text-muted-foreground">
                           <DollarSign className="mx-auto h-10 w-10 mb-2" /> <p>No pricing rules found for {selectedLotId !== 'all' && selectedLot ? selectedLot.name : 'the selected scope'}.</p>
                           {(isAdmin || isParkingLotOwner) && ( <Button size="sm" className="mt-4" onClick={() => handleOpenRuleModal(null)}> <PlusCircle className="mr-2 h-4 w-4" /> Create First Rule </Button> )}
                         </div> )}
                 </CardContent>
               </Card>
            </TabsContent>

            {/* Parking Records Tab */}
             <TabsContent value="records">
                <Card>
                  <CardHeader>
                    <CardTitle>Parking Records {selectedLotId !== 'all' && selectedLot ? ` - ${selectedLot.name}` : isAdmin ? ' - All Locations' : ''}</CardTitle>
                    <CardDescription>View historical parking records and transaction details.</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                         <Input
                            placeholder="Search by User ID or Name..."
                            value={recordsSearchUserId}
                            onChange={(e) => setRecordsSearchUserId(e.target.value)}
                            className="max-w-xs"
                         />
                         <DatePicker
                             date={recordsStartDate}
                             setDate={setRecordsStartDate}
                             placeholder="Start Date"
                             className="w-[180px]"
                         />
                         <DatePicker
                             date={recordsEndDate}
                             setDate={setRecordsEndDate}
                             placeholder="End Date"
                             className="w-[180px]"
                         />
                         <Button onClick={() => handleDownloadRecords()} disabled={isDownloading}>
                             {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Filter & Download
                         </Button>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={handleDownloadRecords} disabled={isDownloading}>
                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Download Records
                            </Button>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                      {/* TODO: Fetch and display parking records similar to other tables */}
                      {/* Example: Use getParkingRecords({ lotId: selectedLotId === 'all' ? undefined : selectedLotId }) */}
                      <p className="text-muted-foreground text-center py-10">Parking records display coming soon.</p>
                  </CardContent>
                </Card>
             </TabsContent>

            {/* Loyalty Programs Tab */}
            <TabsContent value="loyalty">
                <Card>
                    <CardHeader>
                        <CardTitle>Linked Loyalty Programs</CardTitle>
                        <CardDescription>View loyalty programs linked by users across the platform.</CardDescription>
                        <div className="flex flex-wrap items-center gap-2 pt-4">
                            <Input placeholder="Search by User ID or Program..." className="max-w-sm" /> <Button>Search</Button>
                             <div className="ml-auto flex gap-2">
                                <Button variant="outline" onClick={handleDownloadLoyalty} disabled={isLoadingLoyalty || isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Download List
                                </Button>
                                 {/* Maybe add ability to manage partner configurations */}
                             </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                         {isLoadingLoyalty ? (
                             <Skeleton className="h-32 w-full" />
                         ) : linkedLoyalty.length > 0 ? (
                             <Table>
                                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Program Name</TableHead><TableHead>Membership ID</TableHead><TableHead>Linked Date</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {linkedLoyalty.map((lp) => {
                                        const user = sampleUsers.find(u => u.id === lp.userId); // Find user for display name
                                        return (
                                             <TableRow key={lp.id}>
                                                 <TableCell className="font-medium">{user?.name || lp.userId}</TableCell>
                                                 <TableCell>{lp.programName}</TableCell>
                                                 <TableCell>{lp.membershipId}</TableCell>
                                                 <TableCell>{new Date(lp.linkedDate).toLocaleDateString()}</TableCell>
                                             </TableRow>
                                        );
                                    })}
                                </TableBody>
                             </Table>
                         ) : (
                              <div className="text-center py-10 text-muted-foreground">
                                  <Award className="mx-auto h-10 w-10 mb-2" />
                                  <p>No loyalty programs have been linked by users yet.</p>
                              </div>
                         )}
                    </CardContent>
                </Card>
            </TabsContent>


             {/* Analytics Tab */}
             <TabsContent value="analytics">
               <Card>
                 <CardHeader>
                   <CardTitle>System Analytics {selectedLotId !== 'all' && selectedLot ? ` - ${selectedLot.name}` : (isAdmin ? ' - Overall' : '')}</CardTitle>
                   <CardDescription>View performance and financial reports {selectedLotId !== 'all' && selectedLot ? `for ${selectedLot.name}` : (isAdmin ? 'for all locations' : '')}.</CardDescription>
                   {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) && (
                       <div className="pt-4 flex justify-end">
                          <Button variant="outline" onClick={handleDownloadAnalytics} disabled={isDownloading}>
                             {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Download Report
                          </Button>
                       </div> )}
                 </CardHeader>
                 <CardContent>
                    {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) ? (
                       <>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                               <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600"/> ${displayedAnalytics.revenue.toFixed(2)}</CardTitle><CardDescription>Revenue Today</CardDescription></CardHeader></Card>
                                <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600"/> {displayedAnalytics.avgOccupancy}%</CardTitle><CardDescription>Avg. Occupancy (24h)</CardDescription></CardHeader></Card>
                                <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><CalendarClock className="h-5 w-5 text-orange-600"/> {displayedAnalytics.activeReservations}</CardTitle><CardDescription>Active Reservations</CardDescription></CardHeader></Card>
                           </div>
                            {selectedLotId === 'all' && isAdmin && displayedAnalytics.userSignups && (
                                 <Card className="mb-6">
                                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UsersRound className="h-5 w-5 text-purple-600"/> User Signups (Last 7 Days)</CardTitle></CardHeader>
                                    <CardContent className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            {/* Use aliased RechartsBarChart */}
                                            <RechartsBarChart data={displayedAnalytics.userSignups}>
                                                 <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                 <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                                 <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                                 {/* Use ChartTooltip */}
                                                 <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                                 <Bar dataKey="signups" fill="var(--color-signups)" radius={4} />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                 </Card> )}
                            {/* Daily Revenue Chart */}
                             <Card className="mb-6">
                                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-600"/> Daily Revenue (Last 7 Days)</CardTitle></CardHeader>
                                <CardContent className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                         <LineChart data={displayedAnalytics.dailyRevenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                             <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                             <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} tickFormatter={(value) => `$${value}`} />
                                             {/* Use ChartTooltip */}
                                             <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                             <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                             </Card>
                             {/* Peak Hours Chart */}
                            <Card className="mb-6">
                                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600"/> Peak Hour Occupancy</CardTitle></CardHeader>
                                <CardContent className="h-[250px] w-full">
                                     <ResponsiveContainer width="100%" height="100%">
                                         {/* Use aliased RechartsBarChart */}
                                         <RechartsBarChart data={displayedAnalytics.peakHours} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                             <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                             <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                                             {/* Use ChartTooltip */}
                                             <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                             <Bar dataKey="occupancy" fill="var(--color-occupancy)" radius={4} />
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                             </Card>
                           <p className="text-muted-foreground mt-6 text-center text-xs">More detailed analytics coming soon.</p>
                       </>
                    ) : ( <p className="text-muted-foreground text-center py-4">Analytics are available for specific lots or by Admins for all locations.</p> )}
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Settings Tab */}
             <TabsContent value="settings">
               <Card>
                 <CardHeader><CardTitle>System Settings {selectedLotId !== 'all' && selectedLot ? ` - ${selectedLot.name}` : (isAdmin ? ' - Global' : '')}</CardTitle><CardDescription>Configure application settings, integrations, and defaults {selectedLotId !== 'all' && selectedLot ? `specific to ${selectedLot.name}` : (isAdmin ? 'globally' : '')}.</CardDescription></CardHeader>
                 <CardContent>
                     {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) ? (
                         <div className="mt-4 space-y-4">
                           {selectedLotId === 'all' && isAdmin && (
                               <div className="flex items-center justify-between p-4 border rounded-md">
                                  <div> <p className="font-medium">Base Reservation Fee (Global)</p> <p className="text-sm text-muted-foreground">Default fee if no lot-specific fee exists.</p> </div>
                                  <div className="flex items-center gap-2"> <span className="text-lg font-semibold">$</span> <Input type="number" defaultValue="2.50" step="0.01" className="w-24" /> <Button size="sm">Save</Button> </div>
                               </div> )}
                            {selectedLotId !== 'all' && selectedLot && (
                               <div className="flex items-center justify-between p-4 border rounded-md">
                                  <div> <p className="font-medium">Lot Fee Override ({selectedLot.name})</p> <p className="text-sm text-muted-foreground">Set specific fee (leave blank for global/default).</p> </div>
                                  <div className="flex items-center gap-2"> <span className="text-lg font-semibold">$</span> <Input type="number" placeholder="e.g., 3.00" step="0.01" className="w-24" /> <Button size="sm">Save</Button> </div>
                               </div> )}
                            {isAdmin && (
                                 <div className="flex items-center justify-between p-4 border rounded-md">
                                  <div> <p className="font-medium">Payment Gateway Integration</p> <p className="text-sm text-muted-foreground">Connect to Stripe, Mobile Money, etc.</p> </div>
                                  <Button size="sm" variant="outline">Configure</Button>
                               </div> )}
                            {/* Chat Support Integration Placeholder */}
                            {isAdmin && (
                                <div className="flex items-center justify-between p-4 border rounded-md">
                                    <div>
                                       <p className="font-medium flex items-center gap-2"> <MessageSquare className="h-4 w-4" /> Chat Support Integration </p>
                                       <p className="text-sm text-muted-foreground">Connect live chat service (e.g., Tawk.to).</p>
                                       <p className="text-xs text-muted-foreground">
                                            Current Status: <Badge variant={process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID && process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID ? 'default' : 'secondary'} size="sm" className={process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID && process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID ? 'bg-green-600' : ''}>
                                                {process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID && process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                        </p>
                                     </div>
                                     {/* Link to environment variable setup or external dashboard */}
                                     <Button size="sm" variant="outline" disabled>Configure (Set Env Vars)</Button>
                                </div>
                            )}
                             {/* External App Integration Placeholder */}
                             {isAdmin && (
                                 <div className="flex items-center justify-between p-4 border rounded-md">
                                     <div>
                                         <p className="font-medium flex items-center gap-2"><LinkIcon className="h-4 w-4" /> External App Integration</p>
                                         <p className="text-sm text-muted-foreground">Manage connections with Waze, Google Maps etc.</p>
                                     </div>
                                     <Button size="sm" variant="outline" disabled>Manage (Coming Soon)</Button>
                                 </div>
                             )}
                              {/* Loyalty Partner Integration Placeholder */}
                              {isAdmin && (
                                  <div className="flex items-center justify-between p-4 border rounded-md">
                                      <div>
                                         <p className="font-medium flex items-center gap-2"><Award className="h-4 w-4" /> Loyalty Partner Integration</p>
                                         <p className="text-sm text-muted-foreground">Manage API keys and configurations for loyalty partners.</p>
                                      </div>
                                      <Button size="sm" variant="outline" disabled>Manage Partners (Coming Soon)</Button>
                                  </div>
                              )}
                        </div>
                     ) : ( <p className="text-muted-foreground text-center py-4">Settings are available for specific lots or globally by Admins.</p> )}
                 </CardContent>
               </Card>
             </TabsContent>
           </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Advertisement Modal */}
       <Dialog open={isAdModalOpen} onOpenChange={setIsAdModalOpen}>
           <DialogContent className="sm:max-w-lg"> <DialogHeader><DialogTitle>{currentAd.id ? 'Edit' : 'Create'} Ad</DialogTitle><DialogDescription>Fill in the details for the advertisement.</DialogDescription></DialogHeader>
               <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="ad-title" className="text-right">Title*</Label><Input id="ad-title" name="title" value={currentAd.title || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} /></div>
                    <div className="grid grid-cols-4 items-start gap-4"><Label htmlFor="ad-description" className="text-right pt-2">Desc*</Label><Textarea id="ad-description" name="description" value={currentAd.description || ''} onChange={handleAdFormChange} className="col-span-3 min-h-[80px]" disabled={isSavingAd} /></div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="ad-imageUrl" className="text-right">Image URL</Label><Input id="ad-imageUrl" name="imageUrl" value={currentAd.imageUrl || ''} onChange={handleAdFormChange} className="col-span-3" placeholder="https://..." disabled={isSavingAd} /></div>
                    {currentAd.imageUrl && (<div className="grid grid-cols-4 items-center gap-4"><div className="col-start-2 col-span-3"><Image src={currentAd.imageUrl} alt="Ad Preview" width={150} height={75} className="rounded object-cover aspect-[2/1] border" onError={(e) => { e.currentTarget.style.display = 'none'; }} data-ai-hint="advertisement preview"/></div></div>)}
                   <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="ad-targetLocationId" className="text-right">Location*</Label>
                        <Select name="targetLocationId" value={currentAd.targetLocationId || 'all'} onValueChange={(value) => handleAdSelectChange('targetLocationId', value)} disabled={isSavingAd || (!isAdmin && isParkingLotOwner && getDisplayLots().length <=1 && !currentAd.id)}>
                           <SelectTrigger id="ad-targetLocationId" className="col-span-3"><SelectValue placeholder="Select target location" /></SelectTrigger>
                           <SelectContent>
                                { (isAdmin || (isParkingLotOwner && sampleUsers.find(u => u.id === userId)?.associatedLots.includes('*'))) && <SelectItem value="all">All Locations (Global)</SelectItem> }
                                {getDisplayLots().map(lot => (<SelectItem key={lot.id} value={lot.id}>{lot.name}</SelectItem>))}
                           </SelectContent> </Select> </div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="ad-associatedService" className="text-right">Link Service</Label><Select name="associatedService" value={currentAd.associatedService || 'none'} onValueChange={(value) => handleAdSelectChange('associatedService', value )} disabled={isSavingAd}><SelectTrigger id="ad-associatedService" className="col-span-3"><SelectValue placeholder="Link to a specific service..." /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{allAvailableServices.map(service => (<SelectItem key={service} value={service}><span className="flex items-center gap-2">{getServiceIcon(service, "h-4 w-4 mr-2")} {service}</span></SelectItem>))}</SelectContent></Select></div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="ad-startDate" className="text-right">Start Date</Label><Input id="ad-startDate" name="startDate" type="date" value={currentAd.startDate || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} /></div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="ad-endDate" className="text-right">End Date</Label><Input id="ad-endDate" name="endDate" type="date" value={currentAd.endDate || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} /></div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="ad-status" className="text-right">Status</Label><Select name="status" value={currentAd.status || 'active'} onValueChange={(value) => handleAdSelectChange('status', value as 'active' | 'inactive' | 'draft')} disabled={isSavingAd}><SelectTrigger id="ad-status" className="col-span-3"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></div>
               </div>
               <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSavingAd}>Cancel</Button></DialogClose><Button type="submit" onClick={handleSaveAd} disabled={isSavingAd}>{isSavingAd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{currentAd.id ? 'Save Changes' : 'Create Ad'}</Button></DialogFooter>
           </DialogContent>
       </Dialog>

        {/* Add/Edit Pricing Rule Modal */}
        <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
            <DialogContent className="sm:max-w-lg"> <DialogHeader><DialogTitle>{currentRule.ruleId ? 'Edit' : 'Create'} Pricing Rule</DialogTitle><DialogDescription>Define conditions and rates for dynamic pricing.</DialogDescription></DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-6">
                    <div className="grid gap-4 py-4">
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-ruleId" className="text-right">Rule ID</Label><Input id="rule-ruleId" name="ruleId" value={currentRule.ruleId || ''} readOnly disabled className="col-span-3 bg-muted text-muted-foreground text-xs" /></div>
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-description" className="text-right">Desc*</Label><Input id="rule-description" name="description" value={currentRule.description || ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule} /></div>
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-priority" className="text-right">Priority*</Label><Input id="rule-priority" name="priority" type="number" value={currentRule.priority ?? 100} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule} placeholder="Lower = higher priority" min="1" /></div>
                         <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="rule-lotId" className="text-right">Lot Scope</Label>
                             <Select name="lotId" value={currentRule.lotId || 'all'} onValueChange={(value) => handleRuleSelectChange('lotId', value)} disabled={isSavingRule || (!isAdmin && isParkingLotOwner && !sampleUsers.find(u => u.id === userId)?.associatedLots.includes('*'))}>
                                 <SelectTrigger id="rule-lotId" className="col-span-3"><SelectValue placeholder="Select lot scope" /></SelectTrigger>
                                 <SelectContent> { (isAdmin || (isParkingLotOwner && sampleUsers.find(u => u.id === userId)?.associatedLots.includes('*'))) && <SelectItem value="all">Global (All Lots)</SelectItem> } {getDisplayLots().map(lot => (<SelectItem key={lot.id} value={lot.id}>{lot.name}</SelectItem>))} </SelectContent> </Select> </div>
                         <Separator className="col-span-4 my-2" /> <p className="col-span-4 text-sm font-medium text-muted-foreground -mb-2">Rate/Discount (Define ONE type)</p>
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-baseRatePerHour" className="text-right">Base ($/hr)</Label><ShadInput id="rule-baseRatePerHour" name="baseRatePerHour" type="number" value={currentRule.baseRatePerHour ?? ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule || currentRule.flatRate !== undefined || currentRule.discountPercentage !== undefined} placeholder="e.g., 2.50" step="0.01" min="0"/></div>
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-flatRate" className="text-right">Flat ($)</Label><ShadInput id="rule-flatRate" name="flatRate" type="number" value={currentRule.flatRate ?? ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule || currentRule.baseRatePerHour !== undefined || currentRule.discountPercentage !== undefined} placeholder="e.g., 10.00" step="0.01" min="0"/></div>
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-flatRateDurationMinutes" className="text-right">Duration (min)</Label><ShadInput id="rule-flatRateDurationMinutes" name="flatRateDurationMinutes" type="number" value={currentRule.flatRateDurationMinutes ?? ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule || currentRule.baseRatePerHour !== undefined || currentRule.discountPercentage !== undefined || currentRule.flatRate === undefined} placeholder="e.g., 1440 daily" min="1"/></div>
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-discountPercentage" className="text-right">Discount (%)</Label><ShadInput id="rule-discountPercentage" name="discountPercentage" type="number" value={currentRule.discountPercentage ?? ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule || currentRule.baseRatePerHour !== undefined || currentRule.flatRate !== undefined} placeholder="e.g., 10 for 10%" min="0" max="100"/></div>
                         <Separator className="col-span-4 my-2" /> <p className="col-span-4 text-sm font-medium text-muted-foreground -mb-2">Conditions (Optional)</p>
                          <div className="grid grid-cols-4 items-start gap-4"> <Label className="text-right pt-2">Days</Label> <MultiSelect options={daysOfWeekOptions} selected={currentRule.timeCondition?.daysOfWeek || []} onChange={handleRuleDaysOfWeekChange} placeholder="Select days..." className="col-span-3" disabled={isSavingRule} /> </div>
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-startTime" className="text-right">Time Range</Label><div className="col-span-3 flex items-center gap-2"><ShadInput id="rule-startTime" name="startTime" type="time" value={currentRule.timeCondition?.startTime || ''} onChange={handleRuleTimeConditionChange} className="flex-1" disabled={isSavingRule} /><span className="text-muted-foreground">-</span><ShadInput id="rule-endTime" name="endTime" type="time" value={currentRule.timeCondition?.endTime || ''} onChange={handleRuleTimeConditionChange} className="flex-1" disabled={isSavingRule} /></div></div>
                          <div className="grid grid-cols-4 items-start gap-4"> <Label className="text-right pt-2">User Tiers</Label> <MultiSelect options={userTierOptions} selected={currentRule.userTierCondition || []} onChange={handleRuleUserTiersChange} placeholder="Select tiers..." className="col-span-3" disabled={isSavingRule} /> </div>
                         <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="rule-eventCondition" className="text-right">Event Name</Label><Input id="rule-eventCondition" name="eventCondition" value={currentRule.eventCondition || ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule} placeholder="e.g., Concert Night"/></div>
                    </div>
                </ScrollArea>
                <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSavingRule}>Cancel</Button></DialogClose><Button type="submit" onClick={handleSaveRule} disabled={isSavingRule}>{isSavingRule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{currentRule.ruleId ? 'Save Changes' : 'Create Rule'}</Button></DialogFooter>
            </DialogContent>
        </Dialog>

         {/* Manage Subscription Modal (Admin Only) */}
         <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
             <DialogContent className="sm:max-w-md">
                 <DialogHeader>
                     <DialogTitle>Manage Subscription</DialogTitle>
                     <DialogDescription>
                         Update subscription status for {parkingLots.find(l => l.id === currentSubscription.lotId)?.name || 'this lot'}.
                     </DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-4 py-4">
                      <div className="space-y-1">
                         <Label htmlFor="sub-status">Status</Label>
                         <Select
                            value={currentSubscription.status}
                            onValueChange={(value) => handleSubscriptionFormChange('status', value)}
                            disabled={isSavingSubscription}
                         >
                            <SelectTrigger id="sub-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                     {currentSubscription.status === 'trial' && (
                         <div className="space-y-1">
                             <Label htmlFor="sub-trialEndDate">Trial End Date*</Label>
                              <DatePicker
                                 date={currentSubscription.trialEndDate}
                                 setDate={(date) => handleSubscriptionFormChange('trialEndDate', date)}
                                 disabled={isSavingSubscription}
                             />
                         </div>
                     )}
                      {(currentSubscription.status === 'inactive' || currentSubscription.status === 'expired') && (
                           <Button variant="outline" size="sm" onClick={() => handleStartTrial(currentSubscription.lotId)} disabled={isSavingSubscription}>
                             <CalendarClock className="mr-2 h-4 w-4" /> Start 14-Day Trial
                           </Button>
                      )}
                 </div>
                 <DialogFooter>
                     <DialogClose asChild><Button type="button" variant="outline" disabled={isSavingSubscription}>Cancel</Button></DialogClose>
                     <Button type="submit" onClick={handleSaveSubscription} disabled={isSavingSubscription}>
                         {isSavingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Save Changes
                     </Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>

    </div>
  );
}

    