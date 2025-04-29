import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import { Toaster } from "@/components/ui/toaster"


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
        <div className="relative flex min-h-screen flex-col">
           <Header />
           <main className="flex-1">{children}</main>
           {/* Optional Footer can be added here */}
        </div>
         <Toaster />
      </body>
    </html>
  );
}
