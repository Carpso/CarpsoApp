import Link from 'next/link';
import { Car, ShieldCheck, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Mobile Nav Trigger - Now triggers the same nav as BottomNavBar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0 w-[250px] sm:w-[300px]"> {/* Adjusted width */}
            <Link href="/" className="flex items-center space-x-2 mb-6 px-4"> {/* Added padding */}
                <Car className="h-6 w-6 text-primary" />
                <span className="font-bold">Carpso</span>
            </Link>
            <nav className="flex flex-col space-y-2 px-2"> {/* Adjusted padding and spacing */}
               {/* Links moved to BottomNavBar and potentially duplicated here for Drawer */}
               <Link href="/" className="text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted text-sm">
                Parking Map
              </Link>
              <Link href="/predict" className="text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted text-sm">
                Predict Availability
              </Link>
              {/* TODO: Show this link only for Admin role */}
               <Link href="/admin" className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Dashboard
               </Link>
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

         {/* Desktop Navigation (kept for larger screens) */}
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


        <div className="flex items-center justify-end space-x-2 ml-auto"> {/* Use ml-auto to push to the right */}
           {/* Placeholder for potential User Actions/Auth Button */}
           {/* <Button>Login</Button> */}
        </div>
      </div>
    </header>
  );
}
