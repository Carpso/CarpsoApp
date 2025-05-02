// src/components/parking/ParkingSpot.tsx
'use client';

import type { ParkingSpotStatus } from '@/services/parking-sensor';
import { cn } from '@/lib/utils';
import { Car, Ban, Clock } from 'lucide-react'; // Added Clock
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNowStrict } from 'date-fns'; // For relative time

interface ParkingSpotProps {
  spot: ParkingSpotStatus;
  onSelect: (spot: ParkingSpotStatus) => void; // Pass the full spot object
}

export default function ParkingSpot({ spot, onSelect }: ParkingSpotProps) {
  const statusColor = spot.isOccupied ? 'bg-destructive/20 text-destructive' : 'bg-green-200 text-green-800';
  const hoverColor = !spot.isOccupied ? 'hover:bg-teal-100 hover:border-accent' : 'hover:bg-destructive/30'; // Add hover for occupied too
  const cursorStyle = 'cursor-pointer'; // Always allow clicking

  const handleClick = () => {
    // Always call onSelect when clicked. The parent (ParkingLotGrid)
    // will decide whether to open the dialog or show a toast/live view.
    onSelect(spot);
  };

  const getEndTimeDescription = () => {
      if (!spot.isOccupied || !spot.reservationEndTime) return null;
      try {
          const endDate = new Date(spot.reservationEndTime);
          const now = new Date();
          if (endDate < now) {
              return "(Should be free)"; // Reservation expired
          }
          // Show relative time until free
          return `(Free in ${formatDistanceToNowStrict(endDate)})`;
      } catch (e) {
          console.error("Error parsing reservation end time:", e);
          return "(End time unavailable)";
      }
  }
  const endTimeDescription = getEndTimeDescription();

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
            aria-label={`Parking Spot ${spot.spotId} - ${spot.isOccupied ? `Occupied ${endTimeDescription || ''}` : 'Available'}. Click for details.`}
          >
            <CardContent className="flex flex-col items-center justify-center p-3 aspect-square">
              {spot.isOccupied ? (
                <Ban className="h-6 w-6 mb-1" />
              ) : (
                <Car className="h-6 w-6 mb-1" />
              )}
              <span className="text-xs font-medium">{spot.spotId}</span>
               {spot.isOccupied && endTimeDescription && (
                   <span className="text-[10px] text-muted-foreground leading-tight mt-0.5 flex items-center gap-0.5">
                       <Clock className="h-2.5 w-2.5"/> {endTimeDescription.replace(/[()]/g, '')} {/* Remove parentheses for display */}
                   </span>
               )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
           <p>Spot {spot.spotId}: {spot.isOccupied ? 'Occupied' : 'Available'}</p>
           {!spot.isOccupied ? (
              <p className="text-xs text-muted-foreground">Click to reserve</p>
           ) : (
               <>
                   <p className="text-xs text-muted-foreground">Click to view live location</p>
                   {endTimeDescription && <p className="text-xs text-muted-foreground mt-0.5">{endTimeDescription}</p>}
               </>
           )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
