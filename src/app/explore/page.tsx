// src/app/explore/page.tsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Fuel, CalendarDays, Megaphone, Sparkles, MapPin, BadgeCent, SprayCan, Wifi, Loader2, ServerCrash, Bath, ConciergeBell, Building, Send, Info, ExternalLink } from "lucide-react"; // Added Fuel, Bath, ConciergeBell, Building, Send, Info, ExternalLink
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Skeleton } from '@/components/ui/skeleton';
import type { ParkingLotService } from '@/services/parking-lot'; // Added service type import
import { getAdvertisements, Advertisement } from '@/services/advertisement'; // Added Advertisement type
import { getAvailableParkingLots, ParkingLot } from '@/services/parking-lot'; // Added ParkingLot type
import { cn } from '@/lib/utils';
import { Input } from "@/components/ui/input"; // Import Input
import { Button } from "@/components/ui/button"; // Import Button
import { Label } from "@/components/ui/label"; // Import Label
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { AppStateContext } from '@/context/AppStateProvider'; // Import context

interface CombinedItem extends Advertisement {
    itemType: 'advertisement';
}

interface FeaturedService {
    id: number | string; // Use string if it comes from lot id
    name: string;
    location: string;
    locationId?: string; // Link back to the parking lot ID
    description: string;
    icon: React.ElementType;
    serviceType: ParkingLotService; // Added service type
    imageUrl?: string; // Optional image URL for the service card
}

interface CombinedServiceItem extends FeaturedService {
    itemType: 'service';
}

// Placeholder function to simulate submitting a recommendation
const submitLotRecommendation = async (name: string, location: string, reason: string): Promise<boolean> => {
    console.log("Submitting recommendation:", { name, location, reason });
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API call
    // Replace with actual API call logic
    const success = Math.random() > 0.1; // Simulate success
    return success;
};


