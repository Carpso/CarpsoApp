// src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { Car, ShieldCheck, Menu, UserCircle, Compass } from 'lucide-react'; // Added Compass
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
// Note: Auth state is handled via context now (AppStateProvider)

export default function Header() {
  // Auth state would come from context if needed here, but primary buttons are in ParkingLotManager
  // const { isAuthenticated } = useContext(AppStateContext)!;

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
               <Button variant="ghost" className="justify-start" asChild>
                   <Link href="/" >Carpso Map</Link> {/* Changed label here */}
               </Button>
               <Button variant="ghost" className="justify-start" asChild>
                 <Link href="/explore" className="flex items-center gap-1">
                    <Compass className="h-4 w-4" /> Explore
                 </Link>
               </Button>
              {/* TODO: Conditionally show Admin link based on role from context */}
               <Button variant="ghost" className="justify-start" asChild>
                   <Link href="/admin" className="flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      Admin Dashboard
                   </Link>
               </Button>
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
              Carpso Map {/* Changed label here */}
            </Link>
            <Link
              href="/explore"
              className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1"
            >
               <Compass className="h-4 w-4" />
               Explore
            </Link>
             {/* TODO: Conditionally show Admin link based on role from context */}
            <Link
              href="/admin"
              className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1"
            >
               <ShieldCheck className="h-4 w-4" />
               Admin Dashboard
            </Link>
        </nav>


        {/* Auth / Profile Button Area - managed in ParkingLotManager */}
        <div className="flex items-center justify-end space-x-2 ml-auto">
           {/* The actual button rendering is controlled by ParkingLotManager using context */}
        </div>
      </div>
    </header>
  );
}