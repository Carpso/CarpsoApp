// src/components/layout/BottomNavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BrainCircuit, ShieldCheck, UserCircle } from 'lucide-react'; // Added UserCircle
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Import Button
import React from 'react'; // Import React for potential context usage

// Assume auth state might come from context or props in a real app
// Example using hypothetical context:
// import { useAuth } from '@/context/AuthContext';

const navItemsBase = [
  { href: '/', label: 'Map', icon: Home },
  { href: '/predict', label: 'Predict', icon: BrainCircuit },
];

// Define admin item separately
const adminItem = { href: '/admin', label: 'Admin', icon: ShieldCheck };

// Define profile item (acts as a button trigger)
const profileItem = { id: 'profile', label: 'Profile', icon: UserCircle };

export default function BottomNavBar() {
  const pathname = usePathname();
  // const { isAuthenticated, userRole, openAuthModal, openProfileModal } = useAuth(); // Example context usage

  // --- Simulation for demonstration ---
  // In a real app, get these from your auth state management (context, Zustand, Redux, props)
  const isAuthenticated = false; // Simulate logged out state
  const userRole = 'User'; // Simulate basic user role
  const openAuthModal = () => console.log('Open Auth Modal triggered'); // Placeholder action
  const openProfileModal = () => console.log('Open Profile Modal triggered'); // Placeholder action
  // --- End Simulation ---

  const navItems = [...navItemsBase];

  // Conditionally add Admin link
  // TODO: Replace 'Admin' with your actual admin role identifier
  if (isAuthenticated && userRole === 'Admin') {
    navItems.push(adminItem);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {/* Map Navigation Items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!} // Added non-null assertion, ensure href exists for links
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

        {/* Profile/Auth Button */}
        <Button
           variant="ghost"
           className={cn(
               'flex flex-col items-center justify-center text-center transition-colors w-16 h-16 rounded-md',
                // Apply active style if a profile-related route is active (adjust as needed)
                // isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80',
                'text-muted-foreground hover:text-foreground/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-accent focus-visible:text-accent-foreground'
           )}
           onClick={isAuthenticated ? openProfileModal : openAuthModal}
           aria-label={isAuthenticated ? 'Open Profile' : 'Sign In or Sign Up'}
        >
             <profileItem.icon className={cn('h-5 w-5 mb-1')} />
             <span className="text-xs">{isAuthenticated ? profileItem.label : 'Sign In'}</span>
        </Button>
      </div>
    </nav>
  );
}
