// src/components/layout/BottomNavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BrainCircuit, ShieldCheck, Home } from 'lucide-react'; // Using Home for Parking Map
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Map', icon: Home }, // Changed to Home icon
  { href: '/predict', label: 'Predict', icon: BrainCircuit },
  { href: '/admin', label: 'Admin', icon: ShieldCheck }, // TODO: Conditionally render based on role
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          // TODO: Add logic here to hide Admin link if user role is not 'Admin'
          // Example: if (item.href === '/admin' && userRole !== 'Admin') return null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center text-center transition-colors w-16 h-16 rounded-md', // Added rounded-md for potential focus indicator
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground' // Added focus styles
              )}
            >
              <item.icon className={cn('h-5 w-5 mb-1', isActive ? 'text-primary' : '')} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
