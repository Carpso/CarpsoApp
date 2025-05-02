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
  const [userState, setUserState] = useState<UserState>({
    isAuthenticated: false,
    userId: null,
    userName: null,
    userAvatarUrl: null,
    userRole: null,
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
    setUserState({
      isAuthenticated: true,
      userId: userId,
      userName: name,
      userAvatarUrl: avatarUrl || null,
      userRole: role || 'User', // Default to 'User' role if not provided
    });
    // Persist login state (e.g., localStorage, session) if needed
  }, []);

  const logout = useCallback(() => {
    setUserState({
      isAuthenticated: false,
      userId: null,
      userName: null,
      userAvatarUrl: null,
      userRole: null,
    });
    // Clear persisted login state if needed
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
         console.log("Cleared user-specific cache on logout.");
    }
  }, []);

   const updateUserProfile = useCallback((name: string, avatarUrl?: string | null) => {
       setUserState(prevState => ({
           ...prevState,
           userName: name,
           userAvatarUrl: avatarUrl !== undefined ? avatarUrl : prevState.userAvatarUrl, // Update avatar only if provided
       }));
       // Update persisted state if needed
   }, []);

  return (
    <AppStateContext.Provider value={{ ...userState, isOnline, login, logout, updateUserProfile }}>
      {children}
    </AppStateContext.Provider>
  );
};

export default AppStateProvider;
