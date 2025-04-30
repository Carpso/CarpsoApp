// src/components/parking/ParkingLotGrid.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { ParkingSpotStatus } from '@/services/parking-sensor';
import { getParkingSpotStatus } from '@/services/parking-sensor';
import ParkingSpot from './ParkingSpot';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info } from 'lucide-react';

const TOTAL_SPOTS = 20; // Example total number of spots

export default function ParkingLotGrid() {
  const [spots, setSpots] = useState<ParkingSpotStatus[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSpotStatuses = async () => {
      // Only set loading true on initial load
      if (spots.length === 0) setIsLoading(true);
      try {
        const spotPromises = Array.from({ length: TOTAL_SPOTS }, (_, i) =>
          getParkingSpotStatus(`A${i + 1}`) // Example Spot ID format
        );
        const spotStatuses = await Promise.all(spotPromises);
        setSpots(spotStatuses);
      } catch (error) {
        console.error("Failed to fetch parking spot statuses:", error);
        toast({
          title: "Error",
          description: "Failed to load parking spot data. Please try again later.",
          variant: "destructive",
        });
      } finally {
         // Only set loading false on initial load
        if (isLoading) setIsLoading(false);
      }
    };

    fetchSpotStatuses();
    // Optional: Set up interval polling for real-time updates
    const intervalId = setInterval(fetchSpotStatuses, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId); // Cleanup interval on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // Removed `spots` and `isLoading` dependency to avoid loop

  const handleSelectSpot = (spot: ParkingSpotStatus) => {
     if (!spot.isOccupied) {
      setSelectedSpot(spot);
      setIsDialogOpen(true);
    } else {
         toast({
             title: "Spot Occupied",
             description: `Spot ${spot.spotId} is currently occupied.`,
             variant: "default", // Use default or a custom 'info' variant if created
         });
    }
  };

  const handleReserve = async () => {
      if (!selectedSpot) return;
      setIsReserving(true);
      // Simulate reservation API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsReserving(false);
      setIsDialogOpen(false); // Close dialog on successful reservation

      toast({
        title: "Reservation Successful",
        description: `Spot ${selectedSpot.spotId} reserved successfully!`,
      });

      // Optimistically update the spot status
      setSpots(prevSpots =>
        prevSpots.map(spot =>
          spot.spotId === selectedSpot.spotId ? { ...spot, isOccupied: true } : spot
        )
      );
      setSelectedSpot(null); // Clear selection
  };

  const handleDialogClose = () => {
      setIsDialogOpen(false);
      // Delay clearing selected spot slightly to allow dialog fade-out
      setTimeout(() => {
          if (!isReserving) { // Don't clear if reservation is in progress
             setSelectedSpot(null);
          }
      }, 300);
  }

  const availableSpots = spots.filter(spot => !spot.isOccupied).length;

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Parking Availability</h1>

       <Card className="mb-8">
         <CardHeader>
             <CardTitle>Select an Available Spot</CardTitle>
             <CardDescription>Click on a green spot to view details and reserve.</CardDescription>
         </CardHeader>
         <CardContent>
            {isLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {Array.from({ length: TOTAL_SPOTS }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full aspect-square" />
                ))}
                </div>
            ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {spots.map((spot) => (
                    <ParkingSpot
                    key={spot.spotId}
                    spot={spot}
                    // isSelected={selectedSpot?.spotId === spot.spotId} // No visual selection needed on grid now
                    onSelect={() => handleSelectSpot(spot)} // Pass the full spot object
                    />
                ))}
                </div>
            )}
         </CardContent>
         <CardFooter className="flex justify-center items-center pt-4">
           <div className="text-sm text-muted-foreground">
               {isLoading ? 'Loading spots...' : `${availableSpots} / ${TOTAL_SPOTS} spots available`}
           </div>
            {/* Reservation button moved to AlertDialog */}
         </CardFooter>
       </Card>

       {/* Reservation Confirmation Dialog */}
        <AlertDialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reserve Parking Spot {selectedSpot?.spotId}?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to reserve spot <span className="font-semibold">{selectedSpot?.spotId}</span>.
                {/* Add more details like price, duration limits, etc. here */}
                <p className="mt-2">Estimated cost: $5.00 (Example)</p>
                <p className="text-xs text-muted-foreground mt-1">Reservations are held for 15 minutes.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDialogClose} disabled={isReserving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReserve}
                disabled={isReserving || selectedSpot?.isOccupied} // Double check occupancy
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isReserving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reserving...
                  </>
                ) : (
                  'Confirm Reservation'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
