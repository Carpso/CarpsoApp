// src/services/parking-lot.ts

/**
 * Represents a service offered at a parking lot.
 */
export type ParkingLotService = 'EV Charging' | 'Car Wash' | 'Mobile Money Agent' | 'Valet' | 'Restroom' | 'Wifi'; // Added Wifi


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
}

// Sample data - replace with actual API calls or database queries
// Simulate trial end dates relative to 'now'
const now = Date.now();
const futureDate = (days: number) => new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
const pastDate = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

let sampleParkingLots: ParkingLot[] = [
  // Carpso Managed Lots
  { id: 'lot_A', name: 'Downtown Garage (Carpso)', address: '123 Main St, Lusaka', capacity: 50, latitude: -15.4167, longitude: 28.2833, services: ['EV Charging', 'Mobile Money Agent', 'Wifi', 'Restroom'], ownerUserId: 'usr_1', subscriptionStatus: 'active', isCarpsoManaged: true, dataSource: 'carpso' },
  { id: 'lot_B', name: 'Airport Lot B (Carpso Partner)', address: '456 Airport Rd, Lusaka', capacity: 150, latitude: -15.3300, longitude: 28.4522, services: ['Restroom', 'Wifi'], ownerUserId: 'usr_2', subscriptionStatus: 'trial', trialEndDate: futureDate(15), isCarpsoManaged: true, dataSource: 'carpso' },
  { id: 'lot_C', name: 'East Park Mall Deck (Carpso)', address: '789 Great East Rd, Lusaka', capacity: 200, latitude: -15.4000, longitude: 28.3333, services: ['Car Wash', 'Valet', 'Mobile Money Agent', 'Restroom', 'EV Charging'], ownerUserId: 'usr_5', subscriptionStatus: 'trial', trialEndDate: pastDate(5), isCarpsoManaged: true, dataSource: 'carpso' }, // Expired trial, still shown to owner
  { id: 'lot_D', name: 'Levy Junction Upper Level (Carpso)', address: '101 Church Rd, Lusaka', capacity: 80, latitude: -15.4150, longitude: 28.2900, services: ['Valet', 'Wifi'], ownerUserId: 'usr_2', subscriptionStatus: 'active', isCarpsoManaged: true, dataSource: 'carpso' },
  { id: 'lot_E', name: 'Arcades Park & Shop (Carpso)', address: '200 Great East Rd, Lusaka', capacity: 120, latitude: -15.4050, longitude: 28.3200, services: ['Mobile Money Agent', 'Restroom', 'Car Wash'], ownerUserId: 'usr_admin', subscriptionStatus: 'active', isCarpsoManaged: true, dataSource: 'carpso'},
  { id: 'lot_F', name: 'UTH Parking Zone 1 (Carpso)', address: 'Hospital Rd, Lusaka', capacity: 60, latitude: -15.4200, longitude: 28.3000, services: ['Restroom'], ownerUserId: 'usr_admin', subscriptionStatus: 'inactive', isCarpsoManaged: true, dataSource: 'carpso' }, // Inactive, only shown to admin/owner

  // Simulated External Lots (from Google Maps)
  { id: 'g_place_1', name: 'Mandahill Shopping Mall Parking', address: 'Mandahill, Lusaka', capacity: 300, latitude: -15.4098, longitude: 28.3115, services: ['Restroom'], subscriptionStatus: 'external', isCarpsoManaged: false, dataSource: 'google_places' },
  { id: 'g_place_2', name: 'Society Business Park Parking', address: 'Cairo Rd, Lusaka', capacity: 100, latitude: -15.4210, longitude: 28.2821, services: [], subscriptionStatus: 'external', isCarpsoManaged: false, dataSource: 'google_places' },
  { id: 'g_place_3', name: 'Kwitanda House Parking', address: 'Independence Ave, Lusaka', capacity: 40, latitude: -15.4235, longitude: 28.2858, services: [], subscriptionStatus: 'external', isCarpsoManaged: false, dataSource: 'google_places' },
  { id: 'g_place_4', name: 'Zambia National Library Car Park', address: 'Corner of Burma &, Independence Ave, Lusaka', capacity: 20, latitude: -15.4242, longitude: 28.2878, services: [], subscriptionStatus: 'external', isCarpsoManaged: false, dataSource: 'google_places' },

];


/**
 * Asynchronously retrieves a list of available parking lots, potentially including external sources.
 * In a real application, this would fetch data from a backend API or database, which might aggregate
 * data from Carpso's own system and external APIs like Google Places.
 * Includes basic offline caching support using localStorage.
 * Filters visibility based on user role and lot status/source.
 *
 * @param userRole The role of the user requesting the lots ('User', 'Admin', 'ParkingLotOwner').
 * @param userId The ID of the user requesting the lots.
 * @returns A promise that resolves to an array of ParkingLot objects.
 */
