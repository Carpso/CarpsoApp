// src/components/layout/BottomNavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, ShieldCheck, UserCircle, WifiOff, User as UserIcon } from 'lucide-react'; // Added UserIcon
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import React, { useContext } from 'react'; // Added useContext
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppStateContext } from '@/context/AppStateProvider'; // Import context

interface BottomNavBarProps {
  // isAuthenticated, userRole, etc. are now taken from context
  onAuthClick: () => void; // Keep for Sign In button
}

const navItemsBase = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
];

const adminItem = { href: '/admin', label: 'Admin', icon: ShieldCheck };
const attendantItem = { href: '/attendant', label: 'Attendant', icon: UserIcon }; // Added attendant item
const profileItem = { href: '/profile', label: 'Profile', icon: UserCircle }; // Link target


export default function BottomNavBar({ onAuthClick }: BottomNavBarProps) {
  const { isAuthenticated, userRole, userName, userAvatarUrl, isOnline } = useContext(AppStateContext)!; // Get context values
  const pathname = usePathname();

  const navItems = [...navItemsBase];

  const isAdminOrOwner = userRole === 'Admin' || userRole === 'ParkingLotOwner';
  const isAttendant = userRole === 'ParkingAttendant';

  // Add role-specific items
  if (isAuthenticated) {
    if (isAdminOrOwner) {
        navItems.push(adminItem);
    } else if (isAttendant) {
        navItems.push(attendantItem);
    }
  }


  const profileButtonLabel = isAuthenticated ? (userName ? userName.split(' ')[0] : 'Profile') : 'Sign In';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
       {/* Offline Indicator Banner */}
       {!isOnline && (
           <div className="bg-destructive text-destructive-foreground text-xs text-center py-1 px-2 flex items-center justify-center gap-1">
               <WifiOff className="h-3 w-3" /> Offline Mode
           </div>
       )}
      <div className={cn(
         "container mx-auto flex h-16 max-w-md items-center justify-around px-2",
         // Adjust grid columns based on number of items + profile/auth
         navItems.length + 1 === 5 ? "grid grid-cols-5" : // 4 nav + profile/auth
         navItems.length + 1 === 4 ? "grid grid-cols-4" : // 3 nav + profile/auth
         "grid grid-cols-3" // Default/fallback (2 nav + profile/auth)
      )}>
        {/* Map Navigation Items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex flex-col items-center justify-center text-center transition-colors w-full h-16 rounded-md', // Use w-full for grid layout
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-primary' : '')} /> {/* Adjusted icon size consistency */}
              <span className="text-xs truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}

        {/* Profile Link / Auth Button */}
        {isAuthenticated ? (
            <Link
                href={profileItem.href} // Direct link to profile page
                className={cn(
                   'flex flex-col items-center justify-center text-center transition-colors w-full h-16 rounded-md', // Use w-full
                   pathname === profileItem.href ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80',
                   'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
                )}
                aria-current={pathname === profileItem.href ? 'page' : undefined}
                aria-label="View Profile"
            >
                 <Avatar className="h-6 w-6 mb-0.5">
                      <AvatarImage src={userAvatarUrl || undefined} alt={userName || 'User'} className="object-cover" />
                      <AvatarFallback className="text-[10px] bg-muted border border-muted-foreground/20">{userInitial}</AvatarFallback>
                  </Avatar>
                 <span className="text-xs truncate max-w-full">{profileButtonLabel}</span>
            </Link>
        ) : (
            <Button
                variant="ghost"
                className={cn(
                    'flex flex-col items-center justify-center text-center transition-colors w-full h-16 rounded-md', // Use w-full
                    'text-muted-foreground hover:text-foreground/80',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
                )}
                onClick={onAuthClick}
                aria-label="Sign In or Sign Up"
            >
                <UserCircle className={cn('h-6 w-6 mb-0.5')} /> {/* Standard UserCircle icon */}
                <span className="text-xs truncate max-w-full">{profileButtonLabel}</span>
            </Button>
        )}
      </div>
    </nav>
  );
}
