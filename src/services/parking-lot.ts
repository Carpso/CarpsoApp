// src/services/parking-lot.ts

import type { UserRole } from './user-service'; // Import UserRole for filtering

/**
 * Represents a service offered at a parking lot.
 */
export type ParkingLotService = 'EV Charging' | 'Car Wash' | 'Mobile Money Agent' | 'Valet' | 'Restroom' | 'Wifi';


/**
 * Represents a parking lot location.
 */
export interface ParkingLot {
  /**
   * Unique identifier for the parking lot. Can be Carpso internal or from an external source like Google Places ID.
   */
  id: string;
  /**
   * Name of the parking lot.
   */
  name: string;
  /**
   * Address of the parking lot.
   */
  address: string;
  /**
   * Total capacity of the parking lot. Might be unknown for non-Carpso managed lots.
   */
  capacity: number;
  /**
   * Current occupancy count (optional, might be derived from spot statuses, likely unavailable for non-Carpso managed lots).
   */
  currentOccupancy?: number;
  /**
   * Geographical coordinates. Required for map view.
   */
  latitude: number;
  longitude: number;
  /**
   * List of services offered at the parking lot (optional).
   */
  services?: ParkingLotService[];
  /**
   * User ID of the owner/manager of this parking lot (for Carpso managed lots).
   */
  ownerUserId?: string;
  /**
   * Subscription status for this lot on the Carpso platform (for Carpso managed lots).
   */
  subscriptionStatus: 'active' | 'trial' | 'inactive' | 'expired' | 'external'; // Added 'external' status
  /**
   * Date when the trial period ends (ISO 8601 format), if applicable.
   */
  trialEndDate?: string;
  /**
   * Indicates if this parking lot is directly managed/partnered with Carpso.
   */
  isCarpsoManaged: boolean;
  /**
   * Optional: Source of the data (e.g., 'carpso', 'google_places').
   */
  dataSource?: string;
   /**
    * Optional: Contact phone number, primarily for external lots fetched from Google Places.
    */
   phoneNumber?: string;
   /**
    * Optional: Website URL, primarily for external lots fetched from Google Places.
    */
   website?: string;
    /**
     * Optional: Indicates if Carpso team has attempted contact or if the lot is a prospect.
     */
    contactStatus?: 'prospect' | 'contacted' | 'signed' | null; // For internal tracking maybe
}

// Sample data - replace with actual API calls or database queries
// Simulate trial end dates relative to 'now'
const now = Date.now();
const futureDate = (days: number) => new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
const pastDate = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

// Moved sample data inside the relevant functions or kept minimal here
let sampleCarpsoLots: ParkingLot[] = [
  // Carpso Managed Lots
  { id: 'lot_A', name: 'Downtown Garage (Carpso)', address: '123 Main St, Lusaka', capacity: 50, latitude: -15.4167, longitude: 28.2833, services: ['EV Charging', 'Mobile Money Agent', 'Wifi', 'Restroom'], ownerUserId: 'usr_1', subscriptionStatus: 'active', isCarpsoManaged: true, dataSource: 'carpso' },
  { id: 'lot_B', name: 'Airport Lot B (Carpso Partner)', address: '456 Airport Rd, Lusaka', capacity: 150, latitude: -15.3300, longitude: 28.4522, services: ['Restroom', 'Wifi'], ownerUserId: 'usr_2', subscriptionStatus: 'trial', trialEndDate: futureDate(15), isCarpsoManaged: true, dataSource: 'carpso' },
  { id: 'lot_C', name: 'East Park Mall Deck (Carpso)', address: '789 Great East Rd, Lusaka', capacity: 200, latitude: -15.4000, longitude: 28.3333, services: ['Car Wash', 'Valet', 'Mobile Money Agent', 'Restroom', 'EV Charging'], ownerUserId: 'usr_5', subscriptionStatus: 'trial', trialEndDate: pastDate(5), isCarpsoManaged: true, dataSource: 'carpso' }, // Expired trial, still shown to owner
  { id: 'lot_D', name: 'Levy Junction Upper Level (Carpso)', address: '101 Church Rd, Lusaka', capacity: 80, latitude: -15.4150, longitude: 28.2900, services: ['Valet', 'Wifi'], ownerUserId: 'usr_2', subscriptionStatus: 'active', isCarpsoManaged: true, dataSource: 'carpso' },
  { id: 'lot_E', name: 'Arcades Park & Shop (Carpso)', address: '200 Great East Rd, Lusaka', capacity: 120, latitude: -15.4050, longitude: 28.3200, services: ['Mobile Money Agent', 'Restroom', 'Car Wash'], ownerUserId: 'usr_admin', subscriptionStatus: 'active', isCarpsoManaged: true, dataSource: 'carpso'},
  { id: 'lot_F', name: 'UTH Parking Zone 1 (Carpso)', address: 'Hospital Rd, Lusaka', capacity: 60, latitude: -15.4200, longitude: 28.3000, services: ['Restroom'], ownerUserId: 'usr_admin', subscriptionStatus: 'inactive', isCarpsoManaged: true, dataSource: 'carpso' }, // Inactive, only shown to admin/owner
];


