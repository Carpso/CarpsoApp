'use client'; // Add 'use client' for useEffect

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import { Toaster } from "@/components/ui/toaster";
import AppStateProvider from '@/context/AppStateProvider'; // Import the provider
import React, { useEffect } from 'react'; // Import useEffect

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata can still be exported from client components in App Router
// Removed: Metadata must be in a server component.
// export const metadata: Metadata = {
//   title: 'Carpso - Smart Parking',
//   description: 'Find, predict, and reserve parking spots.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  useEffect(() => {
    // --- Tawk.to Chat Widget ---
    // IMPORTANT: Replace 'YOUR_PROPERTY_ID' and 'YOUR_WIDGET_ID' with your actual Tawk.to IDs
    // Get these from your Tawk.to dashboard: Admin -> Chat Widget
    const tawkPropertyId = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID || 'YOUR_PROPERTY_ID';
    const tawkWidgetId = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID || 'YOUR_WIDGET_ID';

    if (tawkPropertyId === 'YOUR_PROPERTY_ID' || tawkWidgetId === 'YOUR_WIDGET_ID') {
        console.warn('Tawk.to environment variables not set. Chat widget will not load.');
        return;
    }

    // Prevent duplicate script injection
    if (document.getElementById('tawkto-script')) {
        return;
    }

    var Tawk_API = Tawk_API || {};
    var Tawk_LoadStart = new Date();
    (function () {
      var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
      s1.async = true;
      s1.src = `https://embed.tawk.to/${tawkPropertyId}/${tawkWidgetId}`;
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      s1.id = 'tawkto-script'; // Add ID to check for existing script
      s0?.parentNode?.insertBefore(s1, s0);
      console.log("Tawk.to script loaded.");
    })();

    // Optional: You can use Tawk_API for customization after load
    // Tawk_API.onLoad = function(){
    //     console.log("Tawk.to Widget Loaded");
    //     // Tawk_API.maximize(); // Example: Maximize widget on load
    // };

     // Cleanup function (optional, Tawk.to usually handles itself well)
     // return () => {
     //   const script = document.getElementById('tawkto-script');
     //   if (script) {
     //     script.remove();
     //   }
     //   // Clean up global Tawk variables if necessary
     //   delete (window as any).Tawk_API;
     //   delete (window as any).Tawk_LoadStart;
     //   // Remove the widget elements if needed
     //   const widgetElements = document.querySelectorAll('[id^="tawk-"]');
     //   widgetElements.forEach(el => el.remove());
     //   console.log("Tawk.to script and elements cleaned up.");
     // };

  }, []); // Empty dependency array ensures this runs only once on mount


  return (
    <html lang="en" className="light"> {/* Force light theme for now */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}>
         <AppStateProvider>{/* Wrap with the provider */}
            <div className="relative flex min-h-screen flex-col pb-16 md:pb-0">{/* Add padding-bottom for BottomNavBar on mobile */}
               <Header />
               <main className="flex-1">{children}</main>
               {/* BottomNavBar is now conditionally rendered inside ParkingLotManager based on context */}
            </div>
            <Toaster />
         </AppStateProvider>
          {/* Tawk.to script will be injected here by the useEffect hook */}
      </body>
    </html>
  );
}
