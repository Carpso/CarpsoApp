// src/components/parking/LiveLocationView.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Video, CameraOff, AlertTriangle, Camera, RefreshCcw, Smartphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewSourceType = 'userCamera' | 'ipCamera' | 'placeholder' | 'loading' | 'error';

interface LiveLocationViewProps {
  isOpen: boolean;
  onClose: () => void;
  spotId: string | null;
  locationName: string;
  availableSources?: {
      ipCameraUrl?: string;
  };
}

export default function LiveLocationView({
    isOpen,
    onClose,
    spotId,
    locationName,
    availableSources = {}
}: LiveLocationViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSource, setCurrentSource] = useState<ViewSourceType>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userStreamActive, setUserStreamActive] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const simulatedIpCameraUrl = availableSources.ipCameraUrl || (spotId && spotId.includes('A') ? `https://picsum.photos/seed/${spotId}-ipcam/640/480?blur=1` : undefined);

  useEffect(() => {
    const getVideoDevices = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        console.warn("enumerateDevices() not supported or navigator not available.");
        setErrorMessage("Cannot access camera devices on this browser/device.");
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputs);
        const backCamera = videoInputs.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('environment'));
        setSelectedDeviceId(backCamera?.deviceId || videoInputs[0]?.deviceId);
        console.log("Available video devices:", videoInputs);
      } catch (err) {
        console.error("Error enumerating devices:", err);
        setErrorMessage("Error listing camera devices.");
      }
    };

    if (isOpen) {
      getVideoDevices();
    } else {
      setVideoDevices([]);
    }
  }, [isOpen]);

   const cleanupStream = useCallback((streamToClean: MediaStream | null) => {
      if (streamToClean) {
         streamToClean.getTracks().forEach(track => track.stop());
         console.log("Stream tracks stopped.");
      }
      if (videoRef.current) {
         videoRef.current.srcObject = null;
      }
      setActiveStream(null);
      setUserStreamActive(false);
   }, []);

  const loadSource = useCallback(async (sourceType: ViewSourceType, deviceId?: string) => {
      console.log(`Attempting to load source: ${sourceType}${deviceId ? ` (Device: ${deviceId})` : ''}`);
      setCurrentSource('loading');
      setErrorMessage(null);
      cleanupStream(activeStream);

      switch (sourceType) {
          case 'userCamera':
              if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                  setErrorMessage('User camera access is not supported by this browser.');
                  setCurrentSource('error');
                  toast({ variant: 'destructive', title: 'Camera Not Supported', description: 'Your browser does not support camera access.' });
                  return;
              }
              try {
                  const constraints: MediaStreamConstraints = {
                     video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" }
                 };
                  console.log("Requesting user media with constraints:", constraints);
                  const stream = await navigator.mediaDevices.getUserMedia(constraints);
                  setActiveStream(stream);

                   if (videoRef.current) {
                      videoRef.current.srcObject = stream;
                      videoRef.current.muted = true;
                      await videoRef.current.play().catch(playError => {
                          console.error("Video play failed:", playError);
                          setCurrentSource('error');
                          setErrorMessage("Could not play video stream. Ensure autoplay is allowed.");
                          cleanupStream(stream);
                      });

                       if (currentSource !== 'error') { // Check if state was changed by play error
                            setUserStreamActive(true);
                            setCurrentSource('userCamera');
                            setSelectedDeviceId(deviceId || stream.getVideoTracks()[0]?.getSettings().deviceId);
                            console.log("User Camera Active");
                        }
                  } else {
                       console.warn("Video element ref not ready when stream was obtained. Cleaning up.");
                       cleanupStream(stream);
                       setCurrentSource('error');
                       setErrorMessage("Video element disappeared during setup.");
                  }
              } catch (error: any) {
                  console.error('Error accessing user camera:', error);
                  let userFriendlyError = `Could not access camera. ${error.message || error.name || 'Unknown error'}`;
                  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") userFriendlyError = "Camera permission denied. Please enable permissions in browser settings.";
                  else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") userFriendlyError = "Selected camera not found.";
                  else if (error.name === "NotReadableError" || error.name === "TrackStartError") userFriendlyError = "Camera is already in use or hardware error occurred.";
                  else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
                      userFriendlyError = `Could not satisfy camera constraints. Trying default.`;
                      if (deviceId) {
                           console.log("Retrying with default camera constraints...");
                           setTimeout(() => loadSource('userCamera'), 100);
                           return;
                      }
                  }
                  setErrorMessage(`User Camera Error: ${userFriendlyError}`);
                  setCurrentSource('error');
                  setActiveStream(null);
                  setUserStreamActive(false);
                  toast({ variant: 'destructive', title: 'User Camera Failed', description: userFriendlyError, duration: 5000 });
              }
              break;
          case 'ipCamera':
              if (simulatedIpCameraUrl) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                  setCurrentSource('ipCamera');
                  console.log("IP Camera Active (Simulated)");
              } else {
                  console.log("IP Camera not available, trying user camera...");
                  loadSource('userCamera', selectedDeviceId);
              }
              break;
          default:
              setCurrentSource('placeholder');
              setErrorMessage("Selected view source is not available.");
              break;
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStream, cleanupStream, simulatedIpCameraUrl, toast, currentSource]); // Added currentSource to dependencies

  useEffect(() => {
    if (isOpen && spotId) {
      if (simulatedIpCameraUrl) loadSource('ipCamera');
      else loadSource('userCamera', selectedDeviceId);
    } else if (!isOpen) {
      cleanupStream(activeStream);
      setCurrentSource('loading');
      setErrorMessage(null);
      setActiveStream(null);
      setUserStreamActive(false);
      setSelectedDeviceId(undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, spotId]); // Note: `loadSource` and `cleanupStream` are stable due to useCallback with careful dependencies.

  useEffect(() => {
    return () => cleanupStream(activeStream);
  }, [activeStream, cleanupStream]);

  const handleSourceSwitch = (source: ViewSourceType) => {
      if (source === 'userCamera') loadSource('userCamera', selectedDeviceId);
      else loadSource(source);
  };

  const handleCameraDeviceChange = (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      loadSource('userCamera', deviceId);
  };

  const renderViewContent = () => {
      return (
          <>
              <div className={cn("absolute inset-0 flex flex-col items-center justify-center text-muted-foreground z-10 transition-opacity", currentSource === 'loading' ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
                  <Loader2 className="h-8 w-8 animate-spin mb-2" /> <span>Loading View...</span>
              </div>
              <video ref={videoRef} className={cn("w-full h-full object-cover", currentSource === 'userCamera' && userStreamActive ? 'block' : 'hidden')} autoPlay muted playsInline />
               <div className={cn("relative w-full h-full", currentSource === 'ipCamera' ? 'block' : 'hidden')}>
                   {simulatedIpCameraUrl && (
                        <>
                        <Image src={simulatedIpCameraUrl} alt={`Simulated IP Camera view for spot ${spotId}`} layout="fill" objectFit="cover" data-ai-hint="parking lot surveillance camera" unoptimized />
                         <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs z-10">Live IP Cam (Simulated)</Badge>
                       </>
                   )}
               </div>
                <div className={cn("relative w-full h-full flex flex-col items-center justify-center text-center bg-muted", (currentSource === 'placeholder' || currentSource === 'error') ? 'flex' : 'hidden')}>
                    <Image src={`https://picsum.photos/seed/${spotId || 'placeholder'}/640/480?grayscale`} alt={`Placeholder view for spot ${spotId}`} layout="fill" objectFit="cover" className="opacity-30" data-ai-hint="empty parking spot placeholder" unoptimized />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
                        <Video className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="font-semibold text-muted-foreground">Live View Unavailable</p>
                        {errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
                         {currentSource === 'error' && errorMessage?.includes('User Camera') && (
                             <Button variant="secondary" size="sm" className="mt-3" onClick={() => loadSource('userCamera', selectedDeviceId)}>
                                 <RefreshCcw className="mr-2 h-4 w-4" /> Retry My Camera
                             </Button>
                         )}
                    </div>
               </div>
          </>
      );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader> <DialogTitle className="flex items-center gap-2"> <MapPin className="h-5 w-5 text-primary" /> Spot View: {spotId} </DialogTitle> <DialogDescription> Location: {locationName} </DialogDescription> </DialogHeader>
         <div className="my-4 aspect-video w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center relative"> {renderViewContent()} </div>
        {errorMessage?.includes("Camera permission denied") && (
           <Alert variant="destructive" className="mt-4"> <CameraOff className="h-4 w-4"/> <AlertTitle>User Camera Access Denied</AlertTitle> <AlertDescription> Please enable camera permissions in your browser settings to use this feature. </AlertDescription> </Alert>
        )}
         {currentSource === 'error' && !errorMessage?.includes("Camera permission denied") && (
             <Alert variant="warning" className="mt-4"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>View Unavailable</AlertTitle> <AlertDescription>{errorMessage || "The selected view could not be loaded."}</AlertDescription> </Alert>
         )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {simulatedIpCameraUrl && (
                <Button variant={currentSource === 'ipCamera' ? 'default' : 'outline'} size="sm" onClick={() => handleSourceSwitch('ipCamera')} disabled={currentSource === 'loading'}> <Camera className="mr-2 h-4 w-4" /> IP Cam </Button>
            )}
            {videoDevices.length > 1 && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia ? (
                <Select value={selectedDeviceId} onValueChange={handleCameraDeviceChange} disabled={currentSource === 'loading'}>
                    <SelectTrigger className="w-auto h-9 px-3 text-sm gap-2 flex-grow sm:flex-grow-0" aria-label="Select Camera"> <Smartphone className="h-4 w-4 shrink-0" /> <SelectValue placeholder="Select Camera" /> </SelectTrigger>
                    <SelectContent> {videoDevices.map(device => ( <SelectItem key={device.deviceId} value={device.deviceId}> {device.label || `Camera ${videoDevices.indexOf(device) + 1}`} </SelectItem> ))} </SelectContent>
                </Select>
            ) : (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) ? (
                 <Button variant={currentSource === 'userCamera' ? 'default' : 'outline'} size="sm" onClick={() => handleSourceSwitch('userCamera')} disabled={currentSource === 'loading'}> <Smartphone className="mr-2 h-4 w-4" /> My Camera </Button>
            ) : null }
        </div>
        <DialogFooter className="mt-4"> <Button variant="outline" onClick={onClose}>Close</Button> </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
