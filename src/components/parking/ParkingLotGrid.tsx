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
import { Loader2, Info, Eye, BrainCircuit, AlertTriangle, DollarSign, Clock, Car, WifiOff, RefreshCcw, Printer, Download as DownloadIcon, Share2, Users, BellPlus, Timer, UserCheck, CheckCircle } from 'lucide-react'; // Added queue icons (Users, BellPlus), Timer
import { predictParkingAvailability, PredictParkingAvailabilityOutput } from '@/ai/flows/predict-parking-availability';
import TimedReservationSlider from './TimedReservationSlider'; // Import the new component
import { Button } from '@/components/ui/button'; // Import Button
import LiveLocationView from './LiveLocationView'; // Import LiveLocationView
import { calculateEstimatedCost } from '@/services/pricing-service'; // Import pricing service
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import { Alert, AlertTitle, AlertDescription as AlertDialogDescriptionSub } from '@/components/ui/alert'; // Import Alert components, renamed AlertDescription
import { useVisibilityChange } from '@/hooks/useVisibilityChange'; // Import visibility hook
import ParkingTicket from '@/components/common/ParkingTicket'; // Import the new Ticket component
import html2canvas from 'html2canvas'; // For downloading ticket as image
import { formatDistanceToNowStrict } from 'date-fns'; // For relative time
import ReportIssueModal from '@/components/profile/ReportIssueModal'; // Import ReportIssueModal
import { joinQueue, leaveQueue, getUserQueueStatus, getQueueLength } from '@/services/queue-service'; // Import queue service functions
import { getUserGamification, incrementParkingExtensions, UserGamification } from '@/services/user-service'; // Import gamification service functions

const MAX_PARKING_EXTENSIONS_BASIC = 2; // Example limit for basic users

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

// Interfaces used in this component (potentially move to a types file)
interface ParkingHistoryEntry {
  id: string;
  spotId: string;
  locationName: string;
  locationId: string;
  startTime: string;
  endTime: string;
  cost: number;
  status: 'Completed' | 'Active' | 'Upcoming';
  extensionCount?: number; // Track extensions for history
}

const REFRESH_INTERVAL_MS = 15000; // 15 seconds - Keeping it relatively frequent while tab is active
const BACKGROUND_REFRESH_INTERVAL_MS = 60000; // 60 seconds - Less frequent when tab is inactive

