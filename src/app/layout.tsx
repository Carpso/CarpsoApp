// src/app/layout.tsx
'use client'; // Required for useEffect and useState

import './globals.css';
// import { GeistSans } from 'geist/font/sans'; // Assuming Geist fonts are installed
// import { GeistMono } from 'geist/font/mono'; // Assuming Geist fonts are installed
import Header from '@/components/layout/Header';
import { Toaster } from "@/components/ui/toaster";
import AppStateProvider from '@/context/AppStateProvider';
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Head from 'next/head';
import { ThemeProvider } from '@/components/theme/ThemeProvider'; // Import ThemeProvider

// If using Geist fonts, uncomment these lines and ensure the package is installed
// const geistSans = GeistSans({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });
// const geistMono = GeistMono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

// Define fallback font variables if Geist is not used
const fallbackFontVariables = '';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { toast } = useToast();
  const [chatError, setChatError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
      setIsClient(true);
  }, []);

  useEffect(() => {
      if (!isClient) return;

    const tawkPropertyId = process.env.NEXT_PUBLIC_TAWKTO_PROPERTY_ID;
    const tawkWidgetId = process.env.NEXT_PUBLIC_TAWKTO_WIDGET_ID;
    const isConfigured = tawkPropertyId && tawkWidgetId && tawkPropertyId !== 'YOUR_PROPERTY_ID' && tawkWidgetId !== 'YOUR_WIDGET_ID';

    setChatError(null);

    if (!isConfigured) {
      console.warn('Tawk.to environment variables not set correctly. Live chat will be disabled.');
      setChatError('Live chat is currently unavailable (Configuration missing).');
    }

    if (isConfigured) {
      if (document.getElementById('tawkto-script')) {
        console.log("Tawk.to script already exists.");
        if (!(window as any).Tawk_API) {
             console.warn("Tawk.to script found, but API not initialized.");
              setChatError("Chat failed to initialize properly. Try refreshing.");
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
            console.log("Tawk.to script loaded successfully.");
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
  }, [isClient, toast]);

  return (
    <html lang="en" suppressHydrationWarning> {/* Remove default class, add suppressHydrationWarning */}
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <title>Carpso - Smart Parking</title>
        <meta name="description" content="Find, predict, and reserve parking spots." />
      </Head>
      <body className={`${fallbackFontVariables} antialiased min-h-screen bg-background font-sans`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AppStateProvider>
                <div className="relative flex min-h-screen flex-col pb-16 md:pb-0">
                    <Header />
                    <main className="flex-1">{children}</main>
                </div>
                <Toaster />
            </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
