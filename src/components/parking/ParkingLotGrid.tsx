'use client';

import React, { useState, useEffect } from 'react';
import type { ParkingSpotStatus } from '@/services/parking-sensor';
import { getParkingSpotStatus } from '@/services/parking-sensor'; // Assuming this exists and works
import ParkingSpot from './ParkingSpot';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';


const TOTAL_SPOTS = 20; // Example total number of spots

export default function ParkingLotGrid() {
  const [spots, setSpots] = useState<ParkingSpotStatus[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSpotStatuses = async () => {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    };

    fetchSpotStatuses();
    // Optional: Set up interval polling for real-time updates
    const intervalId = setInterval(fetchSpotStatuses, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [toast]);

  const handleSelectSpot = (spotId: string) => {
    setSelectedSpotId(prev => prev === spotId ? null : spotId); // Toggle selection
  };

  const handleReserve = async () => {
      if (!selectedSpotId) return;
      setIsReserving(true);
      // Simulate reservation API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsReserving(false);
      toast({
        title: "Reservation Successful",
        description: `Spot ${selectedSpotId} reserved successfully!`,
      });
      // Optionally re-fetch data to show the spot as occupied
      const updatedSpots = spots.map(spot =>
        spot.spotId === selectedSpotId ? { ...spot, isOccupied: true } : spot
      );
      setSpots(updatedSpots);
      setSelectedSpotId(null); // Clear selection after reservation
  };

  const availableSpots = spots.filter(spot => !spot.isOccupied).length;
  const selectedSpotDetails = spots.find(spot => spot.spotId === selectedSpotId);

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Parking Availability</h1>

       <Card className="mb-8">
         <CardHeader>
             <CardTitle>Select a Spot</CardTitle>
         </CardHeader>
         <CardContent>
            {isLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {Array.from({ length: TOTAL_SPOTS }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full" />
                ))}
                </div>
            ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {spots.map((spot) => (
                    <ParkingSpot
                    key={spot.spotId}
                    spot={spot}
                    isSelected={selectedSpotId === spot.spotId}
                    onSelect={handleSelectSpot}
                    />
                ))}
                </div>
            )}
         </CardContent>
         <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-4">
           <div className="mb-4 sm:mb-0 text-sm text-muted-foreground">
               {isLoading ? 'Loading spots...' : `${availableSpots} / ${TOTAL_SPOTS} spots available`}
           </div>
            <Button
              onClick={handleReserve}
              disabled={!selectedSpotId || isReserving || selectedSpotDetails?.isOccupied} // Also disable if somehow selected spot is occupied
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isReserving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reserving...
                </>
              ) : (
                 selectedSpotId ? `Reserve Spot ${selectedSpotId}` : 'Select a Spot to Reserve'
              )}
            </Button>
         </CardFooter>
       </Card>

       {/* Reservation Summary/Payment could go here */}
       {/* {selectedSpotId && !selectedSpotDetails?.isOccupied && (
           <Card>
             <CardHeader><CardTitle>Confirm Reservation</CardTitle></CardHeader>
             <CardContent>
               <p>You selected spot: <span className="font-semibold">{selectedSpotId}</span></p>
               <p>Price: $5.00</p> // Example price
             </CardContent>
             <CardFooter>
               <Button onClick={handleReserve} disabled={isReserving}>
                 {isReserving ? 'Processing...' : 'Confirm & Pay'}
               </Button>
             </CardFooter>
           </Card>
       )} */}
    </div>
  );
}
