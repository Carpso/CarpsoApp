// src/components/explore/ExplorePageContent.tsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Fuel, CalendarDays, Megaphone, Sparkles, MapPin, BadgeCent, SprayCan, Wifi, Loader2, ServerCrash, Bath, ConciergeBell, Building, Send, Info, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Skeleton } from '@/components/ui/skeleton';
import type { ParkingLotService, ParkingLot } from '@/services/parking-lot';
import { getAdvertisements, Advertisement } from '@/services/advertisement';
import { getAvailableParkingLots } from '@/services/parking-lot';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components

interface FeaturedService {
    id: number | string;
    name: string;
    location: string;
    locationId?: string;
    description: string;
    icon: React.ElementType;
    serviceType: ParkingLotService;
    imageUrl?: string;
}

const submitLotRecommendation = async (name: string, location: string, reason: string): Promise<boolean> => {
    console.log("Submitting recommendation:", { name, location, reason });
    await new Promise(resolve => setTimeout(resolve, 700));
    const success = Math.random() > 0.1;
    return success;
};

export default function ExplorePageContent() {
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [lots, setLots] = useState<ParkingLot[]>([]);
    const [isLoadingAds, setIsLoadingAds] = useState(true);
    const [isLoadingLots, setIsLoadingLots] = useState(true);
    const [recommendName, setRecommendName] = useState('');
    const [recommendLocation, setRecommendLocation] = useState('');
    const [recommendReason, setRecommendReason] = useState('');
    const [isSubmittingRecommendation, setIsSubmittingRecommendation] = useState(false);
    const { toast } = useToast();
    const { isOnline, userId, userRole } = useContext(AppStateContext)!; // Include userId and userRole

    useEffect(() => {
        const fetchExploreData = async () => {
            setIsLoadingAds(true);
            setIsLoadingLots(true);

             // Load from cache first if offline
            let cachedAds: Advertisement[] = [];
            let cachedLots: ParkingLot[] = [];
            if (!isOnline && typeof window !== 'undefined') {
                const adsCache = localStorage.getItem('cachedExploreAds');
                const lotsCache = localStorage.getItem('cachedExploreLots');
                try {
                    if (adsCache) cachedAds = JSON.parse(adsCache);
                    if (lotsCache) cachedLots = JSON.parse(lotsCache);
                } catch (e) { console.error("Failed to parse cached explore data", e); }
            }

            if (!isOnline && cachedAds.length > 0 && cachedLots.length > 0) {
                console.log("Offline: Using cached explore data.");
                setAds(cachedAds);
                setLots(cachedLots);
                setIsLoadingAds(false);
                setIsLoadingLots(false);
                return;
            }

            // If online or no cache, fetch fresh
             if (isOnline) {
                try {
                    const [adsData, lotsData] = await Promise.all([
                        getAdvertisements(), // Fetch all active ads
                         // Fetch lots visible to the current user based on role/status
                         getAvailableParkingLots(userRole || 'User', userId || undefined)
                    ]);
                    const activeAds = adsData.filter(ad => ad.status === 'active' && (!ad.endDate || new Date(ad.endDate) >= new Date()));
                    setAds(activeAds);
                    setLots(lotsData);

                     // Cache fetched data
                     if (typeof window !== 'undefined') {
                         try {
                              localStorage.setItem('cachedExploreAds', JSON.stringify(activeAds));
                              localStorage.setItem('cachedExploreLots', JSON.stringify(lotsData));
                         } catch (e) { console.error("Failed to cache explore data:", e); }
                     }

                } catch (error) {
                    console.error("Failed to fetch explore data:", error);
                    // Show error but still use cache if available
                    setAds(cachedAds);
                    setLots(cachedLots);
                    toast({
                        title: "Error Loading Data",
                        description: "Could not fetch latest updates. Displaying cached data if available.",
                        variant: "destructive",
                    });
                } finally {
                    setIsLoadingAds(false);
                    setIsLoadingLots(false);
                }
             } else {
                 // Offline and no cache
                  console.warn("Offline: No cached explore data available.");
                  setIsLoadingAds(false);
                  setIsLoadingLots(false);
             }
        };
        fetchExploreData();
    }, [isOnline, toast, userId, userRole]);

    const featuredServices: FeaturedService[] = lots.flatMap(lot =>
        (lot.services || []).map(service => ({
            id: `${lot.id}-${service}`,
            name: service,
            location: lot.name,
            locationId: lot.id,
            description: `Available at ${lot.name}.`,
            icon: getServiceIcon(service),
            serviceType: service,
            imageUrl: lot.id.startsWith('g_place') ? `https://picsum.photos/seed/${lot.id}-${service}/400/200` : `https://picsum.photos/seed/${lot.id}-${service}/400/200`
        }))
    ).filter((service, index, self) =>
        index === self.findIndex((s) => s.serviceType === service.serviceType && s.locationId === service.locationId)
    );

    const uniqueServicesOffered: ParkingLotService[] = [
        ...new Set(lots.flatMap(lot => lot.services || []))
    ];

    function getServiceIcon(service: ParkingLotService): React.ElementType {
        switch (service) {
            case 'EV Charging': return Fuel;
            case 'Car Wash': return SprayCan;
            case 'Mobile Money Agent': return BadgeCent;
            case 'Valet': return ConciergeBell;
            case 'Restroom': return Bath;
            case 'Wifi': return Wifi;
            default: return Sparkles;
        }
    }

    const handleRecommendSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recommendName || !recommendLocation) {
            toast({ title: "Missing Information", description: "Please enter the parking lot name and location.", variant: "destructive" });
            return;
        }
         if (!isOnline) {
            toast({ title: "Offline", description: "Cannot submit recommendation while offline.", variant: "destructive" });
            return;
        }
        setIsSubmittingRecommendation(true);
        try {
            const success = await submitLotRecommendation(recommendName, recommendLocation, recommendReason);
            if (success) {
                toast({ title: "Recommendation Sent!", description: `Thank you for suggesting ${recommendName}. We'll look into it!` });
                setRecommendName('');
                setRecommendLocation('');
                setRecommendReason('');
            } else {
                throw new Error("Simulated submission failure.");
            }
        } catch (error) {
            console.error("Failed to submit recommendation:", error);
            toast({ title: "Submission Failed", description: "Could not send your recommendation at this time.", variant: "destructive" });
        } finally {
            setIsSubmittingRecommendation(false);
        }
    };

    const isLoading = isLoadingAds || isLoadingLots;

    return (
        <div className="container py-8 px-4 md:px-6 lg:px-8">
            {/* Offline Indicator Banner */}
           {!isOnline && (
               <Alert variant="destructive" className="mb-6">
                   <WifiOff className="h-4 w-4"/>
                   <AlertTitle>You are offline!</AlertTitle>
                   <AlertDescription>
                      Some content may be outdated or unavailable. Recommendations and submissions are disabled.
                   </AlertDescription>
               </Alert>
           )}

            {/* Section 1: Featured Promotions/Advertisements */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Megaphone className="h-6 w-6 text-primary" /> Promotions & News
                </h2>
                {isLoadingAds ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                ) : ads.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {ads.map(ad => (
                            <Card key={ad.id} className="overflow-hidden flex flex-col">
                                <div className="relative h-40 w-full">
                                    <Image
                                        src={ad.imageUrl || `https://picsum.photos/seed/${ad.id}/400/200`}
                                        alt={ad.title}
                                        layout="fill"
                                        objectFit="cover"
                                        data-ai-hint={ad.associatedService ? `parking ${ad.associatedService.toLowerCase()}` : "parking deal"}
                                    />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                                      {ad.targetLotName && (
                                          <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-black/50 text-white border-none">
                                              <MapPin className="h-3 w-3 mr-1" /> {ad.targetLotName}
                                          </Badge>
                                      )}
                                      {ad.associatedService && (
                                          <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-black/50 text-white border-none">
                                              {React.createElement(getServiceIcon(ad.associatedService), { className: "h-3 w-3 mr-1" })}
                                              {ad.associatedService}
                                          </Badge>
                                      )}
                                </div>
                                <CardHeader className="flex-grow pb-3 pt-4">
                                    <CardTitle className="text-lg">{ad.title}</CardTitle>
                                     <CardDescription className="text-sm">{ad.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {(ad.startDate || ad.endDate) && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <CalendarDays className="h-3 w-3" />
                                            Runs: {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Ongoing'} - {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Ongoing'}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : !isOnline && !isLoadingAds ? (
                     <p className="text-muted-foreground text-center py-4">Promotions unavailable offline.</p>
                ) : (
                     <p className="text-muted-foreground text-center py-4">No active promotions right now. Check back soon!</p>
                )}
            </section>

            {/* Section 2: Available Services */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-accent" /> Available Services
                </h2>
                 {isLoadingLots ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                    </div>
                ) : uniqueServicesOffered.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {uniqueServicesOffered.map(serviceType => {
                            const ServiceIcon = getServiceIcon(serviceType);
                            const count = lots.filter(lot => lot.services?.includes(serviceType)).length;
                            const exampleLot = lots.find(lot => lot.services?.includes(serviceType));
                            const exampleImage = exampleLot ? `https://picsum.photos/seed/${exampleLot.id}-${serviceType}/300/150?blur=1` : `https://picsum.photos/seed/${serviceType}/300/150?blur=1`;
                            const serviceHint = `${serviceType.toLowerCase()} parking`;
                            return (
                                <Card key={serviceType} className="overflow-hidden relative text-white flex flex-col justify-end items-start p-4 min-h-[110px] hover:shadow-lg transition-shadow">
                                     <Image
                                         src={exampleImage}
                                         alt={`${serviceType} service background`}
                                         layout="fill"
                                         objectFit="cover"
                                         className="z-0"
                                         data-ai-hint={serviceHint}
                                     />
                                     <div className="absolute inset-0 bg-black/60 z-10"></div>
                                     <div className="relative z-20">
                                        <ServiceIcon className="h-6 w-6 mb-1" />
                                        <h3 className="font-semibold text-base">{serviceType}</h3>
                                        <p className="text-xs opacity-80">{count} Location{count === 1 ? '' : 's'}</p>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : !isOnline && !isLoadingLots ? (
                     <p className="text-muted-foreground text-center py-4">Services list unavailable offline.</p>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No specific services listed at available locations.</p>
                )}
            </section>

            {/* Section 3: Featured Services (Detailed List) */}
             <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-accent" /> Featured Services Near You
                </h2>
                 {isLoadingLots ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : featuredServices.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {featuredServices.map((service) => {
                            const ServiceIcon = getServiceIcon(service.serviceType);
                            const serviceImageHint = `${service.serviceType.toLowerCase()} ${service.location.toLowerCase()}`;
                            return (
                                <Card key={service.id} className="flex items-start p-4 gap-4 hover:bg-muted/50 transition-colors">
                                     <div className="p-2 bg-accent/10 rounded-full">
                                         <ServiceIcon className="h-6 w-6 text-accent" />
                                     </div>
                                     <div className="flex-grow">
                                         <h3 className="font-semibold text-base mb-0.5">{service.name}</h3>
                                         <p className="text-sm text-muted-foreground flex items-center gap-1">
                                             <MapPin className="h-3.5 w-3.5" /> {service.location}
                                         </p>
                                         {service.locationId && (
                                             <Button variant="link" size="sm" className="text-xs h-auto p-0 mt-1" asChild>
                                                 <a href={`/?location=${service.locationId}`} >
                                                     View Location <ExternalLink className="h-3 w-3 ml-1" />
                                                 </a>
                                             </Button>
                                         )}
                                     </div>
                                </Card>
                            );
                        })}
                    </div>
                 ) : !isOnline && !isLoadingLots ? (
                     <p className="text-muted-foreground text-center py-4">Featured services unavailable offline.</p>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No featured services available right now.</p>
                )}
            </section>

            {/* Section 4: Recommend a Parking Lot */}
            <section>
                 <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Building className="h-6 w-6 text-secondary-foreground" /> Know a Parking Spot?
                </h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Recommend a Location</CardTitle>
                        <CardDescription>
                            Help us expand! Let us know about parking lots (free or paid) in Zambia that aren't listed yet, especially schools, hospitals, malls, garages, or public areas. We'll reach out to them.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleRecommendSubmit}>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="recommend-name">Parking Lot Name*</Label>
                                <Input
                                    type="text"
                                    id="recommend-name"
                                    placeholder="e.g., UNZA Main Campus Parking, Levy Mall Parking"
                                    value={recommendName}
                                    onChange={(e) => setRecommendName(e.target.value)}
                                    disabled={isSubmittingRecommendation || !isOnline}
                                    required
                                />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="recommend-location">Location/Address*</Label>
                                <Input
                                    type="text"
                                    id="recommend-location"
                                    placeholder="e.g., Great East Road, Lusaka or Near Arcades"
                                    value={recommendLocation}
                                    onChange={(e) => setRecommendLocation(e.target.value)}
                                    disabled={isSubmittingRecommendation || !isOnline}
                                    required
                                />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="recommend-reason">Reason/Details (Optional)</Label>
                                <Textarea
                                    id="recommend-reason"
                                    placeholder="Why should Carpso add this location? (e.g., High demand, specific features, contact person)"
                                    value={recommendReason}
                                    onChange={(e) => setRecommendReason(e.target.value)}
                                    disabled={isSubmittingRecommendation || !isOnline}
                                    rows={3}
                                />
                            </div>
                             {!isOnline &&
                                <Alert variant="warning">
                                     <WifiOff className="h-4 w-4" />
                                     <AlertTitle>Offline</AlertTitle>
                                     <AlertDescription>
                                         Cannot submit recommendation while offline.
                                     </AlertDescription>
                                </Alert>
                             }
                        </CardContent>
                         <CardFooter>
                            <Button type="submit" disabled={isSubmittingRecommendation || !recommendName || !recommendLocation || !isOnline}>
                                {isSubmittingRecommendation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Submit Recommendation
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </section>
        </div>
    );
}