/**
 * Asynchronously retrieves a list of available parking lots, potentially including external sources.
 * Includes basic offline caching support using localStorage.
 * Filters visibility based on user role and lot status/source.
 *
 * @param userRole The role of the user requesting the lots.
 * @param userId The ID of the user requesting the lots.
 * @param forceRefresh Bypasses cache and fetches fresh data if true.
 * @returns A promise that resolves to an array of ParkingLot objects.
 */
export async function getAvailableParkingLots(
    userRole: UserRole = 'User',
    userId?: string,
    forceRefresh: boolean = false
): Promise<ParkingLot[]> {
  const cacheKey = 'cachedParkingLotsWithExternal_v2';
  const cacheTimestampKey = `${cacheKey}Timestamp`;
  const maxCacheAge = 60 * 60 * 1000; // 1 hour cache validity
  let isOnline = true;

  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    isOnline = navigator.onLine;
  }

  let allLots: ParkingLot[] = [];
  let needsServerFetch = true;

  if (!forceRefresh && typeof window !== 'undefined') {
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < maxCacheAge) {
      try {
        allLots = JSON.parse(cachedData);
        needsServerFetch = false;
      } catch (e: any) {
        console.error("Failed to parse cached locations, will fetch fresh.", e.message);
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(cacheTimestampKey);
        needsServerFetch = true;
      }
    }
  }

  if (needsServerFetch && isOnline) {
    try {
      // console.log("Fetching fresh parking lots (including external simulation)...");
      await new Promise(resolve => setTimeout(resolve, 900));

      const carpsoLotsData = sampleCarpsoLots.map(lot => {
         let updatedStatus = lot.subscriptionStatus;
         let occupancy = lot.currentOccupancy;
         updatedStatus = (lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date()) ? 'expired' : lot.subscriptionStatus;
         occupancy = occupancy ?? Math.floor(Math.random() * lot.capacity * 0.9);
         return { ...lot, subscriptionStatus: updatedStatus, currentOccupancy: occupancy };
      });

      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      let externalLotsData: ParkingLot[] = [];
      if (googleApiKey) {
          try {
               externalLotsData = await fetchGooglePlacesParking("Zambia", googleApiKey, 100);
          } catch (googleError: any) {
               console.error("Failed to fetch from Google Places API:", googleError.message);
          }
      } else {
          console.warn("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not configured. Skipping external parking lot search.");
      }

      const combinedLotsMap = new Map<string, ParkingLot>();
      [...carpsoLotsData, ...externalLotsData].forEach(lot => {
          if (!combinedLotsMap.has(lot.id)) {
              combinedLotsMap.set(lot.id, lot);
          }
      });
      allLots = Array.from(combinedLotsMap.values());

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(allLots));
          localStorage.setItem(cacheTimestampKey, Date.now().toString());
        } catch (e: any) {
          console.error("Failed to cache parking lots:", e.message);
        }
      }
    } catch (error: any) {
      console.warn("Online fetch failed, using potentially stale/empty cache:", error.message);
      if (allLots.length === 0) {
         // Do not throw, UI will handle "could not load"
      }
    }
  } else if (needsServerFetch && !isOnline) {
      console.warn("Offline and no valid cache available for parking lots.");
      allLots = [];
  }

  let visibleLots: ParkingLot[];
  if (userRole === 'Admin') {
    visibleLots = allLots;
  } else if (userRole === 'ParkingLotOwner' && userId) {
    const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner');
    const ownerLots = ownerUser?.associatedLots || [];
    visibleLots = allLots.filter(lot => (ownerLots.includes('*')) || (lot.isCarpsoManaged && lot.ownerUserId === userId) || (lot.isCarpsoManaged && ownerLots.includes(lot.id)) || !lot.isCarpsoManaged);
  } else {
    visibleLots = allLots.filter(lot =>
      (lot.isCarpsoManaged && (lot.subscriptionStatus === 'active' || (lot.subscriptionStatus === 'trial' && (!lot.trialEndDate || new Date(lot.trialEndDate) >= new Date())))) ||
      !lot.isCarpsoManaged
    );
  }
  return visibleLots;
}

