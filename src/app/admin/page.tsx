// src/app/admin/page.tsx
'use client'; // Required for state and effects

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, UserCog, LayoutDashboard, BarChart, Settings, MapPin, Loader2, Download, Sparkles, EvStation, CarWash, Wifi, BadgeCent, PlusCircle, Trash2 } from "lucide-react"; // Added service icons, PlusCircle, Trash2
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot';
import { getAvailableParkingLots, updateParkingLotServices } from '@/services/parking-lot'; // Added update service
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Badge } from '@/components/ui/badge'; // Import Badge

// TODO: Protect this route/page to be accessible only by users with the 'Admin' role.

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
const allAvailableServices: ParkingLotService[] = ['EV Charging', 'Car Wash', 'Mobile Money Agent', 'Valet', 'Restroom', 'Wifi']; // Added Wifi

export default function AdminDashboardPage() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('all'); // Default to 'all'
  const [isLoadingLots, setIsLoadingLots] = useState(true);
  const [errorLoadingLots, setErrorLoadingLots] = useState<string | null>(null);
  const [isUpdatingServices, setIsUpdatingServices] = useState(false); // State for service update loading
  const { toast } = useToast(); // Use toast hook

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

  useEffect(() => {
    fetchLots();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch only once on mount

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
        // Example: generateCSV(displayedUsers, `users_${selectedLotId}.csv`);
    };

    const handleDownloadLots = () => {
        console.log("Download lots clicked:", parkingLots);
        toast({ title: "Download Started (Simulation)", description: "Downloading parking lot data."});
        // Example: generateCSV(parkingLots, 'parking_lots.csv');
    };

     const handleDownloadAnalytics = () => {
        console.log("Download analytics clicked for scope:", selectedLotId, displayedAnalytics);
        toast({ title: "Download Started (Simulation)", description: `Downloading analytics report for ${selectedLot ? selectedLot.name : 'all locations'}.`});
        // Example: generateCSV([displayedAnalytics], `analytics_${selectedLotId}.csv`); // Wrap in array if needed
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
                // Update local state to reflect changes immediately
                setParkingLots(prevLots => prevLots.map(lot =>
                    lot.id === selectedLotId ? { ...lot, services: updatedServices } : lot
                ));
                toast({ title: "Services Updated", description: `${service} ${isChecked ? 'added to' : 'removed from'} ${selectedLot.name}.` });
            } else {
                throw new Error("Failed to update services on the backend.");
            }
        } catch (error) {
            console.error("Failed to update services:", error);
            toast({ title: "Update Failed", description: `Could not update services for ${selectedLot.name}.`, variant: "destructive" });
            // Revert local state if backend update failed (optional but recommended)
             // await fetchLots(); // Or refetch data
        } finally {
            setIsUpdatingServices(false);
        }
    };
   // --- End Service Management ---


   const getServiceIcon = (service: ParkingLotService) => {
     switch (service) {
       case 'EV Charging': return <EvStation className="h-4 w-4 mr-2" />;
       case 'Car Wash': return <CarWash className="h-4 w-4 mr-2" />;
       case 'Mobile Money Agent': return <BadgeCent className="h-4 w-4 mr-2" />;
       case 'Wifi': return <Wifi className="h-4 w-4 mr-2" />;
       default: return <Sparkles className="h-4 w-4 mr-2" />; // Default icon
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
                    Manage users, lots, services, settings, and view analytics.
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
             <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-6"> {/* Adjusted grid cols */}
               <TabsTrigger value="users"><UserCog className="mr-2 h-4 w-4"/>Users</TabsTrigger>
               <TabsTrigger value="lots"><LayoutDashboard className="mr-2 h-4 w-4"/>Parking Lots</TabsTrigger>
               <TabsTrigger value="services"><Sparkles className="mr-2 h-4 w-4"/>Services</TabsTrigger> {/* Added Services Tab */}
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
                             <TableHead>Services</TableHead> {/* Added Services Column */}
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
                               <TableCell> {/* Services Cell */}
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
                                       {isUpdatingServices && isChecked === selectedLot.services?.includes(service) && ( // Show loader only on the item being changed
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
    </div>
  );
}
```