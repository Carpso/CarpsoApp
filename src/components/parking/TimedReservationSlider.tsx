// src/components/parking/TimedReservationSlider.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Check, Loader2, TimerOff } from 'lucide-react';

interface TimedReservationSliderProps {
  onConfirm: () => void;
  onTimeout: () => void;
  timeoutSeconds?: number;
  isConfirming: boolean; // Added prop to indicate confirmation in progress
  disabled?: boolean; // Added prop to disable the slider
}

const RESERVATION_TIMEOUT_SECONDS = 15; // Default timeout

export default function TimedReservationSlider({
  onConfirm,
  onTimeout,
  timeoutSeconds = RESERVATION_TIMEOUT_SECONDS,
  isConfirming,
  disabled = false,
}: TimedReservationSliderProps) {
  const [sliderValue, setSliderValue] = useState([0]);
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false); // Track if slider is being actively dragged

  useEffect(() => {
    // Start countdown timer only if not disabled and not already confirmed
    if (!disabled && !isConfirmed && !isConfirming) {
      setTimeLeft(timeoutSeconds); // Reset timer when enabled/re-enabled
      setSliderValue([0]); // Reset slider visually

      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalRef.current!);
            if (!isConfirmed) { // Check if not already confirmed by sliding
              onTimeout();
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
       // Clear interval if disabled, confirming, or already confirmed
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    }

    // Cleanup interval on unmount or when disabled/confirming
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutSeconds, onTimeout, disabled, isConfirming]); // Rerun effect if disabled or isConfirming changes


  const handleSliderChange = (value: number[]) => {
     if (disabled || isConfirming) return; // Prevent interaction if disabled or confirming

      // Only update slider value if actively dragging
      if (isDraggingRef.current) {
          setSliderValue(value);
           if (value[0] >= 95 && !isConfirmed) { // Threshold for confirmation
             setIsConfirmed(true);
             if (intervalRef.current) clearInterval(intervalRef.current); // Stop timer
             onConfirm();
           }
      }
  };

   const handlePointerDown = () => {
       if (disabled || isConfirming) return;
       isDraggingRef.current = true;
   };

   const handlePointerUp = () => {
       if (disabled || isConfirming) return;
       isDraggingRef.current = false;
       // If slider is released below threshold, snap it back
       if (sliderValue[0] < 95 && !isConfirmed) {
           setSliderValue([0]);
       }
   };

  const isTimedOut = timeLeft <= 0 && !isConfirmed && !isConfirming;
  const sliderBg = isConfirmed || isConfirming ? 'bg-green-500' : isTimedOut ? 'bg-destructive' : 'bg-primary';
  const sliderThumbBg = isTimedOut ? 'border-destructive bg-destructive-foreground' : 'border-primary bg-background';

  return (
    <div className="flex items-center space-x-3 w-full">
       <div className="relative flex-grow">
           <Slider
             value={sliderValue}
             onValueChange={handleSliderChange}
             onPointerDown={handlePointerDown}
             onPointerUp={handlePointerUp}
             max={100}
             step={1}
             disabled={disabled || isConfirming || isConfirmed || isTimedOut}
             className={cn(
                 "[&>span:first-child]:bg-transparent", // Hide the default track background
                 "[&>span>span]:transition-all [&>span>span]:duration-100", // Smooth thumb transition
                 `[&>span>span]:${sliderThumbBg}` // Apply dynamic thumb background
             )}
             // Custom styling for the range/track fill
             style={{ '--slider-track-fill': sliderBg } as React.CSSProperties}
           >
              {/* Custom Track Fill */}
              <span
                 className="absolute h-full rounded-full transition-colors duration-200"
                 style={{ width: `${sliderValue[0]}%`, backgroundColor: 'var(--slider-track-fill)' }}
             />
           </Slider>
          <div
             className="absolute inset-0 flex items-center justify-center pointer-events-none text-sm font-medium select-none"
             style={{ color: isConfirmed || isConfirming || sliderValue[0] > 50 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))' }} // Adjust text color based on slider position
           >
             {isConfirming ? (
                 <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" /> Confirming...
                 </>
             ) : isConfirmed ? (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Confirmed
                  </>
             ) : isTimedOut ? (
                  <>
                     <TimerOff className="h-4 w-4 mr-1" /> Timed Out
                  </>
             ) : (
               'Slide to Confirm'
             )}
           </div>
       </div>
       <div className="w-12 text-center text-sm font-mono tabular-nums text-muted-foreground">
          {isTimedOut || isConfirmed || isConfirming ? '--' : `${timeLeft}s`}
       </div>

       {/* Override default Slider styles - Tailwind doesn't work directly on pseudo-elements */}
       <style jsx>{`
            .slider-track-fill {
                 background-color: ${sliderBg};
            }
            /* You might need more specific selectors depending on ShadCN's Slider implementation details */
       `}</style>
    </div>
  );
}

// Need to import cn utility if not already available globally
import { cn } from '@/lib/utils';
