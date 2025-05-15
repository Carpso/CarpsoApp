// src/app/layout.tsx
'use client';

import './globals.css';
// import { Inter } from 'next/font/google'; // Keep Inter commented out if using Geist
// import { GeistSans } from 'geist/font/sans'; // Import Geist Sans
// import { GeistMono } from 'geist/font/mono'; // Removed Geist Mono import
import Header from '@/components/layout/Header';
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is imported
import AppStateProvider from '@/context/AppStateProvider'; // Import the provider
import React, { useEffect, useState } from 'react';
import Head from 'next/head'; // Import Head for metadata
import { ThemeProvider } from '@/components/theme/ThemeProvider'; // Import ThemeProvider


// If using Geist fonts, uncomment these lines and ensure the package is installed
// const geistSans = GeistSans({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });
// const geistMono = GeistMono({ // Keep this commented out if not used or installed
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

// Define fallback font variables if Geist is not used or to avoid reference errors
const fallbackFontVariables = '';
// const geistSansVariable = typeof GeistSans !== 'undefined' ? GeistSans.variable : '';
// const geistMonoVariable = typeof GeistMono !== 'undefined' ? GeistMono.variable : '';


// Define a CSS variable for header height if not already globally available
const HEADER_HEIGHT = '4rem'; // Example: 64px, adjust if your header height is different


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
      setIsClient(true);
  }, []);

  useEffect(() => {
      if (!isClient) return;

    const tawkPropertyId = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID;
    const tawkWidgetId = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID;
    
    // More robust check: ensure they are not just empty strings but have some length,
    // and are not the placeholder values.
    const isConfigured = 
        tawkPropertyId && tawkPropertyId.trim() !== '' &&
        tawkWidgetId && tawkWidgetId.trim() !== '' &&
        tawkPropertyId !== 'YOUR_PROPERTY_ID' && 
        tawkWidgetId !== 'YOUR_WIDGET_ID';


    if (!isConfigured) {
      console.log('Tawk.to environment variables (NEXT_PUBLIC_TAWKTO_PROPERTY_ID, NEXT_PUBLIC_TAWKTO_WIDGET_ID) are not set or are placeholders. Live chat will be disabled.');
      return; // Exit early if not configured
    }

    // If configured, proceed with script injection
    console.log("Tawk.to is configured. Attempting to inject script with Property ID:", tawkPropertyId, "Widget ID:", tawkWidgetId);

    if (document.getElementById('tawkto-script')) {
      console.log("Tawk.to script already exists.");
      if (!(window as any).Tawk_API) {
           console.warn("Tawk.to script found, but Tawk_API not initialized. This might indicate a problem with the script or a previous loading attempt.");
      } else {
           console.log("Tawk.to API is available.");
      }
      return;
    }

    if (!(window as any).Tawk_API) { // Check again, in case it was injected by another means but failed
      (window as any).Tawk_API = (window as any).Tawk_API || {};
      (window as any).Tawk_LoadStart = new Date();

      const s1 = document.createElement("script");
      const s0 = document.getElementsByTagName("script")[0];
      s1.async = true;
      s1.src = `https://embed.tawk.to/${tawkPropertyId}/${tawkWidgetId}`;
      s1.charset = 'UTF-8';
      s1.setAttribute('crossorigin', '*');
      s1.id = 'tawkto-script';

      s1.onload = () => {
          console.log("Tawk.to script loaded successfully via onload event.");
          if (!(window as any).Tawk_API?.onLoad && !(window as any).Tawk_API?.showWidget) { // Check for API presence
               console.error("Tawk.to script 'onload' triggered, but Tawk_API seems uninitialized or incomplete. Check Tawk.to dashboard for configuration issues.");
          }
      };
      s1.onerror = (event) => { // event can be an ErrorEvent or just an Event
          console.error(
              "Error loading Tawk.to script. This might be due to incorrect Property/Widget IDs, network issues, ad-blockers, or the Tawk.to service itself.",
              "Attempted to use Property ID:", tawkPropertyId, 
              "Widget ID:", tawkWidgetId, 
              "Error details:", event // Log the actual event/error object
          );
          // You could add a user-facing notification here if critical
      };

      s0?.parentNode?.insertBefore(s1, s0);
      console.log("Tawk.to script injection initiated.");
    }
  }, [isClient]);

  return (
    // No whitespace before <html>
    <html lang="en" suppressHydrationWarning> {/* Remove default class, add suppressHydrationWarning */}
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <title>Carpso - Smart Parking</title>
        <meta name="description" content="Find, predict, and reserve parking spots." />
        {/* Define CSS variable for header height */}
        <style>{`:root { --header-height: ${HEADER_HEIGHT}; }`}</style>
      </Head>
      <body className={`${fallbackFontVariables} antialiased min-h-screen bg-background font-sans`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AppStateProvider>{/* Wrap with the provider */}
                <div className="relative flex min-h-screen flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}> {/* Add padding-bottom for BottomNavBar on mobile */}
                    <Header />
                    {/* Main content takes remaining height, consider header height */}
                    <main className="flex-1" style={{ minHeight: `calc(100vh - var(--header-height))` }}>
                        {children}
                    </main>
                </div>
                <Toaster />
            </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
