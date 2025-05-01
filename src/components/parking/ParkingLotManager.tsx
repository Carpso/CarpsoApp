// src/components/parking/ParkingLotManager.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import ParkingLotGrid from './ParkingLotGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot'; // Import service type
import { getAvailableParkingLots } from '@/services/parking-lot';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { MapPin, Loader2, Sparkles, Star, Mic, MicOff, CheckSquare, Square, AlertTriangle, BookMarked } from 'lucide-react'; // Added BookMarked
import AuthModal from '@/components/auth/AuthModal';
// import UserProfile from '@/components/profile/UserProfile'; // No longer imported here
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Import Badge component
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import BottomNavBar from '@/components/layout/BottomNavBar'; // Import BottomNavBar
// import Link from 'next/link'; // No longer needed for profile here
import { recommendParking, RecommendParkingOutput } from '@/ai/flows/recommend-parking-flow'; // Import recommendation flow
import { getUserGamification, getUserBookmarks, addBookmark, UserBookmark } from '@/services/user-service'; // Import gamification service and bookmark functions/type
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
      // logout, // Logout is handled in profile page or header now
  } = useContext(AppStateContext)!; // Use context

  const [locations, setLocations] = useState<ParkingLot[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // const [isProfileOpen, setIsProfileOpen] = useState(false); // Removed profile sheet state

  const [pinnedSpot, setPinnedSpot] = useState<{ spotId: string, locationId: string } | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  const [recommendations, setRecommendations] = useState<RecommendParkingOutput['recommendations']>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [userPreferredServices, setUserPreferredServices] = useState<ParkingLotService[]>([]); // Example user preference
  const [userHistorySummary, setUserHistorySummary] = useState<string>("Prefers Downtown Garage, parks mostly weekday mornings."); // Example summary
  const [userBookmarks, setUserBookmarks] = useState<UserBookmark[]>([]); // State for user bookmarks
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);

  const { toast } = useToast();
   const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null); // State for report modal
   const [isReportModalOpen, setIsReportModalOpen] = useState(false);
   const [isClient, setIsClient] = useState(false); // State to track client-side mount
   const [voiceAssistantState, setVoiceAssistantState] = useState<VoiceAssistantState>('idle'); // Track voice assistant state for UI

   useEffect(() => {
       // Ensure this only runs on the client
       setIsClient(true);
   }, []);

    const fetchUserBookmarks = useCallback(async () => {
       if (!isAuthenticated || !userId) return;
       setIsLoadingBookmarks(true);
       try {
           const bookmarks = await getUserBookmarks(userId);
           setUserBookmarks(bookmarks);
       } catch (err) {
           console.error("Failed to fetch user bookmarks:", err);
           // Optional: toast notification
       } finally {
           setIsLoadingBookmarks(false);
       }
    }, [isAuthenticated, userId]);


     // Fetch recommendations when locations are loaded or user/destination changes
     const fetchRecommendations = useCallback(async (destinationLabel?: string) => { // Changed parameter to label
       if (!isAuthenticated || !userId || locations.length === 0) {
           setRecommendations([]); // Clear recommendations if not logged in or no locations
           return;
       }
       setIsLoadingRecommendations(true);
       try {
           // Simulate getting user location (replace with actual data)
           const currentCoords = { latitude: 34.0522, longitude: -118.2437 }; // Example: Near Downtown Garage

            // Try to get coords from bookmarks if destinationLabel matches
            let destinationCoords: { latitude?: number; longitude?: number } | undefined = undefined;
            if (destinationLabel) {
                const matchedBookmark = userBookmarks.find(bm => bm.label.toLowerCase() === destinationLabel.toLowerCase());
                if (matchedBookmark) {
                    destinationCoords = { latitude: matchedBookmark.latitude, longitude: matchedBookmark.longitude };
                    console.log(`Using coordinates from bookmark "${matchedBookmark.label}" for recommendation.`);
                } else {
                    console.log(`Destination label "${destinationLabel}" not found in bookmarks. Trying geocoding (not implemented).`);
                    // TODO: Implement geocoding for addresses or general labels if needed
                }
            }


            // Fetch user preferences (e.g., from gamification/profile service)
            // const gamificationData = await getUserGamification(userId);
            // setUserPreferredServices(gamificationData.preferredServices || []); // Assuming preferences are stored there

           // Prepare input for the recommendation flow
           // Convert locations to JSON string with essential details
           const locationsWithPrice = await Promise.all(locations.map(async loc => {
               const { cost: estimatedCost } = await calculateEstimatedCost(loc, 60, userId, userRole === 'PremiumUser' || userRole === 'Premium' ? 'Premium' : 'Basic'); // Estimate for 1 hour, pass correct role
               return { id: loc.id, name: loc.name, address: loc.address, capacity: loc.capacity, currentOccupancy: loc.currentOccupancy, services: loc.services, estimatedCost };
           }));
           const nearbyLotsJson = JSON.stringify(locationsWithPrice);
            const bookmarksJson = JSON.stringify(userBookmarks); // Pass bookmarks to the flow


           const input = {
               userId: userId,
               currentLatitude: currentCoords.latitude,
               currentLongitude: currentCoords.longitude,
               destinationLabel: destinationLabel, // Pass the label
               destinationLatitude: destinationCoords?.latitude, // Pass derived coords if available
               destinationLongitude: destinationCoords?.longitude,
               preferredServices: userPreferredServices,
               nearbyParkingLots: nearbyLotsJson,
               userHistorySummary: userHistorySummary,
               userBookmarks: bookmarksJson, // Pass bookmarks
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
     }, [isAuthenticated, userId, locations, userPreferredServices, userHistorySummary, toast, userRole, userBookmarks]); // Add userBookmarks dependency


   // --- Voice Assistant Integration ---
    // Move handleVoiceCommandResult here
    const handleVoiceCommandResult = useCallback(async (commandOutput: ProcessVoiceCommandOutput) => {
        const { intent, entities, responseText } = commandOutput;

        console.log("Processed Intent:", intent);
        console.log("Processed Entities:", entities);

        // Speak the response first
        if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(responseText);
        else console.warn("Voice assistant speak function not available.");

        // --- Execute action based on intent ---
        switch (intent) {
            case 'find_parking':
                // Trigger recommendation fetch based on destination label
                if (entities.destination) {
                     toast({ title: "Finding Parking", description: `Looking for parking near ${entities.destination}. Recommendations updated.` });
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
                        toast({ title: "Action Required", description: `Navigating to ${location.name}. Please confirm reservation for ${entities.spotId} on screen.` });
                         setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 500);
                         console.warn(`Need mechanism to auto-open reservation dialog for ${entities.spotId}`);
                    } else {
                        if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}. Please try again or select manually.`);
                        else console.warn("Voice assistant speak function not available.");
                    }
                } else {
                    if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Sorry, I didn't catch the spot ID you want to reserve. Please try again.");
                    else console.warn("Voice assistant speak function not available.");
                }
                break;

            case 'check_availability':
                if (entities.spotId) {
                    const location = locations.find(loc => entities.spotId?.startsWith(loc.id));
                     if (location) {
                         setSelectedLocationId(location.id);
                         toast({ title: "Checking Availability", description: `Checking status for ${entities.spotId} in ${location.name}. See grid below.` });
                         setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 500);
                         console.warn(`Need mechanism to display/highlight availability for ${entities.spotId}`);
                    } else {
                         if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                          else console.warn("Voice assistant speak function not available.");
                    }
                } else if (entities.locationId) {
                     const location = locations.find(loc => loc.id === entities.locationId || loc.name === entities.locationId);
                     if (location) {
                         setSelectedLocationId(location.id);
                         const available = location.capacity - (location.currentOccupancy ?? 0);
                         if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Okay, ${location.name} currently has about ${available} spots available.`);
                          else console.warn("Voice assistant speak function not available.");
                     } else {
                         if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't find the location ${entities.locationId}.`);
                          else console.warn("Voice assistant speak function not available.");
                     }
                 } else {
                    if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Which spot or location would you like me to check?");
                    else console.warn("Voice assistant speak function not available.");
                 }
                break;

            case 'cancel_reservation':
                 toast({ title: "Action Required", description: "Please open your profile to view and cancel active reservations." });
                break;

            case 'get_directions':
                 if (entities.destination) {
                      let targetLat: number | undefined;
                      let targetLon: number | undefined;
                      let targetName = entities.destination;

                      // Check if destination is a bookmark
                      const matchedBookmark = userBookmarks.find(bm => bm.label.toLowerCase() === entities.destination?.toLowerCase());
                      if (matchedBookmark) {
                         targetLat = matchedBookmark.latitude;
                         targetLon = matchedBookmark.longitude;
                         targetName = matchedBookmark.label;
                         console.log(`Getting directions to bookmark: ${targetName}`);
                      } else {
                          // Check if destination is a known parking lot
                          const location = locations.find(loc => loc.id === entities.destination || loc.name === entities.destination);
                          if (location) {
                               targetLat = location.latitude;
                               targetLon = location.longitude;
                               targetName = location.name;
                               console.log(`Getting directions to parking lot: ${targetName}`);
                          } else {
                              // TODO: Geocode the destination string if not a bookmark or lot
                               console.log(`Cannot resolve directions target: ${targetName}. Geocoding needed.`);
                          }
                      }

                      if (targetLat && targetLon) {
                          toast({ title: "Getting Directions", description: `Opening map directions for ${targetName}...` });
                          // Open Google Maps URL
                           window.open(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLon}`, '_blank');
                      } else {
                           if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't find or get coordinates for ${targetName}.`);
                            else console.warn("Voice assistant speak function not available.");
                      }
                 } else if (pinnedSpot) {
                     const location = locations.find(l => l.id === pinnedSpot.locationId);
                      toast({ title: "Getting Directions", description: `Opening map directions to your pinned car at ${pinnedSpot.spotId}...` });
                      // TODO: Integrate with mapping service to pinned spot coordinates (if available)
                 } else {
                      if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Where would you like directions to?");
                       else console.warn("Voice assistant speak function not available.");
                 }
                break;

            case 'report_issue':
                if (entities.spotId) {
                    const location = locations.find(loc => entities.spotId?.startsWith(loc.id));
                     if (location && isAuthenticated) {
                         const mockReservation: ParkingHistoryEntry = { // Define type explicitly
                             id: `rep_${entities.spotId}`,
                             spotId: entities.spotId,
                             locationId: location.id,
                             locationName: location.name,
                             startTime: new Date().toISOString(),
                             endTime: '', cost: 0, status: 'Active' as const
                         };
                         setReportingReservation(mockReservation);
                         setIsReportModalOpen(true);
                     } else if (!isAuthenticated) {
                          if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Please sign in to report an issue.");
                          else console.warn("Voice assistant speak function not available.");
                          setIsAuthModalOpen(true);
                     } else {
                          if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                           else console.warn("Voice assistant speak function not available.");
                     }
                } else {
                    if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Which spot are you reporting an issue for?");
                     else console.warn("Voice assistant speak function not available.");
                }
                break;

            case 'add_bookmark':
                 if (!isAuthenticated || !userId) {
                    if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Please sign in to save locations.");
                    else console.warn("Voice assistant speak function not available.");
                    setIsAuthModalOpen(true);
                    break;
                 }
                 if (entities.bookmarkLabel) {
                     // Basic handling: Assume 'current location' for now if location isn't specific
                     // A more robust solution would involve confirming the location or using device GPS
                     let lat: number | undefined;
                     let lon: number | undefined;
                     let addr: string | undefined;
                     if (entities.bookmarkLocation?.toLowerCase().includes('current') || entities.bookmarkLocation?.toLowerCase().includes('here')) {
                         // TODO: Get actual current location from device GPS
                         addr = "Current Location (Detected)";
                     } else {
                         addr = entities.bookmarkLocation;
                         // TODO: Geocode address to get lat/lon if possible
                     }

                     try {
                         await addBookmark(userId, { label: entities.bookmarkLabel, address: addr, latitude: lat, longitude: lon });
                         await fetchUserBookmarks(); // Refresh bookmarks list
                         if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Okay, saved "${entities.bookmarkLabel}".`);
                         else console.warn("Voice assistant speak function not available.");
                         toast({ title: "Bookmark Added", description: `Saved "${entities.bookmarkLabel}".` });
                     } catch (error: any) {
                         console.error("Error adding bookmark via voice:", error);
                          if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't save the bookmark. ${error.message}`);
                          else console.warn("Voice assistant speak function not available.");
                         toast({ title: "Save Failed", description: error.message, variant: "destructive" });
                     }

                 } else {
                      if (voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("What label and location do you want to save?");
                      else console.warn("Voice assistant speak function not available.");
                 }
                break;

            case 'unknown':
                // Response already spoken by the flow
                break;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locations, pinnedSpot, isAuthenticated, toast, fetchRecommendations, userId, userBookmarks, fetchUserBookmarks]); // Removed voiceAssistant, added userId, userBookmarks, fetchUserBookmarks

   const handleVoiceCommand = useCallback(async (transcript: string) => {
        if (!transcript) return;
        try {
             const bookmarksJson = JSON.stringify(userBookmarks); // Pass current bookmarks context
            const result = await processVoiceCommand({ transcript, userBookmarks: bookmarksJson });
            await handleVoiceCommandResult(result);
        } catch (err) {
            console.error("Failed to process voice command:", err);
            toast({
                title: "Voice Command Error",
                description: "Sorry, I couldn't process that request.",
                variant: "destructive",
            });
            // Check if voiceAssistant exists before speaking
            if (voiceAssistant && voiceAssistant.speak) {
               voiceAssistant.speak("Sorry, I encountered an error trying to understand that.");
            } else {
                console.warn("Voice assistant speak function not available for error reporting.");
            }
        }
    }, [handleVoiceCommandResult, toast, userBookmarks]); // Added userBookmarks dependency

   const voiceAssistant = useVoiceAssistant({
       onCommand: handleVoiceCommand,
       onStateChange: (newState) => {
           console.log("Voice Assistant State (Manager):", newState);
           setVoiceAssistantState(newState); // Update local state for UI
       }
   });

   useEffect(() => {
       // Start listening automatically when component mounts on client and is supported
       // Ensure it only runs client-side
       if (isClient && voiceAssistant && voiceAssistant.isSupported && voiceAssistant.state === 'idle') {
           // voiceAssistant.startListening(); // Optional: Auto-start listening
       }
       // No cleanup needed here as the hook manages its own lifecycle
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isClient]); // Only run once on client mount

   useEffect(() => {
        // Check if voiceAssistant exists before accessing error
        if (voiceAssistant?.error) {
           toast({
               title: "Voice Assistant Error",
               description: voiceAssistant.error,
               variant: "destructive",
               duration: 4000,
           });
        }
   }, [voiceAssistant?.error, toast]); // Optional chaining for dependency
   // --- End Voice Assistant Integration ---


  // Fetch locations
  useEffect(() => {
    const fetchLocationsData = async () => {
      setIsLoadingLocations(true);
      setError(null);
      try {
        const fetchedLocations = await getAvailableParkingLots();
        setLocations(fetchedLocations);
        // No auto-selection here, let recommendations or user choose
      } catch (err) {
        console.error("Failed to fetch parking locations:", err);
        setError("Could not load parking locations. Please try again later.");
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchLocationsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    // Fetch bookmarks when user logs in
    useEffect(() => {
        if (isAuthenticated && userId) {
            fetchUserBookmarks();
        } else {
             setUserBookmarks([]); // Clear bookmarks if logged out
        }
    }, [isAuthenticated, userId, fetchUserBookmarks]);


   useEffect(() => {
        // Fetch recommendations after locations and bookmarks are loaded and user is authenticated
        if (!isLoadingLocations && !isLoadingBookmarks && locations.length > 0 && isAuthenticated) {
            fetchRecommendations();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingLocations, isLoadingBookmarks, isAuthenticated, fetchRecommendations]); // Add isLoadingBookmarks

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const handleAuthSuccess = (newUserId: string, name?: string, avatar?: string, role?: string) => {
    login(newUserId, name || `User ${newUserId.substring(0,5)}`, avatar, role || 'User');
    setIsAuthModalOpen(false);
    toast({title: "Authentication Successful"});
    fetchUserBookmarks(); // Fetch bookmarks after login
    // Recommendations will be fetched by the useEffect dependency change
  };

  // Logout is handled in profile page or header now
  // const handleLogout = () => { ... }

   const simulatePinCar = async (spotId: string, locationId: string) => {
       setIsPinning(true);
       setPinnedSpot(null);
       console.log(`Simulating pinning car location at ${spotId} in ${locationId}...`);
       await new Promise(resolve => setTimeout(resolve, 1000));

       const location = locations.find(l => l.id === locationId);

       setPinnedSpot({ spotId, locationId });
       setIsPinning(false);
       toast({
           title: "Car Location Pinned",
           description: `Your car's location at ${spotId} (${location?.name || locationId}) has been temporarily saved.`,
       });
       if (userId) {
          // await awardPoints(userId, 5); // Example gamification call
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
           simulatePinCar(spotId, locationId);
           if (userId) {
                // awardBadge(userId, 'badge_first_booking'); // Example gamification call
           }
       }
  };

  const clearPinnedLocation = () => {
      setPinnedSpot(null);
      toast({ title: "Pinned Location Cleared" });
  };

  const handleSelectRecommendation = (lotId: string) => {
      setSelectedLocationId(lotId);
       document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getVoiceButtonIcon = () => {
        // Return placeholder or static icon before client-side hydration
        if (!isClient) {
             return <MicOff key="ssr-mic" className="h-5 w-5 text-muted-foreground opacity-50" />;
        }
        // Rest of the logic runs only on the client
        if (!voiceAssistant || !voiceAssistant.isSupported) {
             return <MicOff key="unsupported-mic" className="h-5 w-5 text-muted-foreground opacity-50" />;
        }
        switch (voiceAssistantState) {
             case 'activated':
                 return <CheckSquare key="activated" className="h-5 w-5 text-green-600 animate-pulse" />;
            case 'listening':
                return <Square key="listening" className="h-5 w-5 text-blue-600 animate-pulse" />;
            case 'processing':
                return <Loader2 key="loader" className="h-5 w-5 animate-spin" />;
            case 'speaking':
                return <Mic key="speaking" className="h-5 w-5 text-purple-600" />;
            case 'error':
                 return <MicOff key="error-mic" className="h-5 w-5 text-destructive" />;
            case 'idle':
            default:
                return <Mic key="default-mic" className="h-5 w-5" />; // Use Mic icon when idle and supported
        }
    };

   const handleVoiceButtonClick = () => {
       if (!isClient || !voiceAssistant || !voiceAssistant.isSupported) return;
       // Button now just toggles continuous listening on/off
       if (voiceAssistant.state === 'listening' || voiceAssistant.state === 'activated') {
           voiceAssistant.stopListening();
       } else {
           voiceAssistant.startListening();
       }
   };

    const getVoiceButtonTooltip = () => {
         if (!isClient || !voiceAssistant) return "Loading...";
         if (!voiceAssistant.isSupported) return "Voice commands not supported";
         switch (voiceAssistantState) {
              case 'activated': return "Say your command...";
              case 'listening': return "Listening for 'Hey Carpso' or command..."; // Updated tooltip
              case 'processing': return "Processing...";
              case 'speaking': return "Speaking...";
              case 'error': return `Error: ${voiceAssistant.error || 'Unknown'}`;
              case 'idle':
              default: return "Start voice command"; // Updated tooltip
         }
    }

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
       <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
           <h1 className="text-3xl font-bold">Parking Availability</h1>
           <div className="flex items-center gap-2">
                {/* Voice Assistant Button - Enhanced UI */}
                 <Button
                     variant="outline"
                     size="icon"
                     onClick={handleVoiceButtonClick}
                     disabled={!isClient || (voiceAssistant && (!voiceAssistant.isSupported || voiceAssistantState === 'processing' || voiceAssistantState === 'speaking')) || false}
                     aria-label={getVoiceButtonTooltip()}
                     title={getVoiceButtonTooltip()} // Tooltip for desktop
                     className={cn(
                         "transition-opacity", // Added for smoother loading
                         !isClient && "opacity-50 cursor-not-allowed", // Style for SSR/before mount
                         isClient && (!voiceAssistant || !voiceAssistant.isSupported) && "opacity-50 cursor-not-allowed", // Style for unsupported
                         isClient && voiceAssistantState === 'activated' && "border-primary",
                         isClient && voiceAssistantState === 'listening' && "border-blue-600",
                         isClient && voiceAssistantState === 'error' && "border-destructive",
                         isClient && (voiceAssistantState === 'processing' || voiceAssistantState === 'speaking') && "opacity-50 cursor-not-allowed"
                     )}
                 >
                     {getVoiceButtonIcon()}
                 </Button>

               {/* Auth / Profile Button - Only shows Sign In if not authenticated */}
               {!isAuthenticated && (
                    <Button onClick={() => setIsAuthModalOpen(true)}>
                        Sign In / Sign Up
                    </Button>
               )}
               {/* Profile button is now in the header for desktop and bottom nav for mobile */}
           </div>
       </div>
        {/* Voice Assistant Status Indicator (More informative) */}
        {isClient && voiceAssistant && voiceAssistant.isSupported && voiceAssistantState !== 'idle' && (
            <p className="text-sm text-muted-foreground text-center mb-4 italic">
                 {voiceAssistantState === 'activated' && "Say your command..."}
                 {voiceAssistantState === 'listening' && "Listening..."}
                 {voiceAssistantState === 'processing' && "Processing command..."}
                 {voiceAssistantState === 'speaking' && "Speaking..."}
                 {voiceAssistantState === 'error' && `Error: ${voiceAssistant?.error || 'Unknown'}`}
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
                    {/* TODO: Add button to get directions to pinned spot */}
                    {/* <Button size="sm" variant="link" className="mt-1 p-0 h-auto">Get Directions</Button> */}
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
                    {isLoadingRecommendations || isLoadingBookmarks ? ( // Also consider bookmark loading
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
                                                <Badge variant={rec.availabilityScore > 0.7 ? 'default' : rec.availabilityScore > 0.4 ? 'secondary' : 'destructive'} className={cn("text-xs", rec.availabilityScore > 0.7 && "bg-green-600 text-white")}>
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
        <div id="parking-grid-section">
            <ParkingLotGrid
              key={selectedLocation.id}
              location={selectedLocation}
              onSpotReserved={handleSpotReserved}
              userTier={userRole === 'PremiumUser' || userRole === 'Premium' ? 'Premium' : 'Basic'}
            />
        </div>
      ) : !isLoadingLocations && !error && locations.length > 0 ? (
         <p className="text-center text-muted-foreground">
             {isAuthenticated ? 'Select a recommended or specific parking location above.' : 'Please select a parking location above.'}
         </p>
      ) : null }

       <AuthModal
           isOpen={isAuthModalOpen}
           onClose={() => setIsAuthModalOpen(false)}
           onAuthSuccess={handleAuthSuccess}
       />

       {/* UserProfile component is removed, profile access is via dedicated page */}
       {/* {isAuthenticated && userId && (
           <UserProfile ... />
       )} */}

        <BottomNavBar
             isAuthenticated={isAuthenticated}
             userRole={userRole || 'User'}
             userName={userName}
             userAvatarUrl={userAvatarUrl}
             onAuthClick={() => setIsAuthModalOpen(true)}
             // onProfileClick is removed
         />

        {/* Report Issue Modal (Now also potentially triggered by voice) */}
        <ReportIssueModal
            isOpen={isReportModalOpen}
            onClose={() => {
                 setIsReportModalOpen(false);
                 setTimeout(() => setReportingReservation(null), 300);
            }}
            reservation={reportingReservation}
            userId={userId || ''}
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
