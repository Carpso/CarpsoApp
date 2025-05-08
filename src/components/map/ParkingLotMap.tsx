// src/components/map/ParkingLotMap.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, LocateFixed, MapPin as CarIcon, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ParkingLotMapProps {
    apiKey: string | undefined;
    defaultLatitude: number;
    defaultLongitude: number;
    customClassName?: string;
    userLocation?: { lat: number; lng: number } | null;
    showUserCar?: boolean;
    pinnedCarLocation?: { lat: number; lng: number; spotId: string } | null;
    centerCoordinates?: { lat: number; lng: number } | null;
    defaultMapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}

const containerStyleDefault = {
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
    defaultMapType = 'roadmap',
}: ParkingLotMapProps) {
  const { toast } = useToast();
  const isMounted = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-loader',
    googleMapsApiKey: apiKey || "",
    libraries: ['places'],
    preventGoogleFontsLoading: true,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [currentCenter, setCurrentCenter] = useState({ lat: defaultLatitude, lng: defaultLongitude });
  const [mapContainerStyle, setMapContainerStyle] = useState(containerStyleDefault);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (customClassName?.includes('h-')) {
        setMapContainerStyle({ width: '100%', height: '100%' });
    } else {
        setMapContainerStyle(containerStyleDefault);
    }
  }, [customClassName]);

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
      if (map && isLoaded && !centerCoordinates && !userLocation) {
        map.panTo({ lat: defaultLatitude, lng: defaultLongitude });
      }
    }
  }, [centerCoordinates, userLocation, defaultLatitude, defaultLongitude, map, isLoaded]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    if (isMounted.current) {
      setMap(mapInstance);
      mapInstance.panTo(currentCenter);
    }
  }, [currentCenter]);

  const onUnmount = useCallback(() => {
    if (isMounted.current) {
      setMap(null);
    }
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

  const mapOptions: google.maps.MapOptions = {
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: false,
    clickableIcons: false,
  };

  if (!apiKey) {
    return (
      <div className={cn("w-full", customClassName)} style={mapContainerStyle}>
        <Alert variant="destructive" className="h-full flex flex-col justify-center">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Google Maps API Key Missing!</AlertTitle>
          <AlertDescription>
            The `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable is not set or is empty.
            Map functionality is disabled. Please refer to the `README.md` file for setup instructions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (loadError) {
    console.error("Google Maps Load Error:", loadError);
    let errorTitle = "Google Maps Error";
    let errorMessage = "Could not load Google Maps. Please ensure your internet connection is stable and try again.";
    
    if (loadError.message.includes('InvalidKeyMapError')) {
        errorTitle = "Google Maps: Invalid API Key";
        errorMessage = "The Google Maps API Key is invalid. This could be due to an incorrect key, missing billing information for your Google Cloud project, or the Maps JavaScript API not being enabled. Please check the `README.md` for troubleshooting steps.";
    } else if (loadError.message.includes('MissingKeyMapError')) {
        errorTitle = "Google Maps: API Key Missing";
        errorMessage = "The Google Maps API Key was not provided to the API. Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is correctly set in your environment and passed to the map component. See `README.md`.";
    } else if (loadError.message.includes('ApiNotActivatedMapError')) {
        errorTitle = "Google Maps: API Not Activated";
        errorMessage = "The Maps JavaScript API or Places API is not activated for your Google Cloud project. Please enable them in the Google Cloud Console. See `README.md`.";
    } else if (loadError.message.includes('RefererNotAllowedMapError')) {
        errorTitle = "Google Maps: Referer Not Allowed";
        errorMessage = "The current URL is not authorized to use this Google Maps API Key. Check your API key's HTTP referrer restrictions in the Google Cloud Console. The error message in your browser console might show the specific URL that needs to be authorized. See `README.md`.";
    }

    return (
      <div className={cn("w-full", customClassName)} style={mapContainerStyle}>
        <Alert variant="destructive" className="h-full flex flex-col justify-center text-left p-4">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg">{errorTitle}</AlertTitle>
          <AlertDescription className="text-sm">
            {errorMessage}
            <p className="text-xs mt-2 opacity-80">Original Error: {loadError.message}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn("w-full bg-muted rounded-md", customClassName)} style={mapContainerStyle}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2 text-muted-foreground">Loading Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", customClassName)}>
       <div className="rounded-md overflow-hidden border shadow-sm relative" style={mapContainerStyle}>
           <GoogleMap
               mapContainerStyle={{ width: '100%', height: '100%' }}
               center={currentCenter}
               zoom={15}
               onLoad={onLoad}
               onUnmount={onUnmount}
               options={mapOptions}
               mapTypeId={defaultMapType}
           >
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
                        zIndex={5}
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
                  {pinnedCarLocation && (
                     <Marker
                         position={pinnedCarLocation}
                         icon={{
                            path: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5S18.33 16 17.5 16zM5 11l1.5-4.5h11L19 11H5z',
                            fillColor: 'hsl(var(--primary))',
                            fillOpacity: 1,
                            strokeWeight: 1,
                            strokeColor: 'hsl(var(--background))',
                            scale: 1.1,
                            anchor: new google.maps.Point(12, 12)
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
                 aria-label="Recenter map"
             >
                 <LocateFixed className="h-5 w-5"/>
             </Button>
           )}
        </div>
    </div>
  );
}