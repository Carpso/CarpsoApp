// src/components/parking/ParkingLotManager.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import ParkingLotGrid from './ParkingLotGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot'; // Import service type
import { getAvailableParkingLots } from '@/services/parking-lot';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { MapPin, Loader2, Sparkles, Star, Mic, MicOff, CheckSquare, Square, AlertTriangle, BookMarked, WifiOff, RefreshCcw, StarOff, Search, ExternalLink, Building } from 'lucide-react'; // Added ExternalLink, Building
import AuthModal from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge"; // Import Badge component
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import BottomNavBar from '@/components/layout/BottomNavBar'; // Import BottomNavBar
import { recommendParking, RecommendParkingOutput } from '@/ai/flows/recommend-parking-flow'; // Import recommendation flow
import { getUserGamification, getUserBookmarks, addBookmark, UserBookmark, saveUserPreferences, loadUserPreferences, UserRole } from '@/services/user-service'; // Import gamification service and bookmark/preference functions/type
import { calculateEstimatedCost } from '@/services/pricing-service'; // Import pricing service
import { useVoiceAssistant, VoiceAssistantState } from '@/hooks/useVoiceAssistant'; // Import voice assistant hook
import { processVoiceCommand, ProcessVoiceCommandOutput } from '@/ai/flows/process-voice-command-flow'; // Import voice command processor
import { cn } from '@/lib/utils';
import ReportIssueModal from '@/components/profile/ReportIssueModal'; // Import ReportIssueModal
import { useVisibilityChange } from '@/hooks/useVisibilityChange'; // Import visibility hook

