// src/components/layout/BottomNavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, ShieldCheck, UserCircle } from 'lucide-react'; // Replaced BrainCircuit with Compass, kept UserCircle
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components

// Assume auth state and user details might come from context or props
// Example:
// interface BottomNavBarProps {
//   isAuthenticated: boolean;
//   userRole: string;
//   userName?: string; // Add user name
//   userAvatarUrl?: string; // Add avatar URL
//   onAuthClick: () => void;
//   onProfileClick: () => void;
// }

// For simulation (replace with actual props/context)
interface BottomNavBarProps {
  isAuthenticated: boolean;
  userRole: string; // Assuming 'Admin', 'ParkingLotOwner', 'User'
  userName?: string | null;
  userAvatarUrl?: string | null;
  onAuthClick: () => void;
  onProfileClick: () => void;
}


const navItemsBase = [
  { href: '/', label: 'Map', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass }, // New Explore tab
];

// Define admin item separately
const adminItem = { href: '/admin', label: 'Admin', icon: ShieldCheck };

// Define profile item (acts as a button trigger)
const profileItem = { id: 'profile', label: 'Profile', icon: UserCircle };


export default function BottomNavBar({
    isAuthenticated,
    userRole,
    userName,
    userAvatarUrl,
    onAuthClick,
    onProfileClick
}: BottomNavBarProps) {
  const pathname = usePathname();

  const navItems = [...navItemsBase];

  // Conditionally add Admin link based on role
  if (isAuthenticated && (userRole === 'Admin' || userRole === 'ParkingLotOwner')) { // Also show for Owner for now
    navItems.push(adminItem);
  }

  const profileButtonLabel = isAuthenticated ? (userName ? userName.split(' ')[0] : 'Profile') : 'Sign In';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {/* Map Navigation Items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex flex-col items-center justify-center text-center transition-colors w-16 h-16 rounded-md',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={cn('h-5 w-5 mb-1', isActive ? 'text-primary' : '')} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}

        {/* Profile/Auth Button */}
        <Button
           variant="ghost"
           className={cn(
               'flex flex-col items-center justify-center text-center transition-colors w-16 h-16 rounded-md',
                // Optional: Highlight if profile-related route is active
                // pathname.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80',
                'text-muted-foreground hover:text-foreground/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
           )}
           onClick={isAuthenticated ? onProfileClick : onAuthClick}
           aria-label={isAuthenticated ? 'Open Profile' : 'Sign In or Sign Up'}
        >
             {isAuthenticated ? (
                  <Avatar className="h-5 w-5 mb-1">
                      <AvatarImage src={userAvatarUrl || undefined} alt={userName || 'User'} className="object-cover" />
                      <AvatarFallback className="text-[10px] bg-muted">{userInitial}</AvatarFallback>
                  </Avatar>
             ) : (
                 <profileItem.icon className={cn('h-5 w-5 mb-1')} />
             )}
             <span className="text-xs truncate max-w-[50px]">{profileButtonLabel}</span>
        </Button>
      </div>
    </nav>
  );
}
