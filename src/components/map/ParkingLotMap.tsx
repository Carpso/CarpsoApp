// src/components/map/ParkingLotMap.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, LocateFixed, MapPinIcon as CarIcon } from 'lucide-react'; // Renamed MapPinIcon to CarIcon for car representation
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ParkingLotMapProps {
    apiKey: string | undefined;
    defaultLatitude: number;
    defaultLongitude: number;
    customClassName?: string;
    userLocation?: { lat: number; lng: number } | null;
    showUserCar?: boolean;
    pinnedCarLocation?: { lat: number; lng: number; spotId: string } | null;
    centerCoordinates?: { lat: number; lng: number } | null; // New prop to control map center externally
}

const containerStyle = {
  width: '100%',
  height: '300px', // Default height, can be overridden by customClassName if needed
};

export default function ParkingLotMap({
    apiKey,
    defaultLatitude,
    defaultLongitude,
    customClassName,
    userLocation,
    showUserCar = false,
    pinnedCarLocation,
    centerCoordinates,
}: ParkingLotMapProps) {
  const { toast } = useToast();
  const isMounted = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || "", // Ensure it falls back to empty string if apiKey is undefined
    libraries: ['places'],
    preventGoogleFontsLoading: true,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentCenter, setCurrentCenter] = useState({ lat: defaultLatitude, lng: defaultLongitude });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (centerCoordinates) {
      setCurrentCenter(centerCoordinates);
      if (map && isLoaded) {
        map.panTo(centerCoordinates);
      }
    } else if (userLocation) {
      setCurrentCenter(userLocation);
      if (map && isLoaded) {
        map.panTo(userLocation);
      }
    } else {
      setCurrentCenter({ lat: defaultLatitude, lng: defaultLongitude });
      // Only panTo if map is already loaded, otherwise onLoad will handle it.
      if (map && isLoaded && !centerCoordinates && !userLocation) {
        map.panTo({ lat: defaultLatitude, lng: defaultLongitude });
      }
    }
  }, [centerCoordinates, userLocation, defaultLatitude, defaultLongitude, map, isLoaded]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    mapInstance.panTo(currentCenter); // currentCenter is already updated by the useEffect above
  }, [currentCenter]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleRecenterMap = () => {
    let targetCenter = { lat: defaultLatitude, lng: defaultLongitude };
    let toastMessage = "Map centered on default location.";

    if (userLocation) {
        targetCenter = userLocation;
        toastMessage = "Map centered on your current location.";
    } else if (pinnedCarLocation) {
        targetCenter = { lat: pinnedCarLocation.lat, lng: pinnedCarLocation.lng };
        toastMessage = "Map centered on your pinned car.";
    }
    
    if (map && isLoaded) {
        map.panTo(targetCenter);
        map.setZoom(16);
        toast({ title: "Map Recenter", description: toastMessage });
    }
  };


  if (!apiKey) {
    return (
      <div className={cn("w-full", customClassName)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Google Maps API Key Missing!</AlertTitle>
          <AlertDescription>
            The `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not configured in your environment variables (e.g., `.env.local` or `.env`).
            Map functionality is disabled. Common causes for map errors (like `InvalidKeyMapError`) include:
            <ul className="list-disc pl-5 mt-2 text-xs">
                <li>Typo in the API key.</li>
                <li>The API key is not authorized to use the **Maps JavaScript API** and **Places API**.</li>
                <li>**Billing is not enabled** for your Google Cloud Project (this is the most common cause).</li>
                <li>The API key has incorrect restrictions (e.g., HTTP referrer or API restrictions that do not include this site or the required APIs).</li>
            </ul>
            <strong>Please carefully review the &quot;Google Maps API Key Setup&quot; section in the `README.md` file</strong> for detailed setup and troubleshooting instructions. This is crucial for the app to work.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (loadError) {
    console.error("Google Maps Load Error:", loadError);
    const isKeyError = loadError.message.includes('InvalidKeyMapError') ||
                       loadError.message.includes('ApiNotActivatedMapError') ||
                       loadError.message.includes('MissingKeyMapError') ||
                       loadError.message.includes('RefererNotAllowedMapError');
    return (
      <div className={cn("w-full", customClassName)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Google Maps Error</AlertTitle>
          <AlertDescription>
            Could not load Google Maps.
            {isKeyError ? (
              <>
                This is likely an issue with your Google Maps API key setup.
                <ul className="list-disc pl-5 mt-2 text-xs">
                  <li>Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in your `.env.local` (or `.env`) file is correct and has no extra spaces.</li>
                  <li>Verify that **Billing is enabled** for your Google Cloud Project.</li>
                  <li>Ensure **Maps JavaScript API** AND **Places API** are enabled in the Google Cloud Console.</li>
                  <li>Check API key restrictions (HTTP referrers, API restrictions) in the Google Cloud Console.</li>
                  <li>Restart your Next.js development server after any `.env` changes.</li>
                </ul>
                <strong>Please carefully review the &quot;Google Maps API Key Setup&quot; section in the `README.md` file</strong> for comprehensive troubleshooting.
              </>
            ) : (
              "Check your internet connection and browser console for more details."
            )}
            <p className="text-xs mt-2">Error details: {loadError.message}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn("w-full bg-muted", customClassName)} style={containerStyle}>
        <div className="flex items-center justify-center h-full rounded-md">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2 text-muted-foreground">Loading Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", customClassName)}>
       <div className="rounded-md overflow-hidden border shadow-sm relative" style={containerStyle}>
           <GoogleMap
               mapContainerStyle={{ width: '100%', height: '100%' }}
               center={currentCenter}
               zoom={15}
               onLoad={onLoad}
               onUnmount={onUnmount}
               options={{
                 streetViewControl: true,
                 mapTypeControl: true,
                 fullscreenControl: false,
                 mapId: 'CARPSO_MAP_ID', // Consider making this dynamic or removing if not styled
                 clickableIcons: false,
                }}
           >
                {showUserCar && userLocation && (
                    <>
                      <Marker
                        position={userLocation}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 7,
                          fillColor: '#4285F4', // Blue for user location
                          fillOpacity: 1,
                          strokeWeight: 2,
                          strokeColor: 'white',
                        }}
                        title="Your Location"
                        zIndex={5}
                      />
                       <Circle
                          center={userLocation}
                          radius={50} // Example accuracy radius
                          options={{
                            strokeColor: '#4285F4',
                            strokeOpacity: 0.3,
                            strokeWeight: 1,
                            fillColor: '#4285F4',
                            fillOpacity: 0.1,
                          }}
                        />
                    </>
                  )}
                  {pinnedCarLocation && (
                     <Marker
                         position={pinnedCarLocation}
                         // Using a simple car-like SVG path for the icon
                         icon={{
                            path: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S18.33 16 17.5 16zM5 11l1.5-4.5h11L19 11H5z',
                            fillColor: 'hsl(var(--primary))', // Use primary theme color
                            fillOpacity: 1,
                            strokeWeight: 1,
                            strokeColor: 'hsl(var(--background))', // Contrast with fill
                            scale: 1.1, // Adjust scale
                            anchor: new google.maps.Point(12, 12) // Center the icon
                         }}
                         label={{
                           text: `Car: ${pinnedCarLocation.spotId}`,
                           color: 'hsl(var(--primary-foreground))',
                           fontSize: '10px',
                           fontWeight: 'bold',
                           className: 'bg-primary px-1 py-0.5 rounded-sm shadow-md' 
                         }}
                         title={`Pinned Car at ${pinnedCarLocation.spotId}`}
                         zIndex={10}
                     />
                  )}
           </GoogleMap>
           {(userLocation || pinnedCarLocation) && (
             <Button
                 variant="outline"
                 size="icon"
                 onClick={handleRecenterMap}
                 className="absolute bottom-3 right-3 z-10 bg-background/80 hover:bg-background"
                 title="Recenter map"
             >
                 <LocateFixed className="h-5 w-5"/>
             </Button>
           )}
        </div>
    </div>
  );
}

