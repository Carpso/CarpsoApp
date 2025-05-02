// src/app/attendant/page.tsx
'use client';

import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Car, Phone, User, AlertTriangle, ShieldOff, QrCode, Camera, CheckCircle, VideoOff } from 'lucide-react'; // Added QrCode, Camera, CheckCircle, VideoOff
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider';
import { searchUserOrVehicleByAttendant, AttendantSearchResult } from '@/services/user-service';
import { useRouter } from 'next/navigation';
import { confirmUserArrival, confirmSpotOccupancy, AttendantConfirmationResult } from '@/services/attendant-service'; // Import attendant service
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'; // Import Alert for camera permissions

export default function AttendantDashboardPage() {
  const { isAuthenticated, userRole } = useContext(AppStateContext)!;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AttendantSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState(''); // To avoid redundant searches
  const [isScanning, setIsScanning] = useState(false); // State for QR scanning simulation
  const [scannedData, setScannedData] = useState<string | null>(null); // State for scanned QR data
  const [isConfirming, setIsConfirming] = useState(false); // State for confirmation actions
  const [showCamera, setShowCamera] = useState(false); // State to toggle camera view
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Authorization check
  useEffect(() => {
      if (typeof window !== 'undefined' && (!isAuthenticated || userRole !== 'ParkingAttendant')) {
          if (isAuthenticated) {
              toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
          } else {
              toast({ title: "Authentication Required", description: "Please sign in as an attendant.", variant: "destructive" });
          }
          router.push('/'); // Redirect unauthorized users
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole, router, toast]); // Add router and toast to deps


  // Camera Permission and Stream Handling
   useEffect(() => {
       let stream: MediaStream | null = null;

       const getCameraPermission = async () => {
           if (!showCamera) return; // Only request if camera view is shown
           try {
               stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); // Prefer back camera
               setHasCameraPermission(true);
               if (videoRef.current) {
                   videoRef.current.srcObject = stream;
                   videoRef.current.muted = true; // Ensure muted
                   videoRef.current.play().catch(err => console.error("Video play error:", err));
               }
           } catch (error) {
               console.error('Error accessing camera:', error);
               setHasCameraPermission(false);
               toast({
                   variant: 'destructive',
                   title: 'Camera Access Denied',
                   description: 'Please enable camera permissions in your browser settings to use QR scanning.',
               });
           }
       };

        if (showCamera) {
            getCameraPermission();
        } else {
            // Cleanup stream when camera view is hidden
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            setHasCameraPermission(null); // Reset permission status
        }

       // Cleanup function
       return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                 (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                 videoRef.current.srcObject = null;
             }
       };
   }, [showCamera, toast]);


  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery === lastSearchQuery) return; // Don't search if query is empty or unchanged

    setIsLoading(true);
    setLastSearchQuery(searchQuery); // Store the query being searched
    setSearchResults([]); // Clear previous results
    setScannedData(null); // Clear scanned data on new search
    try {
      const results = await searchUserOrVehicleByAttendant(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast({ title: "No Results", description: `No users or vehicles found matching "${searchQuery}".` });
      }
    } catch (error) {
      console.error("Error during attendant search:", error);
      toast({ title: "Search Error", description: "Could not perform search. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, lastSearchQuery, toast]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Simulate QR Code Scanning
  const handleScanQRCode = () => {
      if (!showCamera) {
          setShowCamera(true); // Turn on camera if not already on
          return; // Wait for camera to activate
      }

      setIsScanning(true);
      setScannedData(null); // Clear previous scan
      setSearchResults([]); // Clear search results
      setLastSearchQuery(''); // Clear last search query
      setSearchQuery(''); // Clear search input

      console.log("Simulating QR code scan...");
      toast({ title: "Scanning...", description: "Point camera at QR code (Simulation)" });

      // Simulate finding a QR code after a delay
      setTimeout(() => {
          const mockQrData = `CARPSO-lot_A-S5-${Date.now()}-user_abc123`; // Example QR data
          console.log("QR Code Scanned (Simulated):", mockQrData);
          setScannedData(mockQrData);
          setIsScanning(false);
          toast({ title: "QR Code Scanned!", description: `Data: ${mockQrData}` });
          // TODO: Optionally parse mockQrData and display structured info
      }, 2500);
  };

  // Simulate Confirmation Actions
   const handleConfirmAction = async (actionType: 'arrival' | 'occupancy_free' | 'occupancy_occupied') => {
       let targetIdentifier: string | null = null;
       let confirmationResult: AttendantConfirmationResult | null = null;

       // Determine target based on scanned data or search results
       if (scannedData) {
           // Extract relevant ID from QR code (e.g., reservation ID or Spot ID)
            const parts = scannedData.split('-'); // Example parsing
            targetIdentifier = parts[1] || null; // Assuming Spot ID is second part
            // If QR has reservation ID, use that primarily for arrival
       } else if (searchResults.length === 1) {
           // Use the single search result's spot or reservation ID if applicable
           targetIdentifier = searchResults[0].vehiclePlate; // Example: Confirming based on plate search
           // Need a way to link search result to a specific reservation or spot ID reliably
            console.warn("Confirming based on search result is ambiguous. Using plate as identifier.");
       } else {
           toast({ title: "Ambiguous Target", description: "Scan QR or search for a single user/vehicle to confirm.", variant: "destructive" });
           return;
       }

       if (!targetIdentifier) {
            toast({ title: "Missing Information", description: "Could not identify the target for confirmation.", variant: "destructive" });
            return;
       }

       setIsConfirming(true);
       try {
           switch (actionType) {
               case 'arrival':
                   // Assume targetIdentifier is reservationId or needs lookup
                    confirmationResult = await confirmUserArrival(targetIdentifier);
                   break;
               case 'occupancy_free':
                    confirmationResult = await confirmSpotOccupancy(targetIdentifier, false);
                   break;
               case 'occupancy_occupied':
                    confirmationResult = await confirmSpotOccupancy(targetIdentifier, true);
                   break;
           }

           if (confirmationResult?.success) {
               toast({ title: "Confirmation Successful", description: confirmationResult.message });
               // Clear relevant state after success
               setScannedData(null);
               setSearchResults([]);
               setSearchQuery('');
               setLastSearchQuery('');
           } else {
               toast({ title: "Confirmation Failed", description: confirmationResult?.message || "Could not complete confirmation.", variant: "destructive" });
           }

       } catch (error) {
           console.error("Error during confirmation:", error);
           toast({ title: "Confirmation Error", variant: "destructive" });
       } finally {
           setIsConfirming(false);
       }
   };

  // Early return if not authorized or while redirecting
  if (typeof window !== 'undefined' && (!isAuthenticated || userRole !== 'ParkingAttendant')) {
    return (
      <div className="container py-8 px-4 md:px-6 lg:px-8 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
        <p>Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <User className="h-6 w-6 text-primary" />
            Attendant Dashboard
          </CardTitle>
          <CardDescription>
            Search user/vehicle details or scan QR codes for confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {/* Search & Scan Actions */}
           <div className="flex flex-col sm:flex-row w-full items-center gap-2 mb-6">
                <div className="flex flex-grow w-full items-center space-x-2">
                    <Input
                        type="text"
                        placeholder="Enter License Plate or Phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading || isScanning}
                        className="flex-grow"
                    />
                    <Button onClick={handleSearch} disabled={isLoading || isScanning || !searchQuery || searchQuery === lastSearchQuery}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Search
                    </Button>
                </div>
                 {/* QR Scan Button */}
                 <Button onClick={handleScanQRCode} disabled={isLoading || isScanning || hasCameraPermission === false} variant="outline" className="w-full sm:w-auto">
                     {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : showCamera ? <VideoOff className="mr-2 h-4 w-4"/> : <QrCode className="mr-2 h-4 w-4" />}
                     {isScanning ? "Scanning..." : showCamera ? "Stop Scan" : "Scan QR"}
                 </Button>
           </div>

           {/* Camera View for QR Scanning */}
           {showCamera && (
                <div className="mb-6 border rounded-md overflow-hidden aspect-video relative bg-muted">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4">
                            <Alert variant="destructive" className="max-w-sm">
                              <AlertTriangle className="h-4 w-4"/>
                              <AlertTitle>Camera Access Required</AlertTitle>
                              <AlertDescription>
                                Please allow camera access in your browser settings to use QR scanning.
                              </AlertDescription>
                            </Alert>
                        </div>
                    )}
                     {/* Optional: Add overlay for scanning area visualization */}
                     {/* <div className="absolute inset-0 border-4 border-primary/50 rounded-md m-8"></div> */}
                </div>
           )}

          {/* Scanned QR Data Display & Actions */}
          {scannedData && (
              <Card className="mb-6 bg-secondary">
                  <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600"/> QR Code Scanned
                      </CardTitle>
                      <CardDescription>Data: <code className="text-xs">{scannedData}</code></CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleConfirmAction('arrival')} disabled={isConfirming}>
                          {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Confirm Arrival/Entry
                      </Button>
                      {/* Add other actions based on QR data type if needed */}
                      {/* Example: Confirm Spot Occupancy (if QR relates to a spot) */}
                        <Button size="sm" variant="outline" onClick={() => handleConfirmAction('occupancy_occupied')} disabled={isConfirming}>
                           {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Mark Spot Occupied
                        </Button>
                         <Button size="sm" variant="outline" onClick={() => handleConfirmAction('occupancy_free')} disabled={isConfirming}>
                           {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Mark Spot Free
                        </Button>
                  </CardContent>
              </Card>
          )}

          {/* Search Results Table */}
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : searchResults.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((result, index) => (
                    <TableRow key={`${result.userId}-${result.vehiclePlate}-${index}`}>
                      <TableCell className="font-medium">{result.userName}</TableCell>
                      <TableCell>{result.phone || 'N/A'}</TableCell>
                      <TableCell>
                         <Badge variant="secondary">{result.vehiclePlate}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                          {result.vehicleMake && result.vehicleModel
                              ? `${result.vehicleMake} ${result.vehicleModel}`
                              : 'N/A'}
                      </TableCell>
                      {/* Actions column */}
                       <TableCell className="text-right space-x-1">
                          {/* Add confirmation buttons if only one result */}
                          {searchResults.length === 1 && (
                              <>
                                <Button size="sm" variant="default" onClick={() => handleConfirmAction('arrival')} disabled={isConfirming}>
                                    {isConfirming ? <Loader2 className="h-3 w-3 animate-spin"/> : null} Confirm Arrival
                                </Button>
                                 {/* Add more specific confirmation actions based on search context */}
                              </>
                          )}
                           {/* Or a generic 'View Details' button */}
                           {searchResults.length > 1 && <Button variant="ghost" size="sm">View</Button>}
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : lastSearchQuery ? ( // Only show "No results" if a search was performed
               <p className="text-muted-foreground text-center py-4">No results found for "{lastSearchQuery}".</p>
            ) : !scannedData ? ( // Only show prompt if no scan data either
                 <p className="text-muted-foreground text-center py-4">Enter license plate/phone or scan QR code.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

```
  </change>
  <change>
    <file>src/services/attendant-service.ts</file>
    <description>Create a new service file for attendant-specific actions like confirmations.</description>
    <content><![CDATA[// src/services/attendant-service.ts

/**
 * Interface for the result of an attendant confirmation action.
 */
export interface AttendantConfirmationResult {
  success: boolean;
  message: string;
}

/**
 * Simulates confirming a user's arrival based on a reservation or QR code identifier.
 * In a real app, this would update the reservation status in the database.
 *
 * @param identifier The identifier from QR scan or search (e.g., reservation ID, spot ID).
 * @returns A promise resolving to an AttendantConfirmationResult.
 */
export async function confirmUserArrival(identifier: string): Promise<AttendantConfirmationResult> {
  console.log(`Attendant confirming arrival for identifier: ${identifier}`);
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API call

  // --- Mock Logic ---
  const success = Math.random() > 0.1; // 90% success rate

  if (success) {
    // TODO: In real app, update reservation status to 'Active' or 'Checked-In'.
    // Link the identifier to the actual reservation if needed.
    console.log(`Successfully confirmed arrival for ${identifier}.`);
    return { success: true, message: `Arrival confirmed for ${identifier}.` };
  } else {
    console.error(`Failed to confirm arrival for ${identifier} (Simulated error).`);
    return { success: false, message: `Could not confirm arrival for ${identifier}. Reservation might be invalid or already active.` };
  }
  // --- End Mock Logic ---
}

/**
 * Simulates confirming the occupancy status of a specific spot by an attendant.
 * In a real app, this might override the sensor data or trigger alerts.
 *
 * @param spotId The ID of the parking spot being confirmed.
 * @param isOccupied The confirmed status (true if occupied, false if free).
 * @returns A promise resolving to an AttendantConfirmationResult.
 */
export async function confirmSpotOccupancy(spotId: string, isOccupied: boolean): Promise<AttendantConfirmationResult> {
  console.log(`Attendant confirming spot ${spotId} as ${isOccupied ? 'OCCUPIED' : 'FREE'}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

  // --- Mock Logic ---
  const success = Math.random() > 0.05; // 95% success rate

  if (success) {
    // TODO: In real app:
    // 1. Update the spot status in the database (potentially overriding sensor).
    // 2. Log the manual confirmation event.
    // 3. If confirming as FREE and there's a queue, trigger notification to the next user (call queue-service).
    // 4. If confirming as OCCUPIED and sensor says FREE, log discrepancy or alert admin.
    console.log(`Successfully confirmed spot ${spotId} status.`);
    return { success: true, message: `Spot ${spotId} status confirmed as ${isOccupied ? 'Occupied' : 'Free'}.` };
  } else {
    console.error(`Failed to confirm occupancy for ${spotId} (Simulated error).`);
    return { success: false, message: `Could not update status for spot ${spotId}. Please try again.` };
  }
  // --- End Mock Logic ---
}

// Add other attendant-specific functions here, e.g.,
// - Assisting with payments
// - Reporting incidents
// - Managing temporary spot closures

