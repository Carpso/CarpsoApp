// src/components/parking/ParkingLotGrid.tsx
'use client';

import React, { useState, useEffect, useCallback, useContext } from 'react'; // Added useContext
import type { ParkingSpotStatus } from '@/services/parking-sensor';
import type { ParkingLot } from '@/services/parking-lot';
import { getParkingSpotStatus } from '@/services/parking-sensor';
import ParkingSpot from './ParkingSpot';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Eye, BrainCircuit, AlertTriangle, DollarSign, Clock, Car, WifiOff } from 'lucide-react'; // Added DollarSign, Clock, Car, WifiOff
import { predictParkingAvailability, PredictParkingAvailabilityOutput } from '@/ai/flows/predict-parking-availability';
import TimedReservationSlider from './TimedReservationSlider'; // Import the new component
import { Button } from '@/components/ui/button'; // Import Button
import LiveLocationView from './LiveLocationView'; // Import LiveLocationView
import { calculateEstimatedCost } from '@/services/pricing-service'; // Import pricing service
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import { Alert, AlertTitle } from '@/components/ui/alert'; // Import Alert components

interface ParkingLotGridProps {
  location: ParkingLot;
  onSpotReserved: (spotId: string, locationId: string) => void; // Callback when a spot is reserved
  userTier?: 'Basic' | 'Premium'; // Optional user tier for pricing
}

