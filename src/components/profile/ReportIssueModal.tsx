// src/components/profile/ReportIssueModal.tsx
'use client';

import React, { useState, useRef, useContext } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, Camera, ImagePlus, CheckCircle, CircleAlert, Info, WifiOff, Printer, MessageSquare } from 'lucide-react'; // Added MessageSquare
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription as AlertDescriptionSub } from '@/components/ui/alert'; // Use Sub alias
import { AppStateContext } from '@/context/AppStateProvider';
import { checkPlateWithAuthority } from '@/services/authority-check';
import type { ParkingRecord } from '@/services/pricing-service'; // Import ParkingRecord type
import { useRouter } from 'next/navigation'; // Import useRouter

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: ParkingRecord | null; // Use ParkingRecord type
  userId: string;
}

const submitParkingIssueReport = async (data: {
    reservationId: string;
    userId: string;
    spotId: string;
    locationId: string;
    reportedPlateNumber: string;
    details: string;
    photoDataUri?: string;
    timestamp: string;
}): Promise<{ success: boolean; message: string; caseId?: string; timestamp: string }> => {
    console.log("Submitting issue report:", data);
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    const isPlateValid = data.reportedPlateNumber.length > 3; 
    const apiCheckSuccess = Math.random() > 0.2; 
    const caseId = "REP" + Math.random().toString(36).substring(2, 8).toUpperCase();

    console.log(`Report ${caseId}: Notifying Attendant for location ${data.locationId}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Report ${caseId}: Escalating to Owner for location ${data.locationId}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Report ${caseId}: Logging for Carpso Management review...`);

    let message = `Report submitted successfully. It has been forwarded to the parking attendant and owner. Case ID: ${caseId}`;
    let success = true;

    if (!isPlateValid) {
        message = `Invalid license plate. ${message}`; 
    } else if (!apiCheckSuccess) {
         message = `Could not verify plate with authority. ${message}`;
    }

    return { success: success, message: message, caseId: caseId, timestamp: data.timestamp };
};


