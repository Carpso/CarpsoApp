// src/components/parking/LiveLocationView.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Video, CameraOff, AlertTriangle, Camera, Image as ImageIcon } from 'lucide-react'; // Added Camera, ImageIcon
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image'; // Import next/image

// Define possible view sources
type ViewSourceType = 'userCamera' | 'ipCamera' | 'stillImage' | 'placeholder' | 'loading' | 'error';

interface LiveLocationViewProps {
  isOpen: boolean;
  onClose: () => void;
  spotId: string | null;
  locationName: string;
  // Simulate available sources for the spot (in real app, this comes from backend)
  availableSources?: {
      ipCameraUrl?: string;
      stillImageUrl?: string;
  };
}

export default function LiveLocationView({
    isOpen,
    onClose,
    spotId,
    locationName,
    availableSources = {} // Default to no special sources
}: LiveLocationViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSource, setCurrentSource] = useState<ViewSourceType>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userStreamActive, setUserStreamActive] = useState(false); // Track if the user's camera stream is active
  const { toast } = useToast();

  // --- Simulation Data ---
  // In a real app, these URLs would come from the backend based on the spotId/location
  const simulatedIpCameraUrl = availableSources.ipCameraUrl || (spotId && spotId.includes('A') ? `https://picsum.photos/seed/${spotId}-ipcam/640/480?blur=1` : undefined); // Example: Lot A has IP cams
  const simulatedStillImageUrl = availableSources.stillImageUrl || `https://picsum.photos/seed/${spotId}-still/640/480`; // All spots have a still image URL

  // --- Source Loading Logic ---
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const cleanupUserCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setUserStreamActive(false);
      }
    };

    const tryUserCamera = async () => {
        if (!isMounted) return;
        console.log("Attempting User Camera");
        setCurrentSource('loading');
        setErrorMessage(null);
        setUserStreamActive(false);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('User camera access is not supported by this browser.');
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (!isMounted) {
                 stream.getTracks().forEach(track => track.stop());
                 return;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setUserStreamActive(true);
                setCurrentSource('userCamera');
                console.log("User Camera Active");
            } else {
                 throw new Error("Video element not ready.");
            }
        } catch (error: any) {
            console.error('Error accessing user camera:', error);
            if (!isMounted) return;
            setErrorMessage(`User Camera Error: ${error.message}. Trying next source...`);
            toast({
                variant: 'default', // Use default variant, as it's an expected fallback path
                title: 'User Camera Unavailable',
                description: `Could not access your camera. Trying other views.`,
            });
            // Fallback to placeholder if all else fails
            tryStillImage(); // Fallback path
        }
    };

     const tryStillImage = async () => {
         if (!isMounted) return;
         console.log("Attempting Still Image");
         if (simulatedStillImageUrl) {
             setCurrentSource('loading');
             setErrorMessage(null);
             // Simulate loading delay for the image
             await new Promise(resolve => setTimeout(resolve, 300));
             if (isMounted) {
                 // We assume the image loads successfully for this simulation
                 setCurrentSource('stillImage');
                 console.log("Still Image Active");
             }
         } else {
              if (isMounted) {
                  setErrorMessage("No still image available. Trying next source...");
                  setCurrentSource('placeholder'); // No other sources left
              }
         }
     }

    const tryIpCamera = async () => {
        if (!isMounted) return;
        console.log("Attempting IP Camera");
        if (simulatedIpCameraUrl) {
            setCurrentSource('loading');
            setErrorMessage(null);
            // Simulate loading delay/check for the IP camera feed
            await new Promise(resolve => setTimeout(resolve, 500));
            if (isMounted) {
                // We assume the "IP camera" loads successfully for this simulation
                setCurrentSource('ipCamera');
                console.log("IP Camera Active (Simulated)");
            }
        } else {
             if (isMounted) {
                 setErrorMessage("IP Camera not available for this spot. Trying next source...");
                 tryUserCamera(); // Fallback path
             }
        }
    };

    if (isOpen && spotId) {
      setCurrentSource('loading');
      setErrorMessage(null);
      setUserStreamActive(false);

      // --- Try sources in order: IP Camera -> User Camera -> Still Image -> Placeholder ---
      tryIpCamera();

    } else if (!isOpen) {
      cleanupUserCamera();
      setCurrentSource('loading'); // Reset state when closed
      setErrorMessage(null);
    }

     return () => {
         isMounted = false;
         cleanupUserCamera(); // Ensure cleanup on unmount
     };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, spotId, simulatedIpCameraUrl, simulatedStillImageUrl]); // Rerun effect when dialog opens/closes or spotId/sources change

  const renderViewContent = () => {
      switch (currentSource) {
          case 'loading':
              return (
                  <div className="flex flex-col items-center text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <span>Loading View...</span>
                  </div>
              );
          case 'userCamera':
              if (userStreamActive) {
                  return <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />;
              }
              // Fallback within userCamera state if stream suddenly fails (should be handled by effect, but as safety)
              return <div className="text-destructive">User camera stream failed.</div>;
          case 'ipCamera':
              // Simulate IP Camera view (using an image for simplicity)
              return (
                    <div className="relative w-full h-full">
                        <Image
                            src={simulatedIpCameraUrl!}
                            alt={`Simulated IP Camera view for spot ${spotId}`}
                            layout="fill"
                            objectFit="cover"
                        />
                        <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">Live IP Cam (Simulated)</Badge>
                   </div>
                );
          case 'stillImage':
              return (
                   <div className="relative w-full h-full">
                       <Image
                           src={simulatedStillImageUrl!}
                           alt={`Still image for spot ${spotId}`}
                           layout="fill"
                           objectFit="cover"
                       />
                       <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">Recent Image</Badge>
                   </div>
              );
          case 'error':
          case 'placeholder':
          default:
              return (
                  <div className="relative w-full h-full flex flex-col items-center justify-center text-center bg-muted">
                      <Image
                          src={`https://picsum.photos/seed/${spotId || 'placeholder'}/640/480?grayscale`}
                          alt={`Placeholder view for spot ${spotId}`}
                          layout="fill"
                          objectFit="cover"
                          className="opacity-30"
                      />
                       <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
                          <Video className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="font-semibold text-muted-foreground">Live View Unavailable</p>
                          {errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage.replace("Trying next source...", "")}</p>}
                       </div>
                  </div>
              );
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px]"> {/* Wider dialog for video/image */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <MapPin className="h-5 w-5 text-primary" />
             Spot View: {spotId}
          </DialogTitle>
          <DialogDescription>
            Location: {locationName}
          </DialogDescription>
        </DialogHeader>

         <div className="my-4 aspect-video w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center">
           {renderViewContent()}
        </div>

        {/* Alert if user explicitly denied camera permission during the process */}
        {currentSource === 'placeholder' && errorMessage?.includes("User Camera Error: NotAllowedError") && (
           <Alert variant="destructive" className="mt-4">
              <CameraOff className="h-4 w-4"/>
              <AlertTitle>User Camera Access Denied</AlertTitle>
              <AlertDescription>
                You denied access to your camera. To use the live view from your device, please enable camera permissions in your browser settings.
              </AlertDescription>
            </Alert>
        )}
         {/* Info about the current view source */}
         <div className="text-xs text-muted-foreground text-center mt-[-10px] mb-2">
            {currentSource === 'userCamera' && <span>Showing live view from your device camera.</span>}
            {currentSource === 'ipCamera' && <span>Showing live view from parking lot camera (Simulated).</span>}
            {currentSource === 'stillImage' && <span>Showing recent still image of the spot.</span>}
            {currentSource === 'placeholder' && <span>Showing placeholder image.</span>}
         </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
           {/* TODO: Add "Switch View" button if multiple sources were detected as available */}
           {/* Example:
           { (simulatedIpCameraUrl && currentSource !== 'ipCamera') && <Button variant="secondary" onClick={tryIpCamera}>Try IP Cam</Button> }
           { (currentSource !== 'userCamera') && <Button variant="secondary" onClick={tryUserCamera}>Try My Camera</Button> }
           */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
