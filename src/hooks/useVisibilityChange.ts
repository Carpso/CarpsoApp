// src/hooks/useVisibilityChange.ts
'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to track browser tab visibility.
 * Returns `true` if the tab is visible, `false` otherwise.
 * Handles vendor prefixes for hidden property and visibilitychange event.
 */
export function useVisibilityChange(): boolean {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Ensure this only runs on the client
    if (typeof document === 'undefined') {
      return;
    }

    let hidden: string | undefined;
    let visibilityChange: string | undefined;

    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof (document as any).msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof (document as any).webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }

    const handleVisibilityChange = () => {
      if (hidden) {
        setIsVisible(!document[hidden as keyof Document]);
      }
    };

    // Set the initial state
    handleVisibilityChange();

    // Add event listener
    if (visibilityChange) {
      document.addEventListener(visibilityChange, handleVisibilityChange, false);
    }

    // Cleanup listener on component unmount
    return () => {
      if (visibilityChange) {
        document.removeEventListener(visibilityChange, handleVisibilityChange);
      }
    };
  }, []);

  return isVisible;
}
