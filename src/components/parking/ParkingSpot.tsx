// src/components/parking/ParkingSpot.tsx
'use client';

import type { ParkingSpotStatus } from '@/services/parking-sensor';
import { cn } from '@/lib/utils';
import { Car, Ban, Clock, Users, BellPlus, UserCheck } from 'lucide-react'; // Added Users, BellPlus, UserCheck
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNowStrict } from 'date-fns'; // For relative time
import { Badge } from '@/components/ui/badge'; // Import Badge

interface ParkingSpotProps {
  spot: ParkingSpotStatus;
  onSelect: (spot: ParkingSpotStatus) => void; // Pass the full spot object
  isInUserQueue?: boolean; // Optional: Is the current user in the queue for this spot?
  queueLength?: number; // Optional: Current queue length for this spot
}

export default function ParkingSpot({ spot, onSelect, isInUserQueue = false, queueLength = 0 }: ParkingSpotProps) {
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

  const tooltipText = spot.isOccupied
    ? `Occupied ${endTimeDescription || ''}. Queue: ${queueLength}. ${isInUserQueue ? 'You are in queue.' : 'Click for info/queue.'}`
    : 'Available. Click to reserve.';

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={cn(
              'transition-all duration-150 ease-in-out shadow-sm relative overflow-visible', // Added relative, overflow-visible
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
            aria-label={`Parking Spot ${spot.spotId} - ${tooltipText}`}
          >
            {/* Queue Indicator Badges */}
            {spot.isOccupied && (
                <>
                    {isInUserQueue && (
                        <Badge variant="default" className="absolute -top-2 -left-2 text-[9px] px-1 py-0 h-4 z-10 bg-blue-600 hover:bg-blue-700">
                            <UserCheck className="h-2 w-2 mr-0.5"/> Queued
                        </Badge>
                    )}
                    {queueLength > 0 && !isInUserQueue && (
                        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[9px] px-1 py-0 h-4 z-10">
                            <Users className="h-2 w-2 mr-0.5"/> {queueLength}
                        </Badge>
                    )}
                </>
            )}

            <CardContent className="flex flex-col items-center justify-center p-2 aspect-square"> {/* Reduced padding */}
              {spot.isOccupied ? (
                <Ban className="h-5 w-5 mb-0.5" /> // Slightly smaller icon
              ) : (
                <Car className="h-5 w-5 mb-0.5" /> // Slightly smaller icon
              )}
              <span className="text-[11px] font-medium">{spot.spotId}</span> {/* Slightly smaller text */}
               {spot.isOccupied && endTimeDescription && (
                   <span className="text-[9px] text-muted-foreground leading-tight mt-0.5 flex items-center gap-0.5 text-center"> {/* Centered text */}
                       <Clock className="h-2 w-2"/> {endTimeDescription.replace(/[()]/g, '')} {/* Remove parentheses for display */}
                   </span>
               )}
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
           <p>Spot {spot.spotId}: {spot.isOccupied ? 'Occupied' : 'Available'}</p>
            {spot.isOccupied && (
                <>
                    {endTimeDescription && <p className="text-xs text-muted-foreground mt-0.5">{endTimeDescription}</p>}
                     <p className="text-xs text-muted-foreground mt-1">Queue: {queueLength} waiting</p>
                     {isInUserQueue && <p className="text-xs text-blue-600 font-medium">You are in the queue.</p>}
                     <p className="text-xs text-muted-foreground mt-1">Click for info/queue options</p>
                </>
            )}
           {!spot.isOccupied && <p className="text-xs text-muted-foreground">Click to reserve</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}