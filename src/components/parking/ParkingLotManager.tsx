// src/components/parking/ParkingLotManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import ParkingLotGrid from './ParkingLotGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParkingLot } from '@/services/parking-lot';
import { getAvailableParkingLots } from '@/services/parking-lot'; // Assuming this service exists
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal'; // Import AuthModal
import UserProfile from '@/components/profile/UserProfile'; // Import UserProfile
import { Button } from '@/components/ui/button'; // Import Button
import { useToast } from '@/hooks/use-toast'; // Import useToast

export default function ParkingLotManager() {
  const [locations, setLocations] = useState<ParkingLot[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track auth state
  const [userId, setUserId] = useState<string | null>(null); // Store user ID
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Control auth modal
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Control profile modal

  const { toast } = useToast();

  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      setError(null);
      try {
        const fetchedLocations = await getAvailableParkingLots();
        setLocations(fetchedLocations);
        // Set the first location as default if none is selected
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
  }, []); // Fetch locations only once on mount

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const handleAuthSuccess = (newUserId: string) => {
    setIsAuthenticated(true);
    setUserId(newUserId);
    setIsAuthModalOpen(false);
     toast({title: "Authentication Successful"});
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setUserId(null);
      setIsProfileOpen(false); // Close profile on logout
      toast({title: "Logged Out"});
      // Potentially clear user-specific data if needed
  }

  const handleSpotReserved = (spotId: string, locationId: string) => {
      // Handle logic after spot reservation confirmation, e.g., update user history
      console.log(`Spot ${spotId} at location ${locationId} reserved by user ${userId || 'guest'}`);
      // If not authenticated, prompt login/signup
       if (!isAuthenticated) {
           toast({
               title: "Sign In Required",
               description: "Please sign in or create an account to manage your reservations.",
               action: <Button onClick={() => setIsAuthModalOpen(true)}>Sign In</Button>,
           });
       }
      // TODO: Add reservation to user's history (requires backend integration)
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
          key={selectedLocation.id} // Ensure grid re-renders on location change
          location={selectedLocation}
          onSpotReserved={handleSpotReserved} // Pass down reservation handler
        />
      ) : !isLoadingLocations && !error && locations.length > 0 ? (
         <p className="text-center text-muted-foreground">Please select a parking location above.</p>
      ) : null /* Handle loading/error states for the grid itself if needed */}

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
           />
       )}
    </div>
  );
}
