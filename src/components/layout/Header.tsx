import Link from 'next/link';
import { Car, ShieldCheck } from 'lucide-react'; // Added ShieldCheck for Admin
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              Carpso
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
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
        </div>
        {/* Mobile Nav */}
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
          <SheetContent side="left" className="pr-0">
            <Link href="/" className="flex items-center space-x-2 mb-6">
                <Car className="h-6 w-6 text-primary" />
                <span className="font-bold">Carpso</span>
            </Link>
            <nav className="flex flex-col space-y-4">
               <Link href="/" className="text-muted-foreground hover:text-foreground">
                Parking Map
              </Link>
              <Link href="/predict" className="text-muted-foreground hover:text-foreground">
                Predict Availability
              </Link>
              {/* TODO: Show this link only for Admin role */}
               <Link href="/admin" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  Admin Dashboard
               </Link>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
           {/* Placeholder for potential User Actions/Auth Button */}
           {/* <Button>Login</Button> */}
        </div>
      </div>
    </header>
  );
}
