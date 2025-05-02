
'use client'; // Required for useEffect and useState

import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import { Toaster } from "@/components/ui/toaster";
import AppStateProvider from '@/context/AppStateProvider'; // Import the provider
import React, { useEffect, useState } from 'react'; // Import useEffect, useState
import { useToast } from '@/hooks/use-toast'; // Import useToast

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata should ideally be defined in a server component parent or the page itself.
// export const metadata: Metadata = {
//   title: 'Carpso - Smart Parking',
//   description: 'Find, predict, and reserve parking spots.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { toast } = useToast();
  const [chatError, setChatError] = useState<string | null>(null); // State for chat errors

  useEffect(() => {
    // --- Tawk.to Chat Widget ---
    // IMPORTANT: Ensure NEXT_PUBLIC_TAWKTO_PROPERTY_ID and NEXT_PUBLIC_TAWKTO_WIDGET_ID
    //            are set in your .env file for the chat to work.
    const tawkPropertyId = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID;
    const tawkWidgetId = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID;
    const isConfigured = tawkPropertyId && tawkWidgetId && tawkPropertyId !== 'YOUR_PROPERTY_ID' && tawkWidgetId !== 'YOUR_WIDGET_ID';

    setChatError(null); // Clear previous errors on effect run

    if (typeof window !== 'undefined' && !isConfigured) {
      console.warn('Tawk.to environment variables (NEXT_PUBLIC_TAWKTO_PROPERTY_ID, NEXT_PUBLIC_TAWKTO_WIDGET_ID) are not set correctly. Live chat will be disabled.');
      setChatError('Live chat is currently unavailable (Configuration missing).');
      // Optionally show a toast to the user if config is missing (might be annoying)
      // toast({ title: "Chat Unavailable", description: "Live chat configuration is missing.", variant: "default" });
    }

    // Ensure we run this only once on the client after mount
    if (typeof window !== 'undefined' && isConfigured) {
      // Prevent duplicate script injection
      if (document.getElementById('tawkto-script')) {
        console.log("Tawk.to script already exists.");
        // Check if API exists, sometimes needed if script loaded but API didn't init
        if (!(window as any).Tawk_API) {
             console.warn("Tawk.to script found, but API not initialized. Attempting re-init logic (may cause issues).");
              // Potentially try re-running init logic, but Tawk.to usually handles this.
              // Re-adding the script is generally discouraged.
              setChatError("Chat failed to initialize properly. Try refreshing.");
        } else {
             console.log("Tawk.to API is available.");
        }
        return;
      }

      // Only proceed if IDs are valid and API doesn't exist yet
      if (!(window as any).Tawk_API) {
        (window as any).Tawk_API = (window as any).Tawk_API || {};
        (window as any).Tawk_LoadStart = new Date();

        const s1 = document.createElement("script");
        const s0 = document.getElementsByTagName("script")[0];
        s1.async = true;
        s1.src = `https://embed.tawk.to/${tawkPropertyId}/${tawkWidgetId}`;
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s1.id = 'tawkto-script'; // Add ID to check for existing script

        s1.onload = () => {
            console.log("Tawk.to script loaded successfully.");
            // Verify API is available after load
            if (!(window as any).Tawk_API?.onLoad) {
                 console.error("Tawk.to script loaded, but API failed to initialize.");
                 setChatError("Chat failed to initialize. Try refreshing.");
            }
        };
        s1.onerror = (error) => {
            console.error("Error loading Tawk.to script:", error);
            setChatError("Failed to load live chat script.");
            toast({ title: "Chat Error", description: "Could not load the live chat widget.", variant: "destructive" });
        };

        s0?.parentNode?.insertBefore(s1, s0);
        console.log("Tawk.to script injected.");
      }
    }

    // Cleanup function is generally not needed for Tawk.to standard embed
    // return () => { ... };

  }, [toast]); // Add toast to dependency array

  return (
    // No whitespace before <html>
    <html lang="en" className="light">
      <head>
        {/* Moved meta tags and title to head for proper HTML structure */}
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Carpso - Smart Parking</title>
        <meta name="description" content="Find, predict, and reserve parking spots."/>
        {/* Add favicon link here if needed */}
        {/* <link rel="icon" href="/favicon.ico" sizes="any" /> */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background font-sans`}>
         <AppStateProvider>{/* Wrap with the provider */}
            <div className="relative flex min-h-screen flex-col pb-16 md:pb-0">{/* Add padding-bottom for BottomNavBar on mobile */}
               <Header />
               <main className="flex-1">{children}</main>
               {/* BottomNavBar is now conditionally rendered inside ParkingLotManager based on context */}
            </div>
            <Toaster />
         </AppStateProvider>
          {/* Tawk.to script will be injected here by the useEffect hook
              The widget itself will be positioned by Tawk.to */}
      </body>
    </html>
  );
}
