// src/app/explore/page.tsx
'use client'; // Needed for useEffect, useState

import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, Megaphone, Sparkles, MapPin, BadgeCent, Fuel, SprayCan, Wifi, Loader2, ServerCrash, Bath, ConciergeBell, Star, MessageSquare } from "lucide-react"; // Added Star, MessageSquare
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Skeleton } from '@/components/ui/skeleton';
import type { Advertisement } from '@/services/advertisement'; // Import Advertisement type
import { getAdvertisements } from '@/services/advertisement'; // Import service to fetch ads
import type { ParkingLot, ParkingLotService } from '@/services/parking-lot'; // Import service type and ParkingLot type
import { getAvailableParkingLots } from '@/services/parking-lot'; // Import function to fetch lots
import Link from 'next/link'; // Import Link
import { AppStateContext } from '@/context/AppStateProvider'; // Import context
import { cn } from '@/lib/utils';
import { Input } from "@/components/ui/input"; // Import Input
import { Button } from "@/components/ui/button"; // Import Button
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { useToast } from '@/hooks/use-toast'; // Import useToast


// Mock Data - Replace with actual data fetching for events/auctions if needed
const mockEvents = [
    { id: 1, title: "Weekend Parking Discount", location: "Downtown Garage", date: "This Weekend", description: "Get 20% off parking rates all weekend!", image: "https://picsum.photos/seed/eventParkingDiscount/300/150", hint: "parking discount city sale", href: "#" }, // Added href
    { id: 2, title: "Monthly Pass Holder Event", location: "Airport Lot B", date: "Aug 15th", description: "Exclusive entry raffle for pass holders.", image: "https://picsum.photos/seed/eventAirportRaffle/300/150", hint: "airport parking event raffle", href: "#" }, // Added href
];

const mockAuctions = [
    { id: 1, title: "Abandoned Vehicle Auction", location: "Mall Parking Deck - Level 3", date: "Sep 1st", description: "Several vehicles up for auction. Viewing starts at 9 AM.", image: "https://picsum.photos/seed/auctionCars/300/150", hint: "car auction parking garage vehicle", href: "#" }, // Added href and date
];

// Define Featured Services (replace with dynamic fetching if needed)
const featuredServices: { id: string; name: ParkingLotService; description: string; image: string; hint: string; locations: string[] }[] = [
    { id: 'feat_ev', name: 'EV Charging', description: 'Charge your electric vehicle conveniently while parked.', image: 'https://picsum.photos/seed/featEV/300/150', hint: 'ev charging electric car station', locations: ['lot_A', 'lot_B'] },
    { id: 'feat_wash', name: 'Car Wash', description: 'Get your car sparkling clean with our professional washing services.', image: 'https://picsum.photos/seed/featWash/300/150', hint: 'car wash cleaning service', locations: ['lot_C'] },
    { id: 'feat_valet', name: 'Valet', description: 'Enjoy the convenience of valet parking at select locations.', image: 'https://picsum.photos/seed/featValet/300/150', hint: 'valet parking service attendant', locations: ['lot_D', 'lot_E'] },
];


// Helper to get service icon
const getServiceIcon = (service: ParkingLotService | undefined, className = "h-4 w-4 text-primary") => {
    switch (service) {
      case 'EV Charging': return <Fuel className={className} />;
      case 'Car Wash': return <SprayCan className={className} />;
       case 'Mobile Money Agent': return <BadgeCent className={className} />;
      case 'Wifi': return <Wifi className={className} />;
      case 'Restroom': return <Bath className={className} />;
      case 'Valet': return <ConciergeBell className={className} />;
      default: return <Sparkles className={className} />; // Default icon
    }
  };


