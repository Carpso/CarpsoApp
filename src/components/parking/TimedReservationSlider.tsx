// src/components/parking/TimedReservationSlider.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Check, Loader2, TimerOff, MoveRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimedReservationSliderProps {
  onConfirm: () => void;
  onTimeout: () => void;
  timeoutSeconds?: number;
  isConfirming: boolean; // Confirmation process active
  disabled?: boolean; // General disable flag
}

const RESERVATION_TIMEOUT_SECONDS = 15; // Default timeout
const SLIDER_CONFIRM_THRESHOLD = 95; // Value to reach for confirmation

export default function TimedReservationSlider({
  onConfirm,
  onTimeout,
  timeoutSeconds = RESERVATION_TIMEOUT_SECONDS,
  isConfirming,
  disabled = false,
}: TimedReservationSliderProps) {
  const [sliderValue, setSliderValue] = useState([SLIDER_CONFIRM_THRESHOLD]); // Start near the end
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSliding, setIsSliding] = useState(false); // Track user interaction
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTimedOutRef = useRef(false); // Track timeout state

  // Automatic Countdown and Slider Decrease Effect
  useEffect(() => {
    isTimedOutRef.current = false; // Reset timeout status on re-render/enable

    if (!disabled && !isConfirming && !isConfirmed && !isSliding) {
        setTimeLeft(timeoutSeconds); // Reset timer
        setSliderValue([SLIDER_CONFIRM_THRESHOLD]); // Reset slider position

        intervalRef.current = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(intervalRef.current!);
                    if (!isConfirmed && !isTimedOutRef.current) {
                         isTimedOutRef.current = true;
                         onTimeout();
                    }
                    setSliderValue([0]); // Move slider to 0 on timeout
                    return 0;
                }

                const newTime = prevTime - 1;
                // Decrease slider value proportionally to time remaining
                const newSliderValue = Math.max(0, (newTime / timeoutSeconds) * SLIDER_CONFIRM_THRESHOLD);
                setSliderValue([newSliderValue]);

                return newTime;
            });
        }, 1000);

    } else {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutSeconds, disabled, isConfirming, isConfirmed, isSliding]); // Rerun effect if state changes

  const handleSliderChange = (value: number[]) => {
    if (disabled || isConfirming || isConfirmed || isTimedOutRef.current) return;

    setSliderValue(value); // Update visual position immediately

    // Check for confirmation only when user releases the slider
    if (!isSliding && value[0] >= SLIDER_CONFIRM_THRESHOLD) {
      setIsConfirmed(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      onConfirm();
    }
  };

  const handlePointerDown = () => {
    if (disabled || isConfirming || isConfirmed || isTimedOutRef.current) return;
    setIsSliding(true);
    if (intervalRef.current) clearInterval(intervalRef.current); // Pause auto-slide on interaction
  };

  const handlePointerUp = () => {
    if (disabled || isConfirming || isConfirmed || isTimedOutRef.current) return;
    setIsSliding(false);

    if (sliderValue[0] >= SLIDER_CONFIRM_THRESHOLD) {
      // Confirm if threshold met on release
      setIsConfirmed(true);
      onConfirm();
    } else {
       // If not confirmed, restart the countdown (useEffect dependency `isSliding` handles this)
       // Optionally snap back, but letting useEffect handle reset is smoother
       // setSliderValue([0]); // Or reset to time-based position
    }
  };

  const isTimedOut = timeLeft <= 0 && !isConfirmed && !isConfirming;
  const sliderBg = isConfirmed || isConfirming ? 'bg-green-500' : isTimedOut ? 'bg-destructive' : 'bg-primary';
  const sliderThumbBg = isTimedOut ? 'border-destructive bg-destructive-foreground' : 'border-primary bg-background';
  const currentSliderValue = sliderValue[0];

  return (
    <div className="flex items-center space-x-3 w-full">
       <div className="relative flex-grow">
           <Slider
             value={sliderValue}
             onValueChange={handleSliderChange}
             onPointerDown={handlePointerDown}
             onPointerUp={handlePointerUp}
             max={SLIDER_CONFIRM_THRESHOLD + 5} // Give a little extra room visually
             step={1}
             disabled={disabled || isConfirming || isConfirmed || isTimedOut}
             className={cn(
                 "transition-opacity duration-300", // Fade out slider slightly when disabled/confirmed
                 (disabled || isConfirming || isConfirmed || isTimedOut) && "opacity-70",
                 "[&>span:first-child]:bg-transparent", // Hide default track background
                 `[&>span>span]:${sliderThumbBg}`, // Dynamic thumb background
                 "[&>span>span]:transition-transform [&>span>span]:duration-150", // Smooth thumb manual drag
             )}
           >
              {/* Custom Track Fill - Animated */}
              <span
                 className="absolute h-full rounded-full transition-[width] duration-1000 ease-linear" // Use width transition for auto-slide
                 style={{ width: `${(currentSliderValue / (SLIDER_CONFIRM_THRESHOLD + 5)) * 100}%`, backgroundColor: sliderBg }}
             />
           </Slider>
          <div
             className="absolute inset-0 flex items-center justify-center pointer-events-none text-sm font-medium select-none transition-colors duration-300"
             style={{ color: isConfirmed || isConfirming || currentSliderValue > SLIDER_CONFIRM_THRESHOLD / 2 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))' }}
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
                 <>
                    Slide to Confirm <MoveRight className="h-4 w-4 ml-1 inline-block animate-pulse" />
                 </>
             )}
           </div>
       </div>
       <div className="w-12 text-center text-sm font-mono tabular-nums text-muted-foreground">
          {isTimedOut || isConfirmed || isConfirming ? '--' : `${timeLeft}s`}
       </div>
    </div>
  );
}
