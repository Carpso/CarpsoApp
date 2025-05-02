// src/context/AppStateProvider.tsx
'use client';

import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { UserRole } from '@/services/user-service'; // Import UserRole type

interface UserState {
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  userAvatarUrl: string | null;
  userRole: UserRole | null; // Use imported UserRole type
}

interface AppStateContextProps extends UserState {
  isOnline: boolean; // Added online status
  login: (userId: string, name: string, avatarUrl?: string | null, role?: UserRole | null) => void; // Use UserRole type
  logout: () => void;
  updateUserProfile: (name: string, avatarUrl?: string | null) => void;
}

export const AppStateContext = createContext<AppStateContextProps | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [userState, setUserState] = useState<UserState>(() => {
      // Initialize state from localStorage if available (client-side only)
      if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('carpsoUser');
          if (storedUser) {
              try {
                   const parsedUser = JSON.parse(storedUser) as UserState;
                   // Basic validation
                   if (parsedUser.isAuthenticated && parsedUser.userId) {
                       return parsedUser;
                   }
              } catch (e) {
                   console.error("Failed to parse stored user state:", e);
                   localStorage.removeItem('carpsoUser'); // Clear invalid state
              }
          }
      }
      // Default initial state
      return {
         isAuthenticated: false,
         userId: null,
         userName: null,
         userAvatarUrl: null,
         userRole: null,
     };
  });

  const [isOnline, setIsOnline] = useState(true); // Default to true, check on mount

   // Effect to check initial online status and add listeners
   useEffect(() => {
     // Ensure this runs only on the client
     if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
       setIsOnline(navigator.onLine);

       const handleOnline = () => setIsOnline(true);
       const handleOffline = () => setIsOnline(false);

       window.addEventListener('online', handleOnline);
       window.addEventListener('offline', handleOffline);

       // Cleanup listeners on component unmount
       return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
       };
     }
   }, []);


  const login = useCallback((userId: string, name: string, avatarUrl?: string | null, role?: UserRole | null) => { // Use UserRole type
    // In a real app, you'd verify credentials/token before setting state
     const newState: UserState = {
       isAuthenticated: true,
       userId: userId,
       userName: name,
       userAvatarUrl: avatarUrl || null,
       userRole: role || 'User', // Default to 'User' role if not provided
     };
    setUserState(newState);
    // Persist login state (e.g., localStorage)
     if (typeof window !== 'undefined') {
         localStorage.setItem('carpsoUser', JSON.stringify(newState));
     }
  }, []);

  const logout = useCallback(() => {
      const loggedOutState: UserState = {
        isAuthenticated: false,
        userId: null,
        userName: null,
        userAvatarUrl: null,
        userRole: null,
      };
    setUserState(loggedOutState);
    // Clear persisted login state
     if (typeof window !== 'undefined') {
         localStorage.removeItem('carpsoUser');
     }
    // Clear cached data on logout
    if (typeof window !== 'undefined') {
        // Clear user-specific cache keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cachedUserDetails_') ||
                key.startsWith('cachedBillingInfo_') ||
                key.startsWith('cachedParkingHistory_') ||
                key.startsWith('cachedVehicles_') ||
                key.startsWith('cachedPaymentMethods_') ||
                key.startsWith('cachedGamification_') ||
                key.startsWith('cachedPointsTxns_') ||
                key.startsWith('cachedUserWallet_') ||
                key.startsWith('cachedUserWalletTxns_') ||
                key.startsWith('cachedUserBookmarks_') ||
                key.startsWith('userPreferences_') || // Clear user preferences
                key.endsWith('_timestamp')) { // Also remove timestamps
                localStorage.removeItem(key);
            }
        });
         // Clear general cache if needed (careful not to clear unrelated data)
         localStorage.removeItem('cachedParkingLots');
         localStorage.removeItem('cachedParkingLotsTimestamp');
         localStorage.removeItem('cachedExchangeRates');
         localStorage.removeItem('cachedExchangeRates_timestamp');
         localStorage.removeItem('pinnedCarLocation'); // Clear pinned car
         console.log("Cleared user-specific cache and preferences on logout.");
    }
  }, []);

   const updateUserProfile = useCallback((name: string, avatarUrl?: string | null) => {
       setUserState(prevState => {
            const newState = {
               ...prevState,
               userName: name,
               userAvatarUrl: avatarUrl !== undefined ? avatarUrl : prevState.userAvatarUrl, // Update avatar only if provided
           };
            // Update persisted state if needed
            if (typeof window !== 'undefined' && newState.isAuthenticated) {
                localStorage.setItem('carpsoUser', JSON.stringify(newState));
            }
           return newState;
       });
   }, []);

  return (
    <AppStateContext.Provider value={{ ...userState, isOnline, login, logout, updateUserProfile }}>
      {children}
    </AppStateContext.Provider>
  );
};

export default AppStateProvider;