// Interface for pinned location data, now includes coordinates
interface PinnedLocationData {
    spotId: string;
    locationId: string;
    locationName: string;
    latitude: number; // Ensure latitude is stored
    longitude: number; // Ensure longitude is stored
    timestamp: number;
}

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
  const [isRefreshing, setIsRefreshing] = useState(false); // State for manual refresh
  const [error, setError] = useState<string | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Pinned Spot state now uses the new interface with coordinates
  const [pinnedSpot, setPinnedSpot] = useState<PinnedLocationData | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  const [recommendations, setRecommendations] = useState<RecommendParkingOutput['recommendations']>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [userPreferredServices, setUserPreferredServices] = useState<ParkingLotService[]>([]); // Example user preference
  const [userHistorySummary, setUserHistorySummary] = useState<string>("Prefers Downtown Garage, parks mostly weekday mornings."); // Example summary
  const [userBookmarks, setUserBookmarks] = useState<UserBookmark[]>([]); // State for user bookmarks
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState<string[]>([]); // State for favorite location IDs

  const { toast, dismiss } = useToast(); // Get dismiss function for offline toast
  const [offlineToastId, setOfflineToastId] = useState<string | null>(null); // Track the offline toast ID

   const [reportingReservation, setReportingReservation] = useState<ParkingHistoryEntry | null>(null); // State for report modal
   const [isReportModalOpen, setIsReportModalOpen] = useState(false);
   const [isClient, setIsClient] = useState(false); // State to track client-side mount
   const [voiceAssistantState, setVoiceAssistantState] = useState<VoiceAssistantState>('idle'); // Track voice assistant state for UI
   const isVisible = useVisibilityChange(); // Track tab visibility
   // IMPORTANT: Initialize voiceAssistant ref within the component body
   const voiceAssistant = useRef<VoiceAssistantResult | null>(null);


   useEffect(() => {
       // Ensure this only runs on the client
       setIsClient(true);

       // Load favorites from localStorage on mount
        if (userId && typeof window !== 'undefined') {
             const prefs = loadUserPreferences(userId);
             if (prefs && prefs.favoriteLocations) {
                 setFavoriteLocations(prefs.favoriteLocations);
             }
        }
   }, [userId]); // Depend on userId to load prefs on login

    // Effect to initialize the voice assistant hook only on the client
    useEffect(() => {
        if (isClient) {
            voiceAssistant.current = useVoiceAssistant({
                onCommand: (transcript) => handleVoiceCommand(transcript),
                onStateChange: (newState) => {
                    console.log("Voice Assistant State (Manager):", newState);
                    setVoiceAssistantState(newState);
                }
            });

             // Check for errors from the hook after initialization
             if (voiceAssistant.current?.error) {
                toast({
                    title: "Voice Assistant Error",
                    description: voiceAssistant.current.error,
                    variant: "destructive",
                    duration: 4000,
                });
             }
        }
        // No cleanup needed here as the hook manages its own lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isClient]); // Re-run only if isClient changes (which is only once)


   // Show/hide persistent offline toast
    useEffect(() => {
        if (!isOnline && isClient) {
            // Dismiss any existing offline toast before showing a new one
            if (offlineToastId) dismiss(offlineToastId);

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
            // Trigger data sync when back online
             fetchLocationsData(true); // Force refresh locations
             fetchUserBookmarks(); // Refresh bookmarks
             // Recommendations will be fetched by the useEffect dependency change after locations/bookmarks are ready
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, isClient, toast, dismiss]); // Add dismiss to dependencies


    const fetchUserBookmarks = useCallback(async () => {
       // Load cached bookmarks immediately if available
       if (typeof window !== 'undefined') {
          const cachedBookmarks = localStorage.getItem('cachedUserBookmarks');
          if (cachedBookmarks) {
              try {
                   setUserBookmarks(JSON.parse(cachedBookmarks));
              } catch {
                   console.error("Failed to parse cached bookmarks");
              }
          }
       }
       // Don't fetch fresh if offline
       if (!isAuthenticated || !userId || !isOnline) return;

       setIsLoadingBookmarks(true);
       try {
           const bookmarks = await getUserBookmarks(userId);
           setUserBookmarks(bookmarks);
           // Cache bookmarks
           if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('cachedUserBookmarks', JSON.stringify(bookmarks));
                } catch (e) {
                    console.error("Failed to cache bookmarks:", e);
                }
           }
       } catch (err) {
           console.error("Failed to fetch user bookmarks:", err);
           // Only show error toast if online
           if (isOnline) toast({ title: "Error", description: "Could not refresh saved locations.", variant: "destructive" });
       } finally {
           setIsLoadingBookmarks(false);
       }
    }, [isAuthenticated, userId, isOnline, toast]); // Added isOnline


     // Fetch recommendations when locations are loaded or user/destination changes
     const fetchRecommendations = useCallback(async (destinationLabel?: string) => { // Changed parameter to label
       // Clear recommendations if offline or prerequisites not met
       if (!isAuthenticated || !userId || locations.length === 0 || !isOnline) {
           setRecommendations([]);
           setIsLoadingRecommendations(false); // Ensure loading state is reset
           return;
       }
       setIsLoadingRecommendations(true);
       setRecommendations([]); // Clear previous recommendations before fetching new ones
       try {
           // Simulate getting user location (replace with actual data)
           const currentCoords = { latitude: -15.4167, longitude: 28.2833 }; // Example: Lusaka

            // Try to get coords from bookmarks if destinationLabel matches
            let destinationCoords: { latitude?: number; longitude?: number } | undefined = undefined;
             // Use state which should have been loaded from cache or fetched
             const currentBookmarks = userBookmarks;

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

           // Prepare input for the recommendation flow
           // Convert locations to JSON string with essential details
            let nearbyLotsJson = "[]";
            try {
                 // Filter out external lots without pricing capability before sending to AI
                const carpsoLocations = locations.filter(loc => loc.isCarpsoManaged);
                 const locationsWithPrice = await Promise.all(carpsoLocations.map(async loc => {
                    // Use cached pricing rules or fetch only if necessary
                    const { cost: estimatedCost } = await calculateEstimatedCost(loc, 60, userId, userRole === 'PremiumUser' || userRole === 'Premium' ? 'Premium' : 'Basic');
                    return { id: loc.id, name: loc.name, address: loc.address, capacity: loc.capacity, currentOccupancy: loc.currentOccupancy, services: loc.services, estimatedCost, latitude: loc.latitude, longitude: loc.longitude }; // Include lat/lon
                }));
                nearbyLotsJson = JSON.stringify(locationsWithPrice);
            } catch (error) {
                console.error("Error preparing nearbyLots JSON:", error);
                // Proceed with empty array if pricing calculation fails for some lots
            }


            let bookmarksJson = "[]";
            try {
                bookmarksJson = JSON.stringify(currentBookmarks); // Pass current/cached bookmarks to the flow
            } catch (error) {
                 console.error("Error preparing bookmarks JSON:", error);
                 // Proceed with empty array
            }


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

           console.log("Calling recommendParking with input:", JSON.stringify(input, null, 2)); // Log input for debugging

           const result = await recommendParking(input);
           console.log("Received recommendations:", result); // Log result
           setRecommendations(result.recommendations || []);

       } catch (err) {
           console.error("Failed to fetch recommendations:", err);
            // Only show error toast if online
           if (isOnline) toast({
               title: "Recommendation Error",
               description: "Could not fetch personalized parking recommendations. Please try again later.",
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
        // Ensure voiceAssistant and speak exist before calling
        if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
             voiceAssistant.current.speak(responseText);
        } else {
             console.warn("Voice assistant speak function not available, offline, or not on client.");
        }

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
                    const location = locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id)); // Only allow reserving Carpso spots
                    if (location) {
                        setSelectedLocationId(location.id);
                        toast({ title: "Action Required", description: `Navigating to ${location.name}. Please confirm reservation for ${entities.spotId} on screen.` });
                         setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 500);
                         console.warn(`Need mechanism to auto-open reservation dialog for ${entities.spotId}`);
                         // TODO: Offline reservation queueing could be added here
                    } else {
                         let msg = `Sorry, I couldn't identify the location for spot ${entities.spotId}.`;
                         if (!locations.find(loc => entities.spotId?.startsWith(loc.id))) {
                              msg += " It might be an external parking lot which doesn't support reservations through Carpso.";
                         }
                         if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                            voiceAssistant.current.speak(msg);
                        } else {
                            console.warn("Voice assistant speak function not available, offline, or not on client.");
                        }
                    }
                } else {
                    if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                       voiceAssistant.current.speak("Sorry, I didn't catch the spot ID you want to reserve. Please try again.");
                    } else {
                        console.warn("Voice assistant speak function not available, offline, or not on client.");
                    }
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
                          if (!location.isCarpsoManaged) {
                              if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                                  voiceAssistant.current.speak(`I can show you ${location.name}, but real-time spot availability isn't available for this external location.`);
                              } else {
                                   console.warn("Voice assistant speak function not available, offline, or not on client.");
                              }
                         }
                    } else {
                          if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                             voiceAssistant.current.speak(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                          } else {
                                console.warn("Voice assistant speak function not available, offline, or not on client.");
                          }
                    }
                } else if (entities.locationId) {
                     const location = locations.find(loc => loc.id === entities.locationId || loc.name === entities.locationId);
                     if (location) {
                         setSelectedLocationId(location.id);
                         const available = location.isCarpsoManaged ? (location.capacity - (location.currentOccupancy ?? 0)) : undefined;
                         if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                             if (available !== undefined) {
                                voiceAssistant.current.speak(`Okay, ${location.name} currently has about ${available} spots available.`);
                             } else {
                                 voiceAssistant.current.speak(`Okay, showing ${location.name}. Real-time availability data isn't available for this external location.`);
                             }
                         } else {
                             console.warn("Voice assistant speak function not available, offline, or not on client.");
                         }
                     } else {
                          if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                              voiceAssistant.current.speak(`Sorry, I couldn't find the location ${entities.locationId}.`);
                          } else {
                              console.warn("Voice assistant speak function not available, offline, or not on client.");
                          }
                     }
                 } else {
                    if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                         voiceAssistant.current.speak("Which spot or location would you like me to check?");
                    } else {
                        console.warn("Voice assistant speak function not available, offline, or not on client.");
                    }
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
                         // Use state, which should be loaded/cached
                        const currentBookmarks = userBookmarks;

                      // Check if destination is a bookmark
                      const matchedBookmark = currentBookmarks.find(bm => bm.label.toLowerCase() === entities.destination?.toLowerCase());
                      if (matchedBookmark) {
                         targetLat = matchedBookmark.latitude;
                         targetLon = matchedBookmark.longitude;
                         targetName = matchedBookmark.label;
                         console.log(`Getting directions to bookmark: ${targetName}`);
                      } else {
                          // Check if destination is a known parking lot (Carpso or External)
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
                          if (typeof window !== 'undefined') {
                             window.open(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLon}`, '_blank');
                          }
                      } else {
                           if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                                voiceAssistant.current.speak(`Sorry, I couldn't find or get coordinates for ${targetName}.`);
                           } else {
                               console.warn("Voice assistant speak function not available, offline, or not on client.");
                           }
                      }
                 } else if (pinnedSpot) {
                     // const location = locations.find(l => l.id === pinnedSpot.locationId); // Already have lat/lon
                      toast({ title: "Getting Directions", description: `Opening map directions to your pinned car at ${pinnedSpot.spotId}...` });
                     // Use pinned coordinates
                      if (typeof window !== 'undefined' && pinnedSpot.latitude && pinnedSpot.longitude) {
                         window.open(`https://www.google.com/maps/dir/?api=1&destination=${pinnedSpot.latitude},${pinnedSpot.longitude}`, '_blank');
                      }
                 } else {
                      if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                           voiceAssistant.current.speak("Where would you like directions to?");
                      } else {
                           console.warn("Voice assistant speak function not available, offline, or not on client.");
                      }
                 }
                break;

            case 'report_issue':
                if (entities.spotId) {
                    const location = locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id)); // Can only report issues for Carpso spots
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
                          if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                                voiceAssistant.current.speak("Please sign in to report an issue.");
                          } else {
                                console.warn("Voice assistant speak function not available, offline, or not on client.");
                          }
                          setIsAuthModalOpen(true);
                     } else {
                          let msg = `Sorry, I couldn't identify the location for spot ${entities.spotId}.`;
                          if (!locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id))) {
                               msg += " You can only report issues for Carpso-managed locations.";
                          }
                          if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                                voiceAssistant.current.speak(msg);
                          } else {
                                console.warn("Voice assistant speak function not available, offline, or not on client.");
                          }
                     }
                } else {
                    if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                         voiceAssistant.current.speak("Which spot are you reporting an issue for?");
                    } else {
                        console.warn("Voice assistant speak function not available, offline, or not on client.");
                    }
                }
                break;

            case 'add_bookmark':
                 if (!isAuthenticated || !userId) {
                    if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                         voiceAssistant.current.speak("Please sign in to save locations.");
                    } else {
                         console.warn("Voice assistant speak function not available, offline, or not on client.");
                    }
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
                         if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                             voiceAssistant.current.speak(`Okay, saved "${entities.bookmarkLabel}".`);
                         } else {
                            console.warn("Voice assistant speak function not available, offline, or not on client.");
                         }
                         toast({ title: "Bookmark Added", description: `Saved "${entities.bookmarkLabel}".` });
                     } catch (error: any) {
                         console.error("Error adding bookmark via voice:", error);
                          if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                              voiceAssistant.current.speak(`Sorry, I couldn't save the bookmark. ${error.message}`);
                          } else {
                               console.warn("Voice assistant speak function not available, offline, or not on client.");
                          }
                         toast({ title: "Save Failed", description: error.message, variant: "destructive" });
                     }

                 } else {
                      if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
                           voiceAssistant.current.speak("What label and location do you want to save?");
                      } else {
                           console.warn("Voice assistant speak function not available, offline, or not on client.");
                      }
                 }
                break;

            case 'unknown':
                // Response already spoken by the flow
                break;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locations, pinnedSpot, isAuthenticated, toast, fetchRecommendations, userId, userBookmarks, fetchUserBookmarks, isOnline, isClient]); // Added isClient, removed voiceAssistant as direct dep


   const handleVoiceCommand = useCallback(async (transcript: string) => {
        if (!transcript) return;
        if (!isOnline) { // Don't process if offline
            toast({ title: "Offline", description: "Voice commands require an internet connection.", variant: "destructive"});
            return;
        }
        try {
             // Use state, which should be loaded/cached
             const currentBookmarks = userBookmarks;
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
            if (isOnline && isClient && voiceAssistant.current && voiceAssistant.current.speak) {
               voiceAssistant.current.speak("Sorry, I encountered an error trying to understand that.");
            } else {
                console.warn("Voice assistant speak function not available, offline, or not on client for error reporting.");
            }
        }
    }, [handleVoiceCommandResult, toast, userBookmarks, isOnline, isClient]); // Added isClient, removed voiceAssistant as direct dep


   // --- End Voice Assistant Integration ---


  // Fetch locations - Modified to use cache when offline
   const fetchLocationsData = useCallback(async (forceRefresh = false) => {
     setIsLoadingLocations(true);
     setError(null);
     let fetchedLocations: ParkingLot[] | null = null;
     const cacheKey = 'cachedParkingLotsWithExternal'; // Use a different key to include external
     const cacheTimestampKey = `${cacheKey}Timestamp`;
     const maxCacheAge = isVisible ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 mins active, 1 hour inactive

     // Try loading from cache first unless forceRefresh is true
     if (!forceRefresh && typeof window !== 'undefined') {
         const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
         const cachedData = localStorage.getItem(cacheKey);
         if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < maxCacheAge) {
              try {
                 fetchedLocations = JSON.parse(cachedData);
                 console.log("Using valid cached parking lots.");
              } catch {
                  console.error("Failed to parse cached locations");
                  localStorage.removeItem(cacheKey);
                  localStorage.removeItem(cacheTimestampKey);
              }
         }
     }

     // If no valid cache or forcing refresh, and online, fetch fresh data
     if ((!fetchedLocations || forceRefresh) && isOnline) {
         try {
             console.log("Fetching fresh parking lots...");
              // Pass user context to potentially filter early on backend if needed
             const freshData = await getAvailableParkingLots(userRole || 'User', userId);
             // Update cache if on client
             if (typeof window !== 'undefined') {
                 try {
                     localStorage.setItem(cacheKey, JSON.stringify(freshData));
                     localStorage.setItem(cacheTimestampKey, Date.now().toString());
                     console.log("Cached fresh parking lots.");
                 } catch (e) {
                     console.error("Failed to cache parking lots:", e);
                 }
             }
              // Only update state if data is different to potentially avoid loop
              if (JSON.stringify(freshData) !== JSON.stringify(locations)) {
                 setLocations(freshData);
              }
              fetchedLocations = freshData; // Use fresh data
         } catch (fetchError) {
             console.error("Failed to fetch fresh parking locations:", fetchError);
             // If fetch fails but we had cached data from earlier, keep it
             if (!fetchedLocations) {
                 setError("Could not load parking locations. Please check connection.");
             } else {
                  console.warn("Online fetch failed, continuing with previously cached data.");
                   // Only update state if data is different
                   if (JSON.stringify(fetchedLocations) !== JSON.stringify(locations)) {
                        setLocations(fetchedLocations);
                   }
             }
         }
     } else if (fetchedLocations) {
         // Using cache (either online and cache is fresh, or offline with valid cache)
          // Only update state if data is different
          if (JSON.stringify(fetchedLocations) !== JSON.stringify(locations)) {
                setLocations(fetchedLocations);
          }
     } else if (!isOnline) {
         // Offline and no valid cache
         setError("Offline: Could not load parking data.");
          setLocations([]); // Clear locations if offline and no cache
     }

     // Update selected location ID based on fetched/cached data
     if (fetchedLocations) {
        setSelectedLocationId(prevId => fetchedLocations!.some(loc => loc.id === prevId) ? prevId : null);
     }

     setIsLoadingLocations(false);
     setIsRefreshing(false); // Stop refresh indicator

   }, [isOnline, isVisible, locations, userRole, userId]); // Depend on isOnline, visibility and locations (to compare for changes)

   // Manual refresh handler
   const handleManualRefresh = () => {
       if (!isOnline) {
           toast({ title: "Offline", description: "Cannot refresh data while offline.", variant: "destructive"});
           return;
       }
       setIsRefreshing(true);
       fetchLocationsData(true); // Force fetch fresh data
       fetchUserBookmarks(); // Refresh bookmarks too
       // Recommendations will refresh based on location/bookmark changes
   };

    // Effect for periodic refresh based on visibility and online status
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        const startInterval = () => {
            // Clear existing interval
            if (intervalId) clearInterval(intervalId);

            if (isOnline) {
                const intervalDuration = isVisible ? 30000 : 120000; // 30s active, 2min inactive
                console.log(`Setting location refresh interval to ${intervalDuration / 1000}s (Visible: ${isVisible})`);
                intervalId = setInterval(() => {
                    fetchLocationsData(); // Fetch using cache rules
                    // Optionally refresh bookmarks less frequently
                    // fetchUserBookmarks();
                }, intervalDuration);
            } else {
                console.log("Offline, clearing location refresh interval.");
            }
        };

        startInterval(); // Start interval on mount/dependency change

        // Initial fetch
        fetchLocationsData();

        // Cleanup interval on unmount or when dependencies change
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [fetchLocationsData, isOnline, isVisible]); // Re-run effect if function, online status, or visibility changes


    // Fetch bookmarks when user logs in or initially (respects offline)
    useEffect(() => {
        if (isAuthenticated && userId) {
            fetchUserBookmarks();
        } else {
             setUserBookmarks([]); // Clear bookmarks if logged out
             if (typeof window !== 'undefined') {
                 localStorage.removeItem('cachedUserBookmarks');
             }
        }
    }, [isAuthenticated, userId, fetchUserBookmarks]);


   useEffect(() => {
        // Fetch recommendations after locations and bookmarks are loaded and user is authenticated (respects offline)
        if (!isLoadingLocations && !isLoadingBookmarks && locations.length > 0 && isAuthenticated) {
            fetchRecommendations();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingLocations, isLoadingBookmarks, isAuthenticated, fetchRecommendations]); // Add isLoadingBookmarks

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const handleAuthSuccess = (newUserId: string, name?: string, avatar?: string | null, role?: UserRole | null) => { // Added UserRole type
    login(newUserId, name || `User ${newUserId.substring(0,5)}`, avatar, role || 'User');
    setIsAuthModalOpen(false);
    toast({title: "Authentication Successful"});
    fetchUserBookmarks(); // Fetch bookmarks after login
    fetchLocationsData(true); // Force refetch locations potentially with user context
     // Load favorites from localStorage on login
     if (typeof window !== 'undefined') {
         const prefs = loadUserPreferences(newUserId);
         if (prefs && prefs.favoriteLocations) {
             setFavoriteLocations(prefs.favoriteLocations);
         }
     }
    // Recommendations will be fetched by the useEffect dependency change
  };

  // Logout is handled in profile page or header now

   // Function to simulate pinning car location - now includes coordinates
   const simulatePinCar = async (spotId: string, locationId: string) => {
       setIsPinning(true);
       setPinnedSpot(null);

       const location = locations.find(l => l.id === locationId);
       if (!location) {
           console.error("Cannot pin car: Location details not found for", locationId);
           toast({ title: "Pinning Error", description: "Could not find location details.", variant: "destructive" });
           setIsPinning(false);
           return;
       }

       // In a real app, get spot-specific coordinates if available, otherwise use lot coordinates
       const pinLatitude = location.latitude; // Use lot's latitude as approximation
       const pinLongitude = location.longitude; // Use lot's longitude as approximation

       console.log(`Simulating pinning car location at ${spotId} in ${location.name} (${pinLatitude}, ${pinLongitude})...`);
       await new Promise(resolve => setTimeout(resolve, 1000));

       const pinData: PinnedLocationData = {
            spotId,
            locationId,
            locationName: location.name,
            latitude: pinLatitude,
            longitude: pinLongitude,
            timestamp: Date.now()
       };

       setPinnedSpot(pinData);
       // Cache pinned location for offline access
       if (typeof window !== 'undefined') {
            try {
               localStorage.setItem('pinnedCarLocation', JSON.stringify(pinData));
            } catch (e) {
                console.error("Failed to cache pinned location:", e);
            }
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
                try {
                    const pinData = JSON.parse(cachedPin) as PinnedLocationData;
                     // Check if required coordinates exist
                     if (pinData.latitude && pinData.longitude && Date.now() - pinData.timestamp < maxPinAge) {
                        setPinnedSpot(pinData);
                    } else {
                        localStorage.removeItem('pinnedCarLocation'); // Clear expired or invalid pin
                    }
                } catch {
                     console.error("Failed to parse cached pinned location");
                     localStorage.removeItem('pinnedCarLocation');
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
           // Automatically pin location after successful reservation
           simulatePinCar(spotId, locationId);
           if (userId && isOnline) {
                // awardBadge(userId, 'badge_first_booking'); // Example gamification call - only if online
           }
           // TODO: Add reservation to an offline queue if !isOnline
           if (!isOnline) {
                console.log("Offline: Queuing reservation (Simulation)...", { userId, spotId, locationId });
                // queueReservation({ userId, spotId, locationId, timestamp: Date.now() });
           }
       }
  };

  const clearPinnedLocation = () => {
      setPinnedSpot(null);
       if (typeof window !== 'undefined') {
           localStorage.removeItem('pinnedCarLocation');
       }
      toast({ title: "Pinned Location Cleared" });
  };

  const handleSelectLocation = (locationId: string) => {
      setSelectedLocationId(locationId);
      // Ensure element exists before scrolling
       setTimeout(() => {
            const element = document.getElementById('parking-grid-section');
            element?.scrollIntoView({ behavior: 'smooth' });
       }, 100); // Small delay to allow potential re-renders
  };

   // --- Favorite Location Handling ---
   const toggleFavoriteLocation = (locationId: string) => {
       if (!userId) {
            toast({ title: "Sign In Required", description: "Please sign in to save favorite locations." });
            setIsAuthModalOpen(true);
            return;
        }

       let updatedFavorites: string[];
       if (favoriteLocations.includes(locationId)) {
           updatedFavorites = favoriteLocations.filter(id => id !== locationId);
           toast({ title: "Removed from Favorites", description: locations.find(l => l.id === locationId)?.name });
       } else {
           updatedFavorites = [...favoriteLocations, locationId];
           toast({ title: "Added to Favorites", description: locations.find(l => l.id === locationId)?.name });
       }
       setFavoriteLocations(updatedFavorites);
       saveUserPreferences(userId, { favoriteLocations: updatedFavorites }); // Save preferences (including favorites)
   };

   const favoriteLocationObjects = favoriteLocations
        .map(id => locations.find(loc => loc.id === id))
        .filter((loc): loc is ParkingLot => loc !== undefined);
    // --- End Favorite Location Handling ---

  const getVoiceButtonIcon = () => {
        // Return placeholder or static icon before client-side hydration
        if (!isClient || !voiceAssistant.current) { // Check ref.current
             return <MicOff key="ssr-mic" className="h-5 w-5 text-muted-foreground opacity-50" />;
        }
        // Rest of the logic runs only on the client
        if (!voiceAssistant.current.isSupported || !isOnline) { // Check ref.current
             return <MicOff key="unsupported-mic" className="h-5 w-5 text-muted-foreground opacity-50" />;
        }
        switch (voiceAssistantState) { // Use state directly here
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
                return <Mic key="default-mic" className="h-5 w-5" />;
        }
    };

   const handleVoiceButtonClick = () => {
        if (!isClient || !voiceAssistant.current || !voiceAssistant.current.isSupported || !isOnline) return; // Check ref.current
        // Button now just toggles continuous listening on/off
        if (voiceAssistantState === 'listening' || voiceAssistantState === 'activated') { // Use state
            voiceAssistant.current.stopListening();
        } else {
            voiceAssistant.current.startListening();
        }
   };

    const getVoiceButtonTooltip = () => {
         // Default tooltip for SSR or before client mount
        if (!isClient || !voiceAssistant.current) return "Loading voice assistant..."; // Check ref.current
         if (!isOnline) return "Voice commands unavailable offline";
         if (!voiceAssistant.current.isSupported) return "Voice commands not supported by your browser";
         switch (voiceAssistantState) { // Use state
              case 'activated': return "Say your command...";
              case 'listening': return "Listening for 'Hey Carpso' or command..."; // Updated tooltip
              case 'processing': return "Processing...";
              case 'speaking': return "Speaking...";
              case 'error': return `Error: ${voiceAssistant.current?.error || 'Unknown'}`;
              case 'idle':
              default: return "Start voice command"; // Updated tooltip
         }
    }

    // Function to handle opening external maps for a location
    const openExternalMap = (lot: ParkingLot) => {
        if (lot.latitude && lot.longitude && typeof window !== 'undefined') {
           window.open(`https://www.google.com/maps/search/?api=1&query=${lot.latitude},${lot.longitude}&query_place_id=${lot.id}`, '_blank');
        } else {
            toast({ title: "Location Error", description: "Coordinates not available for this location.", variant: "destructive" });
        }
    };

    // Separate Carpso-managed and external lots for display
    const carpsoManagedLots = locations.filter(loc => loc.isCarpsoManaged);
    const externalLots = locations.filter(loc => !loc.isCarpsoManaged);


  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
       <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
           <h1 className="text-3xl font-bold">Carpso Map</h1>
           <div className="flex items-center gap-2">
                {/* Refresh Button */}
                <Button
                     variant="outline"
                     size="icon"
                     onClick={handleManualRefresh}
                     disabled={isRefreshing || !isOnline}
                     aria-label="Refresh Data"
                     title="Refresh Data"
                >
                    {isRefreshing ? <Loader2 className="h-5 w-5 animate-spin"/> : <RefreshCcw className="h-5 w-5" />}
                </Button>
                {/* Voice Assistant Button */}
                 <Button
                     variant="outline"
                     size="icon"
                     onClick={handleVoiceButtonClick}
                     disabled={!isClient || (voiceAssistant.current && (!voiceAssistant.current.isSupported || voiceAssistantState === 'processing' || voiceAssistantState === 'speaking')) || !isOnline} // Check ref.current
                     aria-label={getVoiceButtonTooltip()}
                     title={getVoiceButtonTooltip()} // Tooltip for desktop
                     className={cn(
                         "transition-opacity", // Added for smoother loading
                         (!isClient || !voiceAssistant.current) && "opacity-50 cursor-not-allowed", // Check ref.current
                         isClient && voiceAssistant.current && (!voiceAssistant.current.isSupported || !isOnline) && "opacity-50 cursor-not-allowed", // Check ref.current
                         isClient && voiceAssistant.current && voiceAssistantState === 'activated' && "border-primary",
                         isClient && voiceAssistant.current && voiceAssistantState === 'listening' && "border-blue-600",
                         isClient && voiceAssistant.current && voiceAssistantState === 'error' && "border-destructive",
                         isClient && voiceAssistant.current && (voiceAssistantState === 'processing' || voiceAssistantState === 'speaking') && "opacity-50 cursor-not-allowed"
                     )}
                 >
                     {getVoiceButtonIcon()}
                 </Button>

               {/* Auth / Profile Button */}
               {!isAuthenticated && (
                    <Button onClick={() => setIsAuthModalOpen(true)}>
                        Sign In / Sign Up
                    </Button>
               )}
           </div>
       </div>
        {/* Voice Assistant Status Indicator */}
        {isClient && voiceAssistant.current && voiceAssistant.current.isSupported && isOnline && voiceAssistantState !== 'idle' && ( // Check ref.current
            <p className="text-sm text-muted-foreground text-center mb-4 italic">
                 {voiceAssistantState === 'activated' && "Say your command..."}
                 {voiceAssistantState === 'listening' && "Listening..."}
                 {voiceAssistantState === 'processing' && "Processing command..."}
                 {voiceAssistantState === 'speaking' && "Speaking..."}
                 {voiceAssistantState === 'error' && `Error: ${voiceAssistant.current?.error || 'Unknown'}`}
            </p>
        )}


       {/* Pinned Location & Map */}
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
                     <p className="text-sm text-primary/90 mb-3">
                        Spot: <span className="font-medium">{pinnedSpot.spotId}</span> at {pinnedSpot.locationName}
                    </p>
                    {/* Google Maps Embed */}
                     <div className="aspect-video w-full overflow-hidden rounded-md border">
                         {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                             <iframe
                                title="Pinned Car Location Map"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${pinnedSpot.latitude},${pinnedSpot.longitude}&zoom=17`} // Use Place mode with coordinates
                            >
                             </iframe>
                         ) : (
                             <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
                                 Google Maps API Key missing. Map cannot be displayed. (Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env)
                             </div>
                         )}
                     </div>
                     {/* Optional: Button to open in Google Maps app */}
                     <Button
                         variant="outline"
                         size="sm"
                         className="mt-3"
                         onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${pinnedSpot.latitude},${pinnedSpot.longitude}`, '_blank')}
                     >
                        <Search className="mr-2 h-4 w-4" /> Open in Google Maps
                    </Button>
                </CardContent>
           </Card>
       )}
        {isPinning && (
             <div className="flex items-center justify-center text-muted-foreground text-sm mb-4">
                <Loader2 className="h-4 w-4 mr-2 animate-spin"/> Pinning car location...
             </div>
        )}

         {/* Favorite Locations Section */}
        {isAuthenticated && favoriteLocationObjects.length > 0 && (
             <Card className="mb-6 border-yellow-500 bg-yellow-500/5">
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-yellow-700">
                         <Star className="h-5 w-5 text-yellow-600 fill-yellow-500" />
                         Your Favorite Locations
                     </CardTitle>
                 </CardHeader>
                 <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {favoriteLocationObjects.map((favLoc) => (
                             <Card key={favLoc.id} className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => handleSelectLocation(favLoc.id)}>
                                  {/* Favorite Toggle Button within the Card */}
                                 <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute top-1 right-1 h-7 w-7 z-10 text-yellow-500 hover:text-yellow-600"
                                      onClick={(e) => {
                                          e.stopPropagation(); // Prevent card click when toggling favorite
                                          toggleFavoriteLocation(favLoc.id);
                                      }}
                                      aria-label={`Remove ${favLoc.name} from favorites`}
                                      title={`Remove ${favLoc.name} from favorites`}
                                 >
                                     <StarOff className="h-4 w-4" />
                                 </Button>
                                 <CardHeader className="pb-2">
                                      <CardTitle className="text-base pr-8">{favLoc.name}</CardTitle> {/* Add padding for button */}
                                      <CardDescription className="text-xs pt-1 flex items-center gap-1">
                                          <MapPin className="h-3 w-3" /> {favLoc.address}
                                      </CardDescription>
                                 </CardHeader>
                                 <CardContent>
                                     {/* Maybe show current availability summary? */}
                                      <Badge variant={favLoc.currentOccupancy === undefined ? 'secondary' : (favLoc.capacity - favLoc.currentOccupancy) > 10 ? 'default' : (favLoc.capacity - favLoc.currentOccupancy) > 0 ? 'secondary' : 'destructive'} className={cn("text-xs", (favLoc.currentOccupancy !== undefined && (favLoc.capacity - favLoc.currentOccupancy) > 10) && "bg-green-600 text-white")}>
                                          {favLoc.currentOccupancy === undefined ? 'Availability N/A' : `${favLoc.capacity - favLoc.currentOccupancy} Spots Free`}
                                      </Badge>
                                 </CardContent>
                             </Card>
                         ))}
                     </div>
                 </CardContent>
             </Card>
         )}


       {/* Recommendations Section (Respects offline state) */}
        {isAuthenticated && !isLoadingLocations && (
            <Card className="mb-6 border-accent bg-accent/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        Recommended Carpso Parking
                    </CardTitle>
                     <CardDescription>Based on your preferences and current conditions. Recommendations focus on Carpso managed/partner locations.</CardDescription>
                     {!isOnline && <CardDescription className="text-destructive text-xs pt-1">(Recommendations may be outdated or unavailable)</CardDescription>}
                </CardHeader>
                <CardContent>
                    {isLoadingRecommendations ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : !isOnline && recommendations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Recommendations require an internet connection.</p>
                    ) : recommendations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recommendations.map((rec) => {
                                const isFavorite = favoriteLocations.includes(rec.lotId);
                                const lot = locations.find(l => l.id === rec.lotId);
                                return (
                                    <Card key={rec.lotId} className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => handleSelectLocation(rec.lotId)}>
                                         {/* Favorite Toggle Button */}
                                        <Button
                                             variant="ghost"
                                             size="icon"
                                             className="absolute top-1 right-1 h-7 w-7 z-10 text-yellow-500 hover:text-yellow-600"
                                             onClick={(e) => {
                                                 e.stopPropagation(); // Prevent card click
                                                 toggleFavoriteLocation(rec.lotId);
                                             }}
                                             aria-label={isFavorite ? `Remove ${rec.lotName} from favorites` : `Add ${rec.lotName} to favorites`}
                                             title={isFavorite ? `Remove ${rec.lotName} from favorites` : `Add ${rec.lotName} to favorites`}
                                             disabled={!isAuthenticated} // Disable if not logged in
                                        >
                                             {isFavorite ? <Star className="h-4 w-4 fill-current" /> : <Star className="h-4 w-4" />}
                                         </Button>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex items-center justify-between pr-8"> {/* Add padding for button */}
                                                {rec.lotName}
                                                {rec.availabilityScore !== undefined && (
                                                    <Badge variant={rec.availabilityScore > 0.7 ? 'default' : rec.availabilityScore > 0.4 ? 'secondary' : 'destructive'} className={cn("text-xs", rec.availabilityScore > 0.7 && "bg-green-600 text-white")}>
                                                        {(rec.availabilityScore * 100).toFixed(0)}% Free
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                             <CardDescription className="text-xs flex items-center gap-1 pt-1">
                                                 <MapPin className="h-3 w-3" /> {lot?.address}
                                                 {rec.estimatedCost !== undefined && ` • ~$${rec.estimatedCost.toFixed(2)}/hr`}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                                                <Sparkles className="h-3 w-3 text-accent mt-0.5 shrink-0" /> {/* Use Sparkles for recommendation reason */}
                                                <span>{rec.reason}</span>
                                            </p>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : isOnline ? ( // Only show "no recommendations" if online and empty
                        <p className="text-sm text-muted-foreground text-center py-4">No specific recommendations available right now. Select a location below.</p>
                    ) : null /* Don't show anything if offline and empty */ }
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
             <CardDescription>Choose a location to view availability or get directions.</CardDescription>
         </CardHeader>
        <CardContent>
          {isLoadingLocations ? (
            <Skeleton className="h-10 w-full" />
          ) : error ? (
             <p className="text-destructive">{error}</p>
          ) : locations.length === 0 && isOnline ? ( // Only show 'no locations' if online and empty
              <p className="text-muted-foreground">No parking locations available.</p>
           ) : locations.length === 0 && !isOnline ? ( // Specific message if offline and empty
               <p className="text-muted-foreground">Offline: No cached parking locations available.</p>
           ) : (
            <Select
              value={selectedLocationId || ""}
              onValueChange={(value) => handleSelectLocation(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a parking location..." />
              </SelectTrigger>
              <SelectContent>
                 {/* Favorites Group */}
                 {favoriteLocationObjects.length > 0 && (
                     <>
                         <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Favorites</div>
                         {favoriteLocationObjects.map((loc) => (
                             <SelectItem key={loc.id} value={loc.id}>
                                  <span className="flex items-center gap-2">
                                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                                      {loc.name} - {loc.address}
                                  </span>
                             </SelectItem>
                         ))}
                         <hr className="my-1" />
                     </>
                 )}
                 {/* Carpso Managed Group */}
                 {carpsoManagedLots.length > 0 && (
                     <>
                         <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Carpso Locations</div>
                         {carpsoManagedLots.map((loc) => (
                           <SelectItem key={loc.id} value={loc.id}>
                              <span className="flex items-center gap-2">
                                 {favoriteLocations.includes(loc.id) && <Star className="h-4 w-4 text-yellow-500" />}
                                 {loc.name} - {loc.address}
                                 <Badge variant="outline" className="ml-auto text-xs">{loc.subscriptionStatus === 'active' ? 'Active' : loc.subscriptionStatus === 'trial' ? 'Trial' : 'Inactive'}</Badge>
                              </span>
                           </SelectItem>
                         ))}
                         <hr className="my-1" />
                     </>
                 )}
                 {/* External Locations Group */}
                  {externalLots.length > 0 && (
                      <>
                         <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Other Locations (via Google)</div>
                         {externalLots.map((loc) => (
                           <SelectItem key={loc.id} value={loc.id}>
                              <span className="flex items-center gap-2">
                                 {favoriteLocations.includes(loc.id) && <Star className="h-4 w-4 text-yellow-500" />}
                                 {loc.name} - {loc.address}
                                  <Badge variant="secondary" className="ml-auto text-xs">External</Badge>
                              </span>
                           </SelectItem>
                         ))}
                      </>
                  )}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

       {/* Display Area based on Selection */}
       {selectedLocation ? (
           selectedLocation.isCarpsoManaged ? (
                // Render ParkingLotGrid for Carpso managed locations
                <div id="parking-grid-section">
                    <ParkingLotGrid
                    key={selectedLocation.id} // Key ensures remount on location change
                    location={selectedLocation}
                    onSpotReserved={handleSpotReserved}
                    userTier={userRole === 'PremiumUser' || userRole === 'Premium' ? 'Premium' : 'Basic'}
                    />
                </div>
           ) : (
               // Render info card for External locations
               <Card id="parking-grid-section" className="mb-8 border-blue-500 bg-blue-500/5">
                   <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-600" />
                            {selectedLocation.name} (External)
                         </CardTitle>
                       <CardDescription>{selectedLocation.address}</CardDescription>
                   </CardHeader>
                   <CardContent>
                       <p className="text-sm text-muted-foreground mb-4">
                           This is an external parking location identified via Google Maps. Real-time spot availability and Carpso reservations are not available here.
                       </p>
                       {/* Add Google Maps link */}
                       <Button variant="outline" onClick={() => openExternalMap(selectedLocation)}>
                           <ExternalLink className="mr-2 h-4 w-4" /> Open in Google Maps
                       </Button>
                   </CardContent>
               </Card>
           )
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

        <BottomNavBar
             // Props now passed from context automatically within BottomNavBar
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

// Assuming VoiceAssistantResult is exported from the hook
interface VoiceAssistantResult {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isActivated: boolean;
  state: VoiceAssistantState;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
  isSupported: boolean;
  error: string | null;
}
