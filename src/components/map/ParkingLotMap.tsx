// src/components/map/ParkingLotMap.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, LocateFixed, MapPinIcon } from 'lucide-react';
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
  height: '300px',
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
    googleMapsApiKey: apiKey || "",
    libraries: ['places'], // Keep places library for potential future use or if other components rely on it
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
      if (map && isLoaded) {
        map.panTo({ lat: defaultLatitude, lng: defaultLongitude });
      }
    }
  }, [centerCoordinates, userLocation, defaultLatitude, defaultLongitude, map, isLoaded]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    mapInstance.panTo(currentCenter);
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
        map.setZoom(16); // Adjusted zoom level
        toast({ title: "Map Recenter", description: toastMessage });
    }
  };

  if (!apiKey) {
    return (
      <div className={cn("w-full", customClassName)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Google Maps API Key Missing</AlertTitle>
          <AlertDescription>
            The Google Maps API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) is not configured. Map functionality is disabled.
            Please **CAREFULLY review the "Google Maps API Key" section in the `README.md` file** for setup instructions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loadError) {
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
                This seems to be an API key issue.
                Ensure your `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is correct, billing is enabled, and necessary APIs (Maps JavaScript API, Places API) are activated.
                Refer to `README.md` for troubleshooting.
              </>
            ) : (
              "Check your internet connection and browser console for details."
            )}
            <p className="text-xs mt-2">Error: {loadError.message}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn("w-full", customClassName)}>
        <div className="flex items-center justify-center h-[300px] bg-muted rounded-md">
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
                 mapId: 'CARPSO_MAP_ID',
                 clickableIcons: false, // Prevent clicking on default Google POIs
                }}
           >
                {/* User's current location marker (blue dot with accuracy circle) */}
                  {showUserCar && userLocation && (
                    <>
                      <Marker
                        position={userLocation}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 7,
                          fillColor: '#4285F4',
                          fillOpacity: 1,
                          strokeWeight: 2,
                          strokeColor: 'white',
                        }}
                        title="Your Location"
                        zIndex={5} // Ensure it's above other markers if needed
                      />
                       <Circle
                          center={userLocation}
                          radius={50}
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
                  {/* Pinned car location marker */}
                  {pinnedCarLocation && (
                     <Marker
                         position={pinnedCarLocation}
                         icon={{
                            path: MapPinIcon, // Using Lucide MapPin as a path, requires custom function if lucide icons are not directly usable
                            // For a simple car icon, you can use a URL to an image:
                            // url: '/path/to/your/car-icon.png',
                            // scaledSize: new google.maps.Size(30, 30),
                            // anchor: new google.maps.Point(15, 30),
                            // Or a more complex SVG path:
                            // path: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', // Example simple car-like shape
                            fillColor: 'hsl(var(--primary))',
                            fillOpacity: 1,
                            strokeWeight: 1,
                            strokeColor: 'hsl(var(--background))',
                            scale: 1.5, // Adjust scale for MapPinIcon
                            anchor: new google.maps.Point(12, 24) // Adjust anchor for MapPinIcon
                         }}
                         label={{
                           text: `Car: ${pinnedCarLocation.spotId}`,
                           color: 'hsl(var(--primary-foreground))',
                           fontSize: '10px',
                           fontWeight: 'bold',
                           className: 'bg-primary px-1 py-0.5 rounded-sm shadow-md'
                         }}
                         title={`Pinned Car at ${pinnedCarLocation.spotId}`}
                         zIndex={10} // Ensure it's above user location accuracy circle
                     />
                  )}
           </GoogleMap>
           {(userLocation || pinnedCarLocation) && ( // Show recenter button if there's something to center on
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
