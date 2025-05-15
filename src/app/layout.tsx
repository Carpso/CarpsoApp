// src/app/layout.tsx
// Removed 'use client'; directive to make this a Server Component

import './globals.css';
// Fallback font variables if Geist is not used
const fallbackFontVariables = '';
import Header from '@/components/layout/Header';
import { Toaster } from "@/components/ui/toaster";
import AppStateProvider from '@/context/AppStateProvider';
import React from 'react'; // Keep React for JSX, remove useEffect, useState
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import type { Metadata } from 'next'; // Import Metadata type

// Define a CSS variable for header height
const HEADER_HEIGHT = '4rem';

// Metadata export for App Router - This is now allowed
export const metadata: Metadata = {
  title: 'Carpso - Smart Parking',
  description: 'Find, predict, and reserve parking spots.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The isClient state and useEffect for Tawk.to are client-side concerns.
  // While they might work here after hydration, encapsulating them in a
  // dedicated Client Component would be a cleaner pattern if issues arise.
  // For now, let's see if removing 'use client' and keeping the useEffect
  // functions as is (they will run on client post-hydration).

  // Note: Since this is now a Server Component, directly using useState and useEffect
  // for the Tawk.to script like before might be problematic if not handled carefully.
  // For this fix, we assume the Tawk.to logic will be moved to a Client Component if needed.
  // The original Tawk.to useEffect logic is removed from here to ensure this is a Server Component.
  // If Tawk.to is still needed, it must be initialized within a Client Component.

  return (
    // No whitespace before <html>
    <html lang="en" suppressHydrationWarning> {/* Remove default class, add suppressHydrationWarning */}
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* title and meta description are now handled by the exported metadata object */}
        <style>{`:root { --header-height: ${HEADER_HEIGHT}; }`}</style>
      </head>
      <body className={`${fallbackFontVariables} antialiased min-h-screen bg-background font-sans`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AppStateProvider>
                <div className="relative flex min-h-screen flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <Header />
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

// If Tawk.to functionality is critical, create a new Client Component like this:
// src/components/layout/TawkToInitializer.tsx
/*
'use client';

import React, { useEffect, useState } from 'react';

export default function TawkToInitializer() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const tawkPropertyId = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID;
    const tawkWidgetId = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID;
    
    const isConfigured = 
        tawkPropertyId && tawkPropertyId.trim() !== '' &&
        tawkWidgetId && tawkWidgetId.trim() !== '' &&
        tawkPropertyId !== 'YOUR_PROPERTY_ID' && 
        tawkWidgetId !== 'YOUR_WIDGET_ID';

    if (!isConfigured) {
      console.log('Tawk.to environment variables are not set or are placeholders. Live chat will be disabled.');
      return;
    }

    if (document.getElementById('tawkto-script')) {
      console.log("Tawk.to script already exists.");
      if (!(window as any).Tawk_API) {
           console.warn("Tawk.to script found, but Tawk_API not initialized.");
      } else {
           console.log("Tawk.to API is available.");
      }
      return;
    }

    if (!(window as any).Tawk_API) {
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
          if (!(window as any).Tawk_API?.onLoad && !(window as any).Tawk_API?.showWidget) {
               console.error("Tawk.to script 'onload' triggered, but Tawk_API seems uninitialized.");
          }
      };
      s1.onerror = (event) => {
          console.error(
              "Error loading Tawk.to script. Attempted Property ID:", tawkPropertyId, 
              "Widget ID:", tawkWidgetId, 
              "Error details:", event 
          );
      };

      s0?.parentNode?.insertBefore(s1, s0);
      console.log("Tawk.to script injection initiated.");
    }
  }, [isClient]);

  return null; // This component doesn't render anything visible
}

// Then, in layout.tsx, you would import and use it:
// import TawkToInitializer from '@/components/layout/TawkToInitializer';
// ...
// <body ...>
//   <ThemeProvider ...>
//     <AppStateProvider>
//       ...
//       <TawkToInitializer /> // Add this
//     </AppStateProvider>
//   </ThemeProvider>
// </body>
*/
