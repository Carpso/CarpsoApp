// src/components/common/ParkingTicket.tsx
'use client';

import React from 'react';
import QRCode from 'qrcode.react'; // Use qrcode.react for client-side generation
import { Car, QrCode } from 'lucide-react'; // Added QrCode icon
import { format } from 'date-fns';

interface ParkingTicketProps {
  spotId: string;
  locationName: string;
  reservationTime: string; // ISO string
  qrCodeValue: string; // Contains reservation details and potentially userId
  userId?: string | null; // Optional userId for linking
}

const ParkingTicket: React.FC<ParkingTicketProps> = ({
    spotId,
    locationName,
    reservationTime,
    qrCodeValue,
    userId
}) => {
  const formattedTime = format(new Date(reservationTime), "PPP p"); // Format date and time

  // Enhance QR code value with user ID if available, suitable for validation or linking
  const finalQrCodeValue = userId ? `${qrCodeValue}|User:${userId}` : qrCodeValue;

  return (
    <div className="bg-card p-4 border border-border rounded-lg shadow-sm max-w-xs mx-auto text-center text-card-foreground">
      <div className="flex items-center justify-center mb-2 gap-2">
          <Car className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-primary">Carpso Parking Ticket</h3>
      </div>
      <p className="text-sm mb-1">Location: <span className="font-medium">{locationName}</span></p>
      <p className="text-2xl font-bold my-2 text-primary">{spotId}</p>
      <p className="text-xs text-muted-foreground mb-3">Reserved: {formattedTime}</p>

      <div className="flex flex-col items-center mb-3">
        <QrCode className="h-5 w-5 text-muted-foreground mb-1" />
        {/* Ensure QR Code generation happens client-side */}
        {typeof window !== 'undefined' ? (
          <QRCode
            value={finalQrCodeValue} // Use the enhanced QR value
            size={128} // Adjust size as needed
            level="M" // Error correction level
            includeMargin={true}
            bgColor="#ffffff" // Background color
            fgColor="#000000" // Foreground color (dots)
          />
        ) : (
           <div className="h-[128px] w-[128px] bg-muted flex items-center justify-center text-muted-foreground text-xs">QR Loading...</div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Present this QR code for entry/validation if required.</p>
       {userId && <p className="text-[10px] text-muted-foreground mt-1">User ID: {userId.substring(0,8)}...</p>}
    </div>
  );
};

export default ParkingTicket;