export async function getParkingLotDetails(lotId: string): Promise<ParkingLot | null> {
  await new Promise(resolve => setTimeout(resolve, 300));

   const allPossibleLots = [...sampleCarpsoLots, ...(await fetchGooglePlacesParking("Zambia", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "dummy_key", 100))];
   let lot = allPossibleLots.find(l => l.id === lotId);

   if (lot) {
       let updatedStatus = lot.subscriptionStatus;
       let occupancy = lot.currentOccupancy;

       if (lot.isCarpsoManaged) {
           updatedStatus = (lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date()) ? 'expired' : lot.subscriptionStatus;
           occupancy = lot.currentOccupancy ?? Math.floor(Math.random() * lot.capacity * 0.9);
       } else {
           occupancy = undefined;
           updatedStatus = 'external';
           if (!lot.phoneNumber) lot.phoneNumber = `+260 9X XXX ${Math.floor(1000 + Math.random() * 9000)}`;
           if (!lot.website) lot.website = `https://www.google.com/maps/search/?api=1&query=${lot.latitude},${lot.longitude}&query_place_id=${lot.id}`;
       }
     return { ...lot, subscriptionStatus: updatedStatus, currentOccupancy: occupancy };
   }
  return null;
}

export async function updateParkingLotServices(lotId: string, services: ParkingLotService[]): Promise<boolean> {
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
       console.error("Cannot update services: Offline.");
       return false;
    }
    await new Promise(resolve => setTimeout(resolve, 800));
    const lotIndex = sampleCarpsoLots.findIndex(l => l.id === lotId && l.isCarpsoManaged);
    if (lotIndex !== -1) {
        sampleCarpsoLots[lotIndex].services = services;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('cachedParkingLotsWithExternal_v2');
            localStorage.removeItem('cachedParkingLotsWithExternal_v2Timestamp');
        }
        return true;
    }
    console.warn(`Cannot update services for non-Carpso managed lot or lot not found: ${lotId}`);
    return false;
}

export async function updateLotSubscriptionStatus(lotId: string, status: ParkingLot['subscriptionStatus'], trialEndDate?: string): Promise<boolean> {
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
       console.error("Cannot update subscription: Offline.");
       return false;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    const lotIndex = sampleCarpsoLots.findIndex(l => l.id === lotId && l.isCarpsoManaged);
    if (lotIndex !== -1) {
        sampleCarpsoLots[lotIndex].subscriptionStatus = status;
        sampleCarpsoLots[lotIndex].trialEndDate = status === 'trial' ? trialEndDate : undefined;
        if (typeof window !== 'undefined') {
             localStorage.removeItem('cachedParkingLotsWithExternal_v2');
             localStorage.removeItem('cachedParkingLotsWithExternal_v2Timestamp');
        }
        return true;
    }
    console.warn(`Cannot update subscription for non-Carpso managed lot or lot not found: ${lotId}`);
    return false;
}

export async function startLotTrial(lotId: string, trialDays: number = 14): Promise<boolean> {
    const endDate = futureDate(trialDays);
    return updateLotSubscriptionStatus(lotId, 'trial', endDate);
}

