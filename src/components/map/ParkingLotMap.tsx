// src/components/map/ParkingLotMap.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ParkingLotMapProps {
    apiKey: string;
    defaultLatitude: number;
    defaultLongitude: number;
    onPinLocation?: (latitude: number, longitude: number, address?: string) => void; // Optional callback
    customClassName?: string;
}

const containerStyle = {
  width: '100%',
  height: '400px',
};

export default function ParkingLotMap({ apiKey, defaultLatitude, defaultLongitude, onPinLocation, customClassName }: ParkingLotMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);
  const [address, setAddress] = useState<string>('');
    const [markerPosition, setMarkerPosition] = useState({
        lat: defaultLatitude,
        lng: defaultLongitude
    });
  const { toast } = useToast();

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

   // Geocoding function (simulated)
   const geocodeAddress = async (address: string): Promise<{ lat: number, lng: number } | null> => {
        // --- Simulate Geocoding Lookup ---
        await new Promise(resolve => setTimeout(resolve, 500));
        if (address.toLowerCase().includes('error')) {
            throw new Error('Simulated geocoding error.');
        }
        // Return mock coordinates based on the address, for demonstration
        return {
            lat: defaultLatitude + (Math.random() - 0.5) * 0.1, // Slight random offset
            lng: defaultLongitude + (Math.random() - 0.5) * 0.1,
        };
    }

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(event.target.value);
   };

   const handlePinByAddress = async () => {
       try {
           const coords = await geocodeAddress(address);
           if (coords) {
              setLatitude(coords.lat);
              setLongitude(coords.lng);
              setMarkerPosition(coords);
               map?.panTo(coords); // Center the map
               toast({ title: "Location Pinned", description: `Pinned location to address: ${address}.` });
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
         if (event.latLng) {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();

             setLatitude(newLat);
             setLongitude(newLng);
             setMarkerPosition({ lat: newLat, lng: newLng });
             // Clear address input since pinning manually
             setAddress('');
             map?.panTo({ lat: newLat, lng: newLng });
             toast({ title: "Location Pinned", description: "Manually pinned location on the map." });
             onPinLocation?.(newLat, newLng);
         }
    }, [map, onPinLocation, toast]);


    const handlePinCurrentLocation = () => {
         onPinLocation?.(latitude, longitude, address); // Still pass the address (if manually entered)
    };

  return (
    <div className={cn("w-full", customClassName)}>
      {loadError && <p>Error loading Google Maps.</p>}
      {!isLoaded ? (
        <p>Loading Google Maps...</p>
      ) : (
        <>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <div>
                    <Label htmlFor="address">Enter Address</Label>
                    <Input
                        type="text"
                        id="address"
                        placeholder="e.g., 123 Main St, Anytown"
                        value={address}
                        onChange={handleAddressChange}
                    />
                </div>
                <div className="flex items-end pb-1">
                     <Button size="sm" onClick={handlePinByAddress}>Pin from Address</Button>
                </div>
            </div>
            {/* Display Current Coordinates */}
           <p className="text-sm text-muted-foreground">Current Coordinates: Lat {latitude.toFixed(6)}, Lng {longitude.toFixed(6)}</p>

           <div style={{ height: '400px', width: '100%' }}>
               <GoogleMap
                   mapContainerStyle={containerStyle}
                   center={markerPosition}
                   zoom={15}
                   onLoad={onLoad}
                   onUnmount={onUnmount}
                   onClick={handleMapClick}
                   options={{
                     streetViewControl: false,
                     mapTypeControl: false,
                    }}
               >
                    <Marker
                        position={markerPosition}
                        draggable={false}
                     />
               </GoogleMap>
            </div>

            <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handlePinCurrentLocation}>
                    Pin This Location
                </Button>
            </div>
        </>
      )}
    </div>
  );
}
