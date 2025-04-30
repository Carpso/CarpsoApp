// src/app/admin/page.tsx
'use client'; // Required for state and effects

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, UserCog, LayoutDashboard, BarChart, Settings, MapPin, Loader2, Download, Sparkles, ChargingStation, SprayCan, Wifi, BadgeCent, PlusCircle, Trash2, Megaphone, Image as ImageIcon, Calendar, Bathroom, ConciergeBell } from "lucide-react"; // Replaced EvStation with ChargingStation, Added Bathroom, ConciergeBell
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot';
import { getAvailableParkingLots, updateParkingLotServices } from '@/services/parking-lot';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"; // Added Dialog components
import { Label } from "@/components/ui/label"; // Added Label
import type { Advertisement } from '@/services/advertisement'; // Import Advertisement type
import { getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement } from '@/services/advertisement'; // Import Ad services
import Image from "next/image"; // Import Next Image for preview

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

// Initial state for the Ad form
const initialAdFormState: Partial<Advertisement> = {
    title: '',
    description: '',
    imageUrl: '',
    targetLocationId: '', // Will be set based on selection or 'all' for admins
    startDate: '',
    endDate: '',
    associatedService: undefined,
};

export default function AdminDashboardPage() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('all'); // Default to 'all'
  const [isLoadingLots, setIsLoadingLots] = useState(true);
  const [errorLoadingLots, setErrorLoadingLots] = useState<string | null>(null);
  const [isUpdatingServices, setIsUpdatingServices] = useState(false);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]); // State for advertisements
  const [isLoadingAds, setIsLoadingAds] = useState(false); // Loading state for ads
  const [errorLoadingAds, setErrorLoadingAds] = useState<string | null>(null); // Error state for ads
  const [isAdModalOpen, setIsAdModalOpen] = useState(false); // State for Add/Edit Ad modal
  const [currentAd, setCurrentAd] = useState<Partial<Advertisement>>(initialAdFormState); // State for the ad being edited/created
  const [isSavingAd, setIsSavingAd] = useState(false); // Loading state for saving ad
  const [isDeletingAd, setIsDeletingAd] = useState(false); // Loading state for deleting ad

  const { toast } = useToast();

  const fetchLots = async () => {
      setIsLoadingLots(true);
      setErrorLoadingLots(null);
      try {
        const lots = await getAvailableParkingLots();
        setParkingLots(lots);
      } catch (err) {
        console.error("Failed to fetch parking lots for admin dashboard:", err);
        setErrorLoadingLots("Could not load parking lots.");
         toast({ title: "Error Loading Lots", description: "Could not fetch parking lot data.", variant: "destructive" });
      } finally {
        setIsLoadingLots(false);
      }
    };

  // Fetch Advertisements based on selected lot
  const fetchAds = async (locationId: string | null) => {
      setIsLoadingAds(true);
      setErrorLoadingAds(null);
      try {
          // If 'all' is selected, fetch all ads (or handle based on role later)
          // Otherwise, fetch ads for the specific location
          const ads = await getAdvertisements(locationId === 'all' ? undefined : locationId);
          // Add location name to each ad for display purposes
          const adsWithLocationNames = ads.map(ad => {
              const targetLot = parkingLots.find(lot => lot.id === ad.targetLocationId);
              return { ...ad, targetLotName: targetLot?.name };
          });
          setAdvertisements(adsWithLocationNames);
      } catch (err) {
          console.error("Failed to fetch advertisements:", err);
          setErrorLoadingAds("Could not load advertisements.");
          toast({ title: "Error Loading Ads", description: "Could not fetch advertisement data.", variant: "destructive" });
      } finally {
          setIsLoadingAds(false);
      }
  };


  useEffect(() => {
    fetchLots();
    // Fetch ads after lots are potentially fetched and parkingLots state is updated
  }, []);

   useEffect(() => {
     // Only fetch ads if parkingLots data is available
     if (parkingLots.length > 0) {
         fetchAds(selectedLotId);
     }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedLotId, parkingLots]); // Re-fetch ads when selectedLotId or parkingLots change

  const selectedLot = parkingLots.find(lot => lot.id === selectedLotId);
  const displayedUsers = selectedLotId === 'all'
    ? sampleUsers
    : sampleUsers.filter(user => user.associatedLots.includes(selectedLotId) || user.associatedLots.includes('*'));

   const displayedAnalytics = selectedLotId === 'all'
    ? sampleAnalyticsData['all']
    : sampleAnalyticsData[selectedLotId] || sampleAnalyticsData['all']; // Fallback to 'all' if specific lot data missing


    // --- Placeholder Download Handlers ---
    const handleDownloadUsers = () => {
        console.log("Download users clicked for scope:", selectedLotId, displayedUsers);
        toast({ title: "Download Started (Simulation)", description: `Downloading user data for ${selectedLot ? selectedLot.name : 'all locations'}.`});
    };
    const handleDownloadLots = () => {
        console.log("Download lots clicked:", parkingLots);
        toast({ title: "Download Started (Simulation)", description: "Downloading parking lot data."});
    };
     const handleDownloadAnalytics = () => {
        console.log("Download analytics clicked for scope:", selectedLotId, displayedAnalytics);
        toast({ title: "Download Started (Simulation)", description: `Downloading analytics report for ${selectedLot ? selectedLot.name : 'all locations'}.`});
    };
    const handleDownloadAds = () => {
        console.log("Download ads clicked for scope:", selectedLotId, advertisements);
        toast({ title: "Download Started (Simulation)", description: `Downloading advertisement data for ${selectedLot ? selectedLot.name : 'all locations'}.`});
    };
    // --- End Placeholder Download Handlers ---


   // --- Service Management ---
    const handleServiceToggle = async (service: ParkingLotService, isChecked: boolean) => {
        if (!selectedLot) return;
        setIsUpdatingServices(true);
        const currentServices = selectedLot.services || [];
        const updatedServices = isChecked
            ? [...currentServices, service]
            : currentServices.filter(s => s !== service);
        try {
            const success = await updateParkingLotServices(selectedLot.id, updatedServices);
            if (success) {
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
        if (ad) {
            // Editing existing ad
            setCurrentAd(ad);
        } else {
            // Creating new ad - Ensure targetLocationId is set correctly
            setCurrentAd({
                ...initialAdFormState,
                targetLocationId: selectedLotId !== 'all' ? selectedLotId : '', // Pre-fill if a specific lot is selected
                status: 'active' // Default to active for new ads
            });
        }
        setIsAdModalOpen(true);
    };

    const handleAdFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurrentAd(prev => ({ ...prev, [name]: value }));
    };

     const handleAdSelectChange = (name: keyof Advertisement, value: string) => {
         setCurrentAd(prev => ({ ...prev, [name]: value }));
     };


    const handleSaveAd = async () => {
        if (!currentAd.title || !currentAd.description || (selectedLotId === 'all' && !currentAd.targetLocationId && !currentAd.id)) {
            toast({ title: "Missing Information", description: "Please fill in title, description, and target location (if applicable).", variant: "destructive" });
            return;
        }
        setIsSavingAd(true);
        try {
            let savedAd: Advertisement | null = null;
            const adDataToSave = {
                ...currentAd,
                // Ensure targetLocationId is set correctly, especially if creating while 'all' is selected
                // If 'All Locations' is selected in the dropdown, set targetLocationId to empty string or undefined
                 targetLocationId: currentAd.targetLocationId === 'all' ? '' : (currentAd.targetLocationId || (selectedLotId !== 'all' ? selectedLotId : '')),
                 // Remove temporary targetLotName before saving
                 targetLotName: undefined,
            };


            if (currentAd.id) {
                // Update existing ad
                savedAd = await updateAdvertisement(currentAd.id, adDataToSave);
            } else {
                // Create new ad
                savedAd = await createAdvertisement(adDataToSave);
            }

            if (savedAd) {
                 // Re-fetch ads to get the updated list including the new/edited one with its potential location name
                 await fetchAds(selectedLotId);
                toast({ title: "Advertisement Saved", description: `"${savedAd.title}" has been ${currentAd.id ? 'updated' : 'created'}.` });
                setIsAdModalOpen(false); // Close modal on success
            } else {
                throw new Error("Failed to save advertisement on the backend.");
            }
        } catch (error) {
            console.error("Failed to save advertisement:", error);
            toast({ title: "Save Failed", description: "Could not save the advertisement.", variant: "destructive" });
        } finally {
            setIsSavingAd(false);
        }
    };

    const handleDeleteAd = async (adId: string) => {
        // Optional: Add a confirmation dialog here
        setIsDeletingAd(true);
        try {
            const success = await deleteAdvertisement(adId);
            if (success) {
                 setAdvertisements(prevAds => prevAds.filter(ad => ad.id !== adId));
                 toast({ title: "Advertisement Deleted", description: "The advertisement has been removed." });
            } else {
                 throw new Error("Failed to delete advertisement on the backend.");
            }
        } catch (error) {
            console.error("Failed to delete advertisement:", error);
            toast({ title: "Deletion Failed", description: "Could not delete the advertisement.", variant: "destructive" });
        } finally {
            setIsDeletingAd(false);
        }
    };
    // --- End Advertisement Management ---


   const getServiceIcon = (service: ParkingLotService | undefined, className: string = "h-4 w-4 mr-2") => {
     switch (service) {
       case 'EV Charging': return <ChargingStation className={className} />; // Replaced EvStation
       case 'Car Wash': return <SprayCan className={className} />; // Replaced CarWash
       case 'Mobile Money Agent': return <BadgeCent className={className} />;
       case 'Wifi': return <Wifi className={className} />;
       case 'Restroom': return <Bathroom className={className} />;
       case 'Valet': return <ConciergeBell className={className} />;
       default: return <Sparkles className={className} />; // Default icon
     }
   };


  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
             <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    Admin Dashboard
                </CardTitle>
                <CardDescription>
                    Manage users, lots, services, ads, settings, and view analytics.
                    {selectedLot ? ` (Viewing: ${selectedLot.name})` : ' (Viewing: All Locations)'}
                </CardDescription>
             </div>
             {/* Parking Lot Selector */}
             <div className="min-w-[250px]">
                 {isLoadingLots ? (
                     <Skeleton className="h-10 w-full" />
                 ) : errorLoadingLots ? (
                     <p className="text-sm text-destructive">{errorLoadingLots}</p>
                 ) : (
                    <Select
                        value={selectedLotId}
                        onValueChange={(value) => setSelectedLotId(value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select location scope..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Locations</SelectItem>
                            {parkingLots.map((lot) => (
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
          </div>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="users" className="w-full">
             <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 mb-6"> {/* Adjusted grid cols */}
               <TabsTrigger value="users"><UserCog className="mr-2 h-4 w-4"/>Users</TabsTrigger>
               <TabsTrigger value="lots"><LayoutDashboard className="mr-2 h-4 w-4"/>Lots</TabsTrigger>
               <TabsTrigger value="services"><Sparkles className="mr-2 h-4 w-4"/>Services</TabsTrigger>
               <TabsTrigger value="ads"><Megaphone className="mr-2 h-4 w-4"/>Ads</TabsTrigger> {/* Added Ads Tab */}
               <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4"/>Analytics</TabsTrigger>
               <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/>Settings</TabsTrigger>
             </TabsList>

             {/* User Management Tab */}
             <TabsContent value="users">
               <Card>
                 <CardHeader>
                   <CardTitle>User Management {selectedLot ? ` - ${selectedLot.name}` : ' - All Locations'}</CardTitle>
                   <CardDescription>View, edit, or remove users and manage their roles {selectedLot ? ` associated with ${selectedLot.name}` : 'across all locations'}.</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search users..." className="max-w-sm" />
                        <Button>Search</Button>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" onClick={handleDownloadUsers}>
                                <Download className="mr-2 h-4 w-4" /> Download List
                            </Button>
                            <Button variant="outline"> <PlusCircle className="mr-2 h-4 w-4" /> Add User</Button>
                        </div>
                    </div>
                 </CardHeader>
                 <CardContent>
                    {displayedUsers.length > 0 ? (
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
                   )}
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Parking Lot Management Tab */}
              <TabsContent value="lots">
               <Card>
                 <CardHeader>
                   <CardTitle>Parking Lot Management</CardTitle>
                   <CardDescription>Monitor status and manage all parking lots.</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                        <Input placeholder="Search lots..." className="max-w-sm" />
                        <Button>Search</Button>
                         <div className="ml-auto flex gap-2">
                             <Button variant="outline" onClick={handleDownloadLots}>
                                 <Download className="mr-2 h-4 w-4" /> Download List
                             </Button>
                             <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Lot</Button>
                         </div>
                    </div>
                 </CardHeader>
                 <CardContent>
                    {isLoadingLots ? (
                         <div className="space-y-2">
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                             <Skeleton className="h-10 w-full" />
                         </div>
                    ) : errorLoadingLots ? (
                         <p className="text-destructive text-center py-4">{errorLoadingLots}</p>
                    ) : parkingLots.length > 0 ? (
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
                           {parkingLots.map((lot) => (
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
                                  <Button variant="ghost" size="sm">Edit</Button>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                     <Trash2 className="h-4 w-4 sm:mr-1" />
                                     <span className="hidden sm:inline">Disable</span>
                                  </Button>
                               </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                    ) : (
                         <p className="text-muted-foreground text-center py-4">No parking lots found.</p>
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
                      {isLoadingLots ? (
                          <Skeleton className="h-24 w-full" />
                      ) : errorLoadingLots ? (
                          <p className="text-destructive text-center py-4">{errorLoadingLots}</p>
                      ) : !selectedLot ? (
                          <p className="text-muted-foreground text-center py-4">Select a parking lot from the dropdown above.</p>
                      ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {allAvailableServices.map((service) => {
                                const isChecked = selectedLot.services?.includes(service) ?? false;
                                return (
                                   <div key={service} className="flex items-center space-x-3 p-3 border rounded-md bg-background hover:bg-accent/10 transition-colors">
                                       <Checkbox
                                           id={`service-${service}`}
                                           checked={isChecked}
                                           onCheckedChange={(checked) => handleServiceToggle(service, !!checked)}
                                           disabled={isUpdatingServices}
                                       />
                                       <label
                                           htmlFor={`service-${service}`}
                                           className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center cursor-pointer"
                                       >
                                            {getServiceIcon(service)} {service}
                                       </label>
                                       {isUpdatingServices && isChecked !== selectedLot.services?.includes(service) && ( // Show loader only when state is changing
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
                   {isLoadingAds ? (
                        <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                   ) : errorLoadingAds ? (
                        <p className="text-destructive text-center py-4">{errorLoadingAds}</p>
                   ) : advertisements.length > 0 ? (
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
                                     return (
                                        <TableRow key={ad.id}>
                                            <TableCell>
                                                 <Image
                                                    src={ad.imageUrl || `https://picsum.photos/seed/${ad.id}/100/50`}
                                                    alt={ad.title}
                                                    width={80}
                                                    height={40}
                                                    className="rounded object-cover aspect-[2/1]"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{ad.title}</TableCell>
                                            {selectedLotId === 'all' && <TableCell>{targetLotName}</TableCell>}
                                            <TableCell className="text-xs">
                                                 {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'N/A'} -
                                                 {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Ongoing'}
                                            </TableCell>
                                             <TableCell className="text-xs">
                                                {ad.associatedService ? (
                                                    <Badge variant="outline" size="sm" className="flex items-center w-fit">
                                                        {getServiceIcon(ad.associatedService, "h-3 w-3 mr-1")} {ad.associatedService}
                                                    </Badge>
                                                ) : <span className="text-muted-foreground">None</span>}
                                            </TableCell>
                                            <TableCell className={`text-xs font-medium ${statusColor}`}>
                                                {ad.status?.charAt(0).toUpperCase() + ad.status?.slice(1) || 'Unknown'}
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenAdModal(ad)}>Edit</Button>
                                                 <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteAd(ad.id)}
                                                    disabled={isDeletingAd}
                                                >
                                                    {isDeletingAd ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 sm:mr-1" />}
                                                    <span className="hidden sm:inline">Delete</span>
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


             {/* Analytics Tab */}
             <TabsContent value="analytics">
               <Card>
                 <CardHeader>
                   <CardTitle>System Analytics {selectedLot ? ` - ${selectedLot.name}` : ' - Overall'}</CardTitle>
                   <CardDescription>View performance and financial reports {selectedLot ? `for ${selectedLot.name}` : 'for all locations'}.</CardDescription>
                   <div className="pt-4 flex justify-end">
                      <Button variant="outline" onClick={handleDownloadAnalytics}>
                          <Download className="mr-2 h-4 w-4" /> Download Report
                      </Button>
                   </div>
                 </CardHeader>
                 <CardContent>
                   <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                       <Card>
                           <CardHeader><CardTitle className="text-lg">${displayedAnalytics.revenue.toFixed(2)}</CardTitle><CardDescription>Revenue Today</CardDescription></CardHeader>
                       </Card>
                        <Card>
                           <CardHeader><CardTitle className="text-lg">{displayedAnalytics.avgOccupancy}%</CardTitle><CardDescription>Avg. Occupancy (24h)</CardDescription></CardHeader>
                       </Card>
                        <Card>
                           <CardHeader><CardTitle className="text-lg">{displayedAnalytics.activeReservations}</CardTitle><CardDescription>Active Reservations</CardDescription></CardHeader>
                       </Card>
                   </div>
                   <p className="text-muted-foreground mt-6 text-center">More detailed charts and reports coming soon.</p>
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Settings Tab */}
             <TabsContent value="settings">
               <Card>
                 <CardHeader>
                   <CardTitle>System Settings {selectedLot ? ` - ${selectedLot.name}` : ' - Global'}</CardTitle>
                   <CardDescription>Configure application settings, integrations, and pricing rules {selectedLot ? `specific to ${selectedLot.name}` : 'globally'}.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     <div className="mt-4 space-y-4">
                       {selectedLotId === 'all' && ( // Only show global settings when 'all' is selected
                           <div className="flex items-center justify-between p-4 border rounded-md">
                              <div>
                                <p className="font-medium">Base Reservation Fee (Global)</p>
                                <p className="text-sm text-muted-foreground">The standard fee applied if no lot-specific fee exists.</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">$</span>
                                <Input type="number" defaultValue="2.50" step="0.01" className="w-24" />
                                 <Button size="sm">Save</Button>
                              </div>
                           </div>
                       )}
                        {selectedLotId !== 'all' && selectedLot && ( // Show lot-specific settings
                           <div className="flex items-center justify-between p-4 border rounded-md">
                              <div>
                                <p className="font-medium">Reservation Fee Override ({selectedLot.name})</p>
                                <p className="text-sm text-muted-foreground">Set a specific fee for this location (leave blank to use global).</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold">$</span>
                                <Input type="number" placeholder="e.g., 3.00" step="0.01" className="w-24" />
                                 <Button size="sm">Save</Button>
                              </div>
                           </div>
                        )}
                         <div className="flex items-center justify-between p-4 border rounded-md">
                          <div>
                            <p className="font-medium">Payment Gateway Integration</p>
                            <p className="text-sm text-muted-foreground">Connect to Stripe, Mobile Money, etc.</p>
                          </div>
                          <Button size="sm" variant="outline">Configure</Button>
                       </div>
                       {/* Add more settings forms here */}
                    </div>
                 </CardContent>
               </Card>
             </TabsContent>
           </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Advertisement Modal */}
       <Dialog open={isAdModalOpen} onOpenChange={setIsAdModalOpen}>
           <DialogContent className="sm:max-w-lg">
               <DialogHeader>
                   <DialogTitle>{currentAd.id ? 'Edit' : 'Create'} Advertisement</DialogTitle>
                   <DialogDescription>
                       Fill in the details for the advertisement. It will be shown in the Explore tab.
                   </DialogDescription>
               </DialogHeader>
               <div className="grid gap-4 py-4">
                    {/* Title */}
                    <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="title" className="text-right">Title*</Label>
                       <Input id="title" name="title" value={currentAd.title || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} />
                   </div>
                   {/* Description */}
                   <div className="grid grid-cols-4 items-start gap-4">
                       <Label htmlFor="description" className="text-right pt-2">Description*</Label>
                       <Textarea id="description" name="description" value={currentAd.description || ''} onChange={handleAdFormChange} className="col-span-3 min-h-[80px]" disabled={isSavingAd} />
                   </div>
                   {/* Image URL */}
                   <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="imageUrl" className="text-right">Image URL</Label>
                       <Input id="imageUrl" name="imageUrl" value={currentAd.imageUrl || ''} onChange={handleAdFormChange} className="col-span-3" placeholder="https://..." disabled={isSavingAd} />
                   </div>
                    {/* Image Preview */}
                   {currentAd.imageUrl && (
                       <div className="grid grid-cols-4 items-center gap-4">
                           <div className="col-start-2 col-span-3">
                               <Image
                                    src={currentAd.imageUrl}
                                    alt="Ad Preview"
                                    width={150}
                                    height={75}
                                    className="rounded object-cover aspect-[2/1] border"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; /* Hide if image fails */ }}
                                />
                           </div>
                       </div>
                   )}
                   {/* Target Location (Only if Admin and creating/editing) */}
                   {/* Allow selection even if a specific lot is chosen initially, but pre-fill it */}
                    <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="targetLocationId" className="text-right">Location*</Label>
                       <Select
                            name="targetLocationId"
                            value={currentAd.targetLocationId || 'all'} // Use 'all' to represent empty/global
                            onValueChange={(value) => handleAdSelectChange('targetLocationId', value)}
                            disabled={isSavingAd}
                       >
                           <SelectTrigger className="col-span-3">
                               <SelectValue placeholder="Select target location" />
                           </SelectTrigger>
                           <SelectContent>
                               <SelectItem value="all">All Locations</SelectItem>
                               {parkingLots.map(lot => (
                                   <SelectItem key={lot.id} value={lot.id}>{lot.name}</SelectItem>
                               ))}
                           </SelectContent>
                       </Select>
                   </div>

                   {/* Associated Service */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="associatedService" className="text-right">Link to Service (Optional)</Label>
                        <Select
                             name="associatedService"
                             value={currentAd.associatedService || ''}
                             onValueChange={(value) => handleAdSelectChange('associatedService', value as ParkingLotService | '' )}
                             disabled={isSavingAd}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Link to a specific service..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {allAvailableServices.map(service => (
                                    <SelectItem key={service} value={service}>
                                         <span className="flex items-center gap-2">
                                            {getServiceIcon(service, "h-4 w-4 mr-2")} {service}
                                         </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                   {/* Start Date */}
                   <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="startDate" className="text-right">Start Date</Label>
                       <Input id="startDate" name="startDate" type="date" value={currentAd.startDate || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} />
                   </div>
                   {/* End Date */}
                   <div className="grid grid-cols-4 items-center gap-4">
                       <Label htmlFor="endDate" className="text-right">End Date</Label>
                       <Input id="endDate" name="endDate" type="date" value={currentAd.endDate || ''} onChange={handleAdFormChange} className="col-span-3" disabled={isSavingAd} />
                   </div>
                    {/* Status */}
                   <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                         <Select
                             name="status"
                             value={currentAd.status || 'active'}
                             onValueChange={(value) => handleAdSelectChange('status', value as 'active' | 'inactive' | 'draft')}
                             disabled={isSavingAd}
                         >
                             <SelectTrigger className="col-span-3">
                                 <SelectValue placeholder="Select status" />
                             </SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="active">Active</SelectItem>
                                 <SelectItem value="inactive">Inactive</SelectItem>
                                 <SelectItem value="draft">Draft</SelectItem>
                             </SelectContent>
                         </Select>
                   </div>
               </div>
               <DialogFooter>
                   <DialogClose asChild>
                       <Button type="button" variant="outline" disabled={isSavingAd}>Cancel</Button>
                   </DialogClose>
                   <Button type="submit" onClick={handleSaveAd} disabled={isSavingAd}>
                       {isSavingAd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                       {currentAd.id ? 'Save Changes' : 'Create Ad'}
                   </Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>

    </div>
  );
}
