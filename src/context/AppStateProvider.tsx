// src/context/AppStateProvider.tsx
'use client';

import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';

interface UserState {
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  userAvatarUrl: string | null;
  userRole: string | null; // e.g., 'User', 'Admin', 'ParkingLotOwner'
}

interface AppStateContextProps extends UserState {
  isOnline: boolean; // Added online status
  login: (userId: string, name: string, avatarUrl?: string | null, role?: string | null) => void;
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


  const login = useCallback((userId: string, name: string, avatarUrl?: string | null, role?: string | null) => {
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
        localStorage.removeItem('cachedParkingLots');
        localStorage.removeItem('cachedUserWallet');
        // Add other cache clears as needed
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
