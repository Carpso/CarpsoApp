// src/components/parking/ParkingLotManager.tsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import ParkingLotGrid from './ParkingLotGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParkingLot } from '@/services/parking-lot';
import { getAvailableParkingLots } from '@/services/parking-lot';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';
import UserProfile from '@/components/profile/UserProfile';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import BottomNavBar from '@/components/layout/BottomNavBar'; // Import BottomNavBar

export default function ParkingLotManager() {
  const {
      isAuthenticated,
      userId,
      userRole,
      userName,
      userAvatarUrl,
      login,
      logout,
  } = useContext(AppStateContext)!; // Use context

  const [locations, setLocations] = useState<ParkingLot[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // State for temporary car pinning (Example)
  const [pinnedSpot, setPinnedSpot] = useState<{ spotId: string, locationId: string } | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      setError(null);
      try {
        const fetchedLocations = await getAvailableParkingLots();
        setLocations(fetchedLocations);
        if (fetchedLocations.length > 0 && !selectedLocationId) {
          setSelectedLocationId(fetchedLocations[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch parking locations:", err);
        setError("Could not load parking locations. Please try again later.");
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchLocations();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const handleAuthSuccess = (newUserId: string, name?: string, avatar?: string, role?: string) => {
    login(newUserId, name || `User ${newUserId.substring(0,5)}`, avatar, role || 'User'); // Update context on login
    setIsAuthModalOpen(false);
    toast({title: "Authentication Successful"});
  };

  const handleLogout = () => {
      logout(); // Update context on logout
      setIsProfileOpen(false);
      toast({title: "Logged Out"});
      setPinnedSpot(null); // Clear pin on logout
  }

  // Simulate pinning the car location temporarily after reservation/parking
   const simulatePinCar = async (spotId: string, locationId: string) => {
       setIsPinning(true);
       setPinnedSpot(null); // Clear previous pin first
       console.log(`Simulating pinning car location at ${spotId} in ${locationId}...`);
       await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

       // Get location details for pinning (optional, for more context)
       const location = locations.find(l => l.id === locationId);

       setPinnedSpot({ spotId, locationId });
       setIsPinning(false);
       toast({
           title: "Car Location Pinned",
           description: `Your car's location at ${spotId} (${location?.name || locationId}) has been temporarily saved.`,
           // Add action to view map or clear pin if needed
       });
   };

  const handleSpotReserved = (spotId: string, locationId: string) => {
      console.log(`Spot ${spotId} at location ${locationId} reserved by user ${userId || 'guest'}`);

       if (!isAuthenticated) {
           toast({
               title: "Sign In Required",
               description: "Please sign in or create an account to manage reservations and pin your car location.",
               action: <Button onClick={() => setIsAuthModalOpen(true)}>Sign In</Button>,
           });
       } else {
           // If authenticated, automatically simulate pinning the car
           simulatePinCar(spotId, locationId);
           // TODO: Add reservation to user's history (requires backend integration)
       }
  };

  // Clear the pinned location manually (example)
  const clearPinnedLocation = () => {
      setPinnedSpot(null);
      toast({ title: "Pinned Location Cleared" });
  };

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
       <div className="flex justify-between items-center mb-6 gap-4">
           <h1 className="text-3xl font-bold">Parking Availability</h1>
           {/* Auth / Profile Button */}
           {isAuthenticated && userId ? (
                <Button variant="outline" onClick={() => setIsProfileOpen(true)}>
                    View Profile
                </Button>
           ) : (
                <Button onClick={() => setIsAuthModalOpen(true)}>
                    Sign In / Sign Up
                </Button>
           )}
       </div>

       {/* Display Pinned Location Info */}
       {pinnedSpot && (
           <Card className="mb-6 border-primary bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Pinned Car Location</CardTitle>
                    </div>
                     <Button variant="ghost" size="sm" onClick={clearPinnedLocation}>Clear Pin</Button>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-primary/90">
                        Spot: <span className="font-medium">{pinnedSpot.spotId}</span> at {locations.find(l => l.id === pinnedSpot.locationId)?.name || pinnedSpot.locationId}
                    </p>
                     {/* Add link to navigate to map centered on this spot if possible */}
                </CardContent>
           </Card>
       )}
        {isPinning && (
             <div className="flex items-center justify-center text-muted-foreground text-sm mb-4">
                <Loader2 className="h-4 w-4 mr-2 animate-spin"/> Pinning car location...
             </div>
        )}


      <Card className="mb-6">
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Select Parking Location
            </CardTitle>
         </CardHeader>
        <CardContent>
          {isLoadingLocations ? (
            <Skeleton className="h-10 w-full" />
          ) : error ? (
             <p className="text-destructive">{error}</p>
          ) : locations.length === 0 ? (
              <p className="text-muted-foreground">No parking locations available.</p>
          ) : (
            <Select
              value={selectedLocationId || ""}
              onValueChange={(value) => setSelectedLocationId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a parking location..." />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} - {loc.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedLocation ? (
        <ParkingLotGrid
          key={selectedLocation.id}
          location={selectedLocation}
          onSpotReserved={handleSpotReserved}
        />
      ) : !isLoadingLocations && !error && locations.length > 0 ? (
         <p className="text-center text-muted-foreground">Please select a parking location above.</p>
      ) : null }

      {/* Authentication Modal */}
       <AuthModal
           isOpen={isAuthModalOpen}
           onClose={() => setIsAuthModalOpen(false)}
           onAuthSuccess={handleAuthSuccess}
       />

        {/* User Profile Modal/Sheet */}
       {isAuthenticated && userId && (
           <UserProfile
               isOpen={isProfileOpen}
               onClose={() => setIsProfileOpen(false)}
               userId={userId}
               onLogout={handleLogout}
               // Pass user details from context
               userName={userName}
               userAvatarUrl={userAvatarUrl}
           />
       )}

        {/* Bottom Navigation - Pass context state */}
        <BottomNavBar
             isAuthenticated={isAuthenticated}
             userRole={userRole || 'User'}
             userName={userName}
             userAvatarUrl={userAvatarUrl}
             onAuthClick={() => setIsAuthModalOpen(true)}
             onProfileClick={() => setIsProfileOpen(true)}
         />
    </div>
  );
}
