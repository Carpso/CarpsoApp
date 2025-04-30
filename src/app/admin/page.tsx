'use client'; // Required for state and effects

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, UserCog, LayoutDashboard, BarChart, Settings, MapPin, Loader2, Download, Sparkles, Fuel, SprayCan, Wifi, BadgeCent, PlusCircle, Trash2, Megaphone, Image as ImageIcon, Calendar, Bath, ConciergeBell, DollarSign, Clock, Users, Tag } from "lucide-react"; // Added DollarSign, Clock, Users, Tag
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot';
import { getAvailableParkingLots, updateParkingLotServices } from '@/services/parking-lot';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Advertisement } from '@/services/advertisement';
import { getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement } from '@/services/advertisement';
import type { PricingRule } from '@/services/pricing-service'; // Import PricingRule type
import { getAllPricingRules, savePricingRule, deletePricingRule } from '@/services/pricing-service'; // Import pricing services
import Image from "next/image";
import { AppStateContext } from '@/context/AppStateProvider';
import { useContext } from 'react';
import { Input as ShadInput } from "@/components/ui/input"; // Alias ShadCN input to avoid conflict
import { MultiSelect } from '@/components/ui/multi-select'; // Assuming a MultiSelect component exists

// TODO: Protect this route/page to be accessible only by users with 'Admin' or 'ParkingLotOwner' roles.

// Placeholder data - replace with actual data fetching based on selectedLotId
const sampleUsers = [
  { id: 'usr_1', name: 'Alice Smith', email: 'alice@example.com', role: 'User', associatedLots: ['lot_A'] },
  { id: 'usr_2', name: 'Bob Johnson', email: 'bob@example.com', role: 'ParkingLotOwner', associatedLots: ['lot_B'] },
  { id: 'usr_3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', associatedLots: ['lot_A', 'lot_C'] },
  { id: 'usr_4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', associatedLots: ['*'] }, // '*' means all lots
  { id: 'usr_5', name: 'Eve Adams', email: 'eve@example.com', role: 'ParkingLotOwner', associatedLots: ['lot_C'] },
];

// Sample Analytics Data (Structure - will be filtered)
const sampleAnalyticsData: Record<string, { revenue: number; avgOccupancy: number; activeReservations: number }> = {
    'lot_A': { revenue: 543.21, avgOccupancy: 80, activeReservations: 5 },
    'lot_B': { revenue: 1234.56, avgOccupancy: 75, activeReservations: 15 },
    'lot_C': { revenue: 987.65, avgOccupancy: 90, activeReservations: 10 },
    'lot_D': { revenue: 321.98, avgOccupancy: 60, activeReservations: 3 },
    'all': { revenue: 3087.40, avgOccupancy: 76, activeReservations: 33 }, // Aggregate
};

// Available services that can be added/managed
const allAvailableServices: ParkingLotService[] = ['EV Charging', 'Car Wash', 'Mobile Money Agent', 'Valet', 'Restroom', 'Wifi'];
const userTiers = ['Basic', 'Premium']; // Available subscription tiers
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Initial state for the Ad form
const initialAdFormState: Partial<Advertisement> = {
    title: '',
    description: '',
    imageUrl: '',
    targetLocationId: '',
    startDate: '',
    endDate: '',
    associatedService: undefined,
    status: 'active',
};

