// src/components/map/ParkingLotMap.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, MapPinIcon } from 'lucide-react'; // Added Loader2, MapPinIcon
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface ParkingLotMapProps {
    apiKey: string | undefined; // API key can be undefined if not set
    defaultLatitude: number;
    defaultLongitude: number;
    onPinLocation?: (latitude: number, longitude: number, address?: string) => void; // Optional callback
    customClassName?: string;
}

const containerStyle = {
  width: '100%',
  height: '300px',
};

export default function ParkingLotMap({ apiKey, defaultLatitude, defaultLongitude, onPinLocation, customClassName }: ParkingLotMapProps) {
  const { toast } = useToast();

  // Only attempt to load Google Maps if the API key is provided
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '', // Pass empty string if apiKey is undefined to avoid error, though guard below is better
    libraries: ['places'],
    preventGoogleFontsLoading: true, // Optional: if you handle fonts elsewhere
    // Prevent loading if API key is explicitly not provided
    // This hook will not run if apiKey is undefined due to the conditional rendering below.
    // However, if it were to run, this check would be an additional safeguard.
    // disabled: !apiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);
  const [address, setAddress] = useState<string>('');
  const [markerPosition, setMarkerPosition] = useState({
      lat: defaultLatitude,
      lng: defaultLongitude
  });

  useEffect(() => {
    setLatitude(defaultLatitude);
    setLongitude(defaultLongitude);
    setMarkerPosition({ lat: defaultLatitude, lng: defaultLongitude });
    if (map && isLoaded) {
        map.panTo({ lat: defaultLatitude, lng: defaultLongitude });
    }
  }, [defaultLatitude, defaultLongitude, map, isLoaded]);


  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance);
    mapInstance.panTo(markerPosition);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerPosition]); // markerPosition ensures map pans to initial or updated marker

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

   const geocodeAddress = async (addressString: string): Promise<{ lat: number, lng: number } | null> => {
        if (!isLoaded || typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.Geocoder) {
            toast({ title: "Map Not Ready", description: "Geocoder service is not available yet.", variant: "destructive" });
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
            console.error("Geocoding error:", error);
            throw new Error(error.message || "Failed to geocode address.");
        }
    }

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(event.target.value);
   };

   const handlePinByAddress = async () => {
       if (!address) {
           toast({ title: "Missing Address", description: "Please enter an address to pin.", variant: "destructive" });
           return;
       }
       if (!isLoaded) {
            toast({ title: "Map Not Ready", description: "Please wait for the map to load.", variant: "default" });
            return;
       }
       try {
           const coords = await geocodeAddress(address);
           if (coords) {
              setLatitude(coords.lat);
              setLongitude(coords.lng);
              setMarkerPosition(coords);
               map?.panTo(coords);
               toast({ title: "Location Pinned", description: `Pinned to: ${address}.` });
               onPinLocation?.(coords.lat, coords.lng, address);
           } else {
               toast({ title: "Address Not Found", description: "Could not find coordinates for the given address.", variant: "destructive" });
           }
       } catch (error: any) {
           console.error("Geocoding error:", error);
           toast({ title: "Geocoding Error", description: error.message || "Failed to find location from address.", variant: "destructive" });
       }
   };

    const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
         if (event.latLng && isLoaded) {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();

             setLatitude(newLat);
             setLongitude(newLng);
             setMarkerPosition({ lat: newLat, lng: newLng });
             setAddress('');
             map?.panTo({ lat: newLat, lng: newLng });
             toast({ title: "Location Pinned", description: "Manually pinned location on the map." });
             onPinLocation?.(newLat, newLng);
         }
    }, [map, onPinLocation, toast, isLoaded]);


    const handleConfirmPin = () => {
        if (!isLoaded) {
             toast({ title: "Map Not Ready", description: "Please wait for the map to load.", variant: "default" });
             return;
        }
        if (onPinLocation) {
            onPinLocation(latitude, longitude, address || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
            toast({ title: "Location Confirmed", description: `Location pinned for recommendations.` });
        } else {
            toast({ title: "Info", description: `Current location: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}` });
        }
    };

  // If API key is missing, show an error and don't attempt to load the map
  if (!apiKey) {
    return (
      <div className={cn("w-full", customClassName)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Google Maps API Key Missing</AlertTitle>
          <AlertDescription>
            The Google Maps API key is not configured. Map functionality is disabled.
            Please set the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable.
            Refer to the README.md for setup instructions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Existing loading and error states for when the key IS provided but loading fails
  if (loadError) {
    return (
      <div className={cn("w-full", customClassName)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Google Maps Error</AlertTitle>
          <AlertDescription>
            Could not load Google Maps. This might be due to an invalid or misconfigured API key (InvalidKeyMapError),
            billing issues with your Google Cloud project, or network problems.
            Please check your API key configuration, ensure the Maps JavaScript API & Places API are enabled,
            and that billing is active on your project. Refer to README.md for detailed troubleshooting.
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

  // Render the map if API key is present and loading is successful
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
                />
            </div>
            <Button size="sm" onClick={handlePinByAddress} className="w-full md:w-auto">Pin from Address</Button>
        </div>

       <div className="rounded-md overflow-hidden border shadow-sm" style={containerStyle}>
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
                }}
           >
                <Marker
                    position={markerPosition}
                    draggable={false}
                 />
           </GoogleMap>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-center">Click on the map to set a pin manually.</p>

        <div className="flex justify-end mt-3">
            <Button size="default" onClick={handleConfirmPin}>
                Use This Pinned Location
            </Button>
        </div>
    </div>
  );
}
