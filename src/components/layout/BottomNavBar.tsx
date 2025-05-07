// src/components/layout/BottomNavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, ShieldCheck, UserCircle, WifiOff, User as UserIcon, LifeBuoy, MessageSquare } from 'lucide-react'; // Added MessageSquare
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import React, { useContext } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppStateContext } from '@/context/AppStateProvider';

interface BottomNavBarProps {
  onAuthClick: () => void;
}

const navItemsBase = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  // Messages will be inserted dynamically
  { href: '/help', label: 'Help', icon: LifeBuoy },
];

const adminItem = { href: '/admin', label: 'Admin', icon: ShieldCheck };
const attendantItem = { href: '/attendant', label: 'Attendant', icon: UserIcon };
const profileItem = { href: '/profile', label: 'Profile', icon: UserCircle };
const messagesItem = { href: '/chat', label: 'Messages', icon: MessageSquare }; // New messages item

export default function BottomNavBar({ onAuthClick }: BottomNavBarProps) {
  const { isAuthenticated, userRole, userName, userAvatarUrl, isOnline } = useContext(AppStateContext)!;
  const pathname = usePathname();

  const navItems = [...navItemsBase];
  const isAdminOrOwner = userRole === 'Admin' || userRole === 'ParkingLotOwner';
  const isAttendant = userRole === 'ParkingAttendant';

  // Insert role-specific items and messages link
  let insertAtIndex = 2; // Default index to insert before 'Help'
  if (isAuthenticated) {
    navItems.splice(insertAtIndex, 0, messagesItem); // Insert Messages link
    insertAtIndex++; // Adjust index for next potential insertion

    if (isAdminOrOwner) {
        navItems.splice(insertAtIndex, 0, adminItem); // Insert Admin link
    } else if (isAttendant) {
        navItems.splice(insertAtIndex, 0, attendantItem); // Insert Attendant link
    }
  }

  const profileButtonLabel = isAuthenticated ? (userName ? userName.split(' ')[0] : 'Profile') : 'Sign In';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  // Determine number of columns based on items + profile button
  const totalItemsForGrid = navItems.length + 1; // +1 for the profile/auth button
  let gridColsClass = `grid-cols-${totalItemsForGrid}`;
  if (totalItemsForGrid > 5) gridColsClass = 'grid-cols-5'; // Max 5, others will wrap/scroll if too many

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
       {!isOnline && (
           <div className="bg-destructive text-destructive-foreground text-xs text-center py-1 px-2 flex items-center justify-center gap-1">
               <WifiOff className="h-3 w-3" /> Offline Mode
           </div>
       )}
      <div className={cn(
         "container mx-auto flex h-16 max-w-md items-center justify-around px-2",
         gridColsClass
      )}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex flex-col items-center justify-center text-center transition-colors w-full h-16 rounded-md',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-primary' : '')} />
              <span className="text-xs truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}

        {isAuthenticated ? (
            <Link
                href={profileItem.href}
                className={cn(
                   'flex flex-col items-center justify-center text-center transition-colors w-full h-16 rounded-md',
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
                    'flex flex-col items-center justify-center text-center transition-colors w-full h-16 rounded-md',
                    'text-muted-foreground hover:text-foreground/80',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
                )}
                onClick={onAuthClick}
                aria-label="Sign In or Sign Up"
            >
                <UserCircle className={cn('h-6 w-6 mb-0.5')} />
                <span className="text-xs truncate max-w-full">{profileButtonLabel}</span>
            </Button>
        )}
      </div>
    </nav>
  );
}
