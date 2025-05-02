// src/components/profile/ReportIssueModal.tsx
'use client';

import React, { useState, useRef, useContext } from 'react'; // Added useContext
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { AlertTriangle, Loader2, Camera, ImagePlus, CheckCircle, CircleAlert, Info, WifiOff } from 'lucide-react'; // Added WifiOff
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppStateContext } from '@/context/AppStateProvider'; // Import context

// Extend ParkingHistoryEntry if needed, or use props directly
interface ParkingHistoryEntry {
  id: string;
  spotId: string;
  locationName: string;
  locationId: string;
  startTime: string;
  endTime: string;
  cost: number;
  status: 'Completed' | 'Active' | 'Upcoming';
}

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: ParkingHistoryEntry | null;
  userId: string;
}

// Mock function to simulate report submission
const submitParkingIssueReport = async (data: {
    reservationId: string;
    userId: string;
    spotId: string;
    locationId: string;
    reportedPlateNumber: string;
    details: string;
    photoDataUri?: string;
}): Promise<{ success: boolean; message: string; caseId?: string }> => {
    console.log("Submitting issue report:", data);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

    // Simulate success/failure and potential external API interaction
    const isPlateValid = data.reportedPlateNumber.length > 3; // Basic validation
    const apiCheckSuccess = Math.random() > 0.2; // Simulate RTSA/authority check

    if (isPlateValid && apiCheckSuccess) {
        return { success: true, message: "Report submitted successfully. Case ID: REP" + Math.random().toString(36).substring(2, 8).toUpperCase(), caseId: "REP" + Math.random().toString(36).substring(2, 8).toUpperCase() };
    } else if (!isPlateValid) {
        return { success: false, message: "Invalid license plate number provided." };
    } else {
        return { success: false, message: "Could not verify license plate with authority. Report submitted with limited details." };
    }
};

