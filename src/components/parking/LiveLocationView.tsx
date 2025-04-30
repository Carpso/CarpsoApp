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
import { Loader2, MapPin, Video, CameraOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image'; // Import next/image

interface LiveLocationViewProps {
  isOpen: boolean;
  onClose: () => void;
  spotId: string | null;
  locationName: string;
}

export default function LiveLocationView({ isOpen, onClose, spotId, locationName }: LiveLocationViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamActive, setStreamActive] = useState(false); // Track if the stream is active
  const { toast } = useToast();

  useEffect(() => {
    // Only attempt to get camera permission if the dialog is open and a spotId is provided
    if (isOpen && spotId && hasCameraPermission === null) {
       setIsLoading(true);
       setStreamActive(false); // Reset stream status on open

      const getCameraPermission = async () => {
        try {
          // Check for mediaDevices support
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
             throw new Error('Camera access is not supported by this browser.');
          }
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          setStreamActive(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setIsLoading(false);
        } catch (error: any) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          setStreamActive(false);
           toast({
            variant: 'destructive',
            title: 'Camera Access Denied or Unavailable',
            description: `Could not access camera: ${error.message}. Please ensure permissions are enabled and your camera is functional. Showing placeholder image instead.`,
          });
           setIsLoading(false);
        }
      };

      getCameraPermission();
    } else if (!isOpen) {
      // Clean up stream when dialog closes
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setStreamActive(false);
      }
      setHasCameraPermission(null); // Reset permission state on close
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, spotId]); // Rerun effect when dialog opens/closes or spotId changes

  const placeholderImageUrl = `https://picsum.photos/seed/${spotId || 'placeholder'}/640/480`; // Use spotId for consistent placeholder


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px]"> {/* Wider dialog for video/image */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <MapPin className="h-5 w-5 text-primary" />
             Live View: Spot {spotId}
          </DialogTitle>
          <DialogDescription>
            Location: {locationName}
          </DialogDescription>
        </DialogHeader>

         <div className="my-4 aspect-video w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center">
           {isLoading ? (
               <div className="flex flex-col items-center text-muted-foreground">
                   <Loader2 className="h-8 w-8 animate-spin mb-2" />
                   <span>Loading Camera...</span>
               </div>
           ) : hasCameraPermission === true && streamActive ? (
               <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
           ) : hasCameraPermission === false ? (
               // Show placeholder image if permission denied or camera unavailable
                <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
                    <Image
                        src={placeholderImageUrl}
                        alt={`Placeholder view for spot ${spotId}`}
                        layout="fill"
                        objectFit="cover"
                        className="opacity-50" // Dim the placeholder
                    />
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-4">
                         <CameraOff className="h-10 w-10 text-destructive mb-2" />
                         <p className="text-destructive-foreground font-semibold">Camera Access Denied/Unavailable</p>
                         <p className="text-xs text-muted-foreground mt-1">Showing placeholder image.</p>
                    </div>
                </div>
           ) : (
                 // Fallback placeholder while loading or in initial state
                <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
                   <Image
                       src={placeholderImageUrl}
                       alt={`Placeholder view for spot ${spotId}`}
                       layout="fill"
                       objectFit="cover"
                       className="opacity-50" // Dim the placeholder
                   />
                   <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-4">
                       <Video className="h-10 w-10 text-muted-foreground mb-2" />
                       <p className="text-muted-foreground">Placeholder Street View</p>
                   </div>
               </div>
           )}
        </div>

        {/* Alert if permission was explicitly denied */}
        {hasCameraPermission === false && (
           <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4"/>
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Live street view requires camera access. Please enable camera permissions in your browser settings and reload if you want to use this feature.
              </AlertDescription>
            </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
           {/* Add other actions if needed, e.g., "Report Issue" */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
