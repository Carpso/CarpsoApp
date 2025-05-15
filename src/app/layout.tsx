// src/app/layout.tsx
import './globals.css';
// Fallback font variables if Geist is not used
const fallbackFontVariables = ''; // Keep if Geist is removed, otherwise remove if Geist is used
import Header from '@/components/layout/Header';
import { Toaster } from "@/components/ui/toaster";
import AppStateProvider from '@/context/AppStateProvider';
import React from 'react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import type { Metadata } from 'next';

const HEADER_HEIGHT = '4rem';

export const metadata: Metadata = {
  title: 'Carpso - Smart Parking',
  description: 'Find, predict, and reserve parking spots.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Construct body classes carefully to avoid leading/trailing spaces
  const bodyClassNames = [
    fallbackFontVariables,
    "antialiased",
    "min-h-screen",
    "bg-background",
    "font-sans"
  ].filter(Boolean).join(" ");

  return (<html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* title and meta description are handled by the exported metadata object */}
        <style>{`:root { --header-height: ${HEADER_HEIGHT}; }`}</style>
      </head>
      <body className={bodyClassNames}>
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
    </html>);
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
      // console.log('Tawk.to environment variables are not set or are placeholders. Live chat will be disabled.');
      return;
    }

    if (document.getElementById('tawkto-script')) {
      // console.log("Tawk.to script already exists.");
      // if (!(window as any).Tawk_API) {
      //      console.warn("Tawk.to script found, but Tawk_API not initialized.");
      // } else {
      //      console.log("Tawk.to API is available.");
      // }
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
          // console.log("Tawk.to script loaded successfully via onload event.");
          // if (!(window as any).Tawk_API?.onLoad && !(window as any).Tawk_API?.showWidget) {
          //      console.error("Tawk.to script 'onload' triggered, but Tawk_API seems uninitialized.");
          // }
      };
      s1.onerror = (event) => {
          console.error(
              "Error loading Tawk.to script. Attempted Property ID:", tawkPropertyId, 
              "Widget ID:", tawkWidgetId, 
              "Error details:", event 
          );
      };

      s0?.parentNode?.insertBefore(s1, s0);
      // console.log("Tawk.to script injection initiated.");
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