export default function ExplorePage() {
    const { userRole, userId } = useContext(AppStateContext)!; // Get user role/id for fetching lots
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [isLoadingAds, setIsLoadingAds] = useState(true);
    const [errorLoadingAds, setErrorLoadingAds] = useState<string | null>(null);
    const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]); // State for parking lots
    const [isLoadingLots, setIsLoadingLots] = useState(true); // Loading state for lots
    const [errorLoadingLots, setErrorLoadingLots] = useState<string | null>(null);
    const [recommendedLotName, setRecommendedLotName] = useState(''); // State for recommended name
    const [recommendedLotAddress, setRecommendedLotAddress] = useState(''); // State for recommended address
    const { toast } = useToast();


    // Fetch Advertisements
    useEffect(() => {
        const fetchExploreAds = async () => {
            setIsLoadingAds(true);
            setErrorLoadingAds(null);
            try {
                // Fetch all active advertisements (no specific location filter here)
                const fetchedAds = await getAdvertisements();
                // Add location name if missing for display
                // In a real app, fetching ads might already include the location name via a join
                const allLots = await getAvailableParkingLots(); // Fetch lots temporarily to get names
                const adsWithNames = fetchedAds.map(ad => ({
                    ...ad,
                    targetLotName: allLots.find(lot => lot.id === ad.targetLocationId)?.name || (ad.targetLocationId ? `Lot ${ad.targetLocationId.substring(0,5)}...` : 'All Locations')
                }));
                setAds(adsWithNames.filter(ad => ad.status === 'active')); // Filter only active ads
            } catch (err) {
                console.error("Failed to fetch advertisements for explore page:", err);
                setErrorLoadingAds("Could not load promotions and updates.");
            } finally {
                setIsLoadingAds(false);
            }
        };
        fetchExploreAds();
    }, []);

    // Fetch Parking Lots (for Services section)
    useEffect(() => {
        const fetchLots = async () => {
            setIsLoadingLots(true);
            setErrorLoadingLots(null);
            try {
                 // Fetch lots relevant to the current user context (might include inactive for owners)
                const fetchedLots = await getAvailableParkingLots(userRole, userId);
                setParkingLots(fetchedLots);
            } catch (err) {
                console.error("Failed to fetch parking lots for explore page:", err);
                setErrorLoadingLots("Could not load parking lot services.");
            } finally {
                setIsLoadingLots(false);
            }
        };
        fetchLots();
    }, [userRole, userId]); // Refetch if user context changes


    // Combine mock events with fetched ads for display
    const allPromotions = [
        ...ads.map(ad => ({ // Transform fetched ads to match display structure
             id: ad.id,
             title: ad.title,
             location: ad.targetLotName || 'All Locations', // Use added name
             date: ad.endDate ? `Until ${new Date(ad.endDate).toLocaleDateString()}` : 'Ongoing',
             description: ad.description,
             image: ad.imageUrl || `https://picsum.photos/seed/ad_${ad.id.substring(0,4)}/400/200`, // Use provided or placeholder image
             hint: ad.associatedService ? `parking promotion ${ad.associatedService.toLowerCase().replace(' ', '-')}` : 'parking promotion business', // Hint based on service or generic
             isAd: true, // Flag to potentially style differently
             associatedService: ad.associatedService, // Pass service type
             href: "#", // Placeholder link for ads
        })),
        ...mockEvents.map(event => ({ ...event, isAd: false, image: event.image || `https://picsum.photos/seed/event${event.id}/400/200`, hint: event.hint || 'parking event discount' })), // Add defaults for mock events
    ];

    const handleRecommendSubmit = () => {
        if (!recommendedLotName || !recommendedLotAddress) {
            toast({ title: "Missing Information", description: "Please provide the name and address of the recommended parking lot.", variant: "destructive" });
            return;
        }
        toast({ title: "Recommendation Submitted", description: `Thank you for recommending ${recommendedLotName}. We'll evaluate its addition to Carpso.`, duration: 5000 });
        setRecommendedLotName('');
        setRecommendedLotAddress('');
    };

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-primary" /> Explore Carpso Network
      </h1>
      <p className="text-muted-foreground mb-8">Discover events, promotions, and services happening at Carpso parking locations.</p>

      {/* Events & Promotions Section (Now includes Ads) */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-accent" /> Updates & Promotions
        </h2>
        {isLoadingAds ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <Skeleton className="h-64 w-full rounded-lg" />
                 <Skeleton className="h-64 w-full rounded-lg" />
                 <Skeleton className="h-64 w-full rounded-lg" />
             </div>
        ) : errorLoadingAds ? (
            <div className="text-center py-10 text-destructive bg-destructive/10 rounded-md">
                <ServerCrash className="mx-auto h-10 w-10 mb-2" />
                <p>{errorLoadingAds}</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allPromotions.map(item => (
                    // Wrap Card in Link
                    <Link key={item.id} href={item.href} passHref legacyBehavior>
                         <a className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
                            <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                                <div className="relative w-full h-40">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill // Use fill for responsive container
                                        className="object-cover"
                                        data-ai-hint={item.hint} // Add AI Hint
                                    />
                                </div>
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
                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                                    {/* Show associated service badge if available */}
                                    {item.isAd && item.associatedService && (
                                        <div className="mt-auto pt-2">
                                            <Badge variant="outline" size="sm" className="flex items-center w-fit">
                                                {getServiceIcon(item.associatedService, "h-3 w-3")} <span className="ml-1">{item.associatedService}</span>
                                            </Badge>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </a>
                    </Link>
                ))}
                 {allPromotions.length === 0 && (
                     <p className="text-muted-foreground md:col-span-2 lg:col-span-3 text-center py-6">
                        No current updates or promotions found.
                     </p>
                 )}
            </div>
        )}
      </section>

       {/* Featured Services Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Star className="h-6 w-6 text-accent" /> Featured Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {featuredServices.map(service => {
                 const hasService = parkingLots.some(lot => lot.services?.includes(service.name));
                 return (
                     <Card key={service.id} className={cn("overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col", !hasService && "opacity-50 cursor-not-allowed")}>
                          <div className="relative w-full h-40">
                              <Image
                                  src={service.image}
                                  alt={service.name}
                                  fill
                                  className="object-cover"
                                  data-ai-hint={service.hint} // Add AI Hint
                                  style={{ filter: !hasService ? 'grayscale(100%)' : 'none' }}
                              />
                               {/* Optional: Add icon overlay */}
                              <div className="absolute top-2 right-2 bg-background/80 p-1.5 rounded-full">
                                  {getServiceIcon(service.name, "h-5 w-5 text-primary")}
                              </div>
                          </div>
                         <CardHeader>
                             <CardTitle className={cn(hasService ? "" : "text-muted-foreground")}>{service.name}</CardTitle>
                         </CardHeader>
                         <CardContent>
                             <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                              {hasService ? (
                                  <p className="text-xs text-muted-foreground mt-2">Available at: {service.locations.map(locId => parkingLots.find(l => l.id === locId)?.name).filter(Boolean).join(', ') || 'No locations offer this service'}</p>
                              ) : (
                                  <p className="text-xs text-muted-foreground mt-2">Not offered at any Carpso locations.</p>
                              )}
                             {/* TODO: Link to locations offering this service? */}
                         </CardContent>
                     </Card>
                 );
            })}
            {featuredServices.length === 0 && <p className="text-muted-foreground md:col-span-2 lg:col-span-3 text-center py-6">No featured services to display.</p>}
        </div>
      </section>


       {/* Auctions Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-accent" /> Auctions & Notices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {mockAuctions.map(auction => (
                 <Link key={auction.id} href={auction.href} passHref legacyBehavior>
                     <a className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                             <div className="relative w-full h-40">
                                <Image
                                    src={auction.image}
                                    alt={auction.title}
                                    fill
                                    className="object-cover"
                                    data-ai-hint={auction.hint} // Add AI Hint
                                />
                             </div>
                            <CardHeader>
                                <CardTitle>{auction.title}</CardTitle>
                                <CardDescription className="flex items-center gap-1 text-xs">
                                    <MapPin className="h-3 w-3" /> {auction.location} &bull; {auction.date}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">{auction.description}</p>
                            </CardContent>
                        </Card>
                    </a>
                 </Link>
            ))}
            {mockAuctions.length === 0 && <p className="text-muted-foreground md:col-span-2 text-center py-6">No upcoming auctions or notices.</p>}
        </div>
      </section>

       {/* Available Services Section - Dynamic Listing */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" /> All Available Services by Location
        </h2>
        {isLoadingLots ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
            </div>
        ) : errorLoadingLots ? (
            <div className="text-center py-10 text-destructive bg-destructive/10 rounded-md">
                <ServerCrash className="mx-auto h-10 w-10 mb-2" />
                <p>{errorLoadingLots}</p>
            </div>
        ) : parkingLots.length > 0 ? (
             <div className="space-y-6">
                {parkingLots
                    .filter(lot => lot.services && lot.services.length > 0) // Only show lots that offer services
                    .sort((a, b) => a.name.localeCompare(b.name)) // Sort lots alphabetically
                    .map(lot => (
                    <Card key={lot.id} className="relative overflow-hidden"> {/* Added relative positioning */}
                        {/* Background Image - Subtle */}
                         <div className="absolute inset-0 z-0 opacity-5">
                           <Image
                             src={`https://picsum.photos/seed/${lot.id}_bg/800/200?grayscale&blur=2`}
                             alt=""
                             layout="fill"
                             objectFit="cover"
                             aria-hidden="true"
                             data-ai-hint="parking lot texture pattern"
                           />
                         </div>
                         {/* Content - Positioned above background */}
                        <div className="relative z-10">
                           <CardHeader>
                               <CardTitle className="text-lg">{lot.name}</CardTitle>
                               <CardDescription className="flex items-center gap-1 text-xs pt-1">
                                   <MapPin className="h-3 w-3" /> {lot.address}
                               </CardDescription>
                           </CardHeader>
                           <CardContent>
                               <div className="flex flex-wrap gap-3">
                                   {lot.services?.map(service => (
                                       // Optionally make each service clickable, linking to lot or service details
                                       // For now, just display them
                                       <div key={service} className="flex items-center gap-1.5 p-2 border rounded-md bg-background/80 backdrop-blur-sm text-sm shadow-sm"> {/* Added background with blur */}
                                           {getServiceIcon(service, "h-4 w-4 text-muted-foreground")}
                                           <span>{service}</span>
                                       </div>
                                   ))}
                               </div>
                           </CardContent>
                         </div>
                    </Card>
                ))}
                {parkingLots.filter(lot => lot.services && lot.services.length > 0).length === 0 && (
                     <p className="text-muted-foreground text-center py-6">No special services currently offered at available locations.</p>
                )}
            </div>
        ) : (
             <p className="text-muted-foreground text-center py-6">No parking locations found.</p>
        )}
      </section>
       {/* Recommend Location Form */}
        <section className="mb-10">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Recommend a Parking Location</CardTitle>
                    <CardDescription>Help us expand Carpso by recommending a new parking lot!</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="recommend-name">Parking Lot Name</Label>
                        <Input
                            type="text"
                            id="recommend-name"
                            placeholder="e.g., Central Parking Garage"
                            value={recommendedLotName}
                            onChange={(e) => setRecommendedLotName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="recommend-address">Address</Label>
                        <Textarea
                            id="recommend-address"
                            placeholder="e.g., 123 Main St, Lusaka"
                            value={recommendedLotAddress}
                            onChange={(e) => setRecommendedLotAddress(e.target.value)}
                        />
                    </div>
                     <Button onClick={handleRecommendSubmit}>
                         <MessageSquare className="mr-2 h-4 w-4" /> Submit Recommendation
                     </Button>
                </CardContent>
            </Card>
        </section>
    </div>
  );
}
