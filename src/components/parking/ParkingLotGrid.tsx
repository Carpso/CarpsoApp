{// src/components/parking/ParkingLotGrid.tsx
'use client';

import React, { useState, useEffect, useCallback, useContext, useRef } from 'react'; // Added useRef
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
import {
    Dialog,
    DialogContent,
    DialogHeader as DialogSubHeader, // Alias DialogHeader
    DialogTitle as DialogSubTitle,
    DialogDescription as DialogSubDescription,
    DialogFooter as DialogSubFooter,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Eye, BrainCircuit, AlertTriangle, DollarSign, Clock, Car, WifiOff, RefreshCcw, Printer, Download as DownloadIcon, Share2 } from 'lucide-react'; // Added RefreshCcw, Printer, DownloadIcon, Share2
import { predictParkingAvailability, PredictParkingAvailabilityOutput } from '@/ai/flows/predict-parking-availability';
import TimedReservationSlider from './TimedReservationSlider'; // Import the new component
import { Button } from '@/components/ui/button'; // Import Button
import LiveLocationView from './LiveLocationView'; // Import LiveLocationView
import { calculateEstimatedCost } from '@/services/pricing-service'; // Import pricing service
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import { Alert, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { useVisibilityChange } from '@/hooks/useVisibilityChange'; // Import visibility hook
import ParkingTicket from '@/components/common/ParkingTicket'; // Import the new Ticket component
import html2canvas from 'html2canvas'; // For downloading ticket as image

interface ParkingLotGridProps {
  location: ParkingLot;
  onSpotReserved: (spotId: string, locationId: string) => void; // Callback when a spot is reserved
  userTier?: 'Basic' | 'Premium'; // Optional user tier for pricing
}

interface ReservationDetails {
    spotId: string;
    locationId: string;
    locationName: string;
    reservationTime: string; // ISO string
    userId: string | null;
}

const REFRESH_INTERVAL_MS = 60000; // 60 seconds - Reduced background refresh frequency
const FOCUSED_REFRESH_INTERVAL_MS = 15000; // 15 seconds - More frequent when tab is active

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
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState(0); // For manual refresh
  const isVisible = useVisibilityChange(); // Track tab visibility
  const [lastReservationDetails, setLastReservationDetails] = useState<ReservationDetails | null>(null); // Store last reservation details
  const [showTicketModal, setShowTicketModal] = useState(false); // State for ticket modal
  const ticketRef = useRef<HTMLDivElement>(null); // Ref for the ticket component for download

  const { toast } = useToast();

  // Fetch spot status (respecting online status and visibility)
  const fetchSpotStatuses = useCallback(async (isManualRefresh = false) => {
      // Only set loading true on initial load, location change, or manual refresh
      if (isManualRefresh || spots.length === 0 || (spots.length > 0 && !spots[0]?.spotId.startsWith(location.id))) {
          setIsLoading(true);
      }

      // If offline, don't attempt to fetch fresh data
      if (!isOnline) {
          console.log("Offline: Skipping spot status fetch for", location.name);
           // Keep existing data or stop loading if offline and no data initially
            if (spots.length === 0) setIsLoading(false);
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
          if (isOnline) toast({ title: "Prediction Info", description: "Could not fetch prediction data.", variant: "default" });
      } finally {
          setIsPredictionLoading(false);
      }

      try {
          // Fetch Estimated Cost (simulate for 1 hour)
           // Use cached pricing rules or fetch only if needed
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


  // --- Effect for Periodic Refresh ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startInterval = () => {
      // Clear existing interval before starting a new one
      if (intervalId) clearInterval(intervalId);

      // Only set interval if online
      if (isOnline) {
        // Fetch immediately when starting interval (or when tab becomes visible)
        fetchSpotStatuses();

        const intervalDuration = isVisible ? FOCUSED_REFRESH_INTERVAL_MS : REFRESH_INTERVAL_MS;
        console.log(`Setting refresh interval to ${intervalDuration / 1000}s (Visible: ${isVisible})`);
        intervalId = setInterval(fetchSpotStatuses, intervalDuration);
      } else {
          console.log("Offline, clearing refresh interval.");
      }
    };

    startInterval(); // Start interval on mount/dependency change

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchSpotStatuses, isOnline, isVisible]); // Re-run effect if fetch function, online status, or visibility changes


 // --- Effect for Manual Refresh Trigger ---
 useEffect(() => {
     if (manualRefreshTrigger > 0) {
         fetchSpotStatuses(true); // Pass true to indicate manual refresh
     }
 // Only depend on the trigger value
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [manualRefreshTrigger]);


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

             // Set up interval for periodic updates (only if online and dialog open)
             const intervalId = setInterval(() => {
                  // Check if dialog is still open and online
                 if (isDialogOpen && isOnline) {
                    fetchPredictionAndCost(spot); // Re-fetch both prediction and cost
                 } else if (predictionInterval) {
                      // Clear interval if dialog closes or goes offline
                      clearInterval(predictionInterval);
                      setPredictionInterval(null);
                 }
             }, FOCUSED_REFRESH_INTERVAL_MS); // Use faster refresh for dialog
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
          setIsReserving(false); // Ensure loading stops if offline
          return;
      }
      setIsReserving(true);
      const reservationTime = new Date().toISOString(); // Capture reservation time

      try {
         // Simulate reservation API call
         await new Promise(resolve => setTimeout(resolve, 1000));

         // Simulate API success/failure
         const reservationSuccess = Math.random() > 0.1; // 90% success rate

         if (!reservationSuccess) throw new Error("Failed to confirm reservation with the server.");

          const reservationDetails: ReservationDetails = {
             spotId: selectedSpot.spotId,
             locationId: location.id,
             locationName: location.name,
             reservationTime: reservationTime,
             userId: userId,
          };
          setLastReservationDetails(reservationDetails); // Store details for ticket/sharing

         setIsDialogOpen(false); // Close dialog on successful reservation

          // Show toast with buttons
         toast({
             title: "Reservation Successful",
             description: `Spot ${selectedSpot.spotId} reserved! Est. Cost: ~$${estimatedCost?.toFixed(2)}/hr`,
             duration: 15000, // Keep toast longer to allow interaction
             action: (
                 <div className="flex flex-col gap-2 mt-2">
                     <Button variant="secondary" size="sm" onClick={() => handleShowTicket(reservationDetails)}>
                         <Printer className="mr-2 h-4 w-4" /> View Ticket / QR
                     </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                           setLiveLocationSpotId(selectedSpot.spotId);
                           setShowLiveLocation(true);
                      }}>
                         <Eye className="mr-2 h-4 w-4" /> Live View
                     </Button>
                      {/* Share Button (requires Web Share API) */}
                      {navigator.share && (
                         <Button variant="outline" size="sm" onClick={() => handleShareTicket(reservationDetails)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share Details
                         </Button>
                      )}
                 </div>
             ),
         });


         // Optimistically update the spot status
         setSpots(prevSpots =>
           prevSpots.map(spot =>
             spot.spotId === selectedSpot.spotId ? { ...spot, isOccupied: true } : spot
           )
         );
         onSpotReserved(selectedSpot.spotId, location.id); // Notify parent
         setSelectedSpot(null); // Clear selection

      } catch (error: any) {
           console.error("Reservation failed:", error);
           toast({
               title: "Reservation Failed",
               description: error.message || "Could not reserve the spot. Please try again.",
               variant: "destructive",
           });
           // Optionally refetch spot status on failure to get the latest state
           fetchSpotStatuses();
      } finally {
           setIsReserving(false);
            // Clear prediction interval on dialog close/failure
            if (predictionInterval) {
                clearInterval(predictionInterval);
                setPredictionInterval(null);
            }
      }

      // TODO: If offline reservation queue exists, remove this reservation from the queue on success, or mark as failed on error
       if (!isOnline) {
            // Handle offline queue result (simulation)
           // updateOfflineQueueStatus(selectedSpot.spotId, reservationSuccess ? 'synced' : 'failed');
       }
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
          // When dialog opens, fetch prediction/cost if online
          if (selectedSpot && isOnline) {
              fetchPredictionAndCost(selectedSpot);
          }
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

   const handleManualRefresh = () => {
       setManualRefreshTrigger(prev => prev + 1); // Increment trigger to run effect
   };

    // --- Ticket / Share / Download ---
    const handleShowTicket = (details: ReservationDetails | null) => {
        if (!details) return;
        setLastReservationDetails(details); // Ensure modal uses correct details
        setShowTicketModal(true);
    };

    const handleDownloadTicket = async () => {
        if (!ticketRef.current || !lastReservationDetails) return;
        try {
            const canvas = await html2canvas(ticketRef.current, {
                scale: 2, // Increase scale for better resolution
                useCORS: true, // Important if QR code or images are from external source
                backgroundColor: '#ffffff', // Set background color
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `carpso-ticket-${lastReservationDetails.spotId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "Ticket Downloaded", description: "Check your downloads folder." });
        } catch (error) {
            console.error("Failed to download ticket:", error);
            toast({ title: "Download Failed", variant: "destructive" });
        }
    };

    const handleShareTicket = async (details: ReservationDetails | null) => {
        if (!details || !navigator.share) {
            toast({ title: "Sharing Not Supported", description: "Your browser doesn't support sharing.", variant: "default" });
            return;
        }
        const shareData = {
            title: `Carpso Parking Reservation - Spot ${details.spotId}`,
            text: `Reserved parking spot ${details.spotId} at ${details.locationName}.\nTime: ${new Date(details.reservationTime).toLocaleString()}`,
            // url: window.location.href // Or a specific URL related to the reservation
        };
        try {
            await navigator.share(shareData);
            console.log('Reservation shared successfully');
        } catch (error) {
            console.error('Error sharing reservation:', error);
             // Don't show error toast for AbortError (user cancelled share)
             if ((error as DOMException).name !== 'AbortError') {
                toast({ title: "Sharing Failed", variant: "destructive" });
            }
        }
    };

  const availableSpots = spots.filter(spot => !spot.isOccupied).length;
  const totalSpots = location.capacity;

  return (
    <>
       <Card className="mb-8">
         <CardHeader>
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                 <div>
                     <CardTitle>Select an Available Spot at {location.name}</CardTitle>
                     <CardDescription>{location.address}</CardDescription>
                     <CardDescription>Click on a green spot (<Car className="inline h-4 w-4 text-green-800" />) to reserve.</CardDescription>
                 </div>
                 {/* Manual Refresh Button */}
                 <Button
                     variant="outline"
                     size="sm"
                     onClick={handleManualRefresh}
                     disabled={isLoading || !isOnline} // Disable if loading or offline
                     className="w-full sm:w-auto"
                 >
                     {isLoading && manualRefreshTrigger > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                     Refresh Status
                 </Button>
             </div>
              {/* Display last updated time or offline status */}
              <div className="text-xs text-muted-foreground pt-2">
                 {isLoading && !(manualRefreshTrigger > 0) ? ( // Show "Loading..." only on initial load
                     <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</span>
                 ) : !isOnline ? (
                     <span className="flex items-center gap-1 text-destructive"><WifiOff className="h-3 w-3" /> Offline - Data may be outdated.</span>
                 ) : lastFetchTimestamp ? (
                     <span>Last Updated: {new Date(lastFetchTimestamp).toLocaleTimeString()}</span>
                 ) : (
                      <span>Updating...</span> // Show if online but no timestamp yet
                 )}
             </div>
         </CardHeader>
         <CardContent>
            {isLoading && spots.length === 0 ? ( // Show skeleton only on initial load when spots are empty
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
               {isLoading && spots.length === 0 ? 'Loading spots...' : `${availableSpots} / ${totalSpots} spots available`}
           </div>
         </CardFooter>
       </Card>

       {/* Reservation Confirmation Dialog */}
        <AlertDialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reserve Parking Spot {selectedSpot?.spotId}?</AlertDialogTitle>
              {/* Moved description text here */}
               <AlertDialogDescription>
                 You are reserving spot <span className="font-semibold">{selectedSpot?.spotId}</span> at {location.name}.
               </AlertDialogDescription>
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

         {/* Parking Ticket Modal */}
         <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
            <DialogContent className="sm:max-w-md">
                <DialogSubHeader>
                    <DialogSubTitle>Parking Ticket / QR Code</DialogSubTitle>
                     <DialogSubDescription>
                        Spot {lastReservationDetails?.spotId} at {lastReservationDetails?.locationName}
                    </DialogSubDescription>
                </DialogSubHeader>
                <div ref={ticketRef} className="py-4"> {/* Add ref here */}
                     {lastReservationDetails && (
                        <ParkingTicket
                            spotId={lastReservationDetails.spotId}
                            locationName={lastReservationDetails.locationName}
                            reservationTime={lastReservationDetails.reservationTime}
                            qrCodeValue={`CARPSO-${lastReservationDetails.spotId}-${lastReservationDetails.locationId}-${new Date(lastReservationDetails.reservationTime).getTime()}`}
                        />
                    )}
                </div>
                <DialogSubFooter className="flex-col sm:flex-row gap-2 sm:gap-1">
                    <Button variant="outline" onClick={handleDownloadTicket} disabled={!lastReservationDetails}>
                        <DownloadIcon className="mr-2 h-4 w-4" /> Download
                    </Button>
                     {navigator.share && (
                        <Button variant="outline" onClick={() => handleShareTicket(lastReservationDetails)}>
                             <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                     )}
                    <Button variant="default" onClick={() => setShowTicketModal(false)}>
                        Close
                    </Button>
                </DialogSubFooter>
            </DialogContent>
         </Dialog>
    </>
  );
}