export async function getAvailableParkingLots(userRole: string = 'User', userId?: string): Promise<ParkingLot[]> {
  const cacheKey = 'cachedParkingLotsWithExternal'; // Use a different key to include external
  const cacheTimestampKey = `${cacheKey}Timestamp`;
  const maxCacheAge = 60 * 60 * 1000; // 1 hour in milliseconds
  let isOnline = true; // Assume online by default

  // Check online status (client-side only)
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    isOnline = navigator.onLine;
  }

  let allLots: ParkingLot[] = [];

  if (isOnline) {
    try {
      console.log("Fetching fresh parking lots (including external simulation)...");
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 700)); // Slightly longer delay for potential external fetch

      // --- Integration Point for Google Maps Places API ---
      // In a real app, you would call the Google Places API here to find parking locations in Zambia.
      // Example (conceptual):
      // const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      // if (googleApiKey) {
      //   try {
      //     const externalLots = await fetchGooglePlacesParking("Zambia", googleApiKey); // Your function to call Places API
      //     allLots = [...sampleParkingLots, ...externalLots]; // Combine Carpso data with external data
      //   } catch (googleError) {
      //     console.error("Failed to fetch from Google Places API:", googleError);
      //     // Fallback to only Carpso data if Google fetch fails
      //     allLots = [...sampleParkingLots];
      //   }
      // } else {
      //   console.warn("Google Maps API Key not configured. Skipping external parking lot search.");
      //   allLots = [...sampleParkingLots];
      // }
      // --- End Integration Point ---

      // For simulation, we use the combined mock data directly:
      allLots = [...sampleParkingLots];


      // Simulate fetching occupancy and updating trial statuses for Carpso managed lots
      allLots = allLots.map(lot => {
          let updatedStatus = lot.subscriptionStatus;
          let occupancy = lot.currentOccupancy;

          if (lot.isCarpsoManaged) {
              // Update status if trial has ended
              updatedStatus = (lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date()) ? 'expired' : lot.subscriptionStatus;
              // Simulate occupancy only for managed lots
              occupancy = occupancy ?? Math.floor(Math.random() * lot.capacity * 0.9);
          } else {
              // External lots don't have real-time occupancy from Carpso system
              occupancy = undefined;
              updatedStatus = 'external'; // Ensure external status
          }

          return { ...lot, subscriptionStatus: updatedStatus, currentOccupancy: occupancy };
      });

      // Cache the combined data if on client
      if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(cacheKey, JSON.stringify(allLots));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            console.log("Cached combined parking lots.");
        } catch (e) {
             console.error("Failed to cache parking lots:", e); // Handle potential storage errors
        }
      }
    } catch (error) {
      console.error("Online fetch failed, attempting to use cache:", error);
      // Fallback to cache if online fetch fails
      if (typeof window !== 'undefined') {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          console.warn("Returning cached data due to online fetch failure.");
          allLots = JSON.parse(cachedData);
        } else {
           throw error; // Re-throw if fetch fails and no cache
        }
      } else {
          throw error; // Re-throw if server-side fetch fails
      }
    }
  } else {
    // Offline: Try to load from cache
    console.log("Offline: Attempting to load parking lots from cache...");
    if (typeof window !== 'undefined') {
      const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < maxCacheAge) {
        console.log("Using valid cached parking lots (offline).");
        allLots = JSON.parse(cachedData);
      } else {
        console.warn("Offline: Cache is old or empty.");
        // Return empty array if cache is invalid/missing offline
        return [];
      }
    } else {
       console.warn("Offline: localStorage not available.");
       return [];
    }
  }

  // --- Filter based on user role and status/source ---
  if (userRole === 'Admin') {
      return allLots; // Admins see all lots
  } else if (userRole === 'ParkingLotOwner' && userId) {
      // Owners see all lots they own, regardless of subscription status, PLUS all external lots
      return allLots.filter(lot => (lot.isCarpsoManaged && lot.ownerUserId === userId) || !lot.isCarpsoManaged);
  } else {
      // Regular users see:
      // 1. Carpso managed lots that are 'active' or in non-expired 'trial'.
      // 2. All external lots.
      return allLots.filter(lot =>
          (lot.isCarpsoManaged && (lot.subscriptionStatus === 'active' || (lot.subscriptionStatus === 'trial' && (!lot.trialEndDate || new Date(lot.trialEndDate) >= new Date()))))
          || !lot.isCarpsoManaged // Include all external lots
      );
  }
}


/**
 * Asynchronously retrieves details for a specific parking lot.
 * (Note: This function currently lacks offline caching, consider adding if needed)
 *
 * @param lotId The ID of the parking lot to retrieve.
 * @returns A promise that resolves to a ParkingLot object or null if not found.
 */
export async function getParkingLotDetails(lotId: string): Promise<ParkingLot | null> {
   // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));

   // TODO: Replace with actual data fetching logic (might need to check external sources too)
  let lot = sampleParkingLots.find(l => l.id === lotId);
   if (lot) {
       let updatedStatus = lot.subscriptionStatus;
       let occupancy = lot.currentOccupancy;

       if (lot.isCarpsoManaged) {
           // Check and update trial status before returning
           updatedStatus = (lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date()) ? 'expired' : lot.subscriptionStatus;
           // Simulate current occupancy if not present
           occupancy = lot.currentOccupancy ?? Math.floor(Math.random() * lot.capacity * 0.9);
       } else {
           occupancy = undefined;
           updatedStatus = 'external';
       }
     return { ...lot, subscriptionStatus: updatedStatus, currentOccupancy: occupancy };
   }
  return null;
}

