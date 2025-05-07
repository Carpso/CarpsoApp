// src/components/map/ParkingLotMap.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api'; // Added Circle for user location
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, MapPinIcon, LocateFixed } from 'lucide-react'; // Added LocateFixed
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface ParkingLotMapProps {
    apiKey: string | undefined;
    defaultLatitude: number;
    defaultLongitude: number;
    onPinLocation?: (latitude: number, longitude: number, address?: string) => void;
    customClassName?: string;
    userLocation?: { lat: number; lng: number } | null; // Optional user's current location
    showUserCar?: boolean; // Flag to display user's car/current location marker
    pinnedCarLocation?: { lat: number; lng: number; spotId: string } | null; // Pinned car location
}

const containerStyle = {
  width: '100%',
  height: '300px', // Default height, can be overridden by customClassName
};

export default function ParkingLotMap({ 
    apiKey, 
    defaultLatitude, 
    defaultLongitude, 
    onPinLocation, 
    customClassName,
    userLocation,
    showUserCar = false,
    pinnedCarLocation,
}: ParkingLotMapProps) {
  const { toast } = useToast();
  const isMounted = useRef(false); 

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || "", 
    libraries: ['places'],
    preventGoogleFontsLoading: true,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);
  const [address, setAddress] = useState<string>('');
  const [markerPosition, setMarkerPosition] = useState({
      lat: defaultLatitude,
      lng: defaultLongitude
  });
  const [centerMapOnUser, setCenterMapOnUser] = useState(true); // Center on user by default if available

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false; 
    };
  }, []);


  useEffect(() => {
    const initialLat = centerMapOnUser && userLocation ? userLocation.lat : defaultLatitude;
    const initialLng = centerMapOnUser && userLocation ? userLocation.lng : defaultLongitude;
    
    setLatitude(initialLat);
    setLongitude(initialLng);
    setMarkerPosition({ lat: initialLat, lng: initialLng });

    if (map && isLoaded) { 
        map.panTo({ lat: initialLat, lng: initialLng });
    }
  }, [defaultLatitude, defaultLongitude, map, isLoaded, userLocation, centerMapOnUser]);


  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
    const initialCenter = centerMapOnUser && userLocation ? userLocation : markerPosition;
    mapInstance.panTo(initialCenter);
  }, [markerPosition, userLocation, centerMapOnUser]);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

   const geocodeAddress = async (addressString: string): Promise<{ lat: number, lng: number } | null> => {
        if (!isLoaded || typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.Geocoder) {
            if (isMounted.current) { 
                 toast({ title: "Map Not Ready", description: "Geocoder service is not available yet.", variant: "destructive" });
            }
            return null;
        }
        const geocoder = new window.google.maps.Geocoder();
        try {
            const results = await geocoder.geocode({ address: addressString });
            if (results && results.results[0] && results.results[0].geometry) {
                const location = results.results[0].geometry.location;
                return { lat: location.lat(), lng: location.lng() };
            } else {
                return null;
            }
        } catch (error: any) { 
            console.error("Geocoding error:", error.message); 
            throw new Error("Failed to geocode address. Please check the address or try again.");
        }
    }

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(event.target.value);
   };

   const handlePinByAddress = async () => {
       if (!address) {
           if (isMounted.current) toast({ title: "Missing Address", description: "Please enter an address to pin.", variant: "destructive" });
           return;
       }
       if (!isLoaded) {
            if (isMounted.current) toast({ title: "Map Not Ready", description: "Please wait for the map to load.", variant: "default" });
            return;
       }
       setCenterMapOnUser(false); // Stop centering on user when searching address
       try {
           const coords = await geocodeAddress(address);
           if (coords) {
              setLatitude(coords.lat);
              setLongitude(coords.lng);
              setMarkerPosition(coords);
               map?.panTo(coords);
               if (isMounted.current) toast({ title: "Location Pinned", description: `Pinned to: ${address}.` });
               onPinLocation?.(coords.lat, coords.lng, address);
           } else {
               if (isMounted.current) toast({ title: "Address Not Found", description: "Could not find coordinates for the given address.", variant: "destructive" });
           }
       } catch (error: any) {
           console.error("Geocoding error:", error.message);
           if (isMounted.current) toast({ title: "Geocoding Error", description: error.message || "Failed to find location from address.", variant: "destructive" });
       }
   };

    const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
         if (event.latLng && isLoaded) {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();
            setCenterMapOnUser(false); // Stop centering on user when clicking map
             setLatitude(newLat);
             setLongitude(newLng);
             setMarkerPosition({ lat: newLat, lng: newLng });
             setAddress(''); 
             map?.panTo({ lat: newLat, lng: newLng });
             if (isMounted.current) toast({ title: "Location Pinned", description: "Manually pinned location on the map." });
             onPinLocation?.(newLat, newLng); 
         }
    }, [map, onPinLocation, toast, isLoaded]); 


    const handleConfirmPin = () => {
        if (!isLoaded) {
             if (isMounted.current) toast({ title: "Map Not Ready", description: "Please wait for the map to load.", variant: "default" });
             return;
        }
        if (onPinLocation) {
            onPinLocation(latitude, longitude, address || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
            if (isMounted.current) toast({ title: "Location Confirmed", description: `Location pinned for recommendations.` });
        } else {
            if (isMounted.current) toast({ title: "Info", description: `Current location: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}` });
        }
    };

    const handleRecenterMap = () => {
        if (userLocation && map && isLoaded) {
            map.panTo(userLocation);
            map.setZoom(17); // Zoom in closer when recentering on user
            setCenterMapOnUser(true); // Re-enable auto-centering if user moves
            toast({ title: "Map Recenter", description: "Map centered on your current location." });
        } else if (map && isLoaded) {
            map.panTo(markerPosition); // Center on pinned location if user location not available
            toast({ title: "Map Recenter", description: "Map centered on pinned location." });
        }
    };

  if (!apiKey) {
    return (
      <div className={cn("w-full", customClassName)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Google Maps API Key Missing</AlertTitle>
          <AlertDescription>
            The Google Maps API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) is not configured in your environment variables.
            Map functionality is disabled. Please set the key and ensure it's correctly prefixed with `NEXT_PUBLIC_` to be available on the client-side.
            Refer to the `README.md` file for detailed setup and troubleshooting instructions.
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
                This appears to be an issue with your Google Maps API key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
                Common causes include:
                <ul className="list-disc pl-5 mt-2 text-xs">
                  <li>The API key is incorrect or missing.</li>
                  <li>The **Maps JavaScript API** and/or **Places API** are not enabled for your project in the Google Cloud Console.</li>
                  <li>Billing is not enabled for your Google Cloud Project.</li>
                  <li>API key restrictions (HTTP referrers or API restrictions) are misconfigured.</li>
                </ul>
                <p className="mt-2">Please **CAREFULLY review the "Google Maps API Key" section in the `README.md` file** for detailed troubleshooting steps. Restart your development server after making changes to `.env`.</p>
              </>
            ) : (
              "This might be due to network problems or other configuration issues. Please check your internet connection and the browser console for more details."
            )}
            <p className="text-xs mt-2">Original error: {loadError.message}</p>
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
       <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 items-end">
            <div>
                <Label htmlFor="map-address-input">Enter Address to Pin</Label>
                <Input
                    type="text"
                    id="map-address-input"
                    placeholder="e.g., Cairo Rd, Lusaka"
                    value={address}
                    onChange={handleAddressChange}
                    className="mt-1"
                    disabled={!isLoaded}
                />
            </div>
            <Button size="sm" onClick={handlePinByAddress} className="w-full md:w-auto" disabled={!isLoaded || !address}>Pin from Address</Button>
        </div>

       <div className="rounded-md overflow-hidden border shadow-sm relative" style={containerStyle}>
           <GoogleMap
               mapContainerStyle={{ width: '100%', height: '100%' }}
               center={markerPosition}
               zoom={15}
               onLoad={onLoad}
               onUnmount={onUnmount}
               onClick={handleMapClick}
               options={{
                 streetViewControl: true,
                 mapTypeControl: true,
                 fullscreenControl: false,
                 mapId: 'CARPSO_MAP_ID' 
                }}
           >
                <Marker
                    position={markerPosition}
                    draggable={false} 
                    icon={{ // Custom icon for the main pin
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "hsl(var(--primary))",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "hsl(var(--primary-foreground))",
                    }}
                 />
                 {/* User's current location marker (blue dot with accuracy circle) */}
                  {showUserCar && userLocation && (
                    <>
                      <Marker
                        position={userLocation}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 7,
                          fillColor: '#4285F4', // Google Blue
                          fillOpacity: 1,
                          strokeWeight: 2,
                          strokeColor: 'white',
                        }}
                        title="Your Location"
                      />
                       <Circle
                          center={userLocation}
                          radius={50} // Example accuracy radius in meters
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
                  {/* Pinned car location marker (if any) */}
                  {pinnedCarLocation && (
                     <Marker
                         position={pinnedCarLocation}
                         icon={{
                             url: '/car-pin.png', // Replace with your car icon asset if available
                             scaledSize: new google.maps.Size(30, 30),
                             anchor: new google.maps.Point(15, 30),
                         }}
                         label={{
                           text: pinnedCarLocation.spotId,
                           color: 'hsl(var(--primary-foreground))',
                           fontSize: '10px',
                           fontWeight: 'bold',
                           className: 'bg-primary px-1 py-0.5 rounded-sm shadow-md'
                         }}
                         title={`Pinned Car at ${pinnedCarLocation.spotId}`}
                     />
                  )}
           </GoogleMap>
           {userLocation && (
             <Button
                 variant="outline"
                 size="icon"
                 onClick={handleRecenterMap}
                 className="absolute bottom-3 right-3 z-10 bg-background/80 hover:bg-background"
                 title="Center on my location"
             >
                 <LocateFixed className="h-5 w-5"/>
             </Button>
           )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-center">Click on the map to set a pin manually.</p>

        <div className="flex justify-end mt-3">
            <Button size="default" onClick={handleConfirmPin} disabled={!isLoaded}>
                Use This Pinned Location
            </Button>
        </div>
    </div>
  );
}