export default function ReportIssueModal({ isOpen, onClose, reservation, userId }: ReportIssueModalProps) {
  const { isOnline } = useContext(AppStateContext)!;
  const [plateNumber, setPlateNumber] = useState('');
  const [details, setDetails] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPlate, setIsCheckingPlate] = useState(false);
  const [plateCheckResult, setPlateCheckResult] = useState<{ registeredOwner?: string, vehicleMake?: string } | null | 'error'>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter(); // Initialize router

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
        setPlateCheckResult(null); 

         if (!isOnline) return;

        if (newPlateNumber.length >= 4) { 
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

    const handlePrintReportConfirmation = (reportData: any) => {
        if (!reportData) return;
        console.log("Simulating print report confirmation:", reportData);
        const printWindow = window.open('', '_blank', 'height=600,width=400');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Issue Report Confirmation</title>');
            printWindow.document.write('<style>body{font-family:sans-serif;margin:1rem;}h2,h3{margin-bottom:0.5rem;}p{margin:0.2rem 0;}hr{border:none;border-top:1px dashed #ccc;margin:0.5rem 0;}</style>');
            printWindow.document.write('</head><body>');
            const receiptHtml = `
                <h2>Issue Report Confirmation</h2>
                <p><strong>Date:</strong> ${new Date(reportData.timestamp).toLocaleString()}</p>
                <p><strong>Case ID:</strong> ${reportData.caseId || 'N/A'}</p>
                <hr />
                <p><strong>Reported Spot:</strong> ${reportData.spotId}</p>
                <p><strong>Location:</strong> ${reportData.locationName}</p>
                <p><strong>Reported Plate:</strong> ${reportData.reportedPlateNumber}</p>
                ${reportData.plateCheckResult && reportData.plateCheckResult !== 'error' && isOnline ? `<p><strong>Vehicle (Simulated):</strong> ${reportData.plateCheckResult.vehicleMake} - Owner: ${reportData.plateCheckResult.registeredOwner}</p>` : ''}
                ${reportData.details ? `<p><strong>Details:</strong> ${reportData.details}</p>` : ''}
                ${reportData.photoSubmitted ? '<p><i>Photo submitted.</i></p>' : ''}
                <hr />
                 <p><i>This report has been forwarded to the parking attendant and owner for review.</i></p>
                 <p style="text-align:center; font-size: 0.8em;">Keep this confirmation for your records.</p>
                 <p style="text-align:center; font-size: 0.8em;">Thank you for helping improve Carpso!</p>
            `;
            printWindow.document.body.innerHTML = receiptHtml;
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        } else {
            toast({ title: "Print Error", description: "Could not open print window.", variant: "destructive" });
        }
        toast({ title: "Printing Confirmation...", description: "Browser print dialog should open.", duration: 3000 });
    };

    const handleChatWithSupport = () => {
        if (!reservation || !isOnline) return;
        // Navigate to chat page with context
        router.push(`/chat?startWithSupport=true&contextType=reservation_issue&relatedId=${reservation.recordId}`);
        onClose(); // Close this modal
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

    const reportTimestamp = new Date().toISOString();

    try {
      const result = await submitParkingIssueReport({
        reservationId: reservation.recordId, // Use recordId from reservation
        userId: userId,
        spotId: reservation.spotId,
        locationId: reservation.locationId,
        reportedPlateNumber: plateNumber,
        details: details,
        photoDataUri: photoDataUri,
        timestamp: reportTimestamp,
      });

      const reportDataForReceipt = {
             timestamp: result.timestamp,
             caseId: result.caseId,
             spotId: reservation.spotId,
             locationName: reservation.lotName, // Use lotName from reservation
             reportedPlateNumber: plateNumber,
             details: details,
             photoSubmitted: !!photoPreview,
             plateCheckResult: plateCheckResult,
         };

      toast({
          title: result.success ? "Report Submitted" : "Report Submitted (with issues)",
          description: (
              <div className="flex flex-col gap-2">
                  <span>{result.message}</span>
                  {result.caseId && ( 
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePrintReportConfirmation(reportDataForReceipt)}
                        className="mt-2"
                    >
                       <Printer className="mr-2 h-4 w-4"/> Print Confirmation
                    </Button>
                  )}
              </div>
          ),
          variant: result.success ? "default" : "warning", 
          duration: 10000, 
      });
      onClose();
         setTimeout(() => {
             setPlateNumber('');
             setDetails('');
             setPhotoFile(null);
             setPhotoPreview(null);
             setPlateCheckResult(null);
         }, 300);

    } catch (error: any) {
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
            Spot: {reservation?.spotId} at {reservation?.lotName}. <br/> {/* Use lotName */}
            Report if the spot you reserved is occupied by another vehicle.
            {!isOnline && <span className="text-destructive font-medium ml-1">(Offline)</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
           <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="plateNumber" className="text-right col-span-1">
               License Plate*
             </Label>
             <div className="col-span-3 relative">
                 <Input
                   id="plateNumber"
                   value={plateNumber}
                   onChange={handlePlateNumberChange}
                   className="uppercase" 
                   placeholder="e.g., ABX 1234"
                   disabled={isLoading || !isOnline}
                   maxLength={10}
                 />
                  {isCheckingPlate && isOnline && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
             </div>
           </div>

            {plateCheckResult && plateCheckResult !== 'error' && isOnline && (
                 <Alert variant="default" className="col-span-4 mt-[-8px] bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                     <AlertDescriptionSub className="text-xs text-green-800">
                         Vehicle Found (Simulated): {plateCheckResult.vehicleMake} owned by {plateCheckResult.registeredOwner}.
                     </AlertDescriptionSub>
                 </Alert>
            )}
            {plateCheckResult === null && plateNumber.length >= 4 && !isCheckingPlate && isOnline && (
                 <Alert variant="destructive" className="col-span-4 mt-[-8px]">
                    <CircleAlert className="h-4 w-4" />
                     <AlertDescriptionSub className="text-xs">
                         License plate not found in authority records (Simulated). Report can still be submitted.
                     </AlertDescriptionSub>
                 </Alert>
            )}
             {plateCheckResult === 'error' && isOnline && (
                 <Alert variant="destructive" className="col-span-4 mt-[-8px]">
                    <CircleAlert className="h-4 w-4" />
                     <AlertDescriptionSub className="text-xs">
                         Error checking license plate with authority. Report can still be submitted.
                     </AlertDescriptionSub>
                 </Alert>
             )}
             {!isOnline && (
                  <Alert variant="warning" className="col-span-4 mt-[-8px]">
                     <WifiOff className="h-4 w-4" />
                      <AlertDescriptionSub className="text-xs">Offline: License plate check unavailable.</AlertDescriptionSub>
                  </Alert>
             )}

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
                            capture="environment"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={isLoading || !isOnline}
                        />
                        {photoPreview ? (
                            <div className="relative h-10 w-16 rounded border overflow-hidden">
                                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                            </div>
                        ) : null }
                    </div>
                    <span className="text-xs text-muted-foreground ml-1 mt-1">
                         Accepted formats: JPG, PNG.
                    </span>
                </div>
            </div>

            <Alert variant="default" className="col-span-4 mt-2 bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                 <AlertDescriptionSub className="text-xs text-blue-800">
                     Your report will be sent to the parking attendant, owner, and logged by Carpso management. False reports may affect your account status. The license plate will be checked against official records where possible.
                 </AlertDescriptionSub>
             </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <Button variant="outline" onClick={handleChatWithSupport} disabled={isLoading || !isOnline || !reservation}>
                <MessageSquare className="mr-2 h-4 w-4" /> Chat with Support
            </Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading || !plateNumber || isCheckingPlate || !isOnline}>
                    {!isOnline ? <WifiOff className="mr-2 h-4 w-4" /> : isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit Report
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