export default function ExplorePage() {
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [lots, setLots] = useState<ParkingLot[]>([]);
    const [isLoadingAds, setIsLoadingAds] = useState(true);
    const [isLoadingLots, setIsLoadingLots] = useState(true);
    const [recommendName, setRecommendName] = useState('');
    const [recommendLocation, setRecommendLocation] = useState('');
    const [recommendReason, setRecommendReason] = useState('');
    const [isSubmittingRecommendation, setIsSubmittingRecommendation] = useState(false);
    const { toast } = useToast();
    const { isOnline } = useContext(AppStateContext)!;

    useEffect(() => {
        const fetchExploreData = async () => {
            setIsLoadingAds(true);
            setIsLoadingLots(true);
             if (!isOnline) {
                // TODO: Load from cache if available
                console.warn("Offline: Cannot fetch explore data.");
                setIsLoadingAds(false);
                setIsLoadingLots(false);
                return;
            }
            try {
                const [adsData, lotsData] = await Promise.all([
                    getAdvertisements(), // Fetch all active ads (global and local)
                    getAvailableParkingLots() // Fetch all available lots (Carpso + External)
                ]);
                // Filter active ads (can be done here or in the service)
                setAds(adsData.filter(ad => ad.status === 'active' && (!ad.endDate || new Date(ad.endDate) >= new Date())));
                setLots(lotsData);
            } catch (error) {
                console.error("Failed to fetch explore data:", error);
                toast({
                    title: "Error Loading Explore Page",
                    description: "Could not fetch advertisements or parking lot data.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingAds(false);
                setIsLoadingLots(false);
            }
        };
        fetchExploreData();
    }, [toast, isOnline]);

    // Generate Featured Services list from available lots
    const featuredServices: FeaturedService[] = lots.flatMap(lot =>
        (lot.services || []).map(service => ({
            id: `${lot.id}-${service}`, // Unique ID for the service at this lot
            name: service,
            location: lot.name,
            locationId: lot.id, // Store lot ID
            description: `Available at ${lot.name}.`, // Simple description
            icon: getServiceIcon(service),
            serviceType: service,
            imageUrl: lot.id.startsWith('g_place') ? `https://picsum.photos/seed/${lot.id}-${service}/400/200` : `https://picsum.photos/seed/${lot.id}-${service}/400/200` // Use placeholder based on source
        }))
    ).filter((service, index, self) => // Basic deduplication (can be improved)
        index === self.findIndex((s) => s.serviceType === service.serviceType && s.locationId === service.locationId)
    );

    // Get unique service types offered across all listed lots
    const uniqueServicesOffered: ParkingLotService[] = [
        ...new Set(lots.flatMap(lot => lot.services || []))
    ];

    // Combine ads and services for a mixed feed (example)
    const combinedFeed: (CombinedItem | CombinedServiceItem)[] = [
        ...ads.map(ad => ({ ...ad, itemType: 'advertisement' as const })),
        // ...featuredServices.map(service => ({ ...service, itemType: 'service' as const }))
    ];
    // Sort combined feed, e.g., by creation/update date or relevance
    combinedFeed.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());


    // Helper function to get icon based on service type
    function getServiceIcon(service: ParkingLotService): React.ElementType {
        switch (service) {
            case 'EV Charging': return Fuel; // Replaced ChargingStation
            case 'Car Wash': return SprayCan;
            case 'Mobile Money Agent': return BadgeCent;
            case 'Valet': return ConciergeBell;
            case 'Restroom': return Bath; // Replaced Bathroom
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
                                     {/* Overlay gradient */}
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                                      {/* Location Badge */}
                                      {ad.targetLotName && (
                                          <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-black/50 text-white border-none">
                                              <MapPin className="h-3 w-3 mr-1" /> {ad.targetLotName}
                                          </Badge>
                                      )}
                                     {/* Service Badge */}
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
                             // Find an example lot offering this service for the background image
                            const exampleLot = lots.find(lot => lot.services?.includes(serviceType));
                            const exampleImage = exampleLot ? `https://picsum.photos/seed/${exampleLot.id}-${serviceType}/300/150?blur=1` : `https://picsum.photos/seed/${serviceType}/300/150?blur=1`;
                            const serviceHint = `${serviceType.toLowerCase()} parking`;
                            return (
                                <Card key={serviceType} className="overflow-hidden relative text-white flex flex-col justify-end items-start p-4 min-h-[110px] hover:shadow-lg transition-shadow">
                                     {/* Background Image */}
                                     <Image
                                         src={exampleImage}
                                         alt={`${serviceType} service background`}
                                         layout="fill"
                                         objectFit="cover"
                                         className="z-0"
                                         data-ai-hint={serviceHint}
                                     />
                                     {/* Dark overlay */}
                                     <div className="absolute inset-0 bg-black/60 z-10"></div>
                                      {/* Content */}
                                     <div className="relative z-20">
                                        <ServiceIcon className="h-6 w-6 mb-1" />
                                        <h3 className="font-semibold text-base">{serviceType}</h3>
                                        <p className="text-xs opacity-80">{count} Location{count === 1 ? '' : 's'}</p>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
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
                                     {/* Service Icon */}
                                     <div className="p-2 bg-accent/10 rounded-full">
                                         <ServiceIcon className="h-6 w-6 text-accent" />
                                     </div>
                                     <div className="flex-grow">
                                         <h3 className="font-semibold text-base mb-0.5">{service.name}</h3>
                                         <p className="text-sm text-muted-foreground flex items-center gap-1">
                                             <MapPin className="h-3.5 w-3.5" /> {service.location}
                                         </p>
                                         {/* Optionally add a link to the location */}
                                         {service.locationId && (
                                             <Button variant="link" size="sm" className="text-xs h-auto p-0 mt-1" asChild>
                                                 <a href={`/?location=${service.locationId}`} > {/* Link to home with location pre-selected */}
                                                     View Location <ExternalLink className="h-3 w-3 ml-1" />
                                                 </a>
                                             </Button>
                                         )}
                                     </div>
                                      {/* Optional: Small image for the service card */}
                                      {/* <Image src={service.imageUrl || `https://picsum.photos/seed/${service.id}/80/80`} alt={service.name} width={60} height={60} className="rounded-md object-cover" data-ai-hint={serviceImageHint} /> */}
                                </Card>
                            );
                        })}
                    </div>
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
                             {!isOnline && <p className="text-sm text-destructive">Cannot submit recommendation while offline.</p>}
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
