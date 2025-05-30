// src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { ShieldCheck, Menu, UserCircle, Compass, Home, User as UserIcon, LifeBuoy, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AppStateContext } from '@/context/AppStateProvider';
import { useContext } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CarpsoLogo from '@/components/icons/CarpsoLogo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function Header() {
  const { isAuthenticated, userRole, userName, userAvatarUrl, logout } = useContext(AppStateContext)!;
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  const isAdminOrOwner = userRole === 'Admin' || userRole === 'ParkingLotOwner';
  const isAttendant = userRole === 'ParkingAttendant';

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
          <SheetContent side="left" className="pr-0 w-[250px] sm:w-[300px] flex flex-col">
             <SheetHeader className="p-4 pb-2">
               <SheetTitle className="sr-only">Navigation Menu</SheetTitle> {/* Visually hidden title */}
             </SheetHeader>
            <SheetClose asChild>
              <Button variant="ghost" asChild className="justify-start h-auto px-4 py-2 mb-2">
                <Link href="/" className="flex items-center space-x-2">
                    <CarpsoLogo className="h-8 w-auto text-primary" />
                    <span className="font-bold text-lg">Carpso</span>
                </Link>
              </Button>
            </SheetClose>
            <nav className="flex flex-col space-y-1 px-2 flex-grow">
                <SheetClose asChild>
                   <Button variant="ghost" className="justify-start" asChild>
                       <Link href="/" className="flex items-center gap-2">
                         <Home className="h-4 w-4" /> Home
                       </Link>
                   </Button>
                </SheetClose>
                <SheetClose asChild>
                   <Button variant="ghost" className="justify-start" asChild>
                     <Link href="/explore" className="flex items-center gap-2">
                        <Compass className="h-4 w-4" /> Explore
                     </Link>
                   </Button>
               </SheetClose>
               {isAuthenticated && (
                <SheetClose asChild>
                  <Button variant="ghost" className="justify-start" asChild>
                    <Link href="/chat" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Messages
                    </Link>
                  </Button>
                </SheetClose>
               )}
                 <SheetClose asChild>
                   <Button variant="ghost" className="justify-start" asChild>
                     <Link href="/help" className="flex items-center gap-2">
                        <LifeBuoy className="h-4 w-4" /> Help Centre
                     </Link>
                   </Button>
                </SheetClose>
              {isAuthenticated && isAdminOrOwner && (
                   <SheetClose asChild>
                       <Button variant="ghost" className="justify-start" asChild>
                           <Link href="/admin" className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" />
                              Admin Dashboard
                           </Link>
                       </Button>
                   </SheetClose>
               )}
               {isAuthenticated && isAttendant && (
                   <SheetClose asChild>
                       <Button variant="ghost" className="justify-start" asChild>
                           <Link href="/attendant" className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4" />
                              Attendant Dashboard
                           </Link>
                       </Button>
                   </SheetClose>
               )}
               {isAuthenticated && (
                   <SheetClose asChild>
                       <Button variant="ghost" className="justify-start" asChild>
                           <Link href="/profile" className="flex items-center gap-2">
                              <UserCircle className="h-4 w-4" />
                              My Profile
                           </Link>
                       </Button>
                   </SheetClose>
               )}
            </nav>
            {isAuthenticated && (
                 <div className="mt-auto p-4 border-t">
                    <SheetClose asChild>
                        <Button variant="outline" className="w-full" onClick={logout}>Log Out</Button>
                    </SheetClose>
                 </div>
            )}
          </SheetContent>
        </Sheet>

        <div className="flex items-center mr-4">
          <Link href="/" className="flex items-center space-x-2">
            <CarpsoLogo className="h-8 w-auto text-primary" />
            <span className="hidden sm:inline-block font-bold">
              Carpso
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium flex-1">
             <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2">
              <Home className="h-4 w-4" /> Home
            </Link>
            <Link href="/explore" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2">
               <Compass className="h-4 w-4" /> Explore
            </Link>
            {isAuthenticated && (
              <Link href="/chat" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Messages
              </Link>
            )}
             <Link href="/help" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2">
               <LifeBuoy className="h-4 w-4" /> Help
            </Link>
            {isAuthenticated && isAdminOrOwner && (
                <Link href="/admin" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2">
                   <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
            )}
            {isAuthenticated && isAttendant && (
                <Link href="/attendant" className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-2">
                   <UserIcon className="h-4 w-4" /> Attendant
                </Link>
            )}
        </nav>

        <div className="hidden md:flex items-center justify-end space-x-2 ml-auto">
             <ThemeToggle />
            {isAuthenticated ? (
                 <Link href="/profile" aria-label="View Profile">
                     <Button variant="ghost" className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                              <AvatarImage src={userAvatarUrl || undefined} alt={userName || 'User avatar'} className="object-cover" />
                              <AvatarFallback className="text-xs bg-muted">{userInitial}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{userName || 'Profile'}</span>
                     </Button>
                 </Link>
            ) : (
                 null // AuthModal is now handled globally by MainLayoutClientWrapper
            )}
        </div>
      </div>
    </header>
  );
}
