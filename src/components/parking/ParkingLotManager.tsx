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
import { Separator } from "@/components/ui/separator";
import { MapPin, Loader2, Sparkles, Star, Mic, MicOff, CheckSquare, Square, AlertTriangle, BookMarked, WifiOff, RefreshCcw, StarOff, Search, ExternalLink, Building, Phone, Globe as GlobeIcon, LocateFixed, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider';
import { recommendParking, RecommendParkingOutput } from '@/ai/flows/recommend-parking-flow';
import { getUserBookmarks, addBookmark, UserBookmark, saveUserPreferences, loadUserPreferences, UserRole } from '@/services/user-service';
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
      isOnline,
  } = useContext(AppStateContext)!;

  const [locations, setLocations] = useState<ParkingLot[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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


  // --- Data Fetching Callbacks ---
  const fetchLocationsDataRef = useRef<((forceRefresh?: boolean) => Promise<void>) | null>(null);
  const fetchUserBookmarksDataRef = useRef<(() => Promise<void>) | null>(null);
  const fetchRecommendationsDataRef = useRef<((destinationLabel?: string, destinationAddress?: string, destLat?: number, destLng?: number) => Promise<void>) | null>(null);


  const fetchLocationsData = useCallback(async (forceRefresh = false) => {
    setIsLoadingLocations(true);
    setError(null);
    const cacheKey = 'cachedParkingLotsWithExternal_v2';
    const cacheTimestampKey = `${cacheKey}Timestamp`;
    const maxCacheAge = isVisibleCtx ? 5 * 60 * 1000 : 60 * 60 * 1000;
    let newAllLots: ParkingLot[] = [];

    if (!forceRefresh && typeof window !== 'undefined') {
        const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < maxCacheAge) {
             try {
                newAllLots = JSON.parse(cachedData);
             } catch (parseError: any) {
                 localStorage.removeItem(cacheKey);
                 localStorage.removeItem(cacheTimestampKey);
             }
        }
    }

    const needsServerFetch = newAllLots.length === 0 || forceRefresh;

    if (needsServerFetch && isOnline) {
        try {
            const fetchedLots = await getAvailableParkingLots(userRole || 'User', userId, true);
            newAllLots = fetchedLots;
            if (typeof window !== 'undefined') {
                localStorage.setItem(cacheKey, JSON.stringify(newAllLots));
                localStorage.setItem(cacheTimestampKey, Date.now().toString());
            }
        } catch (fetchError: any) {
            if (newAllLots.length === 0) setError("Could not load parking locations. Please check connection.");
        }
    } else if (needsServerFetch && !isOnline) {
        setError("Offline: Could not load parking data. No cached data available.");
    }

    setLocations(prevLocations => {
      if (JSON.stringify(prevLocations) !== JSON.stringify(newAllLots)) {
        return newAllLots;
      }
      return prevLocations;
    });
    setIsLoadingLocations(false);
    setIsRefreshing(false);
  }, [isOnline, isVisibleCtx, userRole, userId]);


  const fetchUserBookmarksData = useCallback(async () => {
    if (typeof window !== 'undefined') {
       const cachedBookmarks = localStorage.getItem('cachedUserBookmarks');
       if (cachedBookmarks) {
           try { setUserBookmarks(JSON.parse(cachedBookmarks)); }
           catch (parseError: any) { console.error("Failed to parse cached bookmarks", parseError.message); }
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
             catch (cacheError: any) { console.error("Failed to cache bookmarks:", cacheError.message); }
        }
    } catch (err: any) {
        if (isOnline) toast({ title: "Error", description: "Could not refresh saved locations.", variant: "destructive" });
    } finally {
        setIsLoadingBookmarks(false);
    }
  }, [isAuthenticated, userId, isOnline, toast]);


  const fetchRecommendationsData = useCallback(async (destinationLabel?: string, destinationAddress?: string, destLat?: number, destLng?: number) => {
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
            } else {
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
            console.error("Error preparing nearbyLots JSON for recommendation:", jsonError.message);
        }
        let bookmarksJson = "[]";
        try {
            bookmarksJson = JSON.stringify(currentBookmarks);
        } catch (jsonError: any) {
             console.error("Error preparing bookmarks JSON for recommendation:", jsonError.message);
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
        const result = await recommendParking(input);
        setRecommendations(result.recommendations || []);
    } catch (err: any) {
        if (isOnline) toast({
            title: "Recommendation Error",
            description: `Could not fetch recommendations: ${err.message || 'Unknown error'}. Please try again later.`,
            variant: "destructive",
        });
        setRecommendations([]);
    } finally {
        setIsLoadingRecommendations(false);
    }
  }, [isAuthenticated, userId, locations, userPreferredServices, userHistorySummary, toast, userRole, userBookmarks, isOnline, userLocation]);


  // Assign to refs after definition
  fetchLocationsDataRef.current = fetchLocationsData;
  fetchUserBookmarksDataRef.current = fetchUserBookmarksData;
  fetchRecommendationsDataRef.current = fetchRecommendationsData;

  // --- Voice Command Handling ---
  const handleVoiceCommandResult = useCallback(async (commandOutput: ProcessVoiceCommandOutput, speakFn: (text: string) => void) => {
    const { intent, entities, responseText } = commandOutput;
    if (isOnline && isClient && speakFn) {
         speakFn(responseText);
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
                          if (fetchRecommendationsDataRef.current) await fetchRecommendationsDataRef.current(entities.destination, matchedBookmark.address, matchedBookmark.latitude, matchedBookmark.longitude);
                     } else {
                          setDestinationForRecommendation({ label: entities.destination, address: entities.destination });
                          if (fetchRecommendationsDataRef.current) await fetchRecommendationsDataRef.current(entities.destination, entities.destination);
                     }
                 } else {
                     toast({ title: "Finding Parking", description: `Showing general recommendations.` });
                     setDestinationForRecommendation(null);
                     if (fetchRecommendationsDataRef.current) await fetchRecommendationsDataRef.current();
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
                } else {
                     let msg = `Sorry, I couldn't identify the location for spot ${entities.spotId}.`;
                     if (!locations.find(loc => entities.spotId?.startsWith(loc.id))) {
                          msg += " It might be an external parking lot which doesn't support reservations through Carpso.";
                     }
                     if (isOnline && isClient && speakFn) speakFn(msg);
                }
            } else {
                if (isOnline && isClient && speakFn) speakFn("Sorry, I didn't catch the spot ID you want to reserve. Please try again.");
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
                     }
                } else {
                      if (isOnline && isClient && speakFn) speakFn(`Sorry, I couldn't identify the location for spot ${entities.spotId}.`);
                 }
             } else if (entities.locationId) {
                 const locationByIdOrName = locations.find(loc => loc.id === entities.locationId || loc.name === entities.locationId);
                 if (locationByIdOrName) {
                     setSelectedLocationId(locationByIdOrName.id);
                     const available = locationByIdOrName.isCarpsoManaged ? (locationByIdOrName.capacity - (locationByIdOrName.currentOccupancy ?? 0)) : undefined;
                     if (isOnline && isClient && speakFn) {
                         if (available !== undefined) speakFn(`Okay, ${locationByIdOrName.name} currently has about ${available} spots available.`);
                         else speakFn(`Okay, showing ${locationByIdOrName.name}. Real-time availability data isn't available for this external location.`);
                     }
                 } else {
                      if (isOnline && isClient && speakFn) speakFn(`Sorry, I couldn't find the location ${entities.locationId}.`);
                 }
             } else {
                if (isOnline && isClient && speakFn) speakFn("Which spot or location would you like me to check?");
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

                  if (targetName === "pinned car") {
                      if (pinnedSpot) {
                         targetLat = pinnedSpot.latitude;
                         targetLon = pinnedSpot.longitude;
                         targetName = `your pinned car at ${pinnedSpot.spotId}`;
                      } else {
                           if (isOnline && isClient && speakFn) speakFn("Sorry, I don't have a pinned car location for you.");
                           break;
                      }
                  } else {
                      const currentBookmarks = userBookmarks;
                      const matchedBookmark = currentBookmarks.find(bm => bm.label.toLowerCase() === targetName?.toLowerCase());
                      if (matchedBookmark) {
                         targetLat = matchedBookmark.latitude;
                         targetLon = matchedBookmark.longitude;
                         targetName = matchedBookmark.label;
                      } else {
                          const locationByIdOrName = locations.find(loc => loc.id === targetName || loc.name === targetName);
                          if (locationByIdOrName) {
                               targetLat = locationByIdOrName.latitude;
                               targetLon = locationByIdOrName.longitude;
                               targetName = locationByIdOrName.name;
                          }
                      }
                  }
                  if (targetLat && targetLon) {
                      toast({ title: "Getting Directions", description: `Opening map directions for ${targetName}...` });
                      if (typeof window !== 'undefined') window.open(`https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLon}`, '_blank');
                  } else {
                       if (isOnline && isClient && speakFn) speakFn(`Sorry, I couldn't find or get coordinates for ${targetName}.`);
                  }
             } else {
                  if (isOnline && isClient && speakFn) speakFn("Where would you like directions to?");
             }
            break;
        case 'report_issue':
            if (entities.spotId) {
                const locationForSpot = locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id));
                 if (locationForSpot && isAuthenticated) {
                     const mockReservation: ParkingRecord = {
                         recordId: `rep_${entities.spotId}_${Date.now()}`,
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
                 } else {
                      let msg = `Sorry, I couldn't identify the location for spot ${entities.spotId}.`;
                      if (!locations.find(loc => loc.isCarpsoManaged && entities.spotId?.startsWith(loc.id))) msg += " You can only report issues for Carpso-managed locations.";
                      if (isOnline && isClient && speakFn) speakFn(msg);
                 }
            } else {
                if (isOnline && isClient && speakFn) speakFn("Which spot are you reporting an issue for?");
            }
            break;
        case 'add_bookmark':
             if (!isAuthenticated || !userId) {
                if (isOnline && isClient && speakFn) speakFn("Please sign in to save locations.");
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
                         toast({ title: "Location Error", description: "Could not get current location for bookmark.", variant: "destructive"});
                         break;
                     }
                 }
                 else addr = entities.bookmarkLocation;

                 try {
                     await addBookmark(userId, { label: entities.bookmarkLabel, address: addr, latitude: lat, longitude: lon });
                     if (fetchUserBookmarksDataRef.current) await fetchUserBookmarksDataRef.current();
                     if (isOnline && isClient && speakFn) speakFn(`Okay, saved "${entities.bookmarkLabel}".`);
                     toast({ title: "Bookmark Added", description: `Saved "${entities.bookmarkLabel}".` });
                 } catch (error: any) {
                     console.error("Error adding bookmark via voice:", error);
                      if (isOnline && isClient && speakFn) speakFn(`Sorry, I couldn't save the bookmark. ${error.message || error}`);
                     toast({ title: "Save Failed", description: error.message || error, variant: "destructive" });
                 }
             } else {
                  if (isOnline && isClient && speakFn) speakFn("What label and location do you want to save?");
             }
            break;
        case 'unknown':
            break;
    }
  }, [
    locations, pinnedSpot, isAuthenticated, toast, userId, userBookmarks, isOnline, isClient,
    userLocation,
    fetchRecommendationsDataRef, // Include refs
    fetchUserBookmarksDataRef   // Include refs
  ]);

  const processRecognizedCommand = useCallback(async (transcript: string, speakFn: (text: string) => void) => {
    if (!isOnline) {
        toast({ title: "Offline", description: "Voice commands require an internet connection.", variant: "destructive" });
        return;
    }
    let bookmarksString: string | undefined;
    try {
        bookmarksString = JSON.stringify(userBookmarks);
    } catch (jsonError: any) {
        console.error("Error stringifying bookmarks for voice command:", jsonError.message);
    }

    try {
        const commandOutput = await processVoiceCommand({ transcript, userBookmarks: bookmarksString });
        handleVoiceCommandResult(commandOutput, speakFn);
    } catch(error: any) {
        console.error("Error in processVoiceCommand flow:", error);
        let errorMsg = "Sorry, I couldn't process that. Please try again.";
        if (error.message && error.message.includes('overloaded')) {
             errorMsg = "The AI service is a bit busy right now. Please try your command again in a moment.";
        }
        if (isOnline && isClient && speakFn) {
            speakFn(errorMsg);
        } else {
            toast({ title: "Voice Command Error", description: errorMsg, variant: "destructive" });
        }
    }
  }, [isOnline, toast, userBookmarks, isClient, handleVoiceCommandResult]);


  const voiceAssistant = useVoiceAssistant({
    onCommand: processRecognizedCommand,
    onStateChange: (newState) => {
        setCurrentVoiceState(newState);
    }
  });


  useEffect(() => {
    setIsClient(true);
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
        (geoError) => {
          console.error(`Error getting user location (Code: ${geoError.code}): ${geoError.message}`);
          let message = `Error getting location: ${geoError.message}. Please ensure location services are enabled.`;
          if (geoError.code === geoError.PERMISSION_DENIED) {
            message = "Location access denied. Please enable it in your browser settings for full functionality.";
          } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
            message = "Location information is unavailable at the moment.";
          } else if (geoError.code === geoError.TIMEOUT) {
            message = "Getting location timed out. Please try again or check your device's location settings.";
          }
          setGeolocationError(message);
          setUserLocation(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000, // Increased timeout
          maximumAge: 0,
        }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      const noGeoMessage = "Geolocation is not supported by this browser.";
      setGeolocationError(noGeoMessage);
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
           if(fetchLocationsDataRef.current) fetchLocationsDataRef.current(true);
           if(fetchUserBookmarksDataRef.current) fetchUserBookmarksDataRef.current();
       }
       return () => {
           if (currentOfflineToastId) dismiss(currentOfflineToastId);
       };
   }, [isOnline, isClient, toast, dismiss, offlineToastId]);

  const handleManualRefresh = () => {
      if (!isOnline) {
          toast({ title: "Offline", description: "Cannot refresh data while offline.", variant: "destructive"});
          return;
      }
      setIsRefreshing(true);
      if(fetchLocationsDataRef.current) fetchLocationsDataRef.current(true);
      if(fetchUserBookmarksDataRef.current) fetchUserBookmarksDataRef.current();
      if (isAuthenticated && userId && fetchRecommendationsDataRef.current) {
          setTimeout(() => {
            if (fetchRecommendationsDataRef.current) {
              fetchRecommendationsDataRef.current(destinationForRecommendation?.label, destinationForRecommendation?.address, destinationForRecommendation?.latitude, destinationForRecommendation?.longitude);
            }
          }, 500);
      }
  };

   useEffect(() => {
       let intervalId: NodeJS.Timeout | null = null;
       const startInterval = () => {
           if (intervalId) clearInterval(intervalId);
           if (isOnline && fetchLocationsDataRef.current) {
               const intervalDuration = isVisibleCtx ? 30000 : 120000;
               intervalId = setInterval(() => {
                 if (fetchLocationsDataRef.current) fetchLocationsDataRef.current();
               }, intervalDuration);
           }
       };
       if (fetchLocationsDataRef.current) fetchLocationsDataRef.current();
       startInterval();
       return () => { if (intervalId) clearInterval(intervalId); };
   }, [isOnline, isVisibleCtx]);

   useEffect(() => {
       if (isAuthenticated && userId && fetchUserBookmarksDataRef.current) {
           fetchUserBookmarksDataRef.current();
       } else {
            setUserBookmarks([]);
            if (typeof window !== 'undefined') localStorage.removeItem('cachedUserBookmarks');
       }
   }, [isAuthenticated, userId, isOnline]);


  useEffect(() => {
       if (!isLoadingLocations && !isLoadingBookmarks && locations.length > 0 && isAuthenticated && userId && fetchRecommendationsDataRef.current) {
           fetchRecommendationsDataRef.current(destinationForRecommendation?.label, destinationForRecommendation?.address, destinationForRecommendation?.latitude, destinationForRecommendation?.longitude);
       }
   }, [isLoadingLocations, isLoadingBookmarks, isAuthenticated, userId, locations, destinationForRecommendation]);

    useEffect(() => {
       setCurrentVoiceState(voiceAssistant.state);
    }, [voiceAssistant.state]);

  useEffect(() => {
      if (userId && typeof window !== 'undefined') {
            const prefs = loadUserPreferences(userId);
            if (prefs && prefs.favoriteLocations) {
                setFavoriteLocations(prefs.favoriteLocations);
            }
       }
  }, [userId]);

   useEffect(() => {
       if (isClient && voiceAssistant.error) {
           toast({
               title: "Voice Assistant Error",
               description: voiceAssistant.error,
               variant: "destructive",
               duration: 4000
           });
       }
   }, [isClient, voiceAssistant.error, toast]);

   useEffect(() => {
    if (locations.length > 0) {
        const currentSelectionValid = locations.some(loc => loc.id === selectedLocationId);
        if (!currentSelectionValid || !selectedLocationId) {
            const favoriteLocationObjects = locations.filter(loc => favoriteLocations.includes(loc.id));
            const firstFavorite = favoriteLocationObjects.length > 0 ? favoriteLocationObjects[0].id : null;
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
    if (destinationForRecommendation?.latitude && destinationForRecommendation?.longitude) {
        setMapCenter({ lat: destinationForRecommendation.latitude, lng: destinationForRecommendation.longitude });
    } else if (selectedLoc) {
        setMapCenter({ lat: selectedLoc.latitude, lng: selectedLoc.longitude });
    } else if (userLocation) {
        setMapCenter(userLocation);
    } else if (locations.length > 0 && !selectedLoc && !userLocation){
        setMapCenter({lat: locations[0].latitude, lng: locations[0].longitude});
    } else if (!selectedLoc && !userLocation && locations.length === 0) {
         setMapCenter({lat: -15.4167, lng: 28.2833});
    }
  }, [selectedLocationId, locations, userLocation, destinationForRecommendation]);


 const selectedLocation = locations.find(loc => loc.id === selectedLocationId);


  const simulatePinCar = async (spotId: string, locationId: string) => {
      setIsPinning(true);
      setPinnedSpot(null);
      const locationToPin = locations.find(l => l.id === locationId);
      if (!locationToPin) {
          toast({ title: "Pinning Error", description: "Could not find location details.", variant: "destructive" });
          setIsPinning(false);
          return;
      }
      const pinLatitude = typeof locationToPin.latitude === 'number' ? locationToPin.latitude : 0;
      const pinLongitude = typeof locationToPin.longitude === 'number' ? locationToPin.longitude : 0;

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
     setDestinationForRecommendation(null);
     setTimeout(() => document.getElementById('parking-grid-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
 };

  const toggleFavoriteLocation = (locationId: string) => {
      if (!userId) {
           toast({ title: "Sign In Required", description: "Please sign in to save favorite locations." });
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

 const getVoiceButtonIcon = () => {
     if (!isClient) return <MicOff key="disabled-mic-not-client" className="h-5 w-5 text-muted-foreground opacity-50" />;
     if (!isOnline) return <MicOff key="disabled-mic-offline" className="h-5 w-5 text-muted-foreground opacity-50" />;
     if (!voiceAssistant.isSupported) return <MicOff key="disabled-mic-notsupported" className="h-5 w-5 text-muted-foreground opacity-50" />;

     switch (currentVoiceState) {
          case 'activated': return <CheckSquare key="activated" className="h-5 w-5 text-green-600 animate-pulse" />;
         case 'listening': return <Square key="listening" className="h-5 w-5 text-blue-600 animate-pulse" />;
         case 'processing': return <Loader2 key="loader" className="h-5 w-5 animate-spin" />;
         case 'speaking': return <Mic key="speaking" className="h-5 w-5 text-purple-600" />;
         case 'error': return <MicOff key="error-mic" className="h-5 w-5 text-destructive" />;
         case 'idle':
         default:
             return <Mic key="default-mic" className="h-5 w-5" />;
     }
 };

  const handleVoiceButtonClick = () => {
       if (!isClient || !voiceAssistant.isSupported || !isOnline) return;

       if (currentVoiceState === 'listening' || currentVoiceState === 'activated') voiceAssistant.stopListening();
       else voiceAssistant.startListening();
  };


   const getVoiceButtonTooltip = () => {
       if (!isClient) return "Loading voice assistant...";
        if (!isOnline) return "Voice commands unavailable offline";
        if (!voiceAssistant.isSupported) return "Voice commands not supported by your browser";

        switch (currentVoiceState) {
             case 'activated': return "Say your command...";
             case 'listening': return "Listening for 'Hey Carpso' or command...";
             case 'processing': return "Processing...";
             case 'speaking': return "Speaking...";
             case 'error': return `Error: ${voiceAssistant.error || 'Unknown'}`;
             case 'idle':
             default: return "Start voice command";
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
   const favoriteLocationObjects = locations.filter(loc => favoriteLocations.includes(loc.id));


  const handleSpotReserved = (spotId: string, locationId: string) => {
    simulatePinCar(spotId, locationId);
    if(fetchLocationsDataRef.current) fetchLocationsDataRef.current(true);
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
                    disabled={!isClient || !voiceAssistant.isSupported || !isOnline || currentVoiceState === 'processing' || currentVoiceState === 'speaking'}
                    aria-label={getVoiceButtonTooltip()}
                    title={getVoiceButtonTooltip()}
                    className={cn("transition-opacity",
                        (!isClient || !voiceAssistant.isSupported || !isOnline) && "opacity-50 cursor-not-allowed",
                        isClient && voiceAssistant.isSupported && isOnline && currentVoiceState === 'activated' && "border-primary",
                        isClient && voiceAssistant.isSupported && isOnline && currentVoiceState === 'listening' && "border-blue-600",
                        isClient && voiceAssistant.isSupported && isOnline && currentVoiceState === 'error' && "border-destructive",
                        isClient && voiceAssistant.isSupported && isOnline && (currentVoiceState === 'processing' || currentVoiceState === 'speaking') && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {getVoiceButtonIcon()}
                </Button>
          </div>
      </div>
       {isClient && voiceAssistant.isSupported && isOnline && currentVoiceState !== 'idle' && (
           <p className="text-sm text-muted-foreground text-center mb-4 italic">
                {currentVoiceState === 'activated' && "Say your command..."}
                {currentVoiceState === 'listening' && "Listening..."}
                {currentVoiceState === 'processing' && "Processing command..."}
                {currentVoiceState === 'speaking' && "Speaking..."}
                {currentVoiceState === 'error' && `Error: ${voiceAssistant.error || 'Unknown'}`}
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
                   <div className="flex items-center gap-2"> <Car className="h-5 w-5 text-primary" /> <CardTitle className="text-lg">Pinned Car Location</CardTitle> </div>
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
                                defaultMapType="satellite"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
                                <Alert variant="warning" className="max-w-md mx-auto"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Map Unavailable</AlertTitle>
                                     <AlertDescription> Google Maps API Key is missing. Map cannot be displayed. (Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env) </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>
                    <Button variant="outline" size="sm" className="mt-3" asChild><a href={`https://www.google.com/maps/search/?api=1&query=${pinnedSpot.latitude},${pinnedSpot.longitude}`} target="_blank" rel="noopener noreferrer"><Search className="mr-2 h-4 w-4" /> Open in Google Maps</a></Button>
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
                                     aria-label={`Remove ${favLoc.name} from favorites`} title={`Remove ${favLoc.name} from favorites`}
                                     disabled={!isAuthenticated}
                                >
                                     <StarOff className="h-4 w-4" />
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
                      The map below shows parking locations. Recommendations are based on your current location
                      {destinationForRecommendation?.label && <span> or your specified destination: <span className="font-medium">{destinationForRecommendation.label}</span></span>}.
                      Use voice commands like "Hey Carpso, find parking near [place]" for quick search.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && mapCenter ? (
                      <ParkingLotMap
                          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                          defaultLatitude={mapCenter.lat}
                          defaultLongitude={mapCenter.lng}
                          customClassName="rounded-md shadow h-[400px]"
                          userLocation={userLocation}
                          showUserCar={true}
                          centerCoordinates={mapCenter}
                      />
                  ) : (
                      <Alert variant="warning">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Map Service Unavailable</AlertTitle>
                          <AlertDescription>
                              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Loading map data or no locations available." : "Google Maps API key is not configured."}
                          </AlertDescription>
                      </Alert>
                  )}
              </CardContent>
          </Card>
        )}

       {isAuthenticated && !isLoadingLocations && (
           <Card className="mb-6 border-accent bg-accent/5">
               <CardHeader> <CardTitle className="flex items-center gap-2"> <Sparkles className="h-5 w-5 text-accent" /> Recommended Carpso Parking </CardTitle>
                    <CardDescription>Based on your preferences {destinationForRecommendation?.label ? `for ${destinationForRecommendation.label} ` : ''}and current conditions. Recommendations focus on Carpso managed/partner locations.</CardDescription>
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
                        {favoriteLocationObjects.map((loc) => ( <SelectItem key={loc.id} value={loc.id}> <span className="flex items-center gap-2"> <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" /> {loc.name} - {loc.address} </span> </SelectItem> ))} <Separator className="my-1" /> </> )}
                {carpsoManagedLots.length > 0 && ( <> <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Carpso Locations</div>
                        {carpsoManagedLots.map((loc) => ( <SelectItem key={loc.id} value={loc.id}> <span className="flex items-center gap-2"> {favoriteLocations.includes(loc.id) && <Star className="h-4 w-4 text-yellow-500" />} {loc.name} - {loc.address} <Badge variant="outline" className="ml-auto text-xs">{loc.subscriptionStatus === 'active' ? 'Active' : loc.subscriptionStatus === 'trial' ? 'Trial' : 'Inactive'}</Badge> </span> </SelectItem> ))} </> )}
                 {externalLots.length > 0 && ( <> <Separator className="my-1" /> <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Other Nearby Locations (via Google)</div>
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
                          <Button variant="outline" onClick={() => openExternalMap(selectedLocation)} size="sm" asChild><a href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.latitude},${selectedLocation.longitude}&query_place_id=${selectedLocation.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Open in Google Maps</a></Button>
                          {selectedLocation.phoneNumber && ( <Button variant="outline" size="sm" asChild><a href={`tel:${selectedLocation.phoneNumber}`}><Phone className="mr-2 h-4 w-4" /> Call</a></Button> )}
                           {selectedLocation.website && ( <Button variant="outline" size="sm" asChild><a href={selectedLocation.website} target="_blank" rel="noopener noreferrer"><GlobeIcon className="mr-2 h-4 w-4" /> Website</a></Button> )}
                      </div>
                  </CardContent>
              </Card>
          )
      ) : !isLoadingLocations && !error && locations.length > 0 ? ( <p className="text-center text-muted-foreground"> {isAuthenticated ? 'Select a recommended or specific parking location above.' : 'Please select a parking location above.'} </p>
       ) : !isLoadingLocations && !error && locations.length === 0 && !isOnline ? ( null
       ) : !isLoadingLocations && !error && locations.length === 0 && isOnline ? ( <p className="text-center text-muted-foreground py-4">No parking locations found in the system.</p>
       ) : null }

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