// Mock function to update services for a lot (Admin/Owner)
// (Note: This function inherently requires an online connection)
export async function updateParkingLotServices(lotId: string, services: ParkingLotService[]): Promise<boolean> {
    console.log(`Simulating update services for lot ${lotId}:`, services);
    await new Promise(resolve => setTimeout(resolve, 800));
    // In a real app, update the backend data source
    const lotIndex = sampleParkingLots.findIndex(l => l.id === lotId && l.isCarpsoManaged); // Can only update managed lots
    if (lotIndex !== -1) {
        sampleParkingLots[lotIndex].services = services;
        // Update cache if online
        if (typeof window !== 'undefined' && navigator.onLine) {
            const cacheKey = 'cachedParkingLotsWithExternal';
             try {
                localStorage.setItem(cacheKey, JSON.stringify(sampleParkingLots));
                localStorage.setItem(`${cacheKey}Timestamp`, Date.now().toString());
             } catch (e) {
                 console.error("Failed to update cache after service update:", e);
             }
        }
        return true;
    }
    console.warn(`Cannot update services for non-Carpso managed lot or lot not found: ${lotId}`);
    return false;
}

// Mock function to update subscription status (Admin)
export async function updateLotSubscriptionStatus(lotId: string, status: ParkingLot['subscriptionStatus'], trialEndDate?: string): Promise<boolean> {
    console.log(`Simulating update subscription for lot ${lotId}:`, { status, trialEndDate });
    await new Promise(resolve => setTimeout(resolve, 500));
    const lotIndex = sampleParkingLots.findIndex(l => l.id === lotId && l.isCarpsoManaged); // Can only update managed lots
    if (lotIndex !== -1) {
        sampleParkingLots[lotIndex].subscriptionStatus = status;
        sampleParkingLots[lotIndex].trialEndDate = status === 'trial' ? trialEndDate : undefined; // Only set trial end date if status is trial
        // Update cache if online
        if (typeof window !== 'undefined' && navigator.onLine) {
            const cacheKey = 'cachedParkingLotsWithExternal';
             try {
                 localStorage.setItem(cacheKey, JSON.stringify(sampleParkingLots));
                 localStorage.setItem(`${cacheKey}Timestamp`, Date.now().toString());
             } catch (e) {
                 console.error("Failed to update cache after subscription update:", e);
             }
        }
        return true;
    }
    console.warn(`Cannot update subscription for non-Carpso managed lot or lot not found: ${lotId}`);
    return false;
}

// Function to start a trial period for a lot (Admin)
export async function startLotTrial(lotId: string, trialDays: number = 14): Promise<boolean> {
    const endDate = futureDate(trialDays);
    return updateLotSubscriptionStatus(lotId, 'trial', endDate);
}

// --- Google Places API Helper (Conceptual) ---

/**
 * Fetches parking locations from Google Places API for a given region.
 * NOTE: This is a conceptual function and requires setting up Google Places API
 *       and handling API keys securely. Replace with actual implementation.
 *
 * @param region The region to search within (e.g., "Zambia").
 * @param apiKey Your Google Maps API Key with Places API enabled.
 * @returns A promise resolving to an array of ParkingLot objects derived from Google Places data.
 */
async function fetchGooglePlacesParking(region: string, apiKey: string): Promise<ParkingLot[]> {
    console.log(`Fetching parking places from Google for region: ${region}`);
    // --- Replace with actual Google Places API call ---
    // Example using Nearby Search or Text Search:
    // const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=parking+in+${encodeURIComponent(region)}&key=${apiKey}`;
    // const response = await fetch(searchUrl);
    // if (!response.ok) throw new Error(`Google Places API error: ${response.statusText}`);
    // const data = await response.json();
    // --- End API Call ---

    // Simulate response data
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    const simulatedResults = [
        { place_id: 'g_place_1_sim', name: 'Mandahill Parking (Google)', vicinity: 'Great East Road, Lusaka', geometry: { location: { lat: -15.4098, lng: 28.3115 } }, types: ['parking'], rating: 4.0, user_ratings_total: 150 },
        { place_id: 'g_place_2_sim', name: 'Society Business Park (Google)', vicinity: 'Cairo Road, Lusaka', geometry: { location: { lat: -15.4210, lng: 28.2821 } }, types: ['parking'] },
        // Add more simulated results...
    ];

    const externalLots: ParkingLot[] = simulatedResults.map((place: any) => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity || `Near ${place.name}`, // Use vicinity or fallback
        capacity: 0, // Capacity often unknown from Places API
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        services: [], // Services usually not available directly, might need Place Details call
        subscriptionStatus: 'external',
        isCarpsoManaged: false,
        dataSource: 'google_places',
    }));

    return externalLots;
}
