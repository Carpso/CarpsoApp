'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import ParkingLotGrid from './ParkingLotGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot'; // Import service type
import { getAvailableParkingLots } from '@/services/parking-lot';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { MapPin, Loader2, Sparkles, Star, Mic, MicOff } from 'lucide-react'; // Added Sparkles, Star, Mic, MicOff
import AuthModal from '@/components/auth/AuthModal';
import UserProfile from '@/components/profile/UserProfile';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import BottomNavBar from '@/components/layout/BottomNavBar'; // Import BottomNavBar
import Link from 'next/link';
import { recommendParking, RecommendParkingOutput } from '@/ai/flows/recommend-parking-flow'; // Import recommendation flow
import { getUserGamification } from '@/services/user-service'; // Import gamification service
import { calculateEstimatedCost } from '@/services/pricing-service'; // Import pricing service
import { useVoiceAssistant, VoiceAssistantState } from '@/hooks/useVoiceAssistant'; // Import voice assistant hook
import { processVoiceCommand, ProcessVoiceCommandOutput } from '@/ai/flows/process-voice-command-flow'; // Import voice command processor
import { cn } from '@/lib/utils';
import ReportIssueModal from '@/components/profile/ReportIssueModal'; // Import ReportIssueModal


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

  const [pinnedSpot, setPinnedSpot] = useState<{ spotId: string, locationId: string } | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  const [recommendations, setRecommendations] = useState<RecommendParkingOutput['recommendations']>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [userPreferredServices, setUserPreferredServices] = useState<ParkingLotService[]>([]); // Example user preference
  const [userHistorySummary, setUserHistorySummary] = useState<string>("Prefers Downtown Garage, parks mostly weekday mornings."); // Example summary

  const { toast } = useToast();
   const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null); // State for report modal
   const [isReportModalOpen, setIsReportModalOpen] = useState(false);

     // Fetch recommendations when locations are loaded or user/destination changes
     const fetchRecommendations = useCallback(async (destination?: string) => { // Added optional destination
       if (!isAuthenticated || !userId || locations.length === 0) {
           setRecommendations([]); // Clear recommendations if not logged in or no locations
           return;
       }
       setIsLoadingRecommendations(true);
       try {
           // Simulate getting user location/destination (replace with actual data)
           const currentCoords = { latitude: 34.0522, longitude: -118.2437 }; // Example: Near Downtown Garage
           const destinationCoords = destination // Use provided destination if available
              ? { latitude: 34.0550, longitude: -118.2500 } // TODO: Geocode destination string to coords
              : undefined;

            // Fetch user preferences (e.g., from gamification/profile service)
            // const gamificationData = await getUserGamification(userId);
            // setUserPreferredServices(gamificationData.preferredServices || []); // Assuming preferences are stored there

           // Prepare input for the recommendation flow
           // Convert locations to JSON string with essential details
           const locationsWithPrice = await Promise.all(locations.map(async loc => {
               const { cost: estimatedCost } = await calculateEstimatedCost(loc, 60, userId, 'Basic'); // Estimate for 1 hour
               return { id: loc.id, name: loc.name, address: loc.address, capacity: loc.capacity, currentOccupancy: loc.currentOccupancy, services: loc.services, estimatedCost };
           }));
           const nearbyLotsJson = JSON.stringify(locationsWithPrice);

           const input = {
               userId: userId,
               currentLatitude: currentCoords.latitude,
               currentLongitude: currentCoords.longitude,
               destinationLatitude: destinationCoords?.latitude,
               destinationLongitude: destinationCoords?.longitude,
               preferredServices: userPreferredServices,
               nearbyParkingLots: nearbyLotsJson,
               userHistorySummary: userHistorySummary,
               // maxDistanceKm: 5, // Optional: Add distance constraint
           };

           const result = await recommendParking(input);
           setRecommendations(result.recommendations || []);

       } catch (err) {
           console.error("Failed to fetch recommendations:", err);
           toast({
               title: "Recommendation Error",
               description: "Could not fetch personalized parking recommendations.",
               variant: "destructive",
           });
           setRecommendations([]); // Clear recommendations on error
       } finally {
           setIsLoadingRecommendations(false);
       }
      // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [isAuthenticated, userId, locations, userPreferredServices, userHistorySummary, toast]); // Add relevant dependencies

    useEffect(() => {
        // Fetch recommendations after locations are loaded and user is authenticated
        if (!isLoadingLocations && locations.length > 0 && isAuthenticated) {
            fetchRecommendations();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingLocations, locations, isAuthenticated, toast, fetchRecommendations, userId, userPreferredServices, userHistorySummary]);

   // --- Voice Assistant Integration ---
    // Move handleVoiceCommandResult here
    const handleVoiceCommandResult = useCallback(async (commandOutput: ProcessVoiceCommandOutput) => {
        const { intent, entities, responseText } = commandOutput;

        console.log("Processed Intent:", intent);
        console.log("Processed Entities:", entities);

        // Speak the response first
        voiceAssistant.speak(responseText);

        // --- Execute action based on intent ---
        switch (intent) {
            case 'find_parking':
                // Trigger recommendation fetch or filter based on destination
                if (entities.destination) {
                     toast({ title: "Finding Parking", description: `Looking for parking near ${entities.destination}. Recommendations updated.` });
                     // TODO: Update recommendations based on destination entity
                     await fetchRecommendations(entities.destination);
                } else {
                     toast({ title: "Finding Parking", description: `Showing general recommendations.` });
                     await fetchRecommendations();
                }
                break;

            case 'reserve_spot':
                if (entities.spotId) {
                    // Find the location containing this spot ID (simple example)
                    const location = locations.find(loc => entities.spotId?.startsWith(loc.id));
                    if (location) {
                        setSelectedLocationId(location.id);
                        // Need a way to trigger the reservation dialog for the specific spot
                        // This might require refactoring ParkingLotGrid or exposing a function
                        toast({ title: "Action Required", description: `Navigating to ${location.name}. Please confirm reservation for ${entities.spotId} on screen.` });
                         // Scroll to grid?
                         setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 500);
                         // TODO: Programmatically trigger the reservation dialog in ParkingLotGrid
                         console.warn(`Need mechanism to auto-open reservation dialog for ${entities.spotId}`);
                    } else {
                        voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}. Please try again or select manually.`);
                    }
                } else {
                    voiceAssistant.speak("Sorry, I didn't catch the spot ID you want to reserve. Please try again.");
                }
                break;

            case 'check_availability':
                if (entities.spotId) {
                    const location = locations.find(loc => entities.spotId?.startsWith(loc.id));
                     if (location) {
                         setSelectedLocationId(location.id);
                         // TODO: Highlight or provide status for the specific spot
                         toast({ title: "Checking Availability", description: `Checking status for ${entities.spotId} in ${location.name}. See grid below.` });
                         setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 500);
                         console.warn(`Need mechanism to display/highlight availability for ${entities.spotId}`);
                    } else {
                         voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                    }
                } else if (entities.locationId) {
                     const location = locations.find(loc => loc.id === entities.locationId || loc.name === entities.locationId);
                     if (location) {
                         setSelectedLocationId(location.id);
                         const available = location.capacity - (location.currentOccupancy ?? 0);
                         voiceAssistant.speak(`Okay, ${location.name} currently has about ${available} spots available.`);
                     } else {
                         voiceAssistant.speak(`Sorry, I couldn't find the location ${entities.locationId}.`);
                     }
                } else {
                    voiceAssistant.speak("Which spot or location would you like me to check?");
                }
                break;

            case 'cancel_reservation':
                 // Requires checking active reservations and asking user to confirm which one
                 toast({ title: "Action Required", description: "Please open your profile to view and cancel active reservations." });
                 // Optionally open profile: setIsProfileOpen(true);
                break;

            case 'get_directions':
                 if (entities.locationId) {
                     const location = locations.find(loc => loc.id === entities.locationId || loc.name === entities.locationId);
                     if (location) {
                         toast({ title: "Getting Directions", description: `Opening map directions for ${location.name}...` });
                         // TODO: Integrate with mapping service (e.g., open Google Maps URL)
                         // window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`, '_blank');
                     } else {
                         voiceAssistant.speak(`Sorry, I couldn't find the location ${entities.locationId}.`);
                     }
                 } else if (pinnedSpot) {
                     const location = locations.find(l => l.id === pinnedSpot.locationId);
                      toast({ title: "Getting Directions", description: `Opening map directions to your parked car at ${pinnedSpot.spotId}...` });
                      // TODO: Integrate with mapping service to pinned spot coordinates (if available)
                 } else {
                      voiceAssistant.speak("Where would you like directions to?");
                 }
                break;
            case 'report_issue':
                if (entities.spotId) {
                    const location = locations.find(loc => entities.spotId?.startsWith(loc.id));
                     if (location && isAuthenticated) {
                         // Find the corresponding 'reservation' (even if just parked) to pass to modal
                         // This is tricky without a proper reservation list. Simulate finding a match.
                         const mockReservation = {
                             id: `rep_${entities.spotId}`,
                             spotId: entities.spotId,
                             locationId: location.id,
                             locationName: location.name,
                             startTime: new Date().toISOString(),
                             endTime: '', cost: 0, status: 'Active' as const
                         };
                         setReportingReservation(mockReservation);
                         setIsReportModalOpen(true);
                         // TTS response handled by the flow already
                     } else if (!isAuthenticated) {
                          voiceAssistant.speak("Please sign in to report an issue.");
                          setIsAuthModalOpen(true);
                     } else {
                          voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                     }
                } else {
                    voiceAssistant.speak("Which spot are you reporting an issue for?");
                }
                break;
            case 'unknown':
                // Response already spoken by the flow
                break;
        }
    }, [locations, pinnedSpot, isAuthenticated, toast]); // Added toast

   const handleVoiceCommand = useCallback(async (transcript: string) => {
        if (!transcript) return;
        try {
            const result = await processVoiceCommand({ transcript });
            await handleVoiceCommandResult(result);
        } catch (err) {
            console.error("Failed to process voice command:", err);
            toast({
                title: "Voice Command Error",
                description: "Sorry, I couldn't process that request.",
                variant: "destructive",
            });
            voiceAssistant.speak("Sorry, I encountered an error trying to understand that.");
        }
    }, [handleVoiceCommandResult, toast]); // Dependencies

   const [isUpdatingCarpool, setIsUpdatingCarpool] = useState(false);
   const voiceAssistant = useVoiceAssistant({
       onCommand: handleVoiceCommand,
       onStateChange: (newState) => {
           console.log("Voice Assistant State:", newState);
           // Update UI based on state if needed
       }
   });

   // useEffect moved below
   useEffect(() => {
       if (voiceAssistant.error) {
           toast({
               title: "Voice Assistant Error",
               description: voiceAssistant.error,
               variant: "destructive",
               duration: 4000,
           });
       }
   }, [voiceAssistant.error, toast]);
   // --- End Voice Assistant Integration ---


  // Fetch locations
  useEffect(() => {
    const fetchLocationsData = async () => {
      setIsLoadingLocations(true);
      setError(null);
      try {
        const fetchedLocations = await getAvailableParkingLots();
        setLocations(fetchedLocations);
        if (fetchedLocations.length > 0 && !selectedLocationId) {
          // Don't auto-select, let recommendations guide or user choose
          // setSelectedLocationId(fetchedLocations[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch parking locations:", err);
        setError("Could not load parking locations. Please try again later.");
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchLocationsData();
  }, []);


  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const handleAuthSuccess = (newUserId: string, name?: string, avatar?: string, role?: string) => {
    login(newUserId, name || `User ${newUserId.substring(0,5)}`, avatar, role || 'User'); // Update context on login
    setIsAuthModalOpen(false);
    toast({title: "Authentication Successful"});
    // Trigger recommendation fetch on login
    fetchRecommendations();
  };

  const handleLogout = () => {
      logout(); // Update context on logout
      setIsProfileOpen(false);
      toast({title: "Logged Out"});
      setPinnedSpot(null); // Clear pin on logout
      setRecommendations([]); // Clear recommendations on logout
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
       // Potentially award points for parking
       if (userId) {
          // await awardPoints(userId, 5); // Example: Award 5 points for parking
       }
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
           // Award badge for first booking (if applicable)
           if (userId) {
                // awardBadge(userId, 'badge_first_booking');
           }
       }
  };

  const clearPinnedLocation = () => {
      setPinnedSpot(null);
      toast({ title: "Pinned Location Cleared" });
  };

  // Handle selecting a recommended location
  const handleSelectRecommendation = (lotId: string) => {
      setSelectedLocationId(lotId);
      // Optionally scroll to the parking grid
       document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getVoiceButtonIcon = () => {
        switch (voiceAssistant.state) {
            case 'listening':
                return <Mic key="mic" className="h-5 w-5 text-destructive animate-pulse" />;
            case 'processing':
                return <Loader2 key="loader" className="h-5 w-5 animate-spin" />;
            case 'speaking':
            case 'error':
            case 'idle':
            default:
                return <Mic key="default-mic" className="h-5 w-5" />;
        }
    };

   const handleVoiceButtonClick = () => {
       if (voiceAssistant.isListening) {
           voiceAssistant.stopListening();
       } else {
           voiceAssistant.startListening();
       }
   };

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
       <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
           <h1 className="text-3xl font-bold">Parking Availability</h1>
           <div className="flex items-center gap-2">
                {/* Voice Assistant Button */}
                {voiceAssistant.isSupported ? (
                     <Button
                         variant="outline"
                         size="icon"
                         onClick={handleVoiceButtonClick}
                         disabled={voiceAssistant.state === 'processing' || voiceAssistant.state === 'speaking'}
                         aria-label={voiceAssistant.isListening ? 'Stop listening' : 'Start voice command'}
                         className={cn(
                             voiceAssistant.isListening && "border-destructive text-destructive",
                             (voiceAssistant.state === 'processing' || voiceAssistant.state === 'speaking') && "opacity-50 cursor-not-allowed"
                         )}
                     >
                         {getVoiceButtonIcon()}
                     </Button>
                ) : (
                     <Button variant="outline" size="icon" disabled title="Voice commands not supported by your browser">
                        <MicOff className="h-5 w-5 text-muted-foreground opacity-50" />
                    </Button>
                )}

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
       </div>
        {/* Voice Assistant Status Indicator (Optional) */}
        {voiceAssistant.state !== 'idle' && voiceAssistant.state !== 'error' && (
            <p className="text-sm text-muted-foreground text-center mb-4">
                 {voiceAssistant.state === 'listening' && 'Listening...'}
                 {voiceAssistant.state === 'processing' && 'Processing command...'}
                 {voiceAssistant.state === 'speaking' && 'Speaking...'}
            </p>
        )}


       {/* Pinned Location */}
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
                </CardContent>
           </Card>
       )}
        {isPinning && (
             <div className="flex items-center justify-center text-muted-foreground text-sm mb-4">
                <Loader2 className="h-4 w-4 mr-2 animate-spin"/> Pinning car location...
             </div>
        )}

       {/* Recommendations Section (Show if logged in and recommendations available) */}
        {isAuthenticated && !isLoadingLocations && (
            <Card className="mb-6 border-accent bg-accent/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        Recommended Parking For You
                    </CardTitle>
                     <CardDescription>Based on your preferences and current conditions.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingRecommendations ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : recommendations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recommendations.map((rec) => (
                                <Card key={rec.lotId} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSelectRecommendation(rec.lotId)}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center justify-between">
                                            {rec.lotName}
                                            {rec.availabilityScore !== undefined && (
                                                <Badge variant={rec.availabilityScore > 0.7 ? 'default' : rec.availabilityScore > 0.4 ? 'secondary' : 'destructive'} className="text-xs bg-green-600 text-white">
                                                    {(rec.availabilityScore * 100).toFixed(0)}% Free
                                                </Badge>
                                            )}
                                        </CardTitle>
                                         <CardDescription className="text-xs flex items-center gap-1 pt-1">
                                             <MapPin className="h-3 w-3" /> {locations.find(l => l.id === rec.lotId)?.address}
                                             {rec.estimatedCost !== undefined && ` • ~$${rec.estimatedCost.toFixed(2)}/hr`}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                                            <Star className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                                            <span>{rec.reason}</span>
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No specific recommendations available right now. Select a location below.</p>
                    )}
                </CardContent>
            </Card>
        )}


       {/* Location Selector */}
      <Card className="mb-6">
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Select Parking Location
            </CardTitle>
             <CardDescription>Choose a location to view available spots.</CardDescription>
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

       {/* Parking Grid */}
      {selectedLocation ? (
        <div id="parking-grid-section"> {/* Added ID for potential scrolling */}
            <ParkingLotGrid
              key={selectedLocation.id}
              location={selectedLocation}
              onSpotReserved={handleSpotReserved}
              // Pass user tier for dynamic pricing calculation
              userTier={userRole === 'PremiumUser' ? 'Premium' : 'Basic'} // Example mapping
            />
        </div>
      ) : !isLoadingLocations && !error && locations.length > 0 ? (
         <p className="text-center text-muted-foreground">
             {isAuthenticated ? 'Select a recommended or specific parking location above.' : 'Please select a parking location above.'}
         </p>
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
               userRole={userRole || 'User'} // Pass role
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

        {/* Report Issue Modal (Now also potentially triggered by voice) */}
        <ReportIssueModal
            isOpen={isReportModalOpen}
            onClose={() => {
                 setIsReportModalOpen(false);
                 setTimeout(() => setReportingReservation(null), 300);
            }}
            reservation={reportingReservation}
            userId={userId || ''} // Pass userId, ensure it's not null if modal can open
        />
    </div>
  );
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
}
