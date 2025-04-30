// src/components/parking/ParkingSpot.tsx
'use client';

import type { ParkingSpotStatus } from '@/services/parking-sensor';
import { cn } from '@/lib/utils';
import { Car, Ban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ParkingSpotProps {
  spot: ParkingSpotStatus;
  onSelect: (spot: ParkingSpotStatus) => void; // Pass the full spot object
}

export default function ParkingSpot({ spot, onSelect }: ParkingSpotProps) {
  const statusColor = spot.isOccupied ? 'bg-destructive/20 text-destructive' : 'bg-green-200 text-green-800';
  const hoverColor = !spot.isOccupied ? 'hover:bg-teal-100 hover:border-accent' : 'hover:bg-destructive/30'; // Add hover for occupied too
  const cursorStyle = spot.isOccupied ? 'cursor-pointer' : 'cursor-pointer'; // Allow clicking occupied spots now

  const handleClick = () => {
    // Always call onSelect when clicked. The parent (ParkingLotGrid)
    // will decide whether to open the dialog or show a toast/live view.
    onSelect(spot);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={cn(
              'transition-all duration-150 ease-in-out shadow-sm',
              statusColor,
              hoverColor,
              cursorStyle,
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2' // Added focus styles
            )}
            onClick={handleClick}
            onKeyDown={(e) => { // Allow activation with Enter/Space
              if (e.key === 'Enter' || e.key === ' ') {
                handleClick();
              }
            }}
            role="button" // Indicate interactivity
            tabIndex={0} // Make it focusable
            // aria-disabled={spot.isOccupied} // No longer strictly disabled
            aria-label={`Parking Spot ${spot.spotId} - ${spot.isOccupied ? 'Occupied' : 'Available'}. Click for details.`}
          >
            <CardContent className="flex flex-col items-center justify-center p-3 aspect-square">
              {spot.isOccupied ? (
                <Ban className="h-6 w-6 mb-1" />
              ) : (
                <Car className="h-6 w-6 mb-1" />
              )}
              <span className="text-xs font-medium">{spot.spotId}</span>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
           <p>Spot {spot.spotId}: {spot.isOccupied ? 'Occupied' : 'Available'}</p>
           {!spot.isOccupied ? (
              <p className="text-xs text-muted-foreground">Click to reserve</p>
           ) : (
               <p className="text-xs text-muted-foreground">Click to view live location</p>
           )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
