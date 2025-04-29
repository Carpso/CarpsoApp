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
  isSelected: boolean;
  onSelect: (spotId: string) => void;
}

export default function ParkingSpot({ spot, isSelected, onSelect }: ParkingSpotProps) {
  const statusColor = spot.isOccupied ? 'bg-destructive/20 text-destructive' : 'bg-green-200 text-green-800';
  const hoverColor = !spot.isOccupied ? 'hover:bg-teal-100 hover:border-accent' : '';
  const selectedColor = isSelected ? 'border-primary ring-2 ring-primary' : '';
  const cursorStyle = spot.isOccupied ? 'cursor-not-allowed' : 'cursor-pointer';

  const handleClick = () => {
    if (!spot.isOccupied) {
      onSelect(spot.spotId);
    }
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
              selectedColor,
              cursorStyle,
              'border'
            )}
            onClick={handleClick}
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
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
