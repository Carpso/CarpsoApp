// src/app/layout.tsx
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
// import BottomNavBar from '@/components/layout/BottomNavBar'; // Now imported within ParkingLotManager
import { Toaster } from "@/components/ui/toaster"
import AppStateProvider from '@/context/AppStateProvider'; // Import the provider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Carpso - Smart Parking',
  description: 'Find, predict, and reserve parking spots.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light"> {/* Force light theme for now */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}>
         <AppStateProvider> {/* Wrap with the provider */}
            <div className="relative flex min-h-screen flex-col pb-16 md:pb-0"> {/* Add padding-bottom for BottomNavBar on mobile */}
               <Header />
               <main className="flex-1">{children}</main>
               {/* BottomNavBar is now conditionally rendered inside ParkingLotManager based on context */}
            </div>
            <Toaster />
         </AppStateProvider>
      </body>
    </html>
  );
}