export default function ParkingLotGrid({ location, onSpotReserved, userTier = 'Basic' }: ParkingLotGridProps) {
  const { userId, isOnline, userRole } = useContext(AppStateContext)!; // Get userId, isOnline, userRole from context
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
  const [userQueueData, setUserQueueData] = useState<{ spotId: string; position: number }[]>([]); // User's queue positions
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [userGamification, setUserGamification] = useState<UserGamification | null>(null); // User gamification status
  const [isExtending, setIsExtending] = useState(false); // State for extension action
  const [spotQueueLengths, setSpotQueueLengths] = useState<Record<string, number>>({}); // Store queue lengths per spot
  const [isLoadingQueueLengths, setIsLoadingQueueLengths] = useState(false);

  const { toast } = useToast();

  // Check if user is Premium
  const isPremiumUser = userRole === 'Premium';

  // Fetch user's gamification status (including extensions used)
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
          // Optional: show toast if needed
      }
  }, [userId, isOnline]);

  // Fetch spot status (respecting online status and visibility)
  const fetchSpotStatuses = useCallback(async (isManualRefresh = false) => {
      // Only set loading true on initial load, location change, or manual refresh
      if (isManualRefresh || spots.length === 0 || (spots.length > 0 && !spots[0]?.spotId.startsWith(location.id))) {
          setIsLoading(true);
          setIsLoadingQueueLengths(true); // Reset queue length loading too
      }

      // If offline, don't attempt to fetch fresh data
      if (!isOnline) {
          console.log("Offline: Skipping spot status fetch for", location.name);
           // Keep existing data or stop loading if offline and no data initially
            if (spots.length === 0) {
                 setIsLoading(false);
                 setIsLoadingQueueLengths(false);
            }
           return;
      }

      console.log("Fetching spot statuses for", location.name);
      try {
        // Simulate fetching spots for the specific location
        const spotPromises = Array.from({ length: location.capacity }, (_, i) =>
          getParkingSpotStatus(`${location.id}-S${i + 1}`) // Example Spot ID format using location ID
        );
        const spotStatuses = await Promise.all(spotPromises);

         // Fetch queue lengths for all spots in parallel
         const queueLengthPromises = spotStatuses.map(spot => getQueueLength(spot.spotId));
         const queueLengths = await Promise.all(queueLengthPromises);
         const newQueueLengths: Record<string, number> = {};
         spotStatuses.forEach((spot, index) => {
             newQueueLengths[spot.spotId] = queueLengths[index];
         });
         setSpotQueueLengths(newQueueLengths);
         setIsLoadingQueueLengths(false);

        setSpots(spotStatuses);
        setLastFetchTimestamp(Date.now()); // Record timestamp of successful fetch
      } catch (error) {
        console.error("Failed to fetch parking spot statuses or queue lengths:", error);
        // Don't show error toast if offline, the main manager component handles the offline notification
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
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id, location.name, location.capacity, toast, isOnline]); // Added isOnline dependency

  // Fetch user's current queue status
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
          // Use toast for non-critical info
          if (isOnline) toast({ title: "Prediction Info", description: "Could not fetch prediction data.", variant: "default", duration: 3000 });
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
           if (isOnline) toast({ title: "Pricing Info", description: "Could not calculate estimated cost.", variant: "default", duration: 3000 });
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
        fetchUserQueueData(); // Also fetch queue status periodically
        fetchUserGamificationData(); // Also fetch gamification status periodically

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

    startInterval(); // Start interval on mount/dependency change

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchSpotStatuses, fetchUserQueueData, fetchUserGamificationData, isOnline, isVisible]); // Re-run effect if fetch function, online status, or visibility changes


 // --- Effect for Manual Refresh Trigger ---
 useEffect(() => {
     if (manualRefreshTrigger > 0 && isOnline) {
         fetchSpotStatuses(true); // Pass true to indicate manual refresh
         fetchUserQueueData(); // Refresh queue data too
         fetchUserGamificationData(); // Refresh gamification data too
     }
 // Only depend on the trigger value
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [manualRefreshTrigger]);


 const handleSelectSpot = async (spot: ParkingSpotStatus) => {
     // If the spot is available, open the reservation dialog
     if (!spot.isOccupied) {
         setSelectedSpot(spot);
         setIsDialogOpen(true);

         // Fetch prediction and cost only if online
         if (isOnline) {
             fetchPredictionAndCost(spot);

             // Clear existing interval if it exists
             if (predictionInterval) clearInterval(predictionInterval);

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
             }, REFRESH_INTERVAL_MS); // Use faster refresh for dialog
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
          // If the spot is occupied, show info toast and live view/queue options
          setLiveLocationSpotId(spot.spotId); // Set for potential live view

          let occupiedMessage = `Spot ${spot.spotId} is currently occupied.`;
           // Check if reservation end time is available and valid
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

           // Modify toast for occupied spot
           toast({
               title: `Spot ${spot.spotId} Occupied`,
               description: (
                   <div>
                       <p>{occupiedMessage}</p>
                       <p className="text-xs mt-1">
                           Queue Length: {queueLength} {queueLength === 1 ? 'user' : 'users'}.
                       </p>
                   </div>
               ),
               variant: "default",
               duration: 8000, // Longer duration
                action: (
                 <div className="flex flex-col gap-2 mt-2">
                     {/* Live View Button */}
                     <Button variant="outline" size="sm" onClick={() => {
                         setLiveLocationSpotId(spot.spotId);
                         setShowLiveLocation(true);
                     }}>
                         <Eye className="mr-2 h-4 w-4" /> Live View
                     </Button>
                      {/* Join/Leave Queue Button */}
                     {userId && isOnline && ( // Only show queue options if logged in and online
                         isInQueue ? (
                             <Button
                                 variant="secondary"
                                 size="sm"
                                 onClick={() => handleLeaveQueueClick(spot.spotId)}
                                 disabled={isQueueLoading}
                             >
                                 {isQueueLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Users className="mr-2 h-4 w-4"/>} Leave Queue
                             </Button>
                         ) : (
                             <Button
                                 variant="default" // Primary action to join
                                 size="sm"
                                 onClick={() => handleJoinQueueClick(spot.spotId)}
                                 disabled={isQueueLoading}
                             >
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

    // --- Queue Actions ---
    const handleJoinQueueClick = async (spotId: string) => {
        if (!userId || !isOnline) return; // Should already be checked, but safety first
        setIsQueueLoading(true);
        try {
            const position = await joinQueue(userId, spotId);
            if (position !== null) {
                toast({ title: "Queue Joined", description: `You are position ${position} in the queue for spot ${spotId}. We'll notify you!` });
                await fetchUserQueueData(); // Refresh user's queue list
                await fetchSpotStatuses(); // Refresh spot status (to get updated queue length for badge)
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
                await fetchUserQueueData(); // Refresh user's queue list
                await fetchSpotStatuses(); // Refresh spot status (to get updated queue length for badge)
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
    // --- End Queue Actions ---

    // --- Parking Extension Logic ---
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
            // Simulate API call to extend parking session
            // In a real app, this would update the reservationEndTime in the backend
            // and potentially involve re-calculating cost or applying an extension fee.
            await new Promise(resolve => setTimeout(resolve, 800));
            console.log(`Simulating extension for reservation ${currentReservation.id}`);

            // Increment the extension counter via the service
            const newExtensionCount = await incrementParkingExtensions(userId);
            // Update local gamification state immediately for UI feedback
            setUserGamification(prev => ({ ...prev!, parkingExtensionsUsed: newExtensionCount }));

            // Fetch updated spot status to reflect the new potential end time (simulated)
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

            // Optionally update the history entry in local state if needed for display
            // setParkingHistory(prev => prev.map(h => h.id === currentReservation.id ? { ...h, extensionCount: (h.extensionCount || 0) + 1 } : h));

        } catch (error) {
            console.error("Failed to extend parking:", error);
            toast({ title: "Extension Failed", variant: "destructive" });
        } finally {
            setIsExtending(false);
        }
    };

    // Find the active reservation for the current user in this specific lot (if any)
    // This requires having parking history accessible, which might be better fetched in a parent or context.
    // For now, we'll assume a placeholder function or that history is passed down.
    const findActiveReservationForCurrentUser = (): ParkingHistoryEntry | null => {
        // Placeholder: Replace with actual logic to find the active reservation
        // based on userId and location.id from a broader state/context.
        // Example structure (needs real data source):
        // const userHistory = getUserParkingHistory(userId);
        // return userHistory.find(h => h.locationId === location.id && h.status === 'Active');
        return null; // Placeholder
    }
    const activeReservation = findActiveReservationForCurrentUser();
    const extensionsUsed = userGamification?.parkingExtensionsUsed || 0;
    const canExtendParking = isPremiumUser || extensionsUsed < MAX_PARKING_EXTENSIONS_BASIC;
    // --- End Parking Extension Logic ---


  const handleReserveConfirm = async () => {
      if (!selectedSpot) return; // Should not happen, but safety check

      if (!isOnline) { // Prevent reservation if offline
          toast({
              title: "Offline Reservation Attempted",
              description: "Your reservation request for " + selectedSpot.spotId + " will be queued and processed when you reconnect.",
              variant: "destructive" // Use destructive to indicate it's not confirmed
          });
          setIsDialogOpen(false); // Close dialog, but don't set as reserved
          setSelectedSpot(null);
          // TODO: Add to offline queue logic here
          setIsReserving(false);
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

          // Show toast with buttons for success notification
         toast({
             title: "Reservation Successful!",
             description: `Spot ${selectedSpot.spotId} reserved at ${location.name}.`,
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
                      {typeof navigator !== 'undefined' && navigator.share && (
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
             spot.spotId === selectedSpot.spotId ? { ...spot, isOccupied: true, reservationEndTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() } : spot // Simulate 1hr reservation
           )
         );
         onSpotReserved(selectedSpot.spotId, location.id); // Notify parent
         setSelectedSpot(null); // Clear selection

      } catch (error: any) {
           console.error("Reservation failed:", error);
           // Use toast for failure notification
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
      // Use toast for timeout notification
      toast({
        title: "Reservation Timed Out",
        description: `Your hold on spot ${selectedSpot?.spotId} expired. Please select again if needed.`,
        variant: "destructive", // Use destructive style for timeout
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
        if (!isOnline) {
           toast({ title: "Offline", description: "Cannot refresh data while offline.", variant: "destructive"});
           return;
        }
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
        if (!details || typeof navigator === 'undefined' || !navigator.share) {
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

  // Get queue position for the currently selected spot
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
                 {/* Manual Refresh Button */}
                 <Button
                     variant="outline"
                     size="sm"
                     onClick={handleManualRefresh}
                     disabled={isLoading || isRefreshing || !isOnline} // Disable if loading or offline
                     className="w-full sm:w-auto"
                 >
                     {isLoading || isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
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
                {spots.map((spot) => {
                     const isInUserQueue = userQueueData.some(q => q.spotId === spot.spotId);
                     const queueLengthForSpot = spotQueueLengths[spot.spotId] || 0;
                     return (
                        <ParkingSpot
                            key={spot.spotId}
                            spot={spot}
                            onSelect={() => handleSelectSpot(spot)}
                            isInUserQueue={isInUserQueue} // Pass queue status
                            queueLength={queueLengthForSpot} // Pass queue length
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

        {/* Parking Extension Button (if user has active reservation in this lot) */}
         {activeReservation && isOnline && (
             <Card className="mb-8 border-blue-500 bg-blue-500/5">
                 <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2">
                         <Timer className="h-5 w-5 text-blue-600" /> Active Parking Session
                     </CardTitle>
                     <CardDescription>
                         You are currently parked at Spot {activeReservation.spotId}.
                         {/* Display simulated time remaining */}
                         {activeReservation.endTime && new Date(activeReservation.endTime) > new Date() && (
                             ` Time remaining: ${formatDistanceToNowStrict(new Date(activeReservation.endTime))}.`
                         )}
                     </CardDescription>
                 </CardHeader>
                 <CardContent>
                      <Button
                         onClick={() => handleExtendParking(activeReservation)}
                         disabled={isExtending || !canExtendParking || !isOnline}
                         className="w-full"
                         variant="outline"
                      >
                         {isExtending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                         {canExtendParking
                             ? `Extend Parking (${isPremiumUser ? 'Premium' : `${extensionsUsed}/${MAX_PARKING_EXTENSIONS_BASIC} used`})`
                             : `Extension Limit Reached (${extensionsUsed}/${MAX_PARKING_EXTENSIONS_BASIC})`}
                     </Button>
                     {!isPremiumUser && !canExtendParking && (
                         <p className="text-xs text-muted-foreground mt-2 text-center">Upgrade to Premium for more extensions.</p>
                     )}
                 </CardContent>
             </Card>
         )}


       {/* Reservation Confirmation Dialog */}
        <AlertDialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reserve Spot {selectedSpot?.spotId}?</AlertDialogTitle>
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
                         <AlertDialogDescriptionSub> {/* Use alias */}
                           Cost estimates and availability predictions are unavailable. Reservations cannot be confirmed until you reconnect. Offline reservations will be queued.
                        </AlertDialogDescriptionSub>
                    </Alert>
                )}
                 {/* Queue Info */}
                {isOnline && selectedSpotQueueLength > 0 && (
                     <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                        <Users className="h-4 w-4 text-blue-600" />
                         <AlertTitle>Queue Information</AlertTitle>
                         <AlertDialogDescriptionSub>
                             {selectedSpotQueueInfo ? (
                                 `You are currently position ${selectedSpotQueueInfo.position} in the queue for this spot.`
                             ) : (
                                 `${selectedSpotQueueLength} ${selectedSpotQueueLength === 1 ? 'user is' : 'users are'} currently waiting for this spot. You can join the queue from the main screen.`
                             )}
                         </AlertDialogDescriptionSub>
                     </Alert>
                )}

                {/* Estimated Cost Display */}
                 <div className="text-sm border-t pt-3">
                     <div className="font-medium mb-1 flex items-center gap-1"><DollarSign className="h-4 w-4 text-green-600" /> Estimated Cost:</div>
                     {isCostLoading && isOnline ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Calculating cost...
                        </div>
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
                {/* Prediction Display */}
                <div className="text-sm border-t pt-3">
                    <div className="font-medium mb-1 flex items-center gap-1"><BrainCircuit className="h-4 w-4 text-primary" /> Availability Prediction:</div>
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
                 <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Reservations held for 60 seconds. Confirm below.</p>
            </div>

             {/* Timed Reservation Slider */}
             <div className="my-4 px-1">
                 <TimedReservationSlider
                     onConfirm={handleReserveConfirm}
                     onTimeout={handleReservationTimeout}
                     isConfirming={isReserving} // Pass reserving state
                      disabled={isReserving || selectedSpot?.isOccupied || !isOnline || !!selectedSpotQueueInfo} // Disable if reserving, occupied, offline, OR if user is in queue for this spot
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
               // stillImageUrl removed
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
                            userId={lastReservationDetails.userId} // Pass userId for display
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
                    <Button variant="default" onClick={() => setShowTicketModal(false)}>
                        Close
                    </Button>
                </DialogSubFooter>
            </DialogContent>
         </Dialog>
    </>
  );
}