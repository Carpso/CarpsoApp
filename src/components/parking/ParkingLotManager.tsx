// src/components/parking/ParkingLotManager.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import ParkingLotGrid from './ParkingLotGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot'; // Import service type
import { getAvailableParkingLots } from '@/services/parking-lot';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { MapPin, Loader2, Sparkles, Star, Mic, MicOff, CheckSquare, Square, AlertTriangle, BookMarked, WifiOff } from 'lucide-react'; // Added WifiOff
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
      isOnline, // Get online status from context
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

  const { toast, dismiss } = useToast(); // Get dismiss function for offline toast
  const [offlineToastId, setOfflineToastId] = useState<string | null>(null); // Track the offline toast ID

   const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null); // State for report modal
   const [isReportModalOpen, setIsReportModalOpen] = useState(false);
   const [isClient, setIsClient] = useState(false); // State to track client-side mount
   const [voiceAssistantState, setVoiceAssistantState] = useState<VoiceAssistantState>('idle'); // Track voice assistant state for UI

   useEffect(() => {
       // Ensure this only runs on the client
       setIsClient(true);
   }, []);

   // Show/hide persistent offline toast
    useEffect(() => {
        if (!isOnline && isClient) {
            const { id } = toast({
                title: "Offline Mode",
                description: "App functionality is limited. Displaying cached data.",
                variant: "destructive", // Use destructive variant for attention
                duration: Infinity, // Keep toast visible indefinitely while offline
                action: <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry Connection</Button>,
            });
            setOfflineToastId(id);
        } else if (isOnline && offlineToastId && isClient) {
            dismiss(offlineToastId); // Dismiss the toast when back online
            setOfflineToastId(null);
            toast({
                title: "Back Online",
                description: "Connection restored. Syncing data...",
                duration: 3000,
            });
            // TODO: Trigger data sync here
            // Example: syncOfflineActions(); fetchFreshData();
             fetchLocationsData(); // Re-fetch locations when back online
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, isClient, toast, dismiss]); // Add dismiss to dependencies


    const fetchUserBookmarks = useCallback(async () => {
       if (!isAuthenticated || !userId || !isOnline) { // Don't fetch if offline
            // Try loading from cache if needed for offline recommendations
            return;
       }
       setIsLoadingBookmarks(true);
       try {
           const bookmarks = await getUserBookmarks(userId);
           setUserBookmarks(bookmarks);
           // Cache bookmarks
           if (typeof window !== 'undefined') {
               localStorage.setItem('cachedUserBookmarks', JSON.stringify(bookmarks));
           }
       } catch (err) {
           console.error("Failed to fetch user bookmarks:", err);
           // Optional: toast notification
       } finally {
           setIsLoadingBookmarks(false);
       }
    }, [isAuthenticated, userId, isOnline]); // Add isOnline


     // Fetch recommendations when locations are loaded or user/destination changes
     const fetchRecommendations = useCallback(async (destinationLabel?: string) => { // Changed parameter to label
       if (!isAuthenticated || !userId || locations.length === 0 || !isOnline) { // Don't fetch if offline
           setRecommendations([]); // Clear recommendations if not logged in, no locations, or offline
           return;
       }
       setIsLoadingRecommendations(true);
       try {
           // Simulate getting user location (replace with actual data)
           const currentCoords = { latitude: 34.0522, longitude: -118.2437 }; // Example: Near Downtown Garage

            // Try to get coords from bookmarks if destinationLabel matches
            let destinationCoords: { latitude?: number; longitude?: number } | undefined = undefined;
             // Load bookmarks from state (which should be loaded/cached)
             const currentBookmarks = userBookmarks.length > 0 ? userBookmarks : JSON.parse(localStorage.getItem('cachedUserBookmarks') || '[]');

            if (destinationLabel) {
                 const matchedBookmark = currentBookmarks.find(bm => bm.label.toLowerCase() === destinationLabel.toLowerCase());
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
            const bookmarksJson = JSON.stringify(currentBookmarks); // Pass current/cached bookmarks to the flow


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
     }, [isAuthenticated, userId, locations, userPreferredServices, userHistorySummary, toast, userRole, userBookmarks, isOnline]); // Add isOnline, userBookmarks dependency


   // --- Voice Assistant Integration ---
    // Move handleVoiceCommandResult here
    const handleVoiceCommandResult = useCallback(async (commandOutput: ProcessVoiceCommandOutput) => {
        const { intent, entities, responseText } = commandOutput;

        console.log("Processed Intent:", intent);
        console.log("Processed Entities:", entities);

        // Speak the response first (check if online/supported)
        if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(responseText);
        else console.warn("Voice assistant speak function not available or offline.");

        // --- Execute action based on intent ---
        switch (intent) {
            case 'find_parking':
                // Trigger recommendation fetch based on destination label (online only)
                if (isOnline) {
                     if (entities.destination) {
                         toast({ title: "Finding Parking", description: `Looking for parking near ${entities.destination}. Recommendations updated.` });
                         await fetchRecommendations(entities.destination);
                    } else {
                         toast({ title: "Finding Parking", description: `Showing general recommendations.` });
                         await fetchRecommendations();
                    }
                } else {
                     toast({ title: "Offline", description: "Recommendations require an internet connection.", variant: "destructive"});
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
                         // TODO: Offline reservation queueing could be added here
                    } else {
                        if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}. Please try again or select manually.`);
                        else console.warn("Voice assistant speak function not available or offline.");
                    }
                } else {
                    if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Sorry, I didn't catch the spot ID you want to reserve. Please try again.");
                    else console.warn("Voice assistant speak function not available or offline.");
                }
                break;

            case 'check_availability':
                if (entities.spotId) {
                    const location = locations.find(loc => entities.spotId?.startsWith(loc.id));
                     if (location) {
                         setSelectedLocationId(location.id);
                         toast({ title: "Checking Availability", description: `Checking status for ${entities.spotId} in ${location.name}. See grid below.` });
                         setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 500);
                         // Availability check relies on fetched data (cached or live)
                    } else {
                         if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                          else console.warn("Voice assistant speak function not available or offline.");
                    }
                } else if (entities.locationId) {
                     const location = locations.find(loc => loc.id === entities.locationId || loc.name === entities.locationId);
                     if (location) {
                         setSelectedLocationId(location.id);
                         const available = location.capacity - (location.currentOccupancy ?? 0);
                         if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Okay, ${location.name} currently has about ${available} spots available.`);
                          else console.warn("Voice assistant speak function not available or offline.");
                     } else {
                         if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't find the location ${entities.locationId}.`);
                          else console.warn("Voice assistant speak function not available or offline.");
                     }
                 } else {
                    if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Which spot or location would you like me to check?");
                    else console.warn("Voice assistant speak function not available or offline.");
                 }
                break;

            case 'cancel_reservation':
                 toast({ title: "Action Required", description: "Please open your profile to view and cancel active reservations." });
                 // Cancellation likely needs online connection
                break;

            case 'get_directions':
                 if (entities.destination) {
                      let targetLat: number | undefined;
                      let targetLon: number | undefined;
                      let targetName = entities.destination;
                        const currentBookmarks = userBookmarks.length > 0 ? userBookmarks : JSON.parse(localStorage.getItem('cachedUserBookmarks') || '[]');

                      // Check if destination is a bookmark
                      const matchedBookmark = currentBookmarks.find(bm => bm.label.toLowerCase() === entities.destination?.toLowerCase());
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
                          // Open Google Maps URL (requires internet)
                           window.open(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLon}`, '_blank');
                      } else {
                           if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't find or get coordinates for ${targetName}.`);
                            else console.warn("Voice assistant speak function not available or offline.");
                      }
                 } else if (pinnedSpot) {
                     const location = locations.find(l => l.id === pinnedSpot.locationId);
                      toast({ title: "Getting Directions", description: `Opening map directions to your pinned car at ${pinnedSpot.spotId}...` });
                      // TODO: Integrate with mapping service to pinned spot coordinates (if available)
                 } else {
                      if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Where would you like directions to?");
                       else console.warn("Voice assistant speak function not available or offline.");
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
                          // TODO: Add offline queuing for reports
                     } else if (!isAuthenticated) {
                          if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Please sign in to report an issue.");
                          else console.warn("Voice assistant speak function not available or offline.");
                          setIsAuthModalOpen(true);
                     } else {
                          if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                           else console.warn("Voice assistant speak function not available or offline.");
                     }
                } else {
                    if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Which spot are you reporting an issue for?");
                     else console.warn("Voice assistant speak function not available or offline.");
                }
                break;

            case 'add_bookmark':
                 if (!isAuthenticated || !userId) {
                    if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("Please sign in to save locations.");
                    else console.warn("Voice assistant speak function not available or offline.");
                    setIsAuthModalOpen(true);
                    break;
                 }
                  if (!isOnline) {
                      toast({ title: "Offline", description: "Cannot add bookmarks while offline.", variant: "destructive" });
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
                         if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Okay, saved "${entities.bookmarkLabel}".`);
                         else console.warn("Voice assistant speak function not available or offline.");
                         toast({ title: "Bookmark Added", description: `Saved "${entities.bookmarkLabel}".` });
                     } catch (error: any) {
                         console.error("Error adding bookmark via voice:", error);
                          if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak(`Sorry, I couldn't save the bookmark. ${error.message}`);
                          else console.warn("Voice assistant speak function not available or offline.");
                         toast({ title: "Save Failed", description: error.message, variant: "destructive" });
                     }

                 } else {
                      if (isOnline && voiceAssistant && voiceAssistant.speak) voiceAssistant.speak("What label and location do you want to save?");
                      else console.warn("Voice assistant speak function not available or offline.");
                 }
                break;

            case 'unknown':
                // Response already spoken by the flow
                break;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locations, pinnedSpot, isAuthenticated, toast, fetchRecommendations, userId, userBookmarks, fetchUserBookmarks, isOnline]); // Add isOnline dependency

   const handleVoiceCommand = useCallback(async (transcript: string) => {
        if (!transcript) return;
        if (!isOnline) { // Don't process if offline
            toast({ title: "Offline", description: "Voice commands require an internet connection.", variant: "destructive"});
            return;
        }
        try {
             const currentBookmarks = userBookmarks.length > 0 ? userBookmarks : JSON.parse(localStorage.getItem('cachedUserBookmarks') || '[]');
             const bookmarksJson = JSON.stringify(currentBookmarks); // Pass current bookmarks context
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
            if (isOnline && voiceAssistant && voiceAssistant.speak) {
               voiceAssistant.speak("Sorry, I encountered an error trying to understand that.");
            } else {
                console.warn("Voice assistant speak function not available or offline for error reporting.");
            }
        }
    }, [handleVoiceCommandResult, toast, userBookmarks, isOnline]); // Added isOnline dependency

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


  // Fetch locations - Modified to use cache when offline
   const fetchLocationsData = useCallback(async () => {
     setIsLoadingLocations(true);
     setError(null);
     try {
         let fetchedLocations: ParkingLot[] | null = null;
         const cacheKey = 'cachedParkingLots';
         const cacheTimestampKey = 'cachedParkingLotsTimestamp';
         const maxCacheAge = 60 * 60 * 1000; // 1 hour in milliseconds

         if (isOnline) {
             try {
                 fetchedLocations = await getAvailableParkingLots();
                 // Cache the fresh data
                 if (typeof window !== 'undefined') {
                     localStorage.setItem(cacheKey, JSON.stringify(fetchedLocations));
                     localStorage.setItem(cacheTimestampKey, Date.now().toString());
                 }
                 console.log("Fetched fresh locations.");
             } catch (fetchError) {
                 console.error("Failed to fetch fresh parking locations:", fetchError);
                 // Try loading from cache as fallback even if online fetch failed
                  if (typeof window !== 'undefined') {
                       const cachedData = localStorage.getItem(cacheKey);
                       if (cachedData) {
                           fetchedLocations = JSON.parse(cachedData);
                           console.warn("Online fetch failed, using cached locations.");
                       } else {
                           throw fetchError; // Re-throw if cache is also empty
                       }
                  } else {
                      throw fetchError; // Re-throw if localStorage unavailable
                  }
             }
         } else {
             // Offline: Try loading from cache
             if (typeof window !== 'undefined') {
                 const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
                 const cachedData = localStorage.getItem(cacheKey);
                 if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < maxCacheAge) {
                     fetchedLocations = JSON.parse(cachedData);
                     console.log("Using cached locations (offline).");
                 } else {
                     setError("Offline: Could not load fresh data and cache is old or empty.");
                 }
             } else {
                  setError("Offline: Cache unavailable.");
             }
         }

         if (fetchedLocations) {
             setLocations(fetchedLocations);
             // Keep previous selection if it's still valid, otherwise clear
             setSelectedLocationId(prevId => fetchedLocations!.some(loc => loc.id === prevId) ? prevId : null);
         }

     } catch (err) {
       console.error("Error processing parking locations:", err);
       setError("Could not load parking locations.");
     } finally {
       setIsLoadingLocations(false);
     }
   }, [isOnline]); // Depend on isOnline

  useEffect(() => {
    fetchLocationsData();
  }, [fetchLocationsData]); // Run fetchLocationsData on mount and when it changes (due to isOnline)

    // Fetch bookmarks when user logs in or comes online
    useEffect(() => {
        if (isAuthenticated && userId) {
            fetchUserBookmarks();
             // Try loading cached bookmarks immediately for faster UI responsiveness
             if (typeof window !== 'undefined') {
                const cachedBookmarks = localStorage.getItem('cachedUserBookmarks');
                if (cachedBookmarks) {
                    setUserBookmarks(JSON.parse(cachedBookmarks));
                }
             }
        } else {
             setUserBookmarks([]); // Clear bookmarks if logged out
             if (typeof window !== 'undefined') {
                 localStorage.removeItem('cachedUserBookmarks');
             }
        }
    }, [isAuthenticated, userId, fetchUserBookmarks]);


   useEffect(() => {
        // Fetch recommendations after locations and bookmarks are loaded and user is authenticated
        // Note: fetchRecommendations now internally checks isOnline
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
    fetchLocationsData(); // Refetch locations potentially with user context
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
       const pinData = { spotId, locationId, timestamp: Date.now() };

       setPinnedSpot(pinData);
       // Cache pinned location for offline access
       if (typeof window !== 'undefined') {
           localStorage.setItem('pinnedCarLocation', JSON.stringify(pinData));
       }

       setIsPinning(false);
       toast({
           title: "Car Location Pinned",
           description: `Your car's location at ${spotId} (${location?.name || locationId}) has been temporarily saved.`,
       });
       if (userId && isOnline) {
          // await awardPoints(userId, 5); // Example gamification call - only if online
       }
   };

    // Load pinned location from cache on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const cachedPin = localStorage.getItem('pinnedCarLocation');
            const maxPinAge = 6 * 60 * 60 * 1000; // 6 hours
            if (cachedPin) {
                const pinData = JSON.parse(cachedPin);
                if (Date.now() - pinData.timestamp < maxPinAge) {
                    setPinnedSpot(pinData);
                } else {
                    localStorage.removeItem('pinnedCarLocation'); // Clear expired pin
                }
            }
        }
    }, []);


  const handleSpotReserved = (spotId: string, locationId: string) => {
      console.log(`Spot ${spotId} at location ${locationId} reserved by user ${userId || 'guest'}`);

       if (!isAuthenticated) {
           toast({
               title: "Sign In Required",
               description: "Please sign in or create an account to manage reservations and pin your car location.",
               action: <Button onClick={() => setIsAuthModalOpen(true)}>Sign In</Button>,
           });
       } else {
           simulatePinCar(spotId, locationId); // Pinning works offline (uses cached location name if offline)
           if (userId && isOnline) {
                // awardBadge(userId, 'badge_first_booking'); // Example gamification call - only if online
           }
           // TODO: Add reservation to an offline queue if !isOnline
           // if (!isOnline) { queueReservation({ userId, spotId, locationId, timestamp: Date.now() }); }
       }
  };

  const clearPinnedLocation = () => {
      setPinnedSpot(null);
       if (typeof window !== 'undefined') {
           localStorage.removeItem('pinnedCarLocation');
       }
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
        if (!voiceAssistant || !voiceAssistant.isSupported || !isOnline) { // Disable if offline
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
       if (!isClient || !voiceAssistant || !voiceAssistant.isSupported || !isOnline) return; // Don't allow activation if offline
       // Button now just toggles continuous listening on/off
       if (voiceAssistant.state === 'listening' || voiceAssistant.state === 'activated') {
           voiceAssistant.stopListening();
       } else {
           voiceAssistant.startListening();
       }
   };

    const getVoiceButtonTooltip = () => {
         if (!isClient || !voiceAssistant) return "Loading...";
          if (!isOnline) return "Voice commands unavailable offline";
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
                      disabled={!isClient || (voiceAssistant && (!voiceAssistant.isSupported || voiceAssistantState === 'processing' || voiceAssistantState === 'speaking')) || !isOnline || false} // Disable if offline
                     aria-label={getVoiceButtonTooltip()}
                     title={getVoiceButtonTooltip()} // Tooltip for desktop
                     className={cn(
                         "transition-opacity", // Added for smoother loading
                         !isClient && "opacity-50 cursor-not-allowed", // Style for SSR/before mount
                          isClient && (!voiceAssistant || !voiceAssistant.isSupported || !isOnline) && "opacity-50 cursor-not-allowed", // Style for unsupported or offline
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
        {isClient && voiceAssistant && voiceAssistant.isSupported && isOnline && voiceAssistantState !== 'idle' && (
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
        {isAuthenticated && !isLoadingLocations && isOnline && ( // Only show recommendations when online
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
              <p className="text-muted-foreground">No parking locations available (check connection or cache).</p>
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
             {isAuthenticated && isOnline ? 'Select a recommended or specific parking location above.' : 'Please select a parking location above.'}
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
