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
  // isSelected: boolean; // Removed isSelected prop
  onSelect: (spotId: string) => void; // Keep onSelect, but simplify usage
}

// export default function ParkingSpot({ spot, isSelected, onSelect }: ParkingSpotProps) { // Original signature
export default function ParkingSpot({ spot, onSelect }: ParkingSpotProps) { // Updated signature
  const statusColor = spot.isOccupied ? 'bg-destructive/20 text-destructive' : 'bg-green-200 text-green-800';
  const hoverColor = !spot.isOccupied ? 'hover:bg-teal-100 hover:border-accent' : '';
  // const selectedColor = isSelected ? 'border-primary ring-2 ring-primary' : ''; // Removed selectedColor logic
  const cursorStyle = spot.isOccupied ? 'cursor-not-allowed' : 'cursor-pointer';

  const handleClick = () => {
    // Always call onSelect when clicked. The parent (ParkingLotGrid)
    // will decide whether to open the dialog or show a toast based on occupancy.
    onSelect(spot.spotId);
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
              // selectedColor, // Removed selectedColor class
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
            aria-disabled={spot.isOccupied}
            aria-label={`Parking Spot ${spot.spotId} - ${spot.isOccupied ? 'Occupied' : 'Available'}`}
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
           {!spot.isOccupied && <p className="text-xs text-muted-foreground">Click to reserve</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
