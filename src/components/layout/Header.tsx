// src/components/layout/Header.tsx
'use client'; // Need client component for state/hooks (though state is managed in parent for now)

import Link from 'next/link';
import { Car, ShieldCheck, Menu, UserCircle } from 'lucide-react'; // Added UserCircle
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
// Note: Authentication state (isAuthenticated, userId, handlers) would typically come from a context or parent component.
// For this example, we'll simulate it or assume it's passed down if needed.

export default function Header({
   // These would be props if state isn't global/contextual
   // isAuthenticated = false,
   // onLoginClick,
   // onProfileClick,
}) {
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
              aria-label="Toggle Menu" // Added aria-label
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0 w-[250px] sm:w-[300px]">
            <Link href="/" className="flex items-center space-x-2 mb-6 px-4 pt-4"> {/* Added top padding */}
                <Car className="h-6 w-6 text-primary" />
                <span className="font-bold">Carpso</span>
            </Link>
            <nav className="flex flex-col space-y-1 px-2"> {/* Adjusted padding and spacing */}
               <Button variant="ghost" className="justify-start" asChild>
                   <Link href="/" >Parking Map</Link>
               </Button>
               <Button variant="ghost" className="justify-start" asChild>
                 <Link href="/predict" >Predict Availability</Link>
               </Button>
              {/* TODO: Show this link only for Admin role */}
               <Button variant="ghost" className="justify-start" asChild>
                   <Link href="/admin" className="flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      Admin Dashboard
                   </Link>
               </Button>
                {/* Add other potential links like Profile, Settings here */}
            </nav>
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
             <Link
              href="/"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Parking Map
            </Link>
            <Link
              href="/predict"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Predict Availability
            </Link>
             {/* TODO: Show this link only for Admin role */}
            <Link
              href="/admin"
              className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1"
            >
               <ShieldCheck className="h-4 w-4" />
               Admin Dashboard
            </Link>
        </nav>


        {/* Auth / Profile Button Area */}
        <div className="flex items-center justify-end space-x-2 ml-auto">
           {/* Placeholder Button - Logic is now handled in ParkingLotManager */}
            {/*
             {isAuthenticated ? (
                <Button variant="ghost" size="icon" onClick={onProfileClick} aria-label="View Profile">
                   <UserCircle className="h-5 w-5" />
                </Button>
            ) : (
                <Button onClick={onLoginClick}>Sign In</Button>
            )}
             */}
             {/* The actual button rendering is controlled by ParkingLotManager */}
        </div>
      </div>
    </header>
  );
}
