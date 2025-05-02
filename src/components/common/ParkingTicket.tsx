// src/components/common/ParkingTicket.tsx
'use client';

import React from 'react';
import QRCode from 'qrcode.react'; // Use qrcode.react for client-side generation
import { Car } from 'lucide-react';
import { format } from 'date-fns';

interface ParkingTicketProps {
  spotId: string;
  locationName: string;
  reservationTime: string; // ISO string
  qrCodeValue: string;
}

const ParkingTicket: React.FC<ParkingTicketProps> = ({
    spotId,
    locationName,
    reservationTime,
    qrCodeValue
}) => {
  const formattedTime = format(new Date(reservationTime), "PPP p"); // Format date and time

  return (
    <div className="bg-card p-4 border border-border rounded-lg shadow-sm max-w-xs mx-auto text-center text-card-foreground">
      <div className="flex items-center justify-center mb-2 gap-2">
          <Car className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-primary">Carpso Parking Ticket</h3>
      </div>
      <p className="text-sm mb-1">Location: <span className="font-medium">{locationName}</span></p>
      <p className="text-2xl font-bold my-2 text-primary">{spotId}</p>
      <p className="text-xs text-muted-foreground mb-3">Reserved: {formattedTime}</p>

      <div className="flex justify-center mb-3">
        {/* Ensure QR Code generation happens client-side */}
        {typeof window !== 'undefined' && (
          <QRCode
            value={qrCodeValue}
            size={128} // Adjust size as needed
            level="M" // Error correction level
            includeMargin={true}
            bgColor="#ffffff" // Background color
            fgColor="#000000" // Foreground color (dots)
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground">Present this QR code for entry/validation if required.</p>
    </div>
  );
};

export default ParkingTicket;
