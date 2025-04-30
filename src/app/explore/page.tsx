// src/app/explore/page.tsx
'use client'; // Needed for useEffect, useState

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, Megaphone, Sparkles, MapPin, BadgeCent, Fuel, SprayCan, Wifi, Loader2, ServerCrash } from "lucide-react"; // Replaced ChargingStation with Fuel, Added Loader2, ServerCrash
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement } from '@/services/advertisement'; // Import Advertisement type
import { getAdvertisements } from '@/services/advertisement'; // Import service to fetch ads
import type { ParkingLotService } from '@/services/parking-lot'; // Import service type

// Mock Data - Replace with actual data fetching
const mockEvents = [
    { id: 1, title: "Weekend Parking Discount", location: "Downtown Garage", date: "This Weekend", description: "Get 20% off parking rates all weekend!", image: "https://picsum.photos/seed/event1/300/150" },
    { id: 2, title: "Monthly Pass Holder Event", location: "Airport Lot B", date: "Aug 15th", description: "Exclusive entry raffle for pass holders.", image: "https://picsum.photos/seed/event2/300/150" },
];

const mockAuctions = [
    { id: 1, title: "Abandoned Vehicle Auction", location: "Mall Parking Deck - Level 3", date: "Next Tuesday, 10 AM", description: "Several vehicles up for auction. Viewing starts at 9 AM.", image: "https://picsum.photos/seed/auction1/300/150" },
];

// Helper to get service icon
const getServiceIcon = (service: ParkingLotService | undefined) => {
    switch (service) {
      case 'EV Charging': return <Fuel className="h-8 w-8 text-primary mb-2" />; // Replaced ChargingStation with Fuel
      case 'Car Wash': return <SprayCan className="h-8 w-8 text-primary mb-2" />;
      case 'Mobile Money Agent': return <BadgeCent className="h-8 w-8 text-primary mb-2" />;
      case 'Wifi': return <Wifi className="h-8 w-8 text-primary mb-2" />;
      // Add other cases for Valet, Restroom etc. if needed
      default: return <Sparkles className="h-8 w-8 text-primary mb-2" />; // Default icon
    }
  };


const mockServices = [
    { id: 1, name: "EV Charging Station", location: "Downtown Garage", description: "Level 2 chargers available.", icon: Fuel, serviceType: 'EV Charging' as ParkingLotService }, // Replaced ChargingStation
    { id: 2, name: "Premium Car Wash", location: "Mall Parking Deck", description: "Hand wash and detailing services.", icon: SprayCan, serviceType: 'Car Wash' as ParkingLotService },
    { id: 3, name: "Mobile Money Booth", location: "Airport Lot B", description: "Airtel & MTN Mobile Money available.", icon: BadgeCent, serviceType: 'Mobile Money Agent' as ParkingLotService },
    { id: 4, name: "Free Wi-Fi Zone", location: "Downtown Garage", description: "Complimentary Wi-Fi near the entrance.", icon: Wifi, serviceType: 'Wifi' as ParkingLotService },
];


