// src/context/AppStateProvider.tsx
'use client';

import React, { createContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { UserRole } from '@/services/user-service'; // Import UserRole type

interface UserState {
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  userAvatarUrl: string | null;
  userRole: UserRole | null;
}

interface AppStateContextProps extends UserState {
  isOnline: boolean;
  login: (userId: string, name: string, avatarUrl?: string | null, role?: UserRole | null) => void;
  logout: () => void;
  updateUserProfile: (name: string, avatarUrl?: string | null) => void;
  requestNotificationPermission: () => Promise<void>; // Added for FCM
}

export const AppStateContext = createContext<AppStateContextProps | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const [userState, setUserState] = useState<UserState>({
      isAuthenticated: false,
      userId: null,
      userName: null,
      userAvatarUrl: null,
      userRole: null,
  });
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const storedUser = localStorage.getItem('carpsoUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as UserState;
        if (parsedUser.isAuthenticated && parsedUser.userId) {
          setUserState(parsedUser);
        } else {
             localStorage.removeItem('carpsoUser');
        }
      } catch (e) {
        console.error("Failed to parse stored user state:", e);
        localStorage.removeItem('carpsoUser');
      }
    }

     if (typeof navigator !== 'undefined') {
       setIsOnline(navigator.onLine);
       const handleOnline = () => setIsOnline(true);
       const handleOffline = () => setIsOnline(false);
       window.addEventListener('online', handleOnline);
       window.addEventListener('offline', handleOffline);
       return () => {
         window.removeEventListener('online', handleOnline);
         window.removeEventListener('offline', handleOffline);
       };
     }
  }, []);

  const login = useCallback((userId: string, name: string, avatarUrl?: string | null, role?: UserRole | null) => {
     const newState: UserState = {
       isAuthenticated: true,
       userId: userId,
       userName: name,
       userAvatarUrl: avatarUrl || null,
       userRole: role || 'User',
     };
    setUserState(newState);
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
     if (typeof window !== 'undefined') {
         localStorage.removeItem('carpsoUser');
         Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cached') || key.startsWith('userPreferences_') || key.startsWith('lastLoginTimestamp_') || key === 'pinnedCarLocation') {
                localStorage.removeItem(key);
            }
        });
        console.log("Cleared user-specific cache and preferences on logout.");
     }
  }, []);

   const updateUserProfile = useCallback((name: string, avatarUrl?: string | null) => {
       setUserState(prevState => {
            const newState = {
               ...prevState,
               userName: name,
               userAvatarUrl: avatarUrl !== undefined ? avatarUrl : prevState.userAvatarUrl,
           };
            if (typeof window !== 'undefined' && newState.isAuthenticated) {
                localStorage.setItem('carpsoUser', JSON.stringify(newState));
            }
           return newState;
       });
   }, []);

  // Placeholder for FCM permission request
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          // TODO: Get FCM token and send it to your server
          // const token = await getFCMToken(); // Placeholder
          // if (token) { sendTokenToServer(token); }
        } else {
          console.warn('Notification permission denied.');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    } else {
      console.warn('Push notifications not supported by this browser or environment.');
    }
  }, []);


  return (
    <AppStateContext.Provider value={{ ...userState, isOnline, login, logout, updateUserProfile, requestNotificationPermission }}>
      {children}
    </AppStateContext.Provider>
  );
};

export default AppStateProvider;