async function fetchGooglePlacesParking(region: string, apiKey: string, maxResults: number = 100): Promise<ParkingLot[]> {
    // console.log(`SIMULATING Google Places parking search for region: ${region} (Max: ${maxResults})`);
    if (!apiKey) {
         console.warn("Google API Key missing - simulation will proceed but real fetch would fail.");
    }

    await new Promise(resolve => setTimeout(resolve, 1200));

    const zambiaLatRange = [-18.0, -8.0];
    const zambiaLonRange = [22.0, 34.0];
    const simulatedResults: ParkingLot[] = [];
    const names = ["Central", "North", "South", "East", "West", "Plaza", "Tower", "Square", "Junction", "Heights", "Park", "Complex", "Center"];
    const suffixes = ["Parking", "Garage", "Lot", "Parkade", "Deck", "Area", "Spot"];
    const cities = ["Lusaka", "Ndola", "Kitwe", "Kabwe", "Livingstone", "Chipata", "Kasama", "Solwezi", "Chingola", "Mongu"];
    const generatedNames = new Set<string>();

    for (let i = 0; i < maxResults * 1.5 && simulatedResults.length < maxResults; i++) {
        const lat = Math.random() * (zambiaLatRange[1] - zambiaLatRange[0]) + zambiaLatRange[0];
        const lon = Math.random() * (zambiaLonRange[1] - zambiaLonRange[0]) + zambiaLonRange[0];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const namePart1 = names[Math.floor(Math.random() * names.length)];
        const namePart2 = suffixes[Math.floor(Math.random() * suffixes.length)];
        const name = `${namePart1} ${city} ${namePart2} #${i % 10 + 1}`;
        const nameKey = `${name}-${city}`;

        if (generatedNames.has(nameKey)) continue;

        generatedNames.add(nameKey);
        const place_id = `g_sim_${city.toLowerCase()}_${i}_${Date.now().toString().slice(-4)}`;

        simulatedResults.push({
            id: place_id,
            name: name,
            address: `${Math.floor(100 + Math.random() * 900)} ${namePart1} Rd, ${city}, ${region}`,
            capacity: Math.floor(20 + Math.random() * 280),
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lon.toFixed(6)),
            services: Math.random() > 0.8 ? ['Restroom'] : [],
            subscriptionStatus: 'external',
            isCarpsoManaged: false,
            dataSource: 'google_places_simulated',
            phoneNumber: Math.random() > 0.5 ? `+260 9X XXX ${Math.floor(1000 + Math.random() * 9000)}` : undefined,
            website: Math.random() > 0.6 ? `https://www.google.com/maps/search/?api=1&query_place_id=${place_id}` : undefined,
            contactStatus: 'prospect',
        });
    }
    return simulatedResults;
}

const sampleUsers = [
  { id: 'usr_1', name: 'Alice Smith', email: 'alice@example.com', role: 'User', associatedLots: ['lot_A'] },
  { id: 'usr_2', name: 'Bob Johnson', email: 'bob@example.com', role: 'ParkingLotOwner', associatedLots: ['lot_B', 'lot_D'] },
  { id: 'usr_3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', associatedLots: ['lot_A', 'lot_C'] },
  { id: 'usr_4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', associatedLots: ['*'] },
  { id: 'usr_5', name: 'Eve Adams', email: 'eve@example.com', role: 'ParkingLotOwner', associatedLots: ['lot_C'] },
];


export interface FeaturedService {
    id: string;
    name: string;
    location: string;
    locationId?: string;
    description: string;
    icon: React.ElementType;
    serviceType: ParkingLotService;
    imageUrl?: string;
    latitude?: number;
    longitude?: number;
}

// Helper function to get Lucide icon component based on service type
export function getServiceIcon(service: ParkingLotService): React.ElementType {
    // Assuming you have Lucide icons imported or a mapping
    // Example:
    // import { EvStation, LocalCarWash, ... } from 'lucide-react';
    // switch (service) {
    //   case 'EV Charging': return EvStation;
    //   case 'Car Wash': return LocalCarWash;
    //   ...
    // }
    return 'div' as unknown as React.ElementType; // Placeholder
}

// Example of how you might populate featuredServices if lots data is available
// This specific constant would likely be generated within a component that has `lots` state.
// For the service file, just exporting the type is usually sufficient.
// const exampleLotsData: ParkingLot[] = []; // Assume this is populated
// export const exampleFeaturedServices: FeaturedService[] = exampleLotsData.flatMap(lot =>
//     (lot.services || []).map(service => ({
//         id: `${lot.id}-${service}`,
//         name: service,
//         location: lot.name,
//         locationId: lot.id,
//         description: `Available at ${lot.name}.`,
//         icon: getServiceIcon(service), // Make sure getServiceIcon is defined and accessible
//         serviceType: service,
//         imageUrl: `https://picsum.photos/seed/${lot.id}-${service}/400/200`, // Placeholder
//         latitude: lot.latitude,
//         longitude: lot.longitude,
//     }))
// );