export default function ExplorePage() {
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [isLoadingAds, setIsLoadingAds] = useState(true);
    const [errorLoadingAds, setErrorLoadingAds] = useState<string | null>(null);

    useEffect(() => {
        const fetchExploreAds = async () => {
            setIsLoadingAds(true);
            setErrorLoadingAds(null);
            try {
                // Fetch all active advertisements (no specific location filter here)
                const fetchedAds = await getAdvertisements();
                // Add location name if missing for display
                const adsWithNames = fetchedAds.map(ad => ({
                    ...ad,
                    targetLotName: ad.targetLotName || (ad.targetLocationId ? `Lot ${ad.targetLocationId.substring(0,5)}...` : 'All Locations')
                }));
                setAds(adsWithNames);
            } catch (err) {
                console.error("Failed to fetch advertisements for explore page:", err);
                setErrorLoadingAds("Could not load promotions and updates.");
            } finally {
                setIsLoadingAds(false);
            }
        };
        fetchExploreAds();
    }, []);


    // Combine mock events with fetched ads for display (or replace mocks entirely)
    const allPromotions = [
        ...ads.map(ad => ({ // Transform fetched ads to match display structure
             id: ad.id,
             title: ad.title,
             location: ad.targetLotName || 'All Locations', // Use added name
             date: ad.endDate ? `Until ${new Date(ad.endDate).toLocaleDateString()}` : 'Ongoing',
             description: ad.description,
             image: ad.imageUrl || `https://picsum.photos/seed/${ad.id}/300/150`, // Use provided or placeholder image
             isAd: true, // Flag to potentially style differently
             associatedService: ad.associatedService, // Pass service type
        })),
        ...mockEvents.map(event => ({ ...event, isAd: false })), // Keep mock events for now
    ];

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-primary" /> Explore Nearby
      </h1>
      <p className="text-muted-foreground mb-8">Discover events, promotions, and services happening at Carpso parking locations.</p>

      {/* Events & Promotions Section (Now includes Ads) */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-accent" /> Updates & Promotions
        </h2>
        {isLoadingAds ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <Skeleton className="h-60 w-full" />
                 <Skeleton className="h-60 w-full" />
                 <Skeleton className="h-60 w-full" />
             </div>
        ) : errorLoadingAds ? (
            <div className="text-center py-10 text-destructive bg-destructive/10 rounded-md">
                <ServerCrash className="mx-auto h-10 w-10 mb-2" />
                <p>{errorLoadingAds}</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allPromotions.map(item => (
                    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                        <Image src={item.image} alt={item.title} width={300} height={150} className="w-full h-40 object-cover"/>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{item.title}</CardTitle>
                                {item.isAd && <Badge variant="secondary" size="sm">Ad</Badge>}
                            </div>
                            <CardDescription className="flex items-center gap-1 text-xs pt-1">
                                <MapPin className="h-3 w-3" /> {item.location} &bull; {item.date}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between">
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            {/* Show associated service badge if available */}
                            {item.isAd && item.associatedService && (
                                <div className="mt-auto pt-2">
                                    <Badge variant="outline" size="sm" className="flex items-center w-fit">
                                         {getServiceIcon(item.associatedService)} <span className="ml-1">{item.associatedService}</span>
                                    </Badge>
                                </div>
                             )}
                        </CardContent>
                    </Card>
                ))}
                 {allPromotions.length === 0 && (
                     <p className="text-muted-foreground md:col-span-2 lg:col-span-3 text-center py-6">
                        No current updates or promotions found.
                     </p>
                 )}
            </div>
        )}
      </section>

       {/* Auctions Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-accent" /> Auctions & Notices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {mockAuctions.map(auction => (
                <Card key={auction.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <Image src={auction.image} alt={auction.title} width={300} height={150} className="w-full h-40 object-cover"/>
                    <CardHeader>
                        <CardTitle>{auction.title}</CardTitle>
                         <CardDescription className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" /> {auction.location} &bull; {auction.date}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{auction.description}</p>
                    </CardContent>
                </Card>
            ))}
            {mockAuctions.length === 0 && <p className="text-muted-foreground md:col-span-2 text-center py-6">No upcoming auctions or notices.</p>}
        </div>
      </section>

       {/* Services Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" /> Featured Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockServices.map(service => (
                <Card key={service.id} className="flex flex-col items-center p-4 text-center hover:bg-accent/5 transition-colors">
                    {/* Use the helper function to get the icon component */}
                    {getServiceIcon(service.serviceType)}
                    <CardTitle className="text-base font-medium mb-1">{service.name}</CardTitle>
                    <CardDescription className="text-xs mb-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3"/> {service.location}
                    </CardDescription>
                    <p className="text-xs text-muted-foreground flex-grow">{service.description}</p>
                </Card>
            ))}
            {mockServices.length === 0 && <p className="text-muted-foreground sm:col-span-2 lg:col-span-4 text-center py-6">No featured services available.</p>}
        </div>
      </section>

    </div>
  );
}
