// src/components/parking/ParkingLotGrid.tsx
'use client';

import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
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
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription, // Use the main AlertDialogDescription here for the primary description
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogHeader as DialogSubHeader,
    DialogTitle as DialogSubTitle,
    DialogDescription as DialogSubDescription,
    DialogFooter as DialogSubFooter,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Eye, BrainCircuit, AlertTriangle, DollarSign, Clock, Car, WifiOff, RefreshCcw, Printer, Download as DownloadIcon, Share2, Users, BellPlus, Timer, UserCheck, Ban } from 'lucide-react';
import { predictParkingAvailability, PredictParkingAvailabilityOutput } from '@/ai/flows/predict-parking-availability';
import TimedReservationSlider from './TimedReservationSlider';
import { Button } from '@/components/ui/button';
import LiveLocationView from './LiveLocationView';
import { calculateEstimatedCost } from '@/services/pricing-service';
import { AppStateContext } from '@/context/AppStateProvider';
import { Alert, AlertTitle, AlertDescription as AlertDescriptionSub } from '@/components/ui/alert'; // Use AlertDescriptionSub for nested alerts
import { useVisibilityChange } from '@/hooks/useVisibilityChange';
import ParkingTicket from '@/components/common/ParkingTicket';
import html2canvas from 'html2canvas';
import { formatDistanceToNowStrict } from 'date-fns';
import ReportIssueModal from '@/components/profile/ReportIssueModal';
import { joinQueue, leaveQueue, getUserQueueStatus, getQueueLength } from '@/services/queue-service';
import { getUserGamification, incrementParkingExtensions, UserGamification } from '@/services/user-service';

const MAX_PARKING_EXTENSIONS_BASIC = 2;

interface ParkingLotGridProps {
  location: ParkingLot;
  onSpotReserved: (spotId: string, locationId: string) => void;
  userTier?: 'Basic' | 'Premium';
}

interface ReservationDetails {
    spotId: string;
    locationId: string;
    locationName: string;
    reservationTime: string;
    userId: string | null;
}

interface ParkingHistoryEntry {
  id: string;
  spotId: string;
  locationName: string;
  locationId: string;
  startTime: string;
  endTime: string;
  cost: number;
  status: 'Completed' | 'Active' | 'Upcoming';
  extensionCount?: number;
}

const REFRESH_INTERVAL_MS = 15000;
const BACKGROUND_REFRESH_INTERVAL_MS = 60000;