export default function ParkingLotGrid({ location, onSpotReserved, userTier = 'Basic' }: ParkingLotGridProps) {
  const { userId, isOnline } = useContext(AppStateContext)!; // Get userId and isOnline from context
  const [spots, setSpots] = useState<ParkingSpotStatus[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [prediction, setPrediction] = useState<PredictParkingAvailabilityOutput | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const [showLiveLocation, setShowLiveLocation] = useState(false); // State for Live Location modal
  const [liveLocationSpotId, setLiveLocationSpotId] = useState<string | null>(null); // Spot ID for Live Location
  const [predictionInterval, setPredictionInterval] = useState<NodeJS.Timeout | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [costRule, setCostRule] = useState<string | null>(null);
  const [isCostLoading, setIsCostLoading] = useState(false);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(null);

  const { toast } = useToast();

  // Fetch spot status (respecting online status)
  const fetchSpotStatuses = useCallback(async () => {
      // Only set loading true on initial load or location change
      if (spots.length === 0 || (spots.length > 0 && !spots[0]?.spotId.startsWith(location.id))) {
          setIsLoading(true);
      }

      // If offline, don't attempt to fetch fresh data
      if (!isOnline) {
          console.log("Offline: Skipping spot status fetch for", location.name);
           // Optionally update UI to show data might be stale
           // If we had cached spot data, we could load it here
           // For now, just keep existing data or show loading/error
            if (spots.length === 0) setIsLoading(false); // Stop loading if offline and no data initially
           return;
      }

      console.log("Fetching spot statuses for", location.name);
      try {
        // Simulate fetching spots for the specific location
        const spotPromises = Array.from({ length: location.capacity }, (_, i) =>
          getParkingSpotStatus(`${location.id}-S${i + 1}`) // Example Spot ID format using location ID
        );
        const spotStatuses = await Promise.all(spotPromises);
        setSpots(spotStatuses);
        setLastFetchTimestamp(Date.now()); // Record timestamp of successful fetch
      } catch (error) {
        console.error("Failed to fetch parking spot statuses:", error);
        // Don't show error toast if offline, the main manager component handles the offline notification
        if (isOnline) {
            toast({
              title: "Error",
              description: `Failed to load parking data for ${location.name}. Please try again later.`,
              variant: "destructive",
            });
        }
      } finally {
         // Only set loading false on initial load/location change or successful fetch
         setIsLoading(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id, location.name, location.capacity, toast, isOnline]); // Added isOnline dependency

  // Fetch prediction and cost (only if online)
  const fetchPredictionAndCost = useCallback(async (spot: ParkingSpotStatus) => {
      if (!isOnline) {
          setPrediction(null);
          setEstimatedCost(null);
          setCostRule(null);
          setIsPredictionLoading(false);
          setIsCostLoading(false);
          return; // Don't fetch if offline
      }

      setIsPredictionLoading(true);
      setIsCostLoading(true);
      setPrediction(null);
      setEstimatedCost(null);
      setCostRule(null);

      try {
          // Fetch Prediction
          const historicalData = `Spot ${spot.spotId} usage: Mon-Fri 8am-6pm busy, weekends lighter. Frequent user: ${userId || 'N/A'}`;
          const trends = `Time: ${new Date().toLocaleTimeString()}. Weather: Clear. Events: None. User Tier: ${userTier}`;
          const predictionResult = await predictParkingAvailability({ spotId: spot.spotId, historicalData, trends });
          setPrediction(predictionResult);
      } catch (err) {
          console.error('Prediction failed:', err);
          // Avoid toast if offline, though this block shouldn't run if offline
          if (isOnline) toast({ title: "Prediction Info", description: "Could not fetch prediction data.", variant: "default" });
      } finally {
          setIsPredictionLoading(false);
      }

      try {
          // Fetch Estimated Cost (simulate for 1 hour)
          const costResult = await calculateEstimatedCost(location, 60, userId, userTier);
          setEstimatedCost(costResult.cost);
          setCostRule(costResult.appliedRule);
      } catch (err) {
           console.error('Cost calculation failed:', err);
           if (isOnline) toast({ title: "Pricing Info", description: "Could not calculate estimated cost.", variant: "default" });
      } finally {
           setIsCostLoading(false);
      }
  }, [location, userId, userTier, toast, isOnline]); // Added isOnline dependency


  useEffect(() => {
    fetchSpotStatuses(); // Fetch initially and on location/online status change
    const intervalId = setInterval(fetchSpotStatuses, 30000); // Refresh every 30 seconds (will skip if offline)
    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [fetchSpotStatuses]); // Depend on the memoized fetch function

 const handleSelectSpot = async (spot: ParkingSpotStatus) => {
     if (!spot.isOccupied) {
         setSelectedSpot(spot);
         setIsDialogOpen(true);

         // Fetch prediction and cost only if online
         if (isOnline) {
             fetchPredictionAndCost(spot);

             // Clear existing interval if it exists
             if (predictionInterval) {
                 clearInterval(predictionInterval);
             }

             // Set up interval for periodic updates (only if online)
             const intervalId = setInterval(() => {
                 if (isOnline) { // Double check online status inside interval
                    fetchPredictionAndCost(spot); // Re-fetch both prediction and cost
                 }
             }, 15000); // Increased interval slightly
             setPredictionInterval(intervalId); // Store the interval ID
         } else {
             // Handle offline case for dialog - clear prediction/cost
             setPrediction(null);
             setEstimatedCost(null);
             setCostRule(null);
             setIsPredictionLoading(false);
             setIsCostLoading(false);
         }

     } else {
          // Allow viewing live location even if offline (might show cached image or error)
          setLiveLocationSpotId(spot.spotId);
          setShowLiveLocation(true);
         // Modify toast for occupied spot when offline
         if (!isOnline) {
              toast({
                 title: "Spot Occupied (Offline)",
                 description: `Cannot verify real-time status for ${spot.spotId}. Cached data shows occupied.`,
                 variant: "default",
                 duration: 3000,
              });
         } else {
            toast({
                title: "Spot Occupied",
                description: `Spot ${spot.spotId} is currently occupied. Click again to view live location.`, // Updated description
                variant: "default",
                duration: 3000,
            });
         }
     }
 };


  const handleReserveConfirm = async () => {
      if (!selectedSpot || !isOnline) { // Prevent reservation if offline
          toast({ title: "Offline", description: "Cannot reserve spots while offline.", variant: "destructive"});
          return;
      }
      setIsReserving(true);

      // Simulate reservation API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsReserving(false);
      setIsDialogOpen(false); // Close dialog on successful reservation

      toast({
        title: "Reservation Successful",
        description: (
             <div className="flex flex-col gap-2">
               <span>Spot {selectedSpot.spotId} reserved successfully! Estimated cost: ~${estimatedCost?.toFixed(2)}/hr.</span>
               <Button variant="outline" size="sm" onClick={() => {
                   setLiveLocationSpotId(selectedSpot.spotId);
                   setShowLiveLocation(true);
               }}>
                 <Eye className="mr-2 h-4 w-4" /> View Live Location
               </Button>
            </div>
        ),
        duration: 7000, // Keep toast longer
      });

      // Optimistically update the spot status
      setSpots(prevSpots =>
        prevSpots.map(spot =>
          spot.spotId === selectedSpot.spotId ? { ...spot, isOccupied: true } : spot
        )
      );
      onSpotReserved(selectedSpot.spotId, location.id); // Notify parent
      setSelectedSpot(null); // Clear selection
      // TODO: If offline reservation queue exists, remove this reservation from the queue
  };

  const handleDialogClose = (open: boolean) => {
      if (!open) {
         setIsDialogOpen(false);
          // Delay clearing selected spot slightly to allow dialog fade-out
          setTimeout(() => {
             setSelectedSpot(null);
             setPrediction(null); // Clear prediction
             setEstimatedCost(null); // Clear cost
             setCostRule(null);
              if (predictionInterval) {
                    clearInterval(predictionInterval);
                    setPredictionInterval(null);
              }
          }, 300);
      } else {
          setIsDialogOpen(true);
      }
  }

  const handleReservationTimeout = () => {
      setIsDialogOpen(false);
      toast({
        title: "Reservation Timed Out",
        description: `Reservation for spot ${selectedSpot?.spotId} expired.`,
        variant: "destructive",
      });
       setTimeout(() => {
           setSelectedSpot(null);
           setPrediction(null); // Clear prediction
           setEstimatedCost(null); // Clear cost
           setCostRule(null);
           if (predictionInterval) {
               clearInterval(predictionInterval);
               setPredictionInterval(null);
           }
        }, 300);
  };


  const availableSpots = spots.filter(spot => !spot.isOccupied).length;
  const totalSpots = location.capacity;

  return (
    <>
       <Card className="mb-8">
         <CardHeader>
             <CardTitle>Select an Available Spot at {location.name}</CardTitle>
             <CardDescription>{location.address}</CardDescription>
             <CardDescription>Click on a green spot (<Car className="inline h-4 w-4 text-green-800" />) to reserve.</CardDescription>
              {/* Display last updated time or offline status */}
              <div className="text-xs text-muted-foreground pt-1">
                 {isLoading ? (
                     <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</span>
                 ) : !isOnline ? (
                     <span className="flex items-center gap-1 text-destructive"><WifiOff className="h-3 w-3" /> Offline - Data may be outdated.</span>
                 ) : lastFetchTimestamp ? (
                     <span>Last Updated: {new Date(lastFetchTimestamp).toLocaleTimeString()}</span>
                 ) : (
                      <span>Updating...</span>
                 )}
             </div>
         </CardHeader>
         <CardContent>
            {isLoading ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {Array.from({ length: totalSpots }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full aspect-square" />
                ))}
                </div>
            ) : spots.length === 0 ? (
                 <p className="text-muted-foreground text-center">No spots available to display for this location.</p>
            ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {spots.map((spot) => (
                    <ParkingSpot
                    key={spot.spotId}
                    spot={spot}
                    onSelect={() => handleSelectSpot(spot)}
                    />
                ))}
                </div>
            )}
         </CardContent>
         <CardFooter className="flex justify-center items-center pt-4">
           <div className="text-sm text-muted-foreground">
               {isLoading ? 'Loading spots...' : `${availableSpots} / ${totalSpots} spots available`}
           </div>
         </CardFooter>
       </Card>

       {/* Reservation Confirmation Dialog */}
        <AlertDialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reserve Parking Spot {selectedSpot?.spotId}?</AlertDialogTitle>
               {/* Moved description text here */}
              <div className="text-sm text-muted-foreground pt-2">
                 You are reserving spot <span className="font-semibold">{selectedSpot?.spotId}</span> at {location.name}.
              </div>
            </AlertDialogHeader>

            {/* Cost and Prediction Sections (Outside Description) */}
            <div className="space-y-4 pt-2">
               {/* Offline Alert within Dialog */}
                {!isOnline && (
                    <Alert variant="destructive">
                        <WifiOff className="h-4 w-4" />
                        <AlertTitle>You are offline!</AlertTitle>
                         <AlertDialogDescription>
                           Cost estimates and availability predictions are unavailable. Reservations cannot be confirmed until you reconnect.
                        </AlertDialogDescription>
                    </Alert>
                )}
                {/* Estimated Cost Display */}
                 <div className="text-sm border-t pt-3">
                    <h4 className="font-medium mb-1 flex items-center gap-1"><DollarSign className="h-4 w-4 text-green-600" /> Estimated Cost:</h4>
                     {isCostLoading && isOnline ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Calculating cost...
                        </div>
                     ) : !isOnline ? (
                          <p className="text-muted-foreground text-xs flex items-center gap-1"><WifiOff className="h-3 w-3" /> Unavailable offline</p>
                    ) : estimatedCost !== null ? (
                         <div className="space-y-1">
                            <p>Rate: <span className="font-semibold">${estimatedCost.toFixed(2)} / hour</span></p>
                            <p className="text-xs text-muted-foreground">Based on: {costRule || 'Standard rate'}</p>
                         </div>
                    ) : (
                        <p className="text-muted-foreground text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Cost estimate unavailable.</p>
                    )}
                 </div>
                {/* Prediction Display */}
                <div className="text-sm border-t pt-3">
                   <h4 className="font-medium mb-1 flex items-center gap-1"><BrainCircuit className="h-4 w-4 text-primary" /> Availability Prediction:</h4>
                    {isPredictionLoading && isOnline ? (
                       <div className="flex items-center gap-2 text-muted-foreground">
                           <Loader2 className="h-4 w-4 animate-spin" /> Loading prediction...
                       </div>
                    ) : !isOnline ? (
                         <p className="text-muted-foreground text-xs flex items-center gap-1"><WifiOff className="h-3 w-3" /> Unavailable offline</p>
                   ) : prediction ? (
                       <div className="space-y-1">
                           <p>Likely Available Soon: <span className="font-semibold">{(prediction.predictedAvailability * 100).toFixed(0)}%</span></p>
                           <p>Confidence: <span className="font-semibold capitalize">{prediction.confidenceLevel}</span></p>
                           <p className="text-xs text-muted-foreground">Factors: {prediction.factors}</p>
                       </div>
                   ) : (
                       <p className="text-muted-foreground text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Prediction data unavailable.</p>
                   )}
                </div>
                 <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Reservations held for a limited time. Confirm below.</p>
            </div>

             {/* Timed Reservation Slider */}
             <div className="my-4 px-1">
                 <TimedReservationSlider
                     onConfirm={handleReserveConfirm}
                     onTimeout={handleReservationTimeout}
                     isConfirming={isReserving} // Pass reserving state
                      disabled={isReserving || selectedSpot?.isOccupied || !isOnline} // Disable slider when reserving, spot occupied, OR OFFLINE
                     timeoutSeconds={60} // Set timeout to 60 seconds
                 />
             </div>
            <AlertDialogFooter className="mt-0 pt-0"> {/* Adjusted spacing */}
              <AlertDialogCancel onClick={() => handleDialogClose(false)} disabled={isReserving}>Cancel</AlertDialogCancel>
              {/* Confirmation button is now part of the slider component */}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Live Location View Modal */}
        <LiveLocationView
           isOpen={showLiveLocation}
           onClose={() => {
               setShowLiveLocation(false);
               setLiveLocationSpotId(null); // Clear spot ID when closing
           }}
           spotId={liveLocationSpotId}
           locationName={location.name}
           // Pass available sources if known for the specific lot/spot
           availableSources={{
               // Example: Lot A has IP cams, Lot C might have stills
               ipCameraUrl: location.id === 'lot_A' ? `https://picsum.photos/seed/${liveLocationSpotId}-ipcam/640/480?blur=1` : undefined,
               stillImageUrl: location.id === 'lot_C' ? `https://picsum.photos/seed/${liveLocationSpotId}-altstill/640/480` : undefined, // Optional different still URL
           }}
        />
    </>
  );
}


// Helper Icon for ParkingSpot
import { Ban } from 'lucide-react'; // Moved import here
