// src/app/layout.tsx
import './globals.css';
import Header from '@/components/layout/Header';
import { Toaster } from "@/components/ui/toaster";
import AppStateProvider from '@/context/AppStateProvider';
import React from 'react';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import type { Metadata } from 'next';
import MainLayoutClientWrapper from '@/components/layout/MainLayoutClientWrapper'; // NEW IMPORT

const HEADER_HEIGHT = '4rem'; // Define header height as a constant

// Metadata export for App Router
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
    "antialiased",
    "min-h-screen",
    "bg-background",
    "font-sans"
  ].filter(Boolean).join(" ");

  return (
    // No whitespace before <html>
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* title and meta description are now handled by the exported metadata object */}
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
                {/* MainLayoutClientWrapper will now handle BottomNavBar and AuthModal globally */}
                <MainLayoutClientWrapper>
                    <div className="relative flex min-h-screen flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                        <Header />
                        <main className="flex-1" style={{ minHeight: `calc(100vh - var(--header-height))` }}>
                            {children}
                        </main>
                    </div>
                </MainLayoutClientWrapper>
                <Toaster />
            </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Example of how Tawk.to could be initialized in a separate client component:
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
      // console.log('Tawk.to environment variables not set or placeholders. Live chat disabled.');
      return;
    }
    if (document.getElementById('tawkto-script')) return;

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
      s1.onerror = (event) => {
          console.error(
              "Error loading Tawk.to script. Attempted Property ID:", tawkPropertyId, 
              "Widget ID:", tawkWidgetId, 
              "Error details:", event 
          );
      };
      s0?.parentNode?.insertBefore(s1, s0);
    }
  }, [isClient]);

  return null;
}
// Then, in layout.tsx, you would import and use it inside AppStateProvider if needed:
// import TawkToInitializer from '@/components/layout/TawkToInitializer';
// ...
// <AppStateProvider>
//   <MainLayoutClientWrapper>...</MainLayoutClientWrapper>
//   <Toaster />
//   <TawkToInitializer /> // Add this
// </AppStateProvider>
*/