export default function ParkingLotGrid({ location, onSpotReserved, userTier = 'Basic' }: ParkingLotGridProps) {
  const { userId, isOnline, userRole } = useContext(AppStateContext)!;
  const [spots, setSpots] = useState<ParkingSpotStatus[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [prediction, setPrediction] = useState<PredictParkingAvailabilityOutput | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const [showLiveLocation, setShowLiveLocation] = useState(false);
  const [liveLocationSpotId, setLiveLocationSpotId] = useState<string | null>(null);
  const [predictionInterval, setPredictionInterval] = useState<NodeJS.Timeout | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [costRule, setCostRule] = useState<string | null>(null);
  const [isCostLoading, setIsCostLoading] = useState(false);
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(null);
  const [manualRefreshTrigger, setManualRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isVisible = useVisibilityChange();
  const [lastReservationDetails, setLastReservationDetails] = useState<ReservationDetails | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [userQueueData, setUserQueueData] = useState<{ spotId: string; position: number }[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [userGamification, setUserGamification] = useState<UserGamification | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [spotQueueLengths, setSpotQueueLengths] = useState<Record<string, number>>({});
  const [isLoadingQueueLengths, setIsLoadingQueueLengths] = useState(false);

  const { toast } = useToast();

  const isPremiumUser = userRole === 'Premium';

  const fetchUserGamificationData = useCallback(async () => {
      if (!userId || !isOnline) {
          setUserGamification(null);
          return;
      }
      try {
          const data = await getUserGamification(userId);
          setUserGamification(data);
      } catch (error) {
          console.error("Failed to fetch user gamification data:", error);
      }
  }, [userId, isOnline]);

  const fetchSpotStatuses = useCallback(async (isManualRefresh = false) => {
      if (isManualRefresh || spots.length === 0 || (spots.length > 0 && !spots[0]?.spotId.startsWith(location.id))) {
          setIsLoading(true);
          setIsLoadingQueueLengths(true);
      }

      if (!isOnline) {
          console.log("Offline: Skipping spot status fetch for", location.name);
            if (spots.length === 0) {
                 setIsLoading(false);
                 setIsLoadingQueueLengths(false);
            }
           return;
      }

      console.log("Fetching spot statuses for", location.name);
      try {
        const spotPromises = Array.from({ length: location.capacity }, (_, i) =>
          getParkingSpotStatus(`${location.id}-S${i + 1}`)
        );
        const spotStatuses = await Promise.all(spotPromises);

         const queueLengthPromises = spotStatuses.map(spot => getQueueLength(spot.spotId));
         const queueLengths = await Promise.all(queueLengthPromises);
         const newQueueLengths: Record<string, number> = {};
         spotStatuses.forEach((spot, index) => {
             newQueueLengths[spot.spotId] = queueLengths[index];
         });
         setSpotQueueLengths(newQueueLengths);
         setIsLoadingQueueLengths(false);

        setSpots(spotStatuses);
        setLastFetchTimestamp(Date.now());
      } catch (error) {
        console.error("Failed to fetch parking spot statuses or queue lengths:", error);
        if (isOnline) {
            toast({
              title: "Error Loading Spots",
              description: `Failed to load parking data for ${location.name}. Retrying automatically.`,
              variant: "destructive",
              duration: 5000,
            });
        }
      } finally {
         setIsLoading(false);
         setIsRefreshing(false);
      }
  }, [location.id, location.name, location.capacity, toast, isOnline, spots]);

  const fetchUserQueueData = useCallback(async () => {
      if (!userId || !isOnline) {
          setUserQueueData([]);
          return;
      }
      setIsQueueLoading(true);
      try {
          const queueData = await getUserQueueStatus(userId);
          setUserQueueData(queueData);
      } catch (error) {
          console.error("Failed to fetch user queue status:", error);
           if (isOnline) toast({ title: "Queue Status Error", description: "Could not fetch your queue positions.", variant: "default" });
      } finally {
          setIsQueueLoading(false);
      }
  }, [userId, isOnline, toast]);

  const fetchPredictionAndCost = useCallback(async (spot: ParkingSpotStatus) => {
      if (!isOnline) {
          setPrediction(null);
          setEstimatedCost(null);
          setCostRule(null);
          setIsPredictionLoading(false);
          setIsCostLoading(false);
          return;
      }

      setIsPredictionLoading(true);
      setIsCostLoading(true);
      setPrediction(null);
      setEstimatedCost(null);
      setCostRule(null);

      try {
          const historicalData = `Spot ${spot.spotId} usage: Mon-Fri 8am-6pm busy, weekends lighter. Frequent user: ${userId || 'N/A'}`;
          const trends = `Time: ${new Date().toLocaleTimeString()}. Weather: Clear. Events: None. User Tier: ${userTier}`;
          const predictionResult = await predictParkingAvailability({ spotId: spot.spotId, historicalData, trends });
          setPrediction(predictionResult);
      } catch (err) {
          console.error('Prediction failed:', err);
          if (isOnline) toast({ title: "Prediction Info", description: "Could not fetch prediction data.", variant: "default", duration: 3000 });
      } finally {
          setIsPredictionLoading(false);
      }

      try {
          const costResult = await calculateEstimatedCost(location, 60, userId, userTier);
          setEstimatedCost(costResult.cost);
          setCostRule(costResult.appliedRule);
      } catch (err) {
           console.error('Cost calculation failed:', err);
           if (isOnline) toast({ title: "Pricing Info", description: "Could not calculate estimated cost.", variant: "default", duration: 3000 });
      } finally {
           setIsCostLoading(false);
      }
  }, [location, userId, userTier, toast, isOnline]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const startInterval = () => {
      if (intervalId) clearInterval(intervalId);
      if (isOnline) {
        fetchSpotStatuses();
        fetchUserQueueData();
        fetchUserGamificationData();
        const intervalDuration = isVisible ? REFRESH_INTERVAL_MS : BACKGROUND_REFRESH_INTERVAL_MS;
        console.log(`Setting refresh interval to ${intervalDuration / 1000}s (Visible: ${isVisible})`);
        intervalId = setInterval(() => {
             fetchSpotStatuses();
             fetchUserQueueData();
             fetchUserGamificationData();
        }, intervalDuration);
      } else {
          console.log("Offline, clearing refresh interval.");
      }
    };
    startInterval();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchSpotStatuses, fetchUserQueueData, fetchUserGamificationData, isOnline, isVisible]);


 useEffect(() => {
     if (manualRefreshTrigger > 0 && isOnline) {
         setIsRefreshing(true);
         fetchSpotStatuses(true);
         fetchUserQueueData();
         fetchUserGamificationData();
     }
 }, [manualRefreshTrigger, isOnline, fetchSpotStatuses, fetchUserQueueData, fetchUserGamificationData]);


 const handleSelectSpot = async (spot: ParkingSpotStatus) => {
     if (!spot.isOccupied) {
         setSelectedSpot(spot);
         setIsDialogOpen(true);
         if (isOnline) {
             fetchPredictionAndCost(spot);
             if (predictionInterval) clearInterval(predictionInterval);
             const intervalId = setInterval(() => {
                 if (isDialogOpen && isOnline) {
                    fetchPredictionAndCost(spot);
                 } else if (predictionInterval) {
                      clearInterval(predictionInterval);
                      setPredictionInterval(null);
                 }
             }, REFRESH_INTERVAL_MS);
             setPredictionInterval(intervalId);
         } else {
             setPrediction(null);
             setEstimatedCost(null);
             setCostRule(null);
             setIsPredictionLoading(false);
             setIsCostLoading(false);
         }
     } else {
          setLiveLocationSpotId(spot.spotId);
          let occupiedMessage = `Spot ${spot.spotId} is currently occupied.`;
           if (spot.reservationEndTime) {
               try {
                   const endDate = new Date(spot.reservationEndTime);
                   const now = new Date();
                   if (endDate > now) {
                        occupiedMessage += ` Expected to be free in ${formatDistanceToNowStrict(endDate)}.`;
                   } else {
                       occupiedMessage += ` Reservation time has passed; spot may be available soon.`;
                   }
               } catch (e) { /* Ignore parsing errors */ }
           }
           const isInQueue = userQueueData.some(q => q.spotId === spot.spotId);
           const queueLength = spotQueueLengths[spot.spotId] || 0;
           toast({
               title: `Spot ${spot.spotId} Occupied`,
               description: (
                   <div>
                       <p>{occupiedMessage}</p>
                       <p className="text-xs mt-1"> Queue Length: {queueLength} {queueLength === 1 ? 'user' : 'users'}. </p>
                   </div>
               ),
               variant: "default",
               duration: 8000,
                action: (
                 <div className="flex flex-col gap-2 mt-2">
                     <Button variant="outline" size="sm" onClick={() => {
                         setLiveLocationSpotId(spot.spotId);
                         setShowLiveLocation(true);
                     }}> <Eye className="mr-2 h-4 w-4" /> Live View </Button>
                     {userId && isOnline && (
                         isInQueue ? (
                             <Button variant="secondary" size="sm" onClick={() => handleLeaveQueueClick(spot.spotId)} disabled={isQueueLoading} >
                                 {isQueueLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Users className="mr-2 h-4 w-4"/>} Leave Queue
                             </Button>
                         ) : (
                             <Button variant="default" size="sm" onClick={() => handleJoinQueueClick(spot.spotId)} disabled={isQueueLoading} >
                                 {isQueueLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BellPlus className="mr-2 h-4 w-4"/>} Join Queue
                             </Button>
                         )
                     )}
                     {!userId && isOnline && (
                         <Button variant="link" size="sm" onClick={() => { /* TODO: Trigger auth modal */ }}>Sign in to join queue</Button>
                     )}
                 </div>
             ),
           });
     }
 };

    const handleJoinQueueClick = async (spotId: string) => {
        if (!userId || !isOnline) return;
        setIsQueueLoading(true);
        try {
            const position = await joinQueue(userId, spotId);
            if (position !== null) {
                toast({ title: "Queue Joined", description: `You are position ${position} in the queue for spot ${spotId}. We'll notify you!` });
                await fetchUserQueueData();
                await fetchSpotStatuses();
            } else {
                 toast({ title: "Already in Queue", description: `You are already waiting for spot ${spotId}.`, variant: "default" });
            }
        } catch (error) {
             console.error("Failed to join queue:", error);
             toast({ title: "Error Joining Queue", variant: "destructive" });
        } finally {
             setIsQueueLoading(false);
        }
    };

    const handleLeaveQueueClick = async (spotId: string) => {
        if (!userId || !isOnline) return;
        setIsQueueLoading(true);
        try {
            const success = await leaveQueue(userId, spotId);
            if (success) {
                toast({ title: "Queue Left", description: `You are no longer waiting for spot ${spotId}.` });
                await fetchUserQueueData();
                await fetchSpotStatuses();
            } else {
                 toast({ title: "Not in Queue", description: `You weren't in the queue for spot ${spotId}.`, variant: "default" });
            }
        } catch (error) {
             console.error("Failed to leave queue:", error);
             toast({ title: "Error Leaving Queue", variant: "destructive" });
        } finally {
             setIsQueueLoading(false);
        }
    };

    const handleExtendParking = async (currentReservation: ParkingHistoryEntry | null) => {
        if (!currentReservation || !userId || !isOnline || !userGamification) return;
        const extensionsUsed = userGamification.parkingExtensionsUsed || 0;
        const canExtend = isPremiumUser || extensionsUsed < MAX_PARKING_EXTENSIONS_BASIC;
        if (!canExtend) {
            toast({ title: "Extension Limit Reached", description: `You have used your allowed parking extensions (${extensionsUsed}/${MAX_PARKING_EXTENSIONS_BASIC}). Upgrade to Premium for more.`, variant: "destructive", duration: 6000 });
            return;
        }
        setIsExtending(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log(`Simulating extension for reservation ${currentReservation.id}`);
            const newExtensionCount = await incrementParkingExtensions(userId);
            setUserGamification(prev => ({ ...prev!, parkingExtensionsUsed: newExtensionCount }));
            const updatedSpot = await getParkingSpotStatus(currentReservation.spotId);
            setSpots(prevSpots =>
              prevSpots.map(spot =>
                spot.spotId === updatedSpot.spotId ? updatedSpot : spot
              )
            );
            toast({
                title: "Parking Extended!",
                description: `Your parking for spot ${currentReservation.spotId} has been extended. Extensions used: ${newExtensionCount}/${isPremiumUser ? 'Unlimited' : MAX_PARKING_EXTENSIONS_BASIC}.`,
                duration: 6000,
            });
        } catch (error) {
            console.error("Failed to extend parking:", error);
            toast({ title: "Extension Failed", variant: "destructive" });
        } finally {
            setIsExtending(false);
        }
    };

    const findActiveReservationForCurrentUser = (): ParkingHistoryEntry | null => {
        return null;
    }
    const activeReservation = findActiveReservationForCurrentUser();
    const extensionsUsed = userGamification?.parkingExtensionsUsed || 0;
    const canExtendParking = isPremiumUser || extensionsUsed < MAX_PARKING_EXTENSIONS_BASIC;


  const handleReserveConfirm = async () => {
      if (!selectedSpot) return;
      if (!isOnline) {
          toast({
              title: "Offline Reservation Attempted",
              description: "Your reservation request for " + selectedSpot.spotId + " will be queued and processed when you reconnect.",
              variant: "destructive"
          });
          setIsDialogOpen(false);
          setSelectedSpot(null);
          setIsReserving(false);
          return;
      }
      setIsReserving(true);
      const reservationTime = new Date().toISOString();
      try {
         await new Promise(resolve => setTimeout(resolve, 1000));
         const reservationSuccess = Math.random() > 0.1;
         if (!reservationSuccess) throw new Error("Failed to confirm reservation with the server.");
          const reservationDetails: ReservationDetails = {
             spotId: selectedSpot.spotId,
             locationId: location.id,
             locationName: location.name,
             reservationTime: reservationTime,
             userId: userId,
          };
          setLastReservationDetails(reservationDetails);
         setIsDialogOpen(false);
         toast({
             title: "Reservation Successful!",
             description: `Spot ${selectedSpot.spotId} reserved at ${location.name}.`,
             duration: 15000,
             action: (
                 <div className="flex flex-col gap-2 mt-2">
                     <Button variant="secondary" size="sm" onClick={() => handleShowTicket(reservationDetails)}>
                         <Printer className="mr-2 h-4 w-4" /> View Ticket / QR
                     </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                           setLiveLocationSpotId(selectedSpot.spotId);
                           setShowLiveLocation(true);
                      }}> <Eye className="mr-2 h-4 w-4" /> Live View </Button>
                      {typeof navigator !== 'undefined' && navigator.share && (
                         <Button variant="outline" size="sm" onClick={() => handleShareTicket(reservationDetails)}>
                            <Share2 className="mr-2 h-4 w-4" /> Share Details
                         </Button>
                      )}
                 </div>
             ),
         });
         setSpots(prevSpots =>
           prevSpots.map(spot =>
             spot.spotId === selectedSpot.spotId ? { ...spot, isOccupied: true, reservationEndTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() } : spot
           )
         );
         onSpotReserved(selectedSpot.spotId, location.id);
         setSelectedSpot(null);
      } catch (error: any) {
           console.error("Reservation failed:", error);
           toast({
               title: "Reservation Failed",
               description: error.message || "Could not reserve the spot. Please try again.",
               variant: "destructive",
           });
           fetchSpotStatuses();
      } finally {
           setIsReserving(false);
            if (predictionInterval) {
                clearInterval(predictionInterval);
                setPredictionInterval(null);
            }
      }
  };

  const handleDialogClose = (open: boolean) => {
      if (!open) {
         setIsDialogOpen(false);
          setTimeout(() => {
             setSelectedSpot(null);
             setPrediction(null);
             setEstimatedCost(null);
             setCostRule(null);
              if (predictionInterval) {
                    clearInterval(predictionInterval);
                    setPredictionInterval(null);
              }
          }, 300);
      } else {
          setIsDialogOpen(true);
          if (selectedSpot && isOnline) {
              fetchPredictionAndCost(selectedSpot);
          }
      }
  }

  const handleReservationTimeout = () => {
      setIsDialogOpen(false);
      toast({
        title: "Reservation Timed Out",
        description: `Your hold on spot ${selectedSpot?.spotId} expired. Please select again if needed.`,
        variant: "destructive",
      });
       setTimeout(() => {
           setSelectedSpot(null);
           setPrediction(null);
           setEstimatedCost(null);
           setCostRule(null);
           if (predictionInterval) {
               clearInterval(predictionInterval);
               setPredictionInterval(null);
           }
        }, 300);
  };

   const handleManualRefresh = () => {
        if (!isOnline) {
           toast({ title: "Offline", description: "Cannot refresh data while offline.", variant: "destructive"});
           return;
        }
       setManualRefreshTrigger(prev => prev + 1);
   };

    const handleShowTicket = (details: ReservationDetails | null) => {
        if (!details) return;
        setLastReservationDetails(details);
        setShowTicketModal(true);
    };

    const handleDownloadTicket = async () => {
        if (!ticketRef.current || !lastReservationDetails) return;
        try {
            const canvas = await html2canvas(ticketRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
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
        if (!details || typeof navigator === 'undefined' || !navigator.share) {
            toast({ title: "Sharing Not Supported", description: "Your browser doesn't support sharing.", variant: "default" });
            return;
        }
        const shareData = {
            title: `Carpso Parking Reservation - Spot ${details.spotId}`,
            text: `Reserved parking spot ${details.spotId} at ${details.locationName}.\nTime: ${new Date(details.reservationTime).toLocaleString()}`,
        };
        try {
            await navigator.share(shareData);
            console.log('Reservation shared successfully');
        } catch (error: any) {
             if ((error as DOMException).name !== 'AbortError') {
                toast({ title: "Sharing Failed", variant: "destructive" });
            }
        }
    };

  const availableSpots = spots.filter(spot => !spot.isOccupied).length;
  const totalSpots = location.capacity;
  const selectedSpotQueueInfo = userQueueData.find(q => q.spotId === selectedSpot?.spotId);
  const selectedSpotQueueLength = spotQueueLengths[selectedSpot?.spotId ?? ''] || 0;

  return (
    <>
       <Card className="mb-8">
         <CardHeader>
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                 <div>
                     <CardTitle>Select an Available Spot at {location.name}</CardTitle>
                     <CardDescription>{location.address}</CardDescription>
                     <CardDescription>Click on a green spot (<Car className="inline h-4 w-4 text-green-800" />) to reserve.</CardDescription>
                      <CardDescription className="text-xs">Click an occupied spot (<Ban className="inline h-3 w-3 text-destructive" />) for info & queue options.</CardDescription>
                 </div>
                 <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading || isRefreshing || !isOnline} className="w-full sm:w-auto" >
                     {isLoading || isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                     Refresh Status
                 </Button>
             </div>
              <div className="text-xs text-muted-foreground pt-2">
                 {isLoading && !(manualRefreshTrigger > 0) ? (
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
            {isLoading && spots.length === 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {Array.from({ length: totalSpots }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full aspect-square" />
                ))}
                </div>
            ) : spots.length === 0 ? (
                 <p className="text-muted-foreground text-center">No spots available to display for this location.</p>
            ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {spots.map((spot) => {
                     const isInUserQueue = userQueueData.some(q => q.spotId === spot.spotId);
                     const queueLengthForSpot = spotQueueLengths[spot.spotId] || 0;
                     return (
                        <ParkingSpot
                            key={spot.spotId}
                            spot={spot}
                            onSelect={() => handleSelectSpot(spot)}
                            isInUserQueue={isInUserQueue}
                            queueLength={queueLengthForSpot}
                        />
                     );
                })}
                </div>
            )}
         </CardContent>
         <CardFooter className="flex justify-center items-center pt-4">
           <div className="text-sm text-muted-foreground">
               {isLoading && spots.length === 0 ? 'Loading spots...' : `${availableSpots} / ${totalSpots} spots available`}
           </div>
         </CardFooter>
       </Card>

         {activeReservation && isOnline && (
             <Card className="mb-8 border-blue-500 bg-blue-500/5">
                 <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2">
                         <Timer className="h-5 w-5 text-blue-600" /> Active Parking Session
                     </CardTitle>
                     <CardDescription>
                         You are currently parked at Spot {activeReservation.spotId}.
                         {activeReservation.endTime && new Date(activeReservation.endTime) > new Date() && (
                             ` Time remaining: ${formatDistanceToNowStrict(new Date(activeReservation.endTime))}.`
                         )}
                     </CardDescription>
                 </CardHeader>
                 <CardContent>
                      <Button onClick={() => handleExtendParking(activeReservation)} disabled={isExtending || !canExtendParking || !isOnline} className="w-full" variant="outline" >
                         {isExtending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                         {canExtendParking
                             ? `Extend Parking (${isPremiumUser ? 'Unlimited' : `${extensionsUsed}/${MAX_PARKING_EXTENSIONS_BASIC} used`})`
                             : `Extension Limit Reached (${extensionsUsed}/${MAX_PARKING_EXTENSIONS_BASIC})`}
                     </Button>
                     {!isPremiumUser && !canExtendParking && (
                         <p className="text-xs text-muted-foreground mt-2 text-center">Upgrade to Premium for more extensions.</p>
                     )}
                 </CardContent>
             </Card>
         )}

        <AlertDialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reserve Spot {selectedSpot?.spotId}?</AlertDialogTitle>
               <AlertDialogDescription> {/* Main description for the dialog */}
                 You are reserving spot <span className="font-semibold">{selectedSpot?.spotId}</span> at {location.name}.
               </AlertDialogDescription>
            </AlertDialogHeader>

             <div className="space-y-4 pt-2">
                {!isOnline && (
                    <Alert variant="destructive">
                        <WifiOff className="h-4 w-4" />
                        <AlertTitle>You are offline!</AlertTitle>
                         <AlertDescriptionSub> {/* Use alias for nested description */}
                           Cost estimates and availability predictions are unavailable. Reservations cannot be confirmed until you reconnect. Offline reservations will be queued.
                        </AlertDescriptionSub>
                    </Alert>
                )}
                {isOnline && selectedSpotQueueLength > 0 && (
                     <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                        <Users className="h-4 w-4 text-blue-600" />
                         <AlertTitle>Queue Information</AlertTitle>
                         <AlertDescriptionSub>
                             {selectedSpotQueueInfo ? (
                                 `You are currently position ${selectedSpotQueueInfo.position} in the queue for this spot.`
                             ) : (
                                 `${selectedSpotQueueLength} ${selectedSpotQueueLength === 1 ? 'user is' : 'users are'} currently waiting for this spot. You can join the queue from the main screen.`
                             )}
                         </AlertDescriptionSub>
                     </Alert>
                )}

                 <div className="text-sm border-t pt-3">
                     <div className="font-medium mb-1 flex items-center gap-1"><DollarSign className="h-4 w-4 text-green-600" /> Estimated Cost:</div>
                     {isCostLoading && isOnline ? (
                        <div className="flex items-center gap-2 text-muted-foreground"> <Loader2 className="h-4 w-4 animate-spin" /> Calculating cost... </div>
                     ) : !isOnline ? (
                          <p className="text-muted-foreground text-xs flex items-center gap-1"><WifiOff className="h-3 w-3" /> Unavailable offline</p>
                    ) : estimatedCost !== null ? (
                         <div className="space-y-1">
                            <p>Rate: <span className="font-semibold">K {estimatedCost.toFixed(2)} / hour</span></p>
                            <p className="text-xs text-muted-foreground">Based on: {costRule || 'Standard rate'}</p>
                         </div>
                    ) : (
                        <p className="text-muted-foreground text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Cost estimate unavailable.</p>
                    )}
                 </div>
                <div className="text-sm border-t pt-3">
                    <div className="font-medium mb-1 flex items-center gap-1"><BrainCircuit className="h-4 w-4 text-primary" /> Availability Prediction:</div>
                    {isPredictionLoading && isOnline ? (
                       <div className="flex items-center gap-2 text-muted-foreground"> <Loader2 className="h-4 w-4 animate-spin" /> Loading prediction... </div>
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
                 <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Reservations held for 60 seconds. Confirm below.</p>
            </div>

             <div className="my-4 px-1">
                 <TimedReservationSlider
                     onConfirm={handleReserveConfirm}
                     onTimeout={handleReservationTimeout}
                     isConfirming={isReserving}
                      disabled={isReserving || selectedSpot?.isOccupied || !isOnline || !!selectedSpotQueueInfo}
                     timeoutSeconds={60}
                 />
             </div>
            <AlertDialogFooter className="mt-0 pt-0">
              <AlertDialogCancel onClick={() => handleDialogClose(false)} disabled={isReserving}>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <LiveLocationView
           isOpen={showLiveLocation}
           onClose={() => {
               setShowLiveLocation(false);
               setLiveLocationSpotId(null);
           }}
           spotId={liveLocationSpotId}
           locationName={location.name}
           availableSources={{
               ipCameraUrl: location.id === 'lot_A' ? `https://picsum.photos/seed/${liveLocationSpotId}-ipcam/640/480?blur=1` : undefined,
           }}
        />

         <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
            <DialogContent className="sm:max-w-md">
                <DialogSubHeader>
                    <DialogSubTitle>Parking Ticket / QR Code</DialogSubTitle>
                     <DialogSubDescription> Spot {lastReservationDetails?.spotId} at {lastReservationDetails?.locationName} </DialogSubDescription>
                </DialogSubHeader>
                <div ref={ticketRef} className="py-4">
                     {lastReservationDetails && (
                        <ParkingTicket
                            spotId={lastReservationDetails.spotId}
                            locationName={lastReservationDetails.locationName}
                            reservationTime={lastReservationDetails.reservationTime}
                            qrCodeValue={`CARPSO-${lastReservationDetails.spotId}-${lastReservationDetails.locationId}-${new Date(lastReservationDetails.reservationTime).getTime()}`}
                            userId={lastReservationDetails.userId}
                        />
                    )}
                </div>
                <DialogSubFooter className="flex-col sm:flex-row gap-2 sm:gap-1">
                    <Button variant="outline" onClick={handleDownloadTicket} disabled={!lastReservationDetails}>
                        <DownloadIcon className="mr-2 h-4 w-4" /> Download
                    </Button>
                     {typeof navigator !== 'undefined' && navigator.share && (
                        <Button variant="outline" onClick={() => handleShareTicket(lastReservationDetails)}>
                             <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                     )}
                    <Button variant="default" onClick={() => setShowTicketModal(false)}> Close </Button>
                </DialogSubFooter>
            </DialogContent>
         </Dialog>
    </>
  );
}
