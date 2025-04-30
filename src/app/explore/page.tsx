// src/app/explore/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, Megaphone, Sparkles, MapPin, BadgeCent, EvStation, CarWash, Wifi } from "lucide-react"; // Added service icons
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

// Mock Data - Replace with actual data fetching
const mockEvents = [
    { id: 1, title: "Weekend Parking Discount", location: "Downtown Garage", date: "This Weekend", description: "Get 20% off parking rates all weekend!", image: "https://picsum.photos/seed/event1/300/150" },
    { id: 2, title: "Monthly Pass Holder Event", location: "Airport Lot B", date: "Aug 15th", description: "Exclusive entry raffle for pass holders.", image: "https://picsum.photos/seed/event2/300/150" },
];

const mockAuctions = [
    { id: 1, title: "Abandoned Vehicle Auction", location: "Mall Parking Deck - Level 3", date: "Next Tuesday, 10 AM", description: "Several vehicles up for auction. Viewing starts at 9 AM.", image: "https://picsum.photos/seed/auction1/300/150" },
];

const mockServices = [
    { id: 1, name: "EV Charging Station", location: "Downtown Garage", description: "Level 2 chargers available.", icon: EvStation },
    { id: 2, name: "Premium Car Wash", location: "Mall Parking Deck", description: "Hand wash and detailing services.", icon: CarWash },
    { id: 3, name: "Mobile Money Booth", location: "Airport Lot B", description: "Airtel & MTN Mobile Money available.", icon: BadgeCent },
    { id: 4, name: "Free Wi-Fi Zone", location: "Downtown Garage", description: "Complimentary Wi-Fi near the entrance.", icon: Wifi },
];


export default function ExplorePage() {
  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-primary" /> Explore Nearby
      </h1>
      <p className="text-muted-foreground mb-8">Discover events, auctions, and services happening at Carpso parking locations.</p>

      {/* Events Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-accent" /> Upcoming Events & Promotions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockEvents.map(event => (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <Image src={event.image} alt={event.title} width={300} height={150} className="w-full h-40 object-cover"/>
                    <CardHeader>
                        <CardTitle>{event.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" /> {event.location} &bull; {event.date}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                    </CardContent>
                </Card>
            ))}
             {mockEvents.length === 0 && <p className="text-muted-foreground md:col-span-2 lg:col-span-3">No current events or promotions.</p>}
        </div>
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
            {mockAuctions.length === 0 && <p className="text-muted-foreground md:col-span-2">No upcoming auctions or notices.</p>}
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
                    <service.icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-base font-medium mb-1">{service.name}</CardTitle>
                    <CardDescription className="text-xs mb-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3"/> {service.location}
                    </CardDescription>
                    <p className="text-xs text-muted-foreground flex-grow">{service.description}</p>
                    {/* Optionally add a button/link */}
                    {/* <Button size="sm" variant="link" className="mt-2 text-xs">Learn More</Button> */}
                </Card>
            ))}
            {mockServices.length === 0 && <p className="text-muted-foreground sm:col-span-2 lg:col-span-4">No featured services available.</p>}
        </div>
      </section>

    </div>
  );
}
```