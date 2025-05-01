'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, ShieldCheck, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BottomNavBarProps {
  isAuthenticated: boolean;
  userRole: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  onAuthClick: () => void; // Keep for Sign In button
  // onProfileClick is no longer needed as it navigates directly
}

const navItemsBase = [
  { href: '/', label: 'Carpso Map', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
];

const adminItem = { href: '/admin', label: 'Admin', icon: ShieldCheck };
const profileItem = { href: '/profile', label: 'Profile', icon: UserCircle }; // Changed to link href


export default function BottomNavBar({
    isAuthenticated,
    userRole,
    userName,
    userAvatarUrl,
    onAuthClick,
}: BottomNavBarProps) {
  const pathname = usePathname();

  const navItems = [...navItemsBase];

  if (isAuthenticated && (userRole === 'Admin' || userRole === 'ParkingLotOwner')) {
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

        {/* Profile Link / Auth Button */}
        {isAuthenticated ? (
            <Link
                href={profileItem.href}
                className={cn(
                   'flex flex-col items-center justify-center text-center transition-colors w-16 h-16 rounded-md',
                   pathname === profileItem.href ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80',
                   'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
                )}
                aria-current={pathname === profileItem.href ? 'page' : undefined}
                aria-label="View Profile"
            >
                 <Avatar className="h-5 w-5 mb-1">
                      <AvatarImage src={userAvatarUrl || undefined} alt={userName || 'User'} className="object-cover" />
                      <AvatarFallback className="text-[10px] bg-muted">{userInitial}</AvatarFallback>
                  </Avatar>
                 <span className="text-xs truncate max-w-[50px]">{profileButtonLabel}</span>
            </Link>
        ) : (
            <Button
                variant="ghost"
                className={cn(
                    'flex flex-col items-center justify-center text-center transition-colors w-16 h-16 rounded-md',
                    'text-muted-foreground hover:text-foreground/80',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
                )}
                onClick={onAuthClick}
                aria-label="Sign In or Sign Up"
            >
                <UserCircle className={cn('h-5 w-5 mb-1')} />
                <span className="text-xs truncate max-w-[50px]">{profileButtonLabel}</span>
            </Button>
        )}
      </div>
    </nav>
  );
}