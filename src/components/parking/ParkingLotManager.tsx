// src/components/parking/ParkingLotManager.tsx
'use client';

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import ParkingLotGrid from './ParkingLotGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot';
import { getAvailableParkingLots } from '@/services/parking-lot';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2, Sparkles, Star, Mic, MicOff, CheckSquare, Square, AlertTriangle, BookMarked, WifiOff, RefreshCcw, StarOff, Search, ExternalLink, Building, Phone, Globe as GlobeIcon, LocateFixed } from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider';
import BottomNavBar from '@/components/layout/BottomNavBar';
import { recommendParking, RecommendParkingOutput } from '@/ai/flows/recommend-parking-flow';
import { getUserGamification, getUserBookmarks, addBookmark as addUserBookmark, UserBookmark, saveUserPreferences, loadUserPreferences, UserRole } from '@/services/user-service';
import { calculateEstimatedCost, ParkingRecord } from '@/services/pricing-service';
import { useVoiceAssistant, VoiceAssistantState } from '@/hooks/useVoiceAssistant';
import { processVoiceCommand, ProcessVoiceCommandOutput } from '@/ai/flows/process-voice-command-flow';
import { cn } from '@/lib/utils';
import ReportIssueModal from '@/components/profile/ReportIssueModal';
import { useVisibilityChange } from '@/hooks/useVisibilityChange';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ParkingLotMap from '@/components/map/ParkingLotMap';


