// src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { Car, ShieldCheck, Menu, UserCircle, Compass, Home } from 'lucide-react'; // Added Home icon
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // Added SheetClose
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import { useContext } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar

export default function Header() {
  const { isAuthenticated, userRole, userName, userAvatarUrl, logout } = useContext(AppStateContext)!;
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Mobile Nav Trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2"
              aria-label="Toggle Menu"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0 w-[250px] sm:w-[300px]">
            <Link href="/" className="flex items-center space-x-2 mb-6 px-4 pt-4">
                <Car className="h-6 w-6 text-primary" />
                <span className="font-bold">Carpso</span>
            </Link>
            <nav className="flex flex-col space-y-1 px-2">
                <SheetClose asChild>
                   <Button variant="ghost" className="justify-start" asChild>
                       <Link href="/" className="flex items-center gap-1">
                         <Home className="h-4 w-4" /> Home {/* Changed Text and Icon */}
                       </Link>
                   </Button>
                </SheetClose>
                <SheetClose asChild>
                   <Button variant="ghost" className="justify-start" asChild>
                     <Link href="/explore" className="flex items-center gap-1">
                        <Compass className="h-4 w-4" /> Explore
                     </Link>
                   </Button>
               </SheetClose>
              {/* Conditionally show Admin link */}
               {isAuthenticated && (userRole === 'Admin' || userRole === 'ParkingLotOwner') && (
                   <SheetClose asChild>
                       <Button variant="ghost" className="justify-start" asChild>
                           <Link href="/admin" className="flex items-center gap-1">
                              <ShieldCheck className="h-4 w-4" />
                              Admin Dashboard
                           </Link>
                       </Button>
                   </SheetClose>
               )}
               {/* Conditionally show Profile link */}
               {isAuthenticated && (
                   <SheetClose asChild>
                       <Button variant="ghost" className="justify-start" asChild>
                           <Link href="/profile" className="flex items-center gap-1">
                              <UserCircle className="h-4 w-4" />
                              My Profile
                           </Link>
                       </Button>
                   </SheetClose>
               )}
            </nav>
            {/* Logout button at the bottom of mobile menu */}
            {isAuthenticated && (
                 <div className="mt-auto p-4">
                    <SheetClose asChild>
                        <Button variant="outline" className="w-full" onClick={logout}>Log Out</Button>
                    </SheetClose>
                 </div>
            )}
          </SheetContent>
        </Sheet>

         {/* Desktop Logo/Title */}
        <div className="flex items-center mr-4">
          <Link href="/" className="flex items-center space-x-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline-block font-bold">
              Carpso
            </span>
          </Link>
        </div>

         {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium flex-1">
             <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1">
              <Home className="h-4 w-4" /> Home {/* Changed Text and Icon */}
            </Link>
            <Link href="/explore" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1">
               <Compass className="h-4 w-4" /> Explore
            </Link>
            {/* Conditionally show Admin link */}
            {isAuthenticated && (userRole === 'Admin' || userRole === 'ParkingLotOwner') && (
                <Link href="/admin" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1">
                   <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
            )}
        </nav>

        {/* Auth / Profile Button Area - Now managed here for desktop */}
        <div className="hidden md:flex items-center justify-end space-x-2 ml-auto">
            {isAuthenticated ? (
                 <Link href="/profile">
                     <Button variant="ghost" className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                              <AvatarImage src={userAvatarUrl || undefined} alt={userName || 'User'} className="object-cover" />
                              <AvatarFallback className="text-xs bg-muted">{userInitial}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{userName || 'Profile'}</span>
                     </Button>
                 </Link>
            ) : (
                 // The Auth button is now handled within ParkingLotManager, so nothing needed here for desktop if that's the only place it appears.
                 // If you want a desktop sign-in button here:
                 // <Button onClick={() => { /* Need access to modal control */ }}>Sign In</Button>
                 null // Keep it clean if auth is handled elsewhere
            )}
        </div>
      </div>
    </header>
  );
}