// Initial state for the Pricing Rule form
const initialPricingRuleFormState: Partial<PricingRule> = {
    ruleId: '',
    lotId: '',
    description: '',
    baseRatePerHour: undefined,
    flatRate: undefined,
    flatRateDurationMinutes: undefined,
    discountPercentage: undefined,
    timeCondition: { daysOfWeek: [], startTime: '', endTime: '' },
    eventCondition: '',
    userTierCondition: [],
    priority: 100,
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
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]); // State for pricing rules
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [errorLoadingRules, setErrorLoadingRules] = useState<string | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<Partial<PricingRule>>(initialPricingRuleFormState);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const { toast } = useToast();
  const { userRole, userId } = useContext(AppStateContext)!;

  const isParkingLotOwner = userRole === 'ParkingLotOwner';
  const isAdmin = userRole === 'Admin';

  // --- Data Fetching ---
  const fetchLots = useCallback(async () => {
      setIsLoadingLots(true);
      setErrorLoadingLots(null);
      try {
          let lots = await getAvailableParkingLots();
          if (isParkingLotOwner && userId) {
              const ownerLots = sampleUsers.find(user => user.id === userId)?.associatedLots || [];
              lots = lots.filter(lot => ownerLots.includes(lot.id));
          }
          setParkingLots(lots);
      } catch (err) {
        console.error("Failed to fetch parking lots:", err);
        setErrorLoadingLots("Could not load parking lots.");
         toast({ title: "Error Loading Lots", description: "Could not fetch parking lot data.", variant: "destructive" });
      } finally {
        setIsLoadingLots(false);
      }
    }, [isParkingLotOwner, userId, toast]);

  const fetchAds = useCallback(async (locationId: string) => {
      setIsLoadingAds(true);
      setErrorLoadingAds(null);
      try {
          let ads = await getAdvertisements(locationId === 'all' ? undefined : locationId);
           if (isParkingLotOwner && userId) {
               const ownerLots = sampleUsers.find(user => user.id === userId)?.associatedLots || [];
               ads = ads.filter(ad => !ad.targetLocationId || ownerLots.includes(ad.targetLocationId)); // Show global or owned lot ads
           }
          const adsWithLocationNames = ads.map(ad => ({ ...ad, targetLotName: parkingLots.find(lot => lot.id === ad.targetLocationId)?.name }));
          setAdvertisements(adsWithLocationNames);
      } catch (err) {
          console.error("Failed to fetch advertisements:", err);
          setErrorLoadingAds("Could not load advertisements.");
          toast({ title: "Error Loading Ads", description: "Could not fetch advertisement data.", variant: "destructive" });
      } finally {
          setIsLoadingAds(false);
      }
  }, [isParkingLotOwner, userId, parkingLots, toast]);

  const fetchPricingRules = useCallback(async () => {
      setIsLoadingRules(true);
      setErrorLoadingRules(null);
      try {
          let rules = await getAllPricingRules();
          if (isParkingLotOwner && userId) {
               const ownerLots = sampleUsers.find(user => user.id === userId)?.associatedLots || [];
               rules = rules.filter(rule => !rule.lotId || ownerLots.includes(rule.lotId)); // Show global or owned lot rules
          }
          setPricingRules(rules.map(rule => ({ ...rule, lotName: parkingLots.find(lot => lot.id === rule.lotId)?.name }))); // Add lot name
      } catch (err) {
          console.error("Failed to fetch pricing rules:", err);
          setErrorLoadingRules("Could not load pricing rules.");
          toast({ title: "Error Loading Rules", description: "Could not fetch pricing rule data.", variant: "destructive" });
      } finally {
          setIsLoadingRules(false);
      }
  }, [isParkingLotOwner, userId, parkingLots, toast]);


  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  useEffect(() => {
    if (parkingLots.length > 0) {
         fetchAds(selectedLotId);
         fetchPricingRules(); // Fetch rules after lots are available
    }
  }, [selectedLotId, parkingLots, fetchAds, fetchPricingRules]); // Re-fetch ads/rules when scope changes

  // --- Component State & Logic ---
  const selectedLot = parkingLots.find(lot => lot.id === selectedLotId);
  const displayedUsers = selectedLotId === 'all'
    ? (isAdmin ? sampleUsers : []) // Only Admin sees all users
    : sampleUsers.filter(user => (isAdmin || isParkingLotOwner) && (user.associatedLots.includes(selectedLotId) || user.associatedLots.includes('*')));

   const displayedAnalytics = selectedLotId === 'all'
    ? (isAdmin ? sampleAnalyticsData['all'] : { revenue: 0, avgOccupancy: 0, activeReservations: 0 }) // Only Admin sees all analytics
    : sampleAnalyticsData[selectedLotId] || { revenue: 0, avgOccupancy: 0, activeReservations: 0 };

   const displayedPricingRules = selectedLotId === 'all'
       ? pricingRules // Show all accessible rules
       : pricingRules.filter(rule => rule.lotId === selectedLotId || !rule.lotId); // Show specific lot or global rules


    // --- Placeholder Download Handlers ---
    const handleDownloadUsers = () => {
        console.log("Download users clicked for scope:", selectedLotId, displayedUsers);
        toast({ title: "Download Started (Simulation)", description: `Downloading user data for ${selectedLot ? selectedLot.name : 'all locations'}.`});
        // TODO: Implement actual CSV/spreadsheet generation and download
    };
    const handleDownloadLots = () => {
        console.log("Download lots clicked:", parkingLots);
        toast({ title: "Download Started (Simulation)", description: "Downloading parking lot data."});
        // TODO: Implement actual CSV/spreadsheet generation and download
    };
     const handleDownloadAnalytics = () => {
        console.log("Download analytics clicked for scope:", selectedLotId, displayedAnalytics);
        toast({ title: "Download Started (Simulation)", description: `Downloading analytics report for ${selectedLot ? selectedLot.name : 'all locations'}.`});
        // TODO: Implement actual CSV/spreadsheet generation and download
    };
    const handleDownloadAds = () => {
        console.log("Download ads clicked for scope:", selectedLotId, advertisements);
        toast({ title: "Download Started (Simulation)", description: `Downloading advertisement data for ${selectedLot ? selectedLot.name : 'all locations'}.`});
        // TODO: Implement actual CSV/spreadsheet generation and download
    };
    const handleDownloadRules = () => {
        console.log("Download rules clicked for scope:", selectedLotId, displayedPricingRules);
        toast({ title: "Download Started (Simulation)", description: `Downloading pricing rules for ${selectedLot ? selectedLot.name : 'all locations'}.`});
        // TODO: Implement actual CSV/spreadsheet generation and download
    };
    // --- End Placeholder Download Handlers ---

   // --- Service Management ---
    const handleServiceToggle = async (service: ParkingLotService, isChecked: boolean) => {
        if (!selectedLot || (!isAdmin && !isParkingLotOwner)) return; // Authorization check
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
                 // Update the services for the currently displayed rules if the lot matches
                 setPricingRules(prevRules => prevRules.map(rule =>
                     rule.lotId === selectedLotId ? { ...rule, lot: { ...(rule as any).lot, services: updatedServices } } : rule
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
         if (ad && isParkingLotOwner && ad.targetLocationId && !sampleUsers.find(user => user.id === userId)?.associatedLots.includes(ad.targetLocationId)) {
              toast({ title: "Unauthorized", description: "You can only edit ads associated with your parking lots.", variant: "destructive" });
              return;
          }
         // Ensure owner cannot edit global ads unless they are also Admin
         if (ad && isParkingLotOwner && !isAdmin && !ad.targetLocationId) {
              toast({ title: "Unauthorized", description: "You cannot edit global advertisements.", variant: "destructive" });
              return;
         }

        if (ad) {
            setCurrentAd(ad);
        } else {
            setCurrentAd({
                ...initialAdFormState,
                targetLocationId: selectedLotId !== 'all' ? selectedLotId : '', // Pre-fill if a specific lot is selected
            });
        }
        setIsAdModalOpen(true);
    };

    const handleAdFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCurrentAd(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
     const handleAdSelectChange = (name: keyof Advertisement, value: string) => {
         setCurrentAd(prev => ({ ...prev, [name]: value }));
     };

    const handleSaveAd = async () => {
        if (!currentAd.title || !currentAd.description) {
            toast({ title: "Missing Information", description: "Please fill in title and description.", variant: "destructive" });
            return;
        }
         // Admin can create global ads (targetLocationId = '')
         // Owner can only create ads for their lots (targetLocationId must be one of their lots)
         if (isParkingLotOwner && !isAdmin && (!currentAd.targetLocationId || !sampleUsers.find(user => user.id === userId)?.associatedLots.includes(currentAd.targetLocationId))) {
            toast({ title: "Invalid Location", description: "Please select one of your assigned parking lots as the target location.", variant: "destructive" });
            return;
         }

        setIsSavingAd(true);
        try {
            let savedAd: Advertisement | null = null;
            const adDataToSave = {
                ...currentAd,
                targetLocationId: currentAd.targetLocationId === 'all' ? '' : currentAd.targetLocationId, // Ensure 'all' maps to empty string
                targetLotName: undefined, // Don't save temporary name
            };

            if (currentAd.id) {
                savedAd = await updateAdvertisement(currentAd.id, adDataToSave);
            } else {
                savedAd = await createAdvertisement(adDataToSave);
            }

            if (savedAd) {
                 await fetchAds(selectedLotId); // Re-fetch ads for the current scope
                toast({ title: "Advertisement Saved", description: `"${savedAd.title}" has been ${currentAd.id ? 'updated' : 'created'}.` });
                setIsAdModalOpen(false);
            } else { throw new Error("Backend save failed."); }
        } catch (error) {
            console.error("Failed to save advertisement:", error);
            toast({ title: "Save Failed", description: "Could not save the advertisement.", variant: "destructive" });
        } finally {
            setIsSavingAd(false);
        }
    };

    const handleDeleteAd = async (adId: string) => {
         const adToDelete = advertisements.find(ad => ad.id === adId);
         if (!adToDelete) return;

         // Authorization check
         if (isParkingLotOwner && !isAdmin && adToDelete.targetLocationId && !sampleUsers.find(user => user.id === userId)?.associatedLots.includes(adToDelete.targetLocationId)) {
             toast({ title: "Unauthorized", description: "You can only delete ads associated with your parking lots.", variant: "destructive" }); return;
         }
         if (isParkingLotOwner && !isAdmin && !adToDelete.targetLocationId) {
              toast({ title: "Unauthorized", description: "You cannot delete global advertisements.", variant: "destructive" }); return;
         }
        // Optional: Confirmation dialog

        setIsDeletingAd(true);
        try {
            const success = await deleteAdvertisement(adId);
            if (success) {
                 setAdvertisements(prevAds => prevAds.filter(ad => ad.id !== adId));
                 toast({ title: "Advertisement Deleted" });
            } else { throw new Error("Backend delete failed."); }
        } catch (error) {
            console.error("Failed to delete advertisement:", error);
            toast({ title: "Deletion Failed", variant: "destructive" });
        } finally {
            setIsDeletingAd(false);
        }
    };
    // --- End Advertisement Management ---

    // --- Pricing Rule Management ---
    const handleOpenRuleModal = (rule: PricingRule | null = null) => {
         // Authorization: Only Admins can edit global rules or rules for lots they don't own
         if (rule && !isAdmin && rule.lotId && !sampleUsers.find(user => user.id === userId)?.associatedLots.includes(rule.lotId)) {
              toast({ title: "Unauthorized", description: "You can only manage rules for your assigned lots.", variant: "destructive" }); return;
         }
         if (rule && !isAdmin && !rule.lotId) {
             toast({ title: "Unauthorized", description: "Only Admins can manage global rules.", variant: "destructive" }); return;
         }

        if (rule) {
            setCurrentRule({
                ...rule,
                // Ensure timeCondition exists for the form
                timeCondition: rule.timeCondition || { daysOfWeek: [], startTime: '', endTime: '' },
                userTierCondition: rule.userTierCondition || [],
            });
        } else {
             // Creating new rule
             const newRuleId = `rule_${Date.now()}`;
            setCurrentRule({
                ...initialPricingRuleFormState,
                ruleId: newRuleId, // Generate a temporary ID or handle on backend
                lotId: selectedLotId !== 'all' ? selectedLotId : '', // Pre-fill if specific lot selected
                priority: 100, // Default priority
            });
        }
        setIsRuleModalOpen(true);
    };

    const handleRuleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setCurrentRule(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value
        }));
    };

     const handleRuleSelectChange = (name: keyof PricingRule, value: string | string[]) => {
        setCurrentRule(prev => ({ ...prev, [name]: value }));
    };

     const handleRuleTimeConditionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target; // name will be 'startTime' or 'endTime'
        setCurrentRule(prev => ({
            ...prev,
            timeCondition: { ...prev?.timeCondition, [name]: value }
        }));
    };

     const handleRuleDaysOfWeekChange = (selectedDays: string[]) => {
         setCurrentRule(prev => ({
             ...prev,
             timeCondition: { ...(prev?.timeCondition || {}), daysOfWeek: selectedDays as any }
         }));
     };
      const handleRuleUserTiersChange = (selectedTiers: string[]) => {
         setCurrentRule(prev => ({
             ...prev,
             userTierCondition: selectedTiers as ('Basic' | 'Premium')[]
         }));
     };


    const handleSaveRule = async () => {
        if (!currentRule.description || !currentRule.priority) {
            toast({ title: "Missing Information", description: "Please fill in description and priority.", variant: "destructive" });
            return;
        }
        // Validation: Must have at least one rate type or discount
        if (currentRule.baseRatePerHour === undefined && currentRule.flatRate === undefined && currentRule.discountPercentage === undefined) {
             toast({ title: "Invalid Rule", description: "Rule must define a base rate, flat rate, or discount percentage.", variant: "destructive" });
             return;
        }
         // Authorization: Owner cannot create global rules
         if (isParkingLotOwner && !isAdmin && (!currentRule.lotId || !sampleUsers.find(user => user.id === userId)?.associatedLots.includes(currentRule.lotId))) {
            toast({ title: "Invalid Location", description: "Please select one of your assigned parking lots or leave blank only if you are an Admin.", variant: "destructive" });
            return;
         }

        setIsSavingRule(true);
        try {
            // Prepare data for saving (ensure empty strings/arrays are handled if needed by backend)
            const ruleToSave: PricingRule = {
                ...(currentRule as PricingRule), // Assume complete structure by now
                lotId: currentRule.lotId === 'all' || currentRule.lotId === '' ? undefined : currentRule.lotId, // Map empty/all to undefined
                // Clean up empty conditions before saving? Depends on backend expectations.
                 timeCondition: (currentRule.timeCondition?.daysOfWeek?.length || currentRule.timeCondition?.startTime || currentRule.timeCondition?.endTime) ? currentRule.timeCondition : undefined,
                 userTierCondition: currentRule.userTierCondition?.length ? currentRule.userTierCondition : undefined,
                 eventCondition: currentRule.eventCondition || undefined,
            };

            const savedRule = await savePricingRule(ruleToSave);

            if (savedRule) {
                 await fetchPricingRules(); // Re-fetch rules
                toast({ title: "Pricing Rule Saved", description: `Rule "${savedRule.description}" has been saved.` });
                setIsRuleModalOpen(false);
            } else { throw new Error("Backend save failed."); }
        } catch (error) {
            console.error("Failed to save pricing rule:", error);
            toast({ title: "Save Failed", description: "Could not save the pricing rule.", variant: "destructive" });
        } finally {
            setIsSavingRule(false);
        }
    };

     const handleDeleteRule = async (ruleId: string) => {
          const ruleToDelete = pricingRules.find(r => r.ruleId === ruleId);
         if (!ruleToDelete) return;
         // Authorization check
         if (!isAdmin && ruleToDelete.lotId && !sampleUsers.find(user => user.id === userId)?.associatedLots.includes(ruleToDelete.lotId)) {
             toast({ title: "Unauthorized", description: "You can only delete rules for your assigned lots.", variant: "destructive" }); return;
         }
          if (!isAdmin && !ruleToDelete.lotId) {
             toast({ title: "Unauthorized", description: "Only Admins can delete global rules.", variant: "destructive" }); return;
         }
        // Optional: Confirmation dialog

         setIsDeletingRule(true);
         try {
             const success = await deletePricingRule(ruleId);
             if (success) {
                 setPricingRules(prevRules => prevRules.filter(r => r.ruleId !== ruleId));
                 toast({ title: "Pricing Rule Deleted" });
             } else { throw new Error("Backend delete failed."); }
         } catch (error) {
             console.error("Failed to delete pricing rule:", error);
             toast({ title: "Deletion Failed", variant: "destructive" });
         } finally {
             setIsDeletingRule(false);
         }
     };
    // --- End Pricing Rule Management ---


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

   const isAuthorizedForLot = (lotId: string) => {
        return isAdmin || !isParkingLotOwner || sampleUsers.find(user => user.id === userId)?.associatedLots.includes(lotId) || lotId === 'all';
    };

   const getDisplayLots = () => {
        return parkingLots.filter(lot => isAuthorizedForLot(lot.id));
    };

   const calculateAverageRevenue = () => {
         const lots = getDisplayLots();
         if (!lots || lots.length === 0) return 0;
        const totalRevenue = lots.reduce((sum, lot) => sum + (sampleAnalyticsData[lot.id]?.revenue || 0), 0);
        return totalRevenue / lots.length;
    };
    const averageRevenue = calculateAverageRevenue();
   // --- End Helper Functions ---


  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
             <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    {isAdmin ? "Admin" : "Owner"} Dashboard
                </CardTitle>
                <CardDescription>
                    Manage users, lots, services, ads, pricing, and view analytics.
                    {selectedLot ? ` (Viewing: ${selectedLot.name})` : ' (Viewing: All Locations)'}
                </CardDescription>
                 <Badge variant="secondary">{userRole}</Badge>
             </div>
             {/* Parking Lot Selector */}
             {(isAdmin || isParkingLotOwner) && (
             <div className="min-w-[250px]">
                 {isLoadingLots ? (
                     <Skeleton className="h-10 w-full" />
                 ) : errorLoadingLots ? (
                     <p className="text-sm text-destructive">{errorLoadingLots}</p>
                 ) : (
                    <Select
                        value={selectedLotId}
                        onValueChange={(value) => setSelectedLotId(value)}
                        disabled={!isAdmin && parkingLots.length <= 1} // Disable if owner only has 1 lot
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select location scope..." />
                        </SelectTrigger>
                        <SelectContent>
                            {isAdmin && <SelectItem value="all">All Locations</SelectItem>}
                            {getDisplayLots().map((lot) => (
                                <SelectItem key={lot.id} value={lot.id}>
                                    <span className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" /> {lot.name}
                                    </span>
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
             <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7 mb-6 overflow-x-auto"> {/* Adjusted grid cols */}
               <TabsTrigger value="users"><UserCog className="mr-2 h-4 w-4"/>Users</TabsTrigger>
               <TabsTrigger value="lots"><LayoutDashboard className="mr-2 h-4 w-4"/>Lots</TabsTrigger>
               <TabsTrigger value="services"><Sparkles className="mr-2 h-4 w-4"/>Services</TabsTrigger>
               <TabsTrigger value="ads"><Megaphone className="mr-2 h-4 w-4"/>Ads</TabsTrigger>
               <TabsTrigger value="pricing"><DollarSign className="mr-2 h-4 w-4"/>Pricing</TabsTrigger> {/* Added Pricing Tab */}
               <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4"/>Analytics</TabsTrigger>
               <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/>Settings</TabsTrigger>
             </TabsList>

             {/* User Management Tab */}
             <TabsContent value="users">
               <Card>
                 <CardHeader>
                   <CardTitle>User Management {selectedLot ? ` - ${selectedLot.name}` : ' - All Locations'}</CardTitle>
                   <CardDescription>View, edit, or remove users and manage their roles {selectedLot ? ` associated with ${selectedLot.name}` : (isAdmin ? 'across all locations' : '(Admin only)')}.</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search users..." className="max-w-sm" />
                        <Button>Search</Button>
                        {isAdmin && (
                            <div className="ml-auto flex gap-2">
                                <Button variant="outline" onClick={handleDownloadUsers}>
                                    <Download className="mr-2 h-4 w-4" /> Download List
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
                             <TableHeader>
                               <TableRow>
                                 <TableHead>Name</TableHead>
                                 <TableHead>Email</TableHead>
                                 <TableHead>Role</TableHead>
                                 {selectedLotId === 'all' && <TableHead>Associated Lots</TableHead>}
                                 <TableHead className="text-right">Actions</TableHead>
                               </TableRow>
                             </TableHeader>
                             <TableBody>
                               {displayedUsers.map((user) => (
                                 <TableRow key={user.id}>
                                   <TableCell className="font-medium">{user.name}</TableCell>
                                   <TableCell>{user.email}</TableCell>
                                   <TableCell>{user.role}</TableCell>
                                   {selectedLotId === 'all' && <TableCell>{user.associatedLots.join(', ')}</TableCell>}
                                   <TableCell className="text-right space-x-1">
                                     <Button variant="ghost" size="sm">Edit</Button>
                                     <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Delete</span>
                                     </Button>
                                   </TableCell>
                                 </TableRow>
                               ))}
                             </TableBody>
                           </Table>
                       ) : (
                            <p className="text-muted-foreground text-center py-4">No users found matching the current filter.</p>
                       )
                    ) : (
                        <p className="text-muted-foreground text-center py-4">User management is available for specific lots or by Admins for all locations.</p>
                    )}
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Parking Lot Management Tab */}
              <TabsContent value="lots">
               <Card>
                 <CardHeader>
                   <CardTitle>Parking Lot Management</CardTitle>
                   <CardDescription>Monitor status and manage parking lots you have access to.</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search lots..." className="max-w-sm" />
                        <Button>Search</Button>
                         {(isAdmin) && ( // Only Admin can add lots / download all
                             <div className="ml-auto flex gap-2">
                                 <Button variant="outline" onClick={handleDownloadLots}>
                                     <Download className="mr-2 h-4 w-4" /> Download List
                                 </Button>
                                 <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Lot</Button>
                             </div>
                         )}
                    </div>
                 </CardHeader>
                 <CardContent>
                    {isLoadingLots ? (
                         <div className="space-y-2">
                             <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                         </div>
                    ) : errorLoadingLots ? (
                         <p className="text-destructive text-center py-4">{errorLoadingLots}</p>
                    ) : getDisplayLots().length > 0 ? (
                       <Table>
                         <TableHeader>
                           <TableRow>
                             <TableHead>Lot Name</TableHead>
                             <TableHead>Capacity</TableHead>
                             <TableHead>Current Occupancy</TableHead>
                             <TableHead>Status</TableHead>
                             <TableHead>Services</TableHead>
                             <TableHead className="text-right">Actions</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {getDisplayLots().map((lot) => (
                             <TableRow key={lot.id}>
                               <TableCell className="font-medium">{lot.name}</TableCell>
                               <TableCell>{lot.capacity}</TableCell>
                               <TableCell>{lot.currentOccupancy ?? 'N/A'}</TableCell>
                               <TableCell>{lot.currentOccupancy !== undefined ? `${((lot.currentOccupancy / lot.capacity) * 100).toFixed(0)}% Full` : 'N/A'}</TableCell>
                               <TableCell>
                                   <div className="flex flex-wrap gap-1">
                                      {(lot.services && lot.services.length > 0) ? lot.services.map(service => (
                                           <Badge key={service} variant="secondary" size="sm" className="flex items-center whitespace-nowrap">
                                                {getServiceIcon(service)} {service}
                                           </Badge>
                                       )) : <span className="text-xs text-muted-foreground">None</span>}
                                   </div>
                                </TableCell>
                               <TableCell className="text-right space-x-1">
                                  <Button variant="ghost" size="sm">Details</Button>
                                  {isAdmin && <Button variant="ghost" size="sm">Edit</Button> }
                                  {isAdmin && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                     <Trash2 className="h-4 w-4 sm:mr-1" />
                                     <span className="hidden sm:inline">Disable</span>
                                  </Button>}
                               </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                    ) : (
                         <p className="text-muted-foreground text-center py-4">No parking lots found matching your access.</p>
                    )}
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Services Management Tab */}
              <TabsContent value="services">
                <Card>
                  <CardHeader>
                     <CardTitle>Manage Lot Services {selectedLot ? ` - ${selectedLot.name}` : ''}</CardTitle>
                     <CardDescription>
                       {selectedLot ? `Enable or disable services offered at ${selectedLot.name}.` : 'Please select a specific parking lot to manage its services.'}
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                      {isLoadingLots ? ( <Skeleton className="h-24 w-full" /> )
                      : errorLoadingLots ? ( <p className="text-destructive text-center py-4">{errorLoadingLots}</p> )
                      : !selectedLot ? ( <p className="text-muted-foreground text-center py-4">Select a parking lot from the dropdown above.</p> )
                      : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {allAvailableServices.map((service) => {
                                const isChecked = selectedLot.services?.includes(service) ?? false;
                                return (
                                   <div key={service} className="flex items-center space-x-3 p-3 border rounded-md bg-background hover:bg-accent/10 transition-colors">
                                       <Checkbox
                                           id={`service-${service}`}
                                           checked={isChecked}
                                           onCheckedChange={(checked) => handleServiceToggle(service, !!checked)}
                                           disabled={isUpdatingServices || (!isAdmin && !isParkingLotOwner)} // Disable if not authorized
                                       />
                                       <label htmlFor={`service-${service}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center cursor-pointer">
                                            {getServiceIcon(service)} {service}
                                       </label>
                                       {isUpdatingServices && isChecked !== (selectedLot.services?.includes(service) ?? false) && (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
                                        )}
                                   </div>
                                );
                             })}
                         </div>
                      )}
                  </CardContent>
                </Card>
              </TabsContent>

             {/* Advertisement Management Tab */}
             <TabsContent value="ads">
               <Card>
                 <CardHeader>
                   <CardTitle>Advertisement Management {selectedLot ? ` - ${selectedLot.name}` : ' - All Locations'}</CardTitle>
                   <CardDescription>Create and manage advertisements shown to users.</CardDescription>
                   <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search ads by title..." className="max-w-sm" />
                        <Button>Search</Button>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={handleDownloadAds}>
                                <Download className="mr-2 h-4 w-4" /> Download List
                            </Button>
                            <Button variant="default" onClick={() => handleOpenAdModal()}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create Ad
                            </Button>
                        </div>
                   </div>
                 </CardHeader>
                 <CardContent>
                   {isLoadingAds ? ( <Skeleton className="h-32 w-full" /> )
                   : errorLoadingAds ? ( <p className="text-destructive text-center py-4">{errorLoadingAds}</p> )
                   : advertisements.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Title</TableHead>
                                    {selectedLotId === 'all' && <TableHead>Target Location</TableHead>}
                                    <TableHead>Runs</TableHead>
                                    <TableHead>Associated Service</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {advertisements.map((ad) => {
                                     const targetLotName = ad.targetLotName || (ad.targetLocationId ? 'Unknown Lot' : 'All Locations');
                                     const statusColor = ad.status === 'active' ? 'text-green-600' : ad.status === 'inactive' ? 'text-orange-600' : 'text-gray-500';
                                     const canEdit = isAdmin || (isParkingLotOwner && (!ad.targetLocationId || sampleUsers.find(u=>u.id===userId)?.associatedLots.includes(ad.targetLocationId)));
                                     const canDelete = canEdit;
                                     return (
                                        <TableRow key={ad.id}>
                                            <TableCell><Image src={ad.imageUrl || `https://picsum.photos/seed/${ad.id}/100/50`} alt={ad.title} width={80} height={40} className="rounded object-cover aspect-[2/1]" /></TableCell>
                                            <TableCell className="font-medium">{ad.title}</TableCell>
                                            {selectedLotId === 'all' && <TableCell>{targetLotName}</TableCell>}
                                            <TableCell className="text-xs">{ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'N/A'} - {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Ongoing'}</TableCell>
                                             <TableCell className="text-xs">
                                                {ad.associatedService ? (<Badge variant="outline" size="sm" className="flex items-center w-fit">{getServiceIcon(ad.associatedService, "h-3 w-3 mr-1")} {ad.associatedService}</Badge>) : <span className="text-muted-foreground">None</span>}
                                             </TableCell>
                                            <TableCell className={`text-xs font-medium ${statusColor}`}>{ad.status?.charAt(0).toUpperCase() + ad.status?.slice(1) || 'Unknown'}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenAdModal(ad)} disabled={!canEdit}>Edit</Button>
                                                 <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAd(ad.id)} disabled={isDeletingAd || !canDelete}>
                                                    {isDeletingAd ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 sm:mr-1" />} <span className="hidden sm:inline">Delete</span>
                                                 </Button>
                                            </TableCell>
                                        </TableRow>
                                     );
                                })}
                            </TableBody>
                        </Table>
                   ) : (
                       <div className="text-center py-10 text-muted-foreground">
                            <Megaphone className="mx-auto h-10 w-10 mb-2" />
                            <p>No advertisements found for {selectedLot ? selectedLot.name : 'all locations'}.</p>
                             <Button size="sm" className="mt-4" onClick={() => handleOpenAdModal()}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create First Ad
                            </Button>
                       </div>
                   )}
                 </CardContent>
               </Card>
             </TabsContent>

            {/* Pricing Rules Tab */}
            <TabsContent value="pricing">
               <Card>
                 <CardHeader>
                   <CardTitle>Dynamic Pricing Rules {selectedLot ? ` - ${selectedLot.name}` : ' - All Locations'}</CardTitle>
                   <CardDescription>Manage pricing rules based on time, events, or user tiers.</CardDescription>
                   <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search rules by description..." className="max-w-sm" />
                        <Button>Search</Button>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={handleDownloadRules}>
                                <Download className="mr-2 h-4 w-4" /> Download Rules
                            </Button>
                            {/* Only Admin can create global rules, Owner can create for their lots */}
                            {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) && (
                                <Button variant="default" onClick={() => handleOpenRuleModal(null)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Create Rule
                                </Button>
                            )}
                        </div>
                   </div>
                 </CardHeader>
                 <CardContent>
                    {isLoadingRules ? ( <Skeleton className="h-32 w-full" /> )
                    : errorLoadingRules ? ( <p className="text-destructive text-center py-4">{errorLoadingRules}</p> )
                    : displayedPricingRules.length > 0 ? (
                        <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>Description</TableHead>
                               {selectedLotId === 'all' && <TableHead>Lot Scope</TableHead>}
                               <TableHead>Rate/Discount</TableHead>
                               <TableHead>Conditions</TableHead>
                               <TableHead>Priority</TableHead>
                               <TableHead className="text-right">Actions</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {displayedPricingRules.map((rule) => {
                                const canEdit = isAdmin || (isParkingLotOwner && (!rule.lotId || sampleUsers.find(u=>u.id===userId)?.associatedLots.includes(rule.lotId)));
                                const canDelete = canEdit;
                                return (
                                   <TableRow key={rule.ruleId}>
                                     <TableCell className="font-medium">{rule.description}</TableCell>
                                     {selectedLotId === 'all' && <TableCell>{rule.lotId ? (parkingLots.find(l=>l.id===rule.lotId)?.name || 'Unknown Lot') : 'Global'}</TableCell>}
                                     <TableCell className="text-xs">
                                         {rule.baseRatePerHour !== undefined && `$${rule.baseRatePerHour.toFixed(2)}/hr`}
                                         {rule.flatRate !== undefined && `$${rule.flatRate.toFixed(2)}${rule.flatRateDurationMinutes ? `/${rule.flatRateDurationMinutes}min` : ''}`}
                                         {rule.discountPercentage !== undefined && `-${rule.discountPercentage}%`}
                                     </TableCell>
                                     <TableCell className="text-xs space-y-0.5">
                                          {rule.timeCondition && (
                                             <div className="flex items-center gap-1 text-muted-foreground">
                                                 <Clock className="h-3 w-3"/>
                                                 <span>{rule.timeCondition.daysOfWeek?.join(', ') || 'Any Day'} {rule.timeCondition.startTime || ''}-{rule.timeCondition.endTime || ''}</span>
                                             </div>
                                          )}
                                           {rule.userTierCondition?.length > 0 && (
                                             <div className="flex items-center gap-1 text-muted-foreground">
                                                 <Users className="h-3 w-3"/>
                                                 <span>{rule.userTierCondition.join(', ')} Tier</span>
                                             </div>
                                          )}
                                           {rule.eventCondition && (
                                             <div className="flex items-center gap-1 text-muted-foreground">
                                                 <Tag className="h-3 w-3"/>
                                                 <span>Event: {rule.eventCondition}</span>
                                             </div>
                                          )}
                                     </TableCell>
                                     <TableCell>{rule.priority}</TableCell>
                                     <TableCell className="text-right space-x-1">
                                         <Button variant="ghost" size="sm" onClick={() => handleOpenRuleModal(rule)} disabled={!canEdit}>Edit</Button>
                                         <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteRule(rule.ruleId)} disabled={isDeletingRule || !canDelete}>
                                            {isDeletingRule ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 sm:mr-1" />} <span className="hidden sm:inline">Delete</span>
                                         </Button>
                                     </TableCell>
                                   </TableRow>
                                );
                             })}
                           </TableBody>
                        </Table>
                     ) : (
                         <div className="text-center py-10 text-muted-foreground">
                           <DollarSign className="mx-auto h-10 w-10 mb-2" />
                           <p>No pricing rules found for {selectedLot ? selectedLot.name : 'all locations'}.</p>
                           {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) && (
                             <Button size="sm" className="mt-4" onClick={() => handleOpenRuleModal(null)}>
                               <PlusCircle className="mr-2 h-4 w-4" /> Create First Rule
                             </Button>
                           )}
                         </div>
                     )}
                 </CardContent>
               </Card>
            </TabsContent>


             {/* Analytics Tab */}
             <TabsContent value="analytics">
               <Card>
                 <CardHeader>
                   <CardTitle>System Analytics {selectedLot ? ` - ${selectedLot.name}` : (isAdmin ? ' - Overall' : '')}</CardTitle>
                   <CardDescription>View performance and financial reports {selectedLot ? `for ${selectedLot.name}` : (isAdmin ? 'for all locations' : '(Admin only)')}.</CardDescription>
                   {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) && (
                       <div className="pt-4 flex justify-end">
                          <Button variant="outline" onClick={handleDownloadAnalytics}>
                              <Download className="mr-2 h-4 w-4" /> Download Report
                          </Button>
                       </div>
                   )}
                 </CardHeader>
                 <CardContent>
                    {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) ? (
                       <>
                           <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                               <Card><CardHeader><CardTitle className="text-lg">${displayedAnalytics.revenue.toFixed(2)}</CardTitle><CardDescription>Revenue Today</CardDescription></CardHeader></Card>
                                <Card><CardHeader><CardTitle className="text-lg">{displayedAnalytics.avgOccupancy}%</CardTitle><CardDescription>Avg. Occupancy (24h)</CardDescription></CardHeader></Card>
                                <Card><CardHeader><CardTitle className="text-lg">{displayedAnalytics.activeReservations}</CardTitle><CardDescription>Active Reservations</CardDescription></CardHeader></Card>
                           </div>
                            {selectedLotId === 'all' && isAdmin && (
                                 <Card className="mt-6">
                                    <CardHeader><CardTitle>Average Revenue Across All Lots</CardTitle><CardDescription>Average revenue per lot today.</CardDescription></CardHeader>
                                    <CardContent><p className="text-2xl font-bold">${averageRevenue.toFixed(2)}</p></CardContent>
                                 </Card>
                            )}
                           <p className="text-muted-foreground mt-6 text-center">More detailed charts and reports coming soon.</p>
                       </>
                    ) : (
                         <p className="text-muted-foreground text-center py-4">Analytics are available for specific lots or by Admins for all locations.</p>
                    )}
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Settings Tab */}
             <TabsContent value="settings">
               <Card>
                 <CardHeader>
                   <CardTitle>System Settings {selectedLot ? ` - ${selectedLot.name}` : (isAdmin ? ' - Global' : '')}</CardTitle>
                   <CardDescription>Configure application settings, integrations, and defaults {selectedLot ? `specific to ${selectedLot.name}` : (isAdmin ? 'globally' : '(Admin only)')}.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     {(isAdmin || (isParkingLotOwner && selectedLotId !== 'all')) ? (
                         <div className="mt-4 space-y-4">
                           {selectedLotId === 'all' && isAdmin && ( // Only show global settings when 'all' is selected by Admin
                               <div className="flex items-center justify-between p-4 border rounded-md">
                                  <div>
                                    <p className="font-medium">Base Reservation Fee (Global)</p>
                                    <p className="text-sm text-muted-foreground">Default fee if no lot-specific fee exists.</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold">$</span>
                                    <Input type="number" defaultValue="2.50" step="0.01" className="w-24" />
                                     <Button size="sm">Save</Button>
                                  </div>
                               </div>
                           )}
                           {/* Lot specific settings or other global settings for Admin */}
                            {selectedLotId !== 'all' && selectedLot && (
                               <div className="flex items-center justify-between p-4 border rounded-md">
                                  <div>
                                    <p className="font-medium">Lot Fee Override ({selectedLot.name})</p>
                                    <p className="text-sm text-muted-foreground">Set specific fee (leave blank for global/default).</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold">$</span>
                                    <Input type="number" placeholder="e.g., 3.00" step="0.01" className="w-24" />
                                     <Button size="sm">Save</Button>
                                  </div>
                               </div>
                            )}
                            {isAdmin && (
                                 <div className="flex items-center justify-between p-4 border rounded-md">
                                  <div>
                                    <p className="font-medium">Payment Gateway Integration</p>
                                    <p className="text-sm text-muted-foreground">Connect to Stripe, Mobile Money, etc.</p>
                                  </div>
                                  <Button size="sm" variant="outline">Configure</Button>
                               </div>
                            )}
                           {/* Add more settings forms here */}
                        </div>
                     ) : (
                         <p className="text-muted-foreground text-center py-4">Settings are available for specific lots or globally by Admins.</p>
                     )}
                 </CardContent>
               </Card>
             </TabsContent>
           </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Advertisement Modal */}
       <Dialog open={isAdModalOpen} onOpenChange={setIsAdModalOpen}>
           <DialogContent className="sm:max-w-lg">
               <DialogHeader><DialogTitle>{currentAd.id ? 'Edit' : 'Create'} Advertisement</DialogTitle><DialogDescription>Fill in the details for the advertisement.</DialogDescription></DialogHeader>
               <div className="grid gap-4 py-4">
                   {/* Title */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="title" className="text-right">Title*</Label><Input id="title" name="title" value={currentAd.title || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} /></div>
                   {/* Description */} <div className="grid grid-cols-4 items-start gap-4"><Label htmlFor="description" className="text-right pt-2">Description*</Label><Textarea id="description" name="description" value={currentAd.description || ''} onChange={handleAdFormChange} className="col-span-3 min-h-[80px]" disabled={isSavingAd} /></div>
                   {/* Image URL */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="imageUrl" className="text-right">Image URL</Label><Input id="imageUrl" name="imageUrl" value={currentAd.imageUrl || ''} onChange={handleAdFormChange} className="col-span-3" placeholder="https://..." disabled={isSavingAd} /></div>
                   {/* Image Preview */} {currentAd.imageUrl && (<div className="grid grid-cols-4 items-center gap-4"><div className="col-start-2 col-span-3"><Image src={currentAd.imageUrl} alt="Ad Preview" width={150} height={75} className="rounded object-cover aspect-[2/1] border" onError={(e) => { e.currentTarget.style.display = 'none'; }}/></div></div>)}
                   {/* Target Location */}
                   <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="targetLocationId" className="text-right">Location*</Label>
                       <Select name="targetLocationId" value={currentAd.targetLocationId || 'all'} onValueChange={(value) => handleAdSelectChange('targetLocationId', value)} disabled={isSavingAd || (!isAdmin && isParkingLotOwner && parkingLots.length <=1 && !currentAd.id)}>
                           <SelectTrigger className="col-span-3"><SelectValue placeholder="Select target location" /></SelectTrigger>
                           <SelectContent>
                               { isAdmin && <SelectItem value="all">All Locations (Global)</SelectItem> }
                               {getDisplayLots().map(lot => (<SelectItem key={lot.id} value={lot.id}>{lot.name}</SelectItem>))}
                           </SelectContent>
                       </Select>
                   </div>
                   {/* Associated Service */}
                   <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="associatedService" className="text-right">Link to Service</Label><Select name="associatedService" value={currentAd.associatedService || ''} onValueChange={(value) => handleAdSelectChange('associatedService', value as ParkingLotService | '' )} disabled={isSavingAd}><SelectTrigger className="col-span-3"><SelectValue placeholder="Link to a specific service..." /></SelectTrigger><SelectContent><SelectItem value="">None</SelectItem>{allAvailableServices.map(service => (<SelectItem key={service} value={service}><span className="flex items-center gap-2">{getServiceIcon(service, "h-4 w-4 mr-2")} {service}</span></SelectItem>))}</SelectContent></Select></div>
                   {/* Start Date */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="startDate" className="text-right">Start Date</Label><Input id="startDate" name="startDate" type="date" value={currentAd.startDate || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} /></div>
                   {/* End Date */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="endDate" className="text-right">End Date</Label><Input id="endDate" name="endDate" type="date" value={currentAd.endDate || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} /></div>
                   {/* Status */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="status" className="text-right">Status</Label><Select name="status" value={currentAd.status || 'active'} onValueChange={(value) => handleAdSelectChange('status', value as 'active' | 'inactive' | 'draft')} disabled={isSavingAd}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></div>
               </div>
               <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSavingAd}>Cancel</Button></DialogClose><Button type="submit" onClick={handleSaveAd} disabled={isSavingAd}>{isSavingAd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{currentAd.id ? 'Save Changes' : 'Create Ad'}</Button></DialogFooter>
           </DialogContent>
       </Dialog>

        {/* Add/Edit Pricing Rule Modal */}
        <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>{currentRule.id ? 'Edit' : 'Create'} Pricing Rule</DialogTitle><DialogDescription>Define conditions and rates for dynamic pricing.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                     {/* Rule ID (Readonly) */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="ruleId" className="text-right">Rule ID</Label><Input id="ruleId" name="ruleId" value={currentRule.ruleId || ''} readOnly disabled className="col-span-3 bg-muted text-muted-foreground text-xs" /></div>
                     {/* Description */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="description" className="text-right">Description*</Label><Input id="description" name="description" value={currentRule.description || ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule} /></div>
                     {/* Priority */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="priority" className="text-right">Priority*</Label><Input id="priority" name="priority" type="number" value={currentRule.priority ?? 100} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule} placeholder="Lower number = higher priority" min="1" /></div>
                     {/* Lot Scope */}
                     <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="lotId" className="text-right">Lot Scope</Label>
                         <Select name="lotId" value={currentRule.lotId || 'all'} onValueChange={(value) => handleRuleSelectChange('lotId', value)} disabled={isSavingRule || (!isAdmin && isParkingLotOwner)}>
                             <SelectTrigger className="col-span-3"><SelectValue placeholder="Select lot scope" /></SelectTrigger>
                             <SelectContent>
                                 { isAdmin && <SelectItem value="all">Global (All Lots)</SelectItem> }
                                 {getDisplayLots().map(lot => (<SelectItem key={lot.id} value={lot.id}>{lot.name}</SelectItem>))}
                             </SelectContent>
                         </Select>
                     </div>
                     {/* Rate Options */} <Separator className="col-span-4 my-2" /> <p className="col-span-4 text-sm font-medium text-muted-foreground -mb-2">Rate/Discount (Define ONE type per rule)</p>
                     {/* Base Rate */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="baseRatePerHour" className="text-right">Base Rate ($/hr)</Label><ShadInput id="baseRatePerHour" name="baseRatePerHour" type="number" value={currentRule.baseRatePerHour ?? ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule || currentRule.flatRate !== undefined || currentRule.discountPercentage !== undefined} placeholder="e.g., 2.50" step="0.01" min="0"/></div>
                     {/* Flat Rate */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="flatRate" className="text-right">Flat Rate ($)</Label><ShadInput id="flatRate" name="flatRate" type="number" value={currentRule.flatRate ?? ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule || currentRule.baseRatePerHour !== undefined || currentRule.discountPercentage !== undefined} placeholder="e.g., 10.00" step="0.01" min="0"/></div>
                     {/* Flat Rate Duration */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="flatRateDurationMinutes" className="text-right">Duration (min)</Label><ShadInput id="flatRateDurationMinutes" name="flatRateDurationMinutes" type="number" value={currentRule.flatRateDurationMinutes ?? ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule || currentRule.baseRatePerHour !== undefined || currentRule.discountPercentage !== undefined || currentRule.flatRate === undefined} placeholder="e.g., 1440 for daily" min="1"/></div>
                     {/* Discount */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="discountPercentage" className="text-right">Discount (%)</Label><ShadInput id="discountPercentage" name="discountPercentage" type="number" value={currentRule.discountPercentage ?? ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule || currentRule.baseRatePerHour !== undefined || currentRule.flatRate !== undefined} placeholder="e.g., 10 for 10%" min="0" max="100"/></div>
                     {/* Conditions */} <Separator className="col-span-4 my-2" /> <p className="col-span-4 text-sm font-medium text-muted-foreground -mb-2">Conditions (Optional)</p>
                     {/* Days of Week */}
                      <div className="grid grid-cols-4 items-start gap-4">
                          <Label className="text-right pt-2">Days of Week</Label>
                          {/* Replace with actual MultiSelect component if available */}
                           <div className="col-span-3 space-x-2"> {/* Placeholder for MultiSelect */}
                               <span className="text-xs text-muted-foreground">[MultiSelect Placeholder: {currentRule.timeCondition?.daysOfWeek?.join(', ') || 'Any'}]</span>
                           </div>
                      </div>
                     {/* Time Range */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="startTime" className="text-right">Time Range</Label><div className="col-span-3 flex items-center gap-2"><ShadInput id="startTime" name="startTime" type="time" value={currentRule.timeCondition?.startTime || ''} onChange={handleRuleTimeConditionChange} className="flex-1" disabled={isSavingRule} /><span className="text-muted-foreground">-</span><ShadInput id="endTime" name="endTime" type="time" value={currentRule.timeCondition?.endTime || ''} onChange={handleRuleTimeConditionChange} className="flex-1" disabled={isSavingRule} /></div></div>
                      {/* User Tiers */}
                      <div className="grid grid-cols-4 items-start gap-4">
                          <Label className="text-right pt-2">User Tiers</Label>
                           {/* Replace with actual MultiSelect component if available */}
                           <div className="col-span-3 space-x-2"> {/* Placeholder for MultiSelect */}
                               <span className="text-xs text-muted-foreground">[MultiSelect Placeholder: {currentRule.userTierCondition?.join(', ') || 'Any'}]</span>
                           </div>
                      </div>
                     {/* Event */} <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="eventCondition" className="text-right">Event Name</Label><Input id="eventCondition" name="eventCondition" value={currentRule.eventCondition || ''} onChange={handleRuleFormChange} className="col-span-3" disabled={isSavingRule} placeholder="e.g., Concert Night"/></div>
                </div>
                <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSavingRule}>Cancel</Button></DialogClose><Button type="submit" onClick={handleSaveRule} disabled={isSavingRule}>{isSavingRule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{currentRule.id ? 'Save Changes' : 'Create Rule'}</Button></DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}

// Mock MultiSelect component placeholder - Replace with actual implementation
const MockMultiSelect = ({ options, selected, onChange, placeholder }: { options: string[], selected: string[], onChange: (selected: string[]) => void, placeholder?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleOption = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    return (
        <div className="relative">
            <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="w-full justify-start font-normal">
                {selected.length > 0 ? selected.join(', ') : <span className="text-muted-foreground">{placeholder || 'Select...'}</span>}
            </Button>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 border bg-popover rounded-md shadow-lg p-2">
                    {options.map(option => (
                        <div key={option} className="flex items-center space-x-2 p-1 hover:bg-accent rounded">
                            <Checkbox
                                id={`ms-${option}`}
                                checked={selected.includes(option)}
                                onCheckedChange={() => toggleOption(option)}
                            />
                            <label htmlFor={`ms-${option}`} className="text-sm">{option}</label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