interface PinnedLocationData {
    spotId: string;
    locationId: string;
    locationName: string;
    latitude: number;
    longitude: number;
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
      isOnline,
  } = useContext(AppStateContext)!;

  const [locations, setLocations] = useState<ParkingLot[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pinnedSpot, setPinnedSpot] = useState<PinnedLocationData | null>(null);
  const [isPinning, setIsPinning] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendParkingOutput['recommendations']>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [userPreferredServices, setUserPreferredServices] = useState<ParkingLotService[]>([]);
  const [userHistorySummary, setUserHistorySummary] = useState<string>("Prefers Downtown Garage, parks mostly weekday mornings.");
  const [userBookmarks, setUserBookmarks] = useState<UserBookmark[]>([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState<string[]>([]);
  const { toast, dismiss } = useToast();
  const [offlineToastId, setOfflineToastId] = useState<string | null>(null);
  const [reportingReservation, setReportingReservation] = useState<ParkingRecord | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const isVisibleCtx = useVisibilityChange();
  const [currentVoiceState, setCurrentVoiceState] = useState<VoiceAssistantState>('idle');
  const [destinationForRecommendation, setDestinationForRecommendation] = useState<{ label?: string, address?: string, latitude?: number, longitude?: number } | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  const fetchLocationsData = useCallback(async (forceRefresh = false) => {
    setIsLoadingLocations(true);
    setError(null);

    const cacheKey = 'cachedParkingLotsWithExternal_v2';
    const cacheTimestampKey = `${cacheKey}Timestamp`;
    const maxCacheAge = isVisibleCtx ? 5 * 60 * 1000 : 60 * 60 * 1000;
    let allLots: ParkingLot[] = [];

    if (!forceRefresh && typeof window !== 'undefined') {
        const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < maxCacheAge) {
             try {
                allLots = JSON.parse(cachedData);
                console.log("Using valid cached parking lots.");
             } catch (parseError: any) {
                 console.error("Failed to parse cached locations, will fetch fresh.", parseError.message);
                 localStorage.removeItem(cacheKey);
                 localStorage.removeItem(cacheTimestampKey);
             }
        }
    }

    const needsServerFetch = allLots.length === 0 || forceRefresh;

    if (needsServerFetch && isOnline) {
        try {
            console.log("Fetching fresh parking lots (including external simulation)...");
            const fetchedLots = await getAvailableParkingLots(userRole || 'User', userId, true);
            allLots = fetchedLots;
            if (typeof window !== 'undefined') {
                localStorage.setItem(cacheKey, JSON.stringify(allLots));
                localStorage.setItem(cacheTimestampKey, Date.now().toString());
            }
        } catch (fetchError: any) {
            console.error("Online fetch failed:", fetchError.message);
            if (allLots.length === 0) setError("Could not load parking locations. Please check connection.");
            else console.warn("Online fetch failed, continuing with previously cached data if any.");
        }
    } else if (needsServerFetch && !isOnline) {
        setError("Offline: Could not load parking data. No cached data available.");
    }

    setLocations(allLots);
    setIsLoadingLocations(false);
    setIsRefreshing(false);
  }, [isOnline, isVisibleCtx, userRole, userId]);

  const fetchUserBookmarks = useCallback(async () => {
    if (typeof window !== 'undefined') {
       const cachedBookmarks = localStorage.getItem('cachedUserBookmarks');
       if (cachedBookmarks) {
           try { setUserBookmarks(JSON.parse(cachedBookmarks)); }
           catch (parseError: any) { console.error("Failed to parse cached bookmarks", parseError); }
       }
    }
    if (!isAuthenticated || !userId || !isOnline) {
        if (!isAuthenticated) setUserBookmarks([]);
        return;
    }
    setIsLoadingBookmarks(true);
    try {
        const bookmarksData = await getUserBookmarks(userId);
        setUserBookmarks(bookmarksData);
        if (typeof window !== 'undefined') {
             try { localStorage.setItem('cachedUserBookmarks', JSON.stringify(bookmarksData)); }
             catch (cacheError: any) { console.error("Failed to cache bookmarks:", cacheError); }
        }
    } catch (err: any) {
        console.error("Failed to fetch user bookmarks:", err);
        if (isOnline) toast({ title: "Error", description: "Could not refresh saved locations.", variant: "destructive" });
    } finally {
        setIsLoadingBookmarks(false);
    }
  }, [isAuthenticated, userId, isOnline, toast]);

  const fetchRecommendations = useCallback(async (destinationLabel?: string, destinationAddress?: string, destLat?: number, destLng?: number) => {
    if (!isAuthenticated || !userId || locations.length === 0 || !isOnline) {
        setRecommendations([]);
        setIsLoadingRecommendations(false);
        return;
    }
    setIsLoadingRecommendations(true);
    setRecommendations([]);
    try {
        const currentCoords = userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng } : { latitude: -15.4167, longitude: 28.2833 };
        const currentBookmarks = userBookmarks;

         let resolvedDestinationLabel = destinationLabel;
         let resolvedDestinationAddress = destinationAddress;
         let resolvedDestLat = destLat;
         let resolvedDestLng = destLng;

         if (destinationLabel) {
              const matchedBookmark = currentBookmarks.find(bm => bm.label.toLowerCase() === destinationLabel.toLowerCase());
             if (matchedBookmark) {
                 resolvedDestLat = matchedBookmark.latitude;
                 resolvedDestLng = matchedBookmark.longitude;
                 resolvedDestinationAddress = matchedBookmark.address || resolvedDestinationAddress;
                 console.log(`Using coordinates from bookmark "${matchedBookmark.label}" for recommendation.`);
             } else {
                 console.log(`Destination label "${destinationLabel}" not found in bookmarks.`);
                 if(!destinationAddress) resolvedDestinationAddress = destinationLabel;
             }
         }

         let nearbyLotsJson = "[]";
         try {
             const carpsoLocations = locations.filter(loc => loc.isCarpsoManaged);
              const locationsWithPrice = await Promise.all(carpsoLocations.map(async loc => {
                 const capacity = typeof loc.capacity === 'number' ? loc.capacity : 0;
                 const currentOccupancy = typeof loc.currentOccupancy === 'number' ? loc.currentOccupancy : 0;
                 const { cost: estimatedCost } = await calculateEstimatedCost(loc, 60, userId, userRole === 'Premium' ? 'Premium' : 'Basic');
                 return { id: loc.id, name: loc.name, address: loc.address, capacity: capacity, currentOccupancy: currentOccupancy, services: loc.services, estimatedCost, latitude: loc.latitude, longitude: loc.longitude };
             }));
             nearbyLotsJson = JSON.stringify(locationsWithPrice);
         } catch (jsonError: any) {
             console.error("Error preparing nearbyLots JSON for recommendation:", jsonError);
         }

         let bookmarksJson = "[]";
         try {
             bookmarksJson = JSON.stringify(currentBookmarks);
         } catch (jsonError: any) {
              console.error("Error preparing bookmarks JSON for recommendation:", jsonError);
         }


        const input = {
            userId: userId,
            currentLatitude: currentCoords.latitude,
            currentLongitude: currentCoords.longitude,
            destinationLabel: resolvedDestinationLabel,
            destinationAddress: resolvedDestinationAddress,
            destinationLatitude: resolvedDestLat,
            destinationLongitude: resolvedDestLng,
            preferredServices: userPreferredServices,
            nearbyParkingLots: nearbyLotsJson,
            userHistorySummary: userHistorySummary,
            userBookmarks: bookmarksJson,
        };

        console.log("Calling recommendParking with input:", JSON.stringify(input, null, 2));
        const result = await recommendParking(input);
        console.log("Received recommendations:", result);
        setRecommendations(result.recommendations || []);

    } catch (err: any) {
        console.error("Failed to fetch recommendations:", err);
        if (isOnline) toast({
            title: "Recommendation Error",
            description: "Could not fetch personalized parking recommendations. Please try again later.",
            variant: "destructive",
        });
        setRecommendations([]);
    } finally {
        setIsLoadingRecommendations(false);
    }
  }, [isAuthenticated, userId, locations, userPreferredServices, userHistorySummary, toast, userRole, userBookmarks, isOnline, userLocation]);

  const loadProfileData = useCallback(async (forceRefresh = false) => {
    if (!userId) return;
    // This function is primarily for user profile data if needed on this page,
    // but currently, ParkingLotManager mainly fetches parking lots and recommendations.
    // If user-specific data like preferredServices or historySummary needs to be fetched on mount,
    // it would happen here. For now, they are hardcoded or derived.
    console.log("loadProfileData called - currently a placeholder in ParkingLotManager for profile-specific data if needed.");
  }, [userId, userRole, isOnline, toast, fetchLocationsData]); // Added fetchLocationsData if it's meant to be part of profile loading


  const handleVoiceCommandResult = useCallback(async (commandOutput: ProcessVoiceCommandOutput, speakFn: (text: string) => void) => {
    const { intent, entities, responseText } = commandOutput;
    console.log("Processed Intent:", intent);
    console.log("Processed Entities:", entities);

    if (isOnline && isClient && speakFn) {
         speakFn(responseText);
    } else {
         console.warn("Voice assistant speak function not available, offline, or not on client.");
    }

    switch (intent) {
        case 'find_parking':
            if (isOnline) {
                 if (entities.destination) {
                     toast({ title: "Finding Parking", description: `Looking for parking near ${entities.destination}. Recommendations updated.` });
                     const currentBookmarks = userBookmarks;
                     const matchedBookmark = currentBookmarks.find(bm => bm.label.toLowerCase() === entities.destination?.toLowerCase());
                     if (matchedBookmark) {
                          setDestinationForRecommendation({ label: entities.destination, address: matchedBookmark.address, latitude: matchedBookmark.latitude, longitude: matchedBookmark.longitude });
                          await fetchRecommendations(entities.destination, matchedBookmark.address, matchedBookmark.latitude, matchedBookmark.longitude);
                     } else {
                          setDestinationForRecommendation({ label: entities.destination, address: entities.destination });
                          await fetchRecommendations(entities.destination, entities.destination);
                     }
                 } else {
                     toast({ title: "Finding Parking", description: `Showing general recommendations.` });
                     setDestinationForRecommendation(null);
                     await fetchRecommendations();
                 }
            } else {
                 toast({ title: "Offline", description: "Recommendations require an internet connection.", variant: "destructive"});
            }
            break;
        case 'reserve_spot':
            if (entities.spotId) {
                const locationForSpot = locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id));
                if (locationForSpot) {
                    setSelectedLocationId(locationForSpot.id);
                    toast({ title: "Action Required", description: `Navigating to ${locationForSpot.name}. Please confirm reservation for ${entities.spotId} on screen.` });
                     setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 500);
                     console.warn(`Need mechanism to auto-open reservation dialog for ${entities.spotId}`);
                } else {
                     let msg = `Sorry, I couldn't identify the location for spot ${entities.spotId}.`;
                     if (!locations.find(loc => entities.spotId?.startsWith(loc.id))) {
                          msg += " It might be an external parking lot which doesn't support reservations through Carpso.";
                     }
                     if (isOnline && isClient && speakFn) speakFn(msg);
                     else console.warn("Voice assistant speak function not available, offline, or not on client.");
                }
            } else {
                if (isOnline && isClient && speakFn) speakFn("Sorry, I didn't catch the spot ID you want to reserve. Please try again.");
                else console.warn("Voice assistant speak function not available, offline, or not on client.");
            }
            break;
        case 'check_availability':
            if (entities.spotId) {
                const locationForSpot = locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id));
                 if (locationForSpot) {
                     setSelectedLocationId(locationForSpot.id);
                     toast({ title: "Checking Availability", description: `Checking status for ${entities.spotId} in ${locationForSpot.name}. See grid below.` });
                     setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 500);
                      if (!locationForSpot.isCarpsoManaged) {
                          if (isOnline && isClient && speakFn) speakFn(`I can show you ${locationForSpot.name}, but real-time spot availability isn't available for this external location.`);
                          else console.warn("Voice assistant speak function not available, offline, or not on client.");
                     }
                } else {
                      if (isOnline && isClient && speakFn) speakFn(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                      else console.warn("Voice assistant speak function not available, offline, or not on client.");
                 }
             } else if (entities.locationId) {
                 const locationByIdOrName = locations.find(loc => loc.id === entities.locationId || loc.name === entities.locationId);
                 if (locationByIdOrName) {
                     setSelectedLocationId(locationByIdOrName.id);
                     const available = locationByIdOrName.isCarpsoManaged ? (locationByIdOrName.capacity - (locationByIdOrName.currentOccupancy ?? 0)) : undefined;
                     if (isOnline && isClient && speakFn) {
                         if (available !== undefined) speakFn(`Okay, ${locationByIdOrName.name} currently has about ${available} spots available.`);
                         else speakFn(`Okay, showing ${locationByIdOrName.name}. Real-time availability data isn't available for this external location.`);
                     } else console.warn("Voice assistant speak function not available, offline, or not on client.");
                 } else {
                      if (isOnline && isClient && speakFn) speakFn(`Sorry, I couldn't find the location ${entities.locationId}.`);
                      else console.warn("Voice assistant speak function not available, offline, or not on client.");
                 }
             } else {
                if (isOnline && isClient && speakFn) speakFn("Which spot or location would you like me to check?");
                else console.warn("Voice assistant speak function not available, offline, or not on client.");
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
                  const currentBookmarks = userBookmarks;
                  const matchedBookmark = currentBookmarks.find(bm => bm.label.toLowerCase() === entities.destination?.toLowerCase());
                  if (matchedBookmark) {
                     targetLat = matchedBookmark.latitude;
                     targetLon = matchedBookmark.longitude;
                     targetName = matchedBookmark.label;
                     console.log(`Getting directions to bookmark: ${targetName}`);
                  } else {
                      const locationByIdOrName = locations.find(loc => loc.id === entities.destination || loc.name === entities.destination);
                      if (locationByIdOrName) {
                           targetLat = locationByIdOrName.latitude;
                           targetLon = locationByIdOrName.longitude;
                           targetName = locationByIdOrName.name;
                           console.log(`Getting directions to parking lot: ${targetName}`);
                      } else {
                           console.log(`Cannot resolve directions target: ${targetName}. Geocoding needed.`);
                      }
                  }

                  if (targetLat && targetLon) {
                      toast({ title: "Getting Directions", description: `Opening map directions for ${targetName}...` });
                      if (typeof window !== 'undefined') window.open(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLon}`, '_blank');
                  } else {
                       if (isOnline && isClient && speakFn) speakFn(`Sorry, I couldn't find or get coordinates for ${targetName}.`);
                       else console.warn("Voice assistant speak function not available, offline, or not on client.");
                  }
             } else if (pinnedSpot) {
                  toast({ title: "Getting Directions", description: `Opening map directions to your pinned car at ${pinnedSpot.spotId}...` });
                  if (typeof window !== 'undefined' && pinnedSpot.latitude && pinnedSpot.longitude) window.open(`https://www.google.com/maps/dir/?api=1&destination=${pinnedSpot.latitude},${pinnedSpot.longitude}`, '_blank');
             } else {
                  if (isOnline && isClient && speakFn) speakFn("Where would you like directions to?");
                  else console.warn("Voice assistant speak function not available, offline, or not on client.");
             }
            break;
        case 'report_issue':
            if (entities.spotId) {
                const locationForSpot = locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id));
                 if (locationForSpot && isAuthenticated) {
                     const mockReservation: ParkingRecord = {
                         recordId: `rep_${entities.spotId}`,
                         spotId: entities.spotId,
                         locationId: locationForSpot.id,
                         lotName: locationForSpot.name,
                         startTime: new Date().toISOString(),
                         cost: 0,
                         status: 'Active'
                     };
                     setReportingReservation(mockReservation);
                     setIsReportModalOpen(true);
                 } else if (!isAuthenticated) {
                      if (isOnline && isClient && speakFn) speakFn("Please sign in to report an issue.");
                      else console.warn("Voice assistant speak function not available, offline, or not on client.");
                      setIsAuthModalOpen(true);
                 } else {
                      let msg = `Sorry, I couldn't identify the location for spot ${entities.spotId}.`;
                      if (!locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id))) msg += " You can only report issues for Carpso-managed locations.";
                      if (isOnline && isClient && speakFn) speakFn(msg);
                      else console.warn("Voice assistant speak function not available, offline, or not on client.");
                 }
            } else {
                if (isOnline && isClient && speakFn) speakFn("Which spot are you reporting an issue for?");
                else console.warn("Voice assistant speak function not available, offline, or not on client.");
            }
            break;
        case 'add_bookmark':
             if (!isAuthenticated || !userId) {
                if (isOnline && isClient && speakFn) speakFn("Please sign in to save locations.");
                else console.warn("Voice assistant speak function not available, offline, or not on client.");
                setIsAuthModalOpen(true);
                break;
             }
              if (!isOnline) {
                  toast({ title: "Offline", description: "Cannot add bookmarks while offline.", variant: "destructive" });
                  break;
              }
             if (entities.bookmarkLabel) {
                 let lat: number | undefined;
                 let lon: number | undefined;
                 let addr: string | undefined;
                 if (entities.bookmarkLocation?.toLowerCase().includes('current') || entities.bookmarkLocation?.toLowerCase().includes('here')) {
                     if (userLocation) {
                        lat = userLocation.lat;
                        lon = userLocation.lng;
                        addr = "Current Location (Detected)";
                     } else {
                         if(isOnline && isClient && speakFn) speakFn("Sorry, I can't get your current location to save it. Please try again or provide an address.");
                         else console.warn("Voice assistant speak function not available, offline, or not on client.");
                         toast({ title: "Location Error", description: "Could not get current location for bookmark.", variant: "destructive"});
                         break;
                     }
                 }
                 else addr = entities.bookmarkLocation;

                 try {
                     await addUserBookmark(userId, { label: entities.bookmarkLabel, address: addr, latitude: lat, longitude: lon });
                     await fetchUserBookmarks();
                     if (isOnline && isClient && speakFn) speakFn(`Okay, saved "${entities.bookmarkLabel}".`);
                     else console.warn("Voice assistant speak function not available, offline, or not on client.");
                     toast({ title: "Bookmark Added", description: `Saved "${entities.bookmarkLabel}".` });
                 } catch (error: any) {
                     console.error("Error adding bookmark via voice:", error);
                      if (isOnline && isClient && speakFn) speakFn(`Sorry, I couldn't save the bookmark. ${error.message}`);
                      else console.warn("Voice assistant speak function not available, offline, or not on client.");
                     toast({ title: "Save Failed", description: error.message, variant: "destructive" });
                 }
             } else {
                  if (isOnline && isClient && speakFn) speakFn("What label and location do you want to save?");
                  else console.warn("Voice assistant speak function not available, offline, or not on client.");
             }
            break;
        case 'unknown':
            break;
    }
  }, [locations, pinnedSpot, isAuthenticated, toast, userId, userBookmarks, isOnline, isClient, fetchUserBookmarks, userLocation, fetchRecommendations]);


  const { startListening, stopListening, speak, isSupported: isVoiceSupported, error: voiceError, state: liveVoiceState } = useVoiceAssistant({
      onCommand: (transcript) => handleVoiceCommand(transcript, speak),
      onStateChange: (newState) => {
          setCurrentVoiceState(newState);
      }
   });

   const handleVoiceCommand = useCallback(async (transcript: string, speakFn: (text: string) => void) => {
    if (!isOnline) {
         toast({ title: "Offline", description: "Voice commands require an internet connection.", variant: "destructive" });
         return;
    }
    let bookmarksString: string | undefined = undefined;
    try {
        bookmarksString = JSON.stringify(userBookmarks);
    } catch (jsonError: any) {
        console.error("Error stringifying bookmarks for voice command:", jsonError.message);
    }
    console.log("Processing voice command:", transcript);
    try {
         const commandOutput = await processVoiceCommand({ transcript, userBookmarks: bookmarksString });
         handleVoiceCommandResult(commandOutput, speakFn);
    } catch(error: any) {
        console.error("Error in processVoiceCommand flow:", error.message);
        let errorMsg = "Sorry, I couldn't process that. Please try again.";
        if (error.message && error.message.includes('overloaded')) {
             errorMsg = "The AI service is a bit busy right now. Please try your command again in a moment.";
        }
        if (isOnline && isClient && speakFn) {
            speak(errorMsg);
        } else {
            toast({ title: "Voice Command Error", description: errorMsg, variant: "destructive" });
        }
    }
  }, [isOnline, toast, userBookmarks, isClient, speak, handleVoiceCommandResult]);


  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLocation);
          setGeolocationError(null);
        },
        (error) => {
          console.error("Error getting user location:", error);
          let message = `Error getting location: ${error.message}. Please ensure location services are enabled.`;
          if (error.code === error.PERMISSION_DENIED) {
            message = "Location access denied. Please enable it in your browser settings for full functionality.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = "Location information is unavailable at the moment.";
          } else if (error.code === error.TIMEOUT) {
            message = "Getting location timed out. Please try again.";
          }
          setGeolocationError(message);
          setUserLocation(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      const noGeoMessage = "Geolocation is not supported by this browser.";
      setGeolocationError(noGeoMessage);
      console.warn(noGeoMessage);
    }
  }, []);


   useEffect(() => {
       let currentOfflineToastId: string | null = null;
       if (!isOnline && isClient) {
           if (offlineToastId) dismiss(offlineToastId);
           const { id } = toast({
               title: "Offline Mode",
               description: "App functionality is limited. Displaying cached data.",
               variant: "destructive",
               duration: Infinity,
               action: <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry Connection</Button>,
           });
           setOfflineToastId(id);
           currentOfflineToastId = id;
       } else if (isOnline && offlineToastId && isClient) {
           dismiss(offlineToastId);
           setOfflineToastId(null);
           toast({ title: "Back Online", description: "Connection restored. Syncing data...", duration: 3000 });
           fetchLocationsData(true);
           fetchUserBookmarks();
       }
       return () => {
           if (currentOfflineToastId) dismiss(currentOfflineToastId);
       };
   }, [isOnline, isClient, toast, dismiss, fetchUserBookmarks, fetchLocationsData]);


  const handleManualRefresh = () => {
      if (!isOnline) {
          toast({ title: "Offline", description: "Cannot refresh data while offline.", variant: "destructive"});
          return;
      }
      setIsRefreshing(true);
      fetchLocationsData(true);
      fetchUserBookmarks();
      if (isAuthenticated && userId) {
          setTimeout(() => fetchRecommendationsRef.current(destinationForRecommendation?.label, destinationForRecommendation?.address, destinationForRecommendation?.latitude, destinationForRecommendation?.longitude), 500);
      }
  };

   useEffect(() => {
       let intervalId: NodeJS.Timeout | null = null;
       const startInterval = () => {
           if (intervalId) clearInterval(intervalId);
           if (isOnline) {
               const intervalDuration = isVisibleCtx ? 30000 : 120000;
               console.log(`Setting location refresh interval to ${intervalDuration / 1000}s (Visible: ${isVisibleCtx})`);
               intervalId = setInterval(() => fetchLocationsData(), intervalDuration);
           } else {
               console.log("Offline, clearing location refresh interval.");
           }
       };

       fetchLocationsData();
       startInterval();
       return () => { if (intervalId) clearInterval(intervalId); };
   }, [isOnline, isVisibleCtx, fetchLocationsData]);

   useEffect(() => {
       if (isAuthenticated && userId) {
           fetchUserBookmarks();
       } else {
            setUserBookmarks([]);
            if (typeof window !== 'undefined') localStorage.removeItem('cachedUserBookmarks');
       }
   }, [isAuthenticated, userId, isOnline, fetchUserBookmarks]);

   const fetchRecommendationsRef = useRef(fetchRecommendations);
   useEffect(() => {
     fetchRecommendationsRef.current = fetchRecommendations;
   }, [fetchRecommendations]);

  useEffect(() => {
       if (!isLoadingLocations && !isLoadingBookmarks && locations.length > 0 && isAuthenticated && userId) {
           fetchRecommendationsRef.current(destinationForRecommendation?.label, destinationForRecommendation?.address, destinationForRecommendation?.latitude, destinationForRecommendation?.longitude);
       }
   }, [isLoadingLocations, isLoadingBookmarks, isAuthenticated, userId, locations.length, destinationForRecommendation]);


    useEffect(() => {
       setCurrentVoiceState(liveVoiceState);
    }, [liveVoiceState]);

  useEffect(() => {
      setIsClient(true);
      if (userId && typeof window !== 'undefined') {
            const prefs = loadUserPreferences(userId);
            if (prefs && prefs.favoriteLocations) {
                setFavoriteLocations(prefs.favoriteLocations);
            }
       }
  }, [userId]);

   useEffect(() => {
       if (isClient && voiceError) {
           toast({
               title: "Voice Assistant Error",
               description: voiceError,
               variant: "destructive",
               duration: 4000
           });
       }
   }, [isClient, voiceError, toast]);

   useEffect(() => {
    if (locations.length > 0) {
        const currentSelectionValid = locations.some(loc => loc.id === selectedLocationId);
        if (!currentSelectionValid || !selectedLocationId) {
            const firstFavorite = favoriteLocations.find(favId => locations.some(loc => loc.id === favId));
            const firstCarpso = locations.find(l => l.isCarpsoManaged);
            const newSelection = firstFavorite || (firstCarpso ? firstCarpso.id : locations[0]?.id);

            if (newSelection) {
                 setSelectedLocationId(newSelection);
            }
        }
    }
  }, [locations, selectedLocationId, favoriteLocations]);

  useEffect(() => {
    const selectedLoc = locations.find(l => l.id === selectedLocationId);
    if (selectedLoc) {
        setMapCenter({ lat: selectedLoc.latitude, lng: selectedLoc.longitude });
    } else if (userLocation && !selectedLocationId) {
        setMapCenter(userLocation);
    } else if (!selectedLocationId && locations.length === 0 && !userLocation) {
         setMapCenter({lat: -15.4167, lng: 28.2833});
    }
  }, [selectedLocationId, locations, userLocation]);


 const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

 const handleAuthSuccess = (newUserId: string, name?: string, avatar?: string | null, role?: UserRole | null) => {
   login(newUserId, name || `User ${newUserId.substring(0,5)}`, avatar, role || 'User');
   setIsAuthModalOpen(false);
   toast({title: "Authentication Successful"});
   fetchUserBookmarks();
   fetchLocationsData(true);
    if (typeof window !== 'undefined') {
        const prefs = loadUserPreferences(newUserId);
        if (prefs && prefs.favoriteLocations) {
            setFavoriteLocations(prefs.favoriteLocations);
        } else {
            setFavoriteLocations([]);
        }
    }
 };

  const simulatePinCar = async (spotId: string, locationId: string) => {
      setIsPinning(true);
      setPinnedSpot(null);
      const locationToPin = locations.find(l => l.id === locationId);
      if (!locationToPin) {
          console.error("Cannot pin car: Location details not found for", locationId);
          toast({ title: "Pinning Error", description: "Could not find location details.", variant: "destructive" });
          setIsPinning(false);
          return;
      }
      const pinLatitude = typeof locationToPin.latitude === 'number' ? locationToPin.latitude : 0;
      const pinLongitude = typeof locationToPin.longitude === 'number' ? locationToPin.longitude : 0;

      console.log(`Simulating pinning car location at ${spotId} in ${locationToPin.name} (${pinLatitude}, ${pinLongitude})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pinData: PinnedLocationData = {
          spotId,
          locationId,
          locationName: locationToPin.name,
          latitude: pinLatitude,
          longitude: pinLongitude,
          timestamp: Date.now()
      };
      setPinnedSpot(pinData);
      if (typeof window !== 'undefined') {
           try { localStorage.setItem('pinnedCarLocation', JSON.stringify(pinData)); }
           catch (cacheError: any) { console.error("Failed to cache pinned location:", cacheError.message); }
      }

      setIsPinning(false);
      toast({
        title: "Car Location Pinned",
        description: `Your car's location at ${spotId} (${locationToPin?.name || locationId}) has been temporarily saved.`,
      });
  };

   useEffect(() => {
       if (typeof window !== 'undefined') {
           const cachedPin = localStorage.getItem('pinnedCarLocation');
           const maxPinAge = 6 * 60 * 60 * 1000;
           if (cachedPin) {
               try {
                   const pinData = JSON.parse(cachedPin) as PinnedLocationData;
                    if (typeof pinData.latitude === 'number' && typeof pinData.longitude === 'number' && Date.now() - pinData.timestamp < maxPinAge) {
                        setPinnedSpot(pinData);
                    } else {
                        localStorage.removeItem('pinnedCarLocation');
                    }
               } catch (parseError: any){
                    console.error("Failed to parse cached pinned location", parseError.message);
                    localStorage.removeItem('pinnedCarLocation');
               }
           }
       }
   }, []);


 const clearPinnedLocation = () => {
     setPinnedSpot(null);
      if (typeof window !== 'undefined') localStorage.removeItem('pinnedCarLocation');
     toast({ title: "Pinned Location Cleared" });
 };

 const handleSelectLocation = (locationId: string) => {
     setSelectedLocationId(locationId);
     setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
 };

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
      saveUserPreferences(userId, { favoriteLocations: updatedFavorites });
  };

  const favoriteLocationObjects = favoriteLocations.map(id => locations.find(loc => loc.id === id)).filter((loc): loc is ParkingLot => loc !== undefined);


 const getVoiceButtonIcon = () => {
     if (!isClient || !isOnline) return <MicOff key="disabled-mic-offline" className="h-5 w-5 text-muted-foreground opacity-50" />;
     if (!isVoiceSupported) return <MicOff key="disabled-mic-notsupported" className="h-5 w-5 text-muted-foreground opacity-50" />;

     switch (currentVoiceState) {
          case 'activated': return <CheckSquare key="activated" className="h-5 w-5 text-green-600 animate-pulse" />;
         case 'listening': return <Square key="listening" className="h-5 w-5 text-blue-600 animate-pulse" />;
         case 'processing': return <Loader2 key="loader" className="h-5 w-5 animate-spin" />;
         case 'speaking': return <Mic key="speaking" className="h-5 w-5 text-purple-600" />;
         case 'error': return <MicOff key="error-mic" className="h-5 w-5 text-destructive" />;
         case 'idle': default: return <Mic key="default-mic" className="h-5 w-5" />;
     }
 };

  const handleVoiceButtonClick = () => {
       if (!isClient || !isVoiceSupported || !isOnline) return;
       if (currentVoiceState === 'listening' || currentVoiceState === 'activated') stopListening();
       else startListening();
  };

   const getVoiceButtonTooltip = () => {
       if (!isClient) return "Loading voice assistant...";
        if (!isOnline) return "Voice commands unavailable offline";
        if (!isVoiceSupported) return "Voice commands not supported by your browser";
        switch (currentVoiceState) {
             case 'activated': return "Say your command...";
             case 'listening': return "Listening for 'Hey Carpso' or command...";
             case 'processing': return "Processing...";
             case 'speaking': return "Speaking...";
             case 'error': return `Error: ${voiceError || 'Unknown'}`;
             case 'idle': default: return "Start voice command";
        }
   };

   const openExternalMap = (lot: ParkingLot) => {
       if (lot.latitude && lot.longitude && typeof window !== 'undefined') {
           const query = lot.id.startsWith('g_place_') ? `?api=1&query_place_id=${lot.id}` : `?api=1&query=${lot.latitude},${lot.longitude}`;
           window.open(`https://www.google.com/maps/search/${query}`, '_blank');
       } else {
           toast({ title: "Location Error", description: "Coordinates not available for this location.", variant: "destructive" });
       }
   };

   const carpsoManagedLots = locations.filter(loc => loc.isCarpsoManaged);
   const externalLots = locations.filter(loc => !loc.isCarpsoManaged);


  const handleSpotReserved = (spotId: string, locationId: string) => {
    console.log(`Spot ${spotId} at ${locationId} reserved. Simulating car pin.`);
    simulatePinCar(spotId, locationId);
    fetchLocationsData(true);
  };

   return (
     <div className="container py-8 px-4 md:px-6 lg:px-8">
       {/* Header and Auth Section */}
       <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
           <h1 className="text-3xl font-bold">Home</h1>
           <div className="flex items-center gap-2">
               <Button
                   variant="outline" size="icon" onClick={handleManualRefresh} disabled={isRefreshing || !isOnline}
                   aria-label="Refresh Data" title="Refresh Data"
               >
                   {isRefreshing ? <Loader2 className="h-5 w-5 animate-spin"/> : <RefreshCcw className="h-5 w-5" />}
               </Button>
                <Button
                    variant="outline" size="icon" onClick={handleVoiceButtonClick}
                    disabled={!isClient || !isVoiceSupported || !isOnline || currentVoiceState === 'processing' || currentVoiceState === 'speaking'}
                    aria-label={getVoiceButtonTooltip()}
                    title={getVoiceButtonTooltip()}
                    className={cn("transition-opacity",
                        (!isClient || !isVoiceSupported || !isOnline) && "opacity-50 cursor-not-allowed",
                        isClient && isVoiceSupported && isOnline && currentVoiceState === 'activated' && "border-primary",
                        isClient && isVoiceSupported && isOnline && currentVoiceState === 'listening' && "border-blue-600",
                        isClient && isVoiceSupported && isOnline && currentVoiceState === 'error' && "border-destructive",
                        isClient && isVoiceSupported && isOnline && (currentVoiceState === 'processing' || currentVoiceState === 'speaking') && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {getVoiceButtonIcon()}
                </Button>
              {!isAuthenticated && <Button onClick={() => setIsAuthModalOpen(true)}>Sign In / Sign Up</Button>}
          </div>
      </div>
       {isClient && isVoiceSupported && isOnline && currentVoiceState !== 'idle' && (
           <p className="text-sm text-muted-foreground text-center mb-4 italic">
                {currentVoiceState === 'activated' && "Say your command..."}
                {currentVoiceState === 'listening' && "Listening..."}
                {currentVoiceState === 'processing' && "Processing command..."}
                {currentVoiceState === 'speaking' && "Speaking..."}
                {currentVoiceState === 'error' && `Error: ${voiceError || 'Unknown'}`}
           </p>
       )}

      {geolocationError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Location Access Error</AlertTitle>
          <AlertDescription>{geolocationError}</AlertDescription>
        </Alert>
      )}

       {pinnedSpot && (
          <Card className="mb-6 border-primary bg-primary/5">
               <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <div className="flex items-center gap-2"> <MapPin className="h-5 w-5 text-primary" /> <CardTitle className="text-lg">Pinned Car Location</CardTitle> </div>
                    <Button variant="ghost" size="sm" onClick={clearPinnedLocation}>Clear Pin</Button>
               </CardHeader>
               <CardContent>
                    <p className="text-sm text-primary/90 mb-3"> Spot: <span className="font-medium">{pinnedSpot.spotId}</span> at {pinnedSpot.locationName} </p>
                    <div className="aspect-video w-full overflow-hidden rounded-md border">
                        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                            <ParkingLotMap
                                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                defaultLatitude={pinnedSpot.latitude}
                                defaultLongitude={pinnedSpot.longitude}
                                customClassName="h-full w-full"
                                userLocation={userLocation}
                                showUserCar={true}
                                pinnedCarLocation={pinnedSpot}
                                centerCoordinates={mapCenter}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
                                <Alert variant="warning" className="max-w-md mx-auto"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Map Unavailable</AlertTitle>
                                     <AlertDescription> Google Maps API Key is missing. Map cannot be displayed. (Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env) </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => typeof window !== 'undefined' && window.open(`https://www.google.com/maps/search/?api=1&query=${pinnedSpot.latitude},${pinnedSpot.longitude}`, '_blank')}>
                       <Search className="mr-2 h-4 w-4" /> Open in Google Maps
                   </Button>
               </CardContent>
          </Card>
       )}
       {isPinning && <div className="flex items-center justify-center text-muted-foreground text-sm mb-4"> <Loader2 className="h-4 w-4 mr-2 animate-spin"/> Pinning car location... </div>}

       {isAuthenticated && favoriteLocationObjects.length > 0 && (
            <Card className="mb-6 border-yellow-500 bg-yellow-500/5">
                <CardHeader> <CardTitle className="flex items-center gap-2 text-yellow-700"> <Star className="h-5 w-5 text-yellow-600 fill-yellow-500" /> Your Favorite Locations </CardTitle> </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {favoriteLocationObjects.map((favLoc) => (
                            <Card key={favLoc.id} className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => handleSelectLocation(favLoc.id)}>
                                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 z-10 text-yellow-500 hover:text-yellow-600"
                                     onClick={(e) => { e.stopPropagation(); toggleFavoriteLocation(favLoc.id); }}
                                     aria-label={`Remove ${favLoc.name} from favorites`} title={`Remove ${favLoc.name} from favorites`}> <StarOff className="h-4 w-4" />
                                </Button>
                                <CardHeader className="pb-2"> <CardTitle className="text-base pr-8">{favLoc.name}</CardTitle>
                                     <CardDescription className="text-xs pt-1 flex items-center gap-1"> <MapPin className="h-3 w-3" /> {favLoc.address} </CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Badge variant={favLoc.currentOccupancy === undefined ? 'secondary' : (favLoc.capacity - favLoc.currentOccupancy) > 10 ? 'default' : (favLoc.capacity - favLoc.currentOccupancy) > 0 ? 'secondary' : 'destructive'} className={cn("text-xs", (favLoc.currentOccupancy !== undefined && (favLoc.capacity - favLoc.currentOccupancy) > 10) && "bg-green-600 text-white")}>
                                         {favLoc.isCarpsoManaged && favLoc.currentOccupancy !== undefined ? `${favLoc.capacity - favLoc.currentOccupancy} Spots Free` : 'Details N/A'}
                                     </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

        {isAuthenticated && (
          <Card className="mb-6 border-blue-500 bg-blue-500/5">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <LocateFixed className="h-5 w-5" /> Parking Destination Map
                  </CardTitle>
                  <CardDescription>
                      The map below shows parking locations. Recommendations are based on your current location or a specified destination.
                      Use voice commands like "Hey Carpso, find parking near [place]" for quick search.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                      <ParkingLotMap
                          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                          defaultLatitude={mapCenter?.lat || userLocation?.lat || -15.4167}
                          defaultLongitude={mapCenter?.lng || userLocation?.lng || 28.2833}
                          customClassName="rounded-md shadow"
                          userLocation={userLocation}
                          showUserCar={true}
                          centerCoordinates={mapCenter}
                      />
                  ) : (
                      <Alert variant="warning">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Map Service Unavailable</AlertTitle>
                          <AlertDescription>
                              Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
                          </AlertDescription>
                      </Alert>
                  )}
              </CardContent>
          </Card>
        )}

       {isAuthenticated && !isLoadingLocations && (
           <Card className="mb-6 border-accent bg-accent/5">
               <CardHeader> <CardTitle className="flex items-center gap-2"> <Sparkles className="h-5 w-5 text-accent" /> Recommended Carpso Parking </CardTitle>
                    <CardDescription>Based on your preferences and current conditions. Recommendations focus on Carpso managed/partner locations.</CardDescription>
                    {!isOnline && <CardDescription className="text-destructive text-xs pt-1">(Recommendations may be outdated or unavailable)</CardDescription>}
               </CardHeader>
               <CardContent>
                   {isLoadingRecommendations ? (<div className="space-y-2"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /> </div>
                   ) : !isOnline && recommendations.length === 0 ? ( <p className="text-sm text-muted-foreground text-center py-4">Recommendations require an internet connection.</p>
                   ) : recommendations.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {recommendations.map((rec) => {
                               const isFavorite = favoriteLocations.includes(rec.lotId);
                               const lot = locations.find(l => l.id === rec.lotId);
                               return (
                                   <Card key={rec.lotId} className="hover:shadow-md transition-shadow cursor-pointer relative" onClick={() => handleSelectLocation(rec.lotId)}>
                                       <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 z-10 text-yellow-500 hover:text-yellow-600"
                                            onClick={(e) => { e.stopPropagation(); toggleFavoriteLocation(rec.lotId); }}
                                            aria-label={isFavorite ? `Remove ${rec.lotName} from favorites` : `Add ${rec.lotName} to favorites`}
                                            title={isFavorite ? `Remove ${rec.lotName} from favorites` : `Add ${rec.lotName} to favorites`}
                                            disabled={!isAuthenticated}
                                        >
                                            {isFavorite ? <Star className="h-4 w-4 fill-current" /> : <Star className="h-4 w-4" />}
                                        </Button>
                                       <CardHeader className="pb-2">
                                           <CardTitle className="text-base flex items-center justify-between pr-8"> {rec.lotName}
                                               {rec.availabilityScore !== undefined && (
                                                   <Badge variant={rec.availabilityScore > 0.7 ? 'default' : rec.availabilityScore > 0.4 ? 'secondary' : 'destructive'} className={cn("text-xs", rec.availabilityScore > 0.7 && "bg-green-600 text-white")}>
                                                       {(rec.availabilityScore * 100).toFixed(0)}% Free
                                                   </Badge>
                                               )}
                                           </CardTitle>
                                            <CardDescription className="text-xs flex items-center gap-1 pt-1"> <MapPin className="h-3 w-3" /> {lot?.address}
                                                {rec.estimatedCost !== undefined && ` • K${rec.estimatedCost.toFixed(2)}/hr`}
                                           </CardDescription>
                                       </CardHeader>
                                       <CardContent> <p className="text-xs text-muted-foreground flex items-start gap-1.5"> <Sparkles className="h-3 w-3 text-accent mt-0.5 shrink-0" /> <span>{rec.reason}</span> </p> </CardContent>
                                   </Card>
                               );
                           })}
                       </div>
                   ) : isOnline ? ( <p className="text-sm text-muted-foreground text-center py-4">No specific recommendations available right now. Select a location below.</p>
                   ) : null }
               </CardContent>
           </Card>
       )}


     <Card className="mb-6">
        <CardHeader> <CardTitle className="flex items-center gap-2"> <MapPin className="h-5 w-5 text-primary" /> Select Parking Location </CardTitle>
            <CardDescription>Choose a location to view availability or get directions.</CardDescription>
        </CardHeader>
       <CardContent>
         {isLoadingLocations ? (<Skeleton className="h-10 w-full" />
         ) : error ? ( <Alert variant="destructive" className="mb-4"> <AlertTriangle className="h-4 w-4"/> <AlertTitle>Error Loading Locations</AlertTitle> <AlertDescription>{error}</AlertDescription> </Alert>
         ) : locations.length === 0 && isOnline ? ( <p className="text-muted-foreground text-center py-4">No parking locations available at the moment.</p>
          ) : locations.length === 0 && !isOnline ? ( <p className="text-muted-foreground text-center py-4 flex items-center justify-center gap-2"><WifiOff className="h-4 w-4" /> Offline: No cached parking locations available.</p>
          ) : (
           <Select value={selectedLocationId || ""} onValueChange={(value) => handleSelectLocation(value)}>
             <SelectTrigger className="w-full"> <SelectValue placeholder="Select a parking location..." /> </SelectTrigger>
             <SelectContent>
                {favoriteLocationObjects.length > 0 && ( <> <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Favorites</div>
                        {favoriteLocationObjects.map((loc) => ( <SelectItem key={loc.id} value={loc.id}> <span className="flex items-center gap-2"> <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" /> {loc.name} - {loc.address} </span> </SelectItem> ))} <hr className="my-1" /> </> )}
                {carpsoManagedLots.length > 0 && ( <> <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Carpso Locations</div>
                        {carpsoManagedLots.map((loc) => ( <SelectItem key={loc.id} value={loc.id}> <span className="flex items-center gap-2"> {favoriteLocations.includes(loc.id) && <Star className="h-4 w-4 text-yellow-500" />} {loc.name} - {loc.address} <Badge variant="outline" className="ml-auto text-xs">{loc.subscriptionStatus === 'active' ? 'Active' : loc.subscriptionStatus === 'trial' ? 'Trial' : 'Inactive'}</Badge> </span> </SelectItem> ))} </> )}
                 {externalLots.length > 0 && ( <> <hr className="my-1" /> <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Other Nearby Locations (via Google)</div>
                        {externalLots.map((loc) => ( <SelectItem key={loc.id} value={loc.id}> <span className="flex items-center gap-2"> {favoriteLocations.includes(loc.id) && <Star className="h-4 w-4 text-yellow-500" />} {loc.name} - {loc.address} <Badge variant="secondary" className="ml-auto text-xs">External</Badge> </span> </SelectItem> ))} </> )}
             </SelectContent>
           </Select>
         )}
       </CardContent>
     </Card>


      {selectedLocation ? (
          selectedLocation.isCarpsoManaged ? (
               <div id="parking-grid-section">
                   <ParkingLotGrid key={selectedLocation.id} location={selectedLocation} onSpotReserved={handleSpotReserved} userTier={userRole === 'Premium' ? 'Premium' : 'Basic'} />
               </div>
          ) : (
              <Card id="parking-grid-section" className="mb-8 border-blue-500 bg-blue-500/5">
                  <CardHeader> <CardTitle className="flex items-center gap-2"> <Building className="h-5 w-5 text-blue-600" /> {selectedLocation.name} (External) </CardTitle> <CardDescription>{selectedLocation.address}</CardDescription> </CardHeader>
                  <CardContent> <p className="text-sm text-muted-foreground mb-4"> This is an external parking location identified via Google Maps. Real-time spot availability and Carpso reservations are not available here. </p>
                      <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => openExternalMap(selectedLocation)} size="sm"> <ExternalLink className="mr-2 h-4 w-4" /> Open in Google Maps </Button>
                          {selectedLocation.phoneNumber && ( <Button variant="outline" size="sm" asChild> <a href={`tel:${selectedLocation.phoneNumber}`}> <Phone className="mr-2 h-4 w-4" /> Call </a> </Button> )}
                           {selectedLocation.website && ( <Button variant="outline" size="sm" asChild> <a href={selectedLocation.website} target="_blank" rel="noopener noreferrer"> <GlobeIcon className="mr-2 h-4 w-4" /> Website </a> </Button> )}
                      </div>
                  </CardContent>
              </Card>
          )
      ) : !isLoadingLocations && !error && locations.length > 0 ? ( <p className="text-center text-muted-foreground"> {isAuthenticated ? 'Select a recommended or specific parking location above.' : 'Please select a parking location above.'} </p>
       ) : !isLoadingLocations && !error && locations.length === 0 && !isOnline ? ( null
       ) : !isLoadingLocations && !error && locations.length === 0 && isOnline ? ( <p className="text-center text-muted-foreground py-4">No parking locations found in the system.</p>
       ) : null }


      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuthSuccess={handleAuthSuccess} />
       {isClient && <BottomNavBar onAuthClick={() => setIsAuthModalOpen(true)} />}
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
