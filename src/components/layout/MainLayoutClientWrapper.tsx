// src/components/layout/MainLayoutClientWrapper.tsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import BottomNavBar from '@/components/layout/BottomNavBar';
import AuthModal from '@/components/auth/AuthModal';
import { AppStateContext } from '@/context/AppStateProvider';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/services/user-service';

interface MainLayoutClientWrapperProps {
  children: React.ReactNode;
}

export default function MainLayoutClientWrapper({ children }: MainLayoutClientWrapperProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const appState = useContext(AppStateContext);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAuthSuccess = (userId: string, name?: string, avatarUrl?: string | null, role?: UserRole | null) => {
    if (appState) {
        appState.login(userId, name || `User ${userId.substring(0,5)}`, avatarUrl, role || 'User');
    }
    setIsAuthModalOpen(false);
    toast({ title: "Authentication Successful" });
    // Page-specific data refreshes should be handled by useEffects in those pages
    // reacting to changes in isAuthenticated/userId from AppStateContext.
  };

  return (
    <>
      {children}
      {isClient && <BottomNavBar onAuthClick={() => setIsAuthModalOpen(true)} />}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