// Mock function to simulate RTSA/authority check
const checkPlateWithAuthority = async (plateNumber: string): Promise<{ registeredOwner?: string, vehicleMake?: string } | null> => {
    console.log(`Simulating check with authority (e.g., RTSA) for plate: ${plateNumber}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    if (plateNumber.startsWith("FAKE")) {
        return null; // Simulate not found
    }
    // Simulate successful lookup
    return {
        registeredOwner: "John Doe (Simulated)",
        vehicleMake: "Toyota Corolla (Simulated)",
    };
};

export default function ReportIssueModal({ isOpen, onClose, reservation, userId }: ReportIssueModalProps) {
  const { isOnline } = useContext(AppStateContext)!; // Get online status
  const [plateNumber, setPlateNumber] = useState('');
  const [details, setDetails] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPlate, setIsCheckingPlate] = useState(false); // State for authority check
  const [plateCheckResult, setPlateCheckResult] = useState<{ registeredOwner?: string, vehicleMake?: string } | null | 'error'>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
        setPhotoFile(null);
        setPhotoPreview(null);
    }
  };

   const handlePlateNumberChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPlateNumber = e.target.value.toUpperCase();
        setPlateNumber(newPlateNumber);
        setPlateCheckResult(null); // Reset check result on change

         // Don't check if offline
         if (!isOnline) return;

        // Basic check before hitting the 'API'
        if (newPlateNumber.length >= 4) { // Example: check only if length >= 4
            setIsCheckingPlate(true);
            try {
                const result = await checkPlateWithAuthority(newPlateNumber);
                setPlateCheckResult(result);
            } catch (error) {
                console.error("Error checking plate with authority:", error);
                setPlateCheckResult('error');
            } finally {
                setIsCheckingPlate(false);
            }
        }
   };


  const handleSubmit = async () => {
    if (!isOnline) {
         toast({ title: "Offline", description: "Cannot submit report while offline.", variant: "destructive" });
         return;
    }
    if (!reservation || !plateNumber) {
      toast({ title: "Missing Information", description: "Please enter the license plate number.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    let photoDataUri: string | undefined = undefined;
    if (photoFile) {
        // Reuse the preview if available, otherwise read the file again (should be rare)
        if(photoPreview) {
            photoDataUri = photoPreview;
        } else {
            const reader = new FileReader();
            photoDataUri = await new Promise((resolve) => {
                 reader.onloadend = () => resolve(reader.result as string);
                 reader.readAsDataURL(photoFile);
            });
        }
    }

    try {
      const result = await submitParkingIssueReport({
        reservationId: reservation.id,
        userId: userId,
        spotId: reservation.spotId,
        locationId: reservation.locationId,
        reportedPlateNumber: plateNumber,
        details: details,
        photoDataUri: photoDataUri,
      });

      if (result.success) {
        toast({ title: "Report Submitted", description: result.message });
        onClose(); // Close modal on success
        // Reset form state after a delay
         setTimeout(() => {
             setPlateNumber('');
             setDetails('');
             setPhotoFile(null);
             setPhotoPreview(null);
             setPlateCheckResult(null);
         }, 300);
      } else {
        toast({ title: "Submission Failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-destructive" /> Report Issue for Spot {reservation?.spotId.split('-')[1]}
          </DialogTitle>
          <DialogDescription>
            Spot: {reservation?.spotId} at {reservation?.locationName}. <br/>
            Report if the spot you reserved is occupied by another vehicle.
            {!isOnline && <span className="text-destructive font-medium ml-1">(Offline)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
           {/* License Plate Input */}
           <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="plateNumber" className="text-right col-span-1">
               License Plate*
             </Label>
             <div className="col-span-3 relative">
                 <Input
                   id="plateNumber"
                   value={plateNumber}
                   onChange={handlePlateNumberChange}
                   className="uppercase" // Ensure uppercase display
                   placeholder="e.g., ABX 1234"
                   disabled={isLoading || !isOnline}
                   maxLength={10} // Example max length
                 />
                  {isCheckingPlate && isOnline && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
             </div>
           </div>

           {/* Plate Check Result Display */}
            {plateCheckResult && plateCheckResult !== 'error' && isOnline && (
                 <Alert variant="default" className="col-span-4 mt-[-8px] bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                     <AlertDescription className="text-xs text-green-800">
                         Vehicle Found (Simulated): {plateCheckResult.vehicleMake} owned by {plateCheckResult.registeredOwner}.
                     </AlertDescription>
                 </Alert>
            )}
            {plateCheckResult === null && plateNumber.length >= 4 && !isCheckingPlate && isOnline && (
                 <Alert variant="destructive" className="col-span-4 mt-[-8px]">
                    <CircleAlert className="h-4 w-4" />
                     <AlertDescription className="text-xs">
                         License plate not found in authority records (Simulated). Report can still be submitted.
                     </AlertDescription>
                 </Alert>
            )}
             {plateCheckResult === 'error' && isOnline && (
                 <Alert variant="destructive" className="col-span-4 mt-[-8px]">
                    <CircleAlert className="h-4 w-4" />
                     <AlertDescription className="text-xs">
                         Error checking license plate with authority. Report can still be submitted.
                     </AlertDescription>
                 </Alert>
            )}
             {!isOnline && (
                  <Alert variant="warning" className="col-span-4 mt-[-8px]">
                     <WifiOff className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                          Offline: License plate check unavailable.
                      </AlertDescription>
                  </Alert>
             )}


           {/* Details Textarea */}
           <div className="grid grid-cols-4 items-start gap-4">
             <Label htmlFor="details" className="text-right col-span-1 pt-2">
               Details
             </Label>
             <Textarea
               id="details"
               value={details}
               onChange={(e) => setDetails(e.target.value)}
               className="col-span-3 min-h-[60px]"
               placeholder="Optional: Add any relevant details (e.g., vehicle color, time noticed)."
               disabled={isLoading || !isOnline}
             />
           </div>

           {/* Photo Upload */}
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="photo" className="text-right col-span-1">
                    Photo (Optional)
                </Label>
                <div className="col-span-3 flex flex-col">
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || !isOnline}
                            className="flex-shrink-0"
                        >
                            {photoPreview ? <ImagePlus className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                            {photoPreview ? 'Change Photo' : 'Add Photo'}
                        </Button>
                        <Input
                            id="photo"
                            type="file"
                            accept="image/*"
                            capture="environment" // Encourage using the camera directly on mobile
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden" // Hide the default input
                            disabled={isLoading || !isOnline}
                        />
                        {photoPreview ? (
                            <div className="relative h-10 w-16 rounded border overflow-hidden">
                                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                            </div>
                        ) : (
                            <span className="text-xs text-muted-foreground"></span>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1 mt-1">
                         Accepted formats: JPG, PNG.
                    </span>
                </div>
            </div>

           {/* Information Note */}
            <Alert variant="default" className="col-span-4 mt-2 bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                 <AlertDescription className="text-xs text-blue-800">
                     Submitting this report helps us manage parking efficiency. False reports may affect your account status. The license plate will be checked against official records (e.g., RTSA in Zambia) where available (requires internet).
                 </AlertDescription>
             </Alert>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !plateNumber || isCheckingPlate || !isOnline}>
             {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
