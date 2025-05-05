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
 * In a real application, this would fetch data from a backend API or database, which might aggregate
 * data from Carpso's own system and external APIs like Google Places.
 * Includes basic offline caching support using localStorage.
 * Filters visibility based on user role and lot status/source.
 *
 * @param userRole The role of the user requesting the lots ('User', 'Admin', 'ParkingLotOwner', 'ParkingAttendant', 'Premium').
 * @param userId The ID of the user requesting the lots.
 * @param forceRefresh Bypasses cache and fetches fresh data if true.
 * @returns A promise that resolves to an array of ParkingLot objects.
 */
export async function getAvailableParkingLots(
    userRole: UserRole = 'User',
    userId?: string,
    forceRefresh: boolean = false
): Promise<ParkingLot[]> {
  const cacheKey = 'cachedParkingLotsWithExternal_v2'; // Updated cache key
  const cacheTimestampKey = `${cacheKey}Timestamp`;
  const maxCacheAge = 60 * 60 * 1000; // 1 hour cache validity
  let isOnline = true;

  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    isOnline = navigator.onLine;
  }

  let allLots: ParkingLot[] = [];
  let needsServerFetch = true; // Assume we need to fetch unless valid cache found

  // 1. Try loading from cache first (unless forceRefresh)
  if (!forceRefresh && typeof window !== 'undefined') {
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < maxCacheAge) {
      try {
        allLots = JSON.parse(cachedData);
        console.log("Using valid cached parking lots.");
        needsServerFetch = false; // Cache is valid, no need to fetch initially
      } catch (e) {
        console.error("Failed to parse cached locations, will fetch fresh.", e);
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(cacheTimestampKey);
        needsServerFetch = true;
      }
    }
  }

  // 2. Fetch from server if needed (cache invalid/missing/forced or online)
  if (needsServerFetch && isOnline) {
    try {
      console.log("Fetching fresh parking lots (including external simulation)...");
      await new Promise(resolve => setTimeout(resolve, 900)); // Simulate API call delay

      // --- Simulate fetching BOTH Carpso lots AND External Lots ---
      // In a real backend, this might involve two separate queries/API calls
      const carpsoLotsData = sampleCarpsoLots.map(lot => {
         // Simulate live status updates for Carpso lots
         let updatedStatus = lot.subscriptionStatus;
         let occupancy = lot.currentOccupancy;
         updatedStatus = (lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date()) ? 'expired' : lot.subscriptionStatus;
         occupancy = occupancy ?? Math.floor(Math.random() * lot.capacity * 0.9);
         return { ...lot, subscriptionStatus: updatedStatus, currentOccupancy: occupancy };
      });

      // Simulate fetching external lots (e.g., from Google Places API)
      // NOTE: The API key check is crucial for real implementation
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      let externalLotsData: ParkingLot[] = [];
      if (googleApiKey) {
          try {
               // Fetch a larger number to simulate 'unending' list (in reality, needs pagination)
               externalLotsData = await fetchGooglePlacesParking("Zambia", googleApiKey, 100); // Fetch more (simulated)
          } catch (googleError) {
               console.error("Failed to fetch from Google Places API:", googleError);
               // Decide if you want to proceed without external data or show an error
          }
      } else {
          console.warn("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not configured. Skipping external parking lot search.");
      }

      // Combine and remove potential duplicates based on ID (if external ID matches an internal one)
      const combinedLotsMap = new Map<string, ParkingLot>();
      [...carpsoLotsData, ...externalLotsData].forEach(lot => {
          if (!combinedLotsMap.has(lot.id)) { // Prioritize Carpso data if IDs clash
              combinedLotsMap.set(lot.id, lot);
          }
      });
      allLots = Array.from(combinedLotsMap.values());

      // Cache the combined data if on client
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(allLots));
          localStorage.setItem(cacheTimestampKey, Date.now().toString());
          console.log("Cached combined parking lots.");
        } catch (e) {
          console.error("Failed to cache parking lots:", e);
        }
      }
    } catch (error: any) { // Add type annotation for error
      console.error("Online fetch failed, using potentially stale/empty cache:", error.message); // Log error message
      // If fetch fails, `allLots` still holds the cached value (or is empty if cache was invalid)
       if (allLots.length === 0) { // Only throw if fetch fails AND cache was empty/invalid
           throw error; // Re-throw if fetch fails and no usable cache exists
       }
    }
  } else if (needsServerFetch && !isOnline) {
      // Offline and cache was invalid/missing
      console.warn("Offline and no valid cache available.");
      return []; // Return empty if offline and no valid cache
  }

  // 3. Filter based on user role and status/source (ALWAYS apply this filter)
  let visibleLots: ParkingLot[];
  if (userRole === 'Admin') {
    visibleLots = allLots; // Admins see everything
  } else if (userRole === 'ParkingLotOwner' && userId) {
    // Owners see their lots + all external lots
    // Make sure associatedLots is correctly fetched or simulated for the owner
    const ownerUser = sampleUsers.find(user => user.id === userId && user.role === 'ParkingLotOwner'); // Using sampleUsers from admin page for simulation
    const ownerLots = ownerUser?.associatedLots || [];
    visibleLots = allLots.filter(lot => (ownerLots.includes('*')) || (lot.isCarpsoManaged && lot.ownerUserId === userId) || (lot.isCarpsoManaged && ownerLots.includes(lot.id)) || !lot.isCarpsoManaged);
  } else {
    // Regular users & attendants see active/trial Carpso lots + all external lots
    visibleLots = allLots.filter(lot =>
      (lot.isCarpsoManaged && (lot.subscriptionStatus === 'active' || (lot.subscriptionStatus === 'trial' && (!lot.trialEndDate || new Date(lot.trialEndDate) >= new Date())))) ||
      !lot.isCarpsoManaged
    );
  }
  return visibleLots;
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

   // In a real app, this might fetch from cache first, then backend/Google Places Details API
   // Combine Carpso and simulated external data for lookup
   const allPossibleLots = [...sampleCarpsoLots, ...(await fetchGooglePlacesParking("Zambia", "dummy_key", 100))]; // Fetch simulated external again for details lookup
   let lot = allPossibleLots.find(l => l.id === lotId);

   if (lot) {
       let updatedStatus = lot.subscriptionStatus;
       let occupancy = lot.currentOccupancy;

       if (lot.isCarpsoManaged) {
           // Check and update trial status before returning
           updatedStatus = (lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date()) ? 'expired' : lot.subscriptionStatus;
           // Simulate current occupancy if not present
           occupancy = lot.currentOccupancy ?? Math.floor(Math.random() * lot.capacity * 0.9);
       } else {
           // Ensure external lots have correct status and no occupancy from Carpso system
           occupancy = undefined;
           updatedStatus = 'external';
           // Simulate fetching details like phone/website if it's an external lot
           // (In real app, call Google Places Details API here if needed)
           if (!lot.phoneNumber) lot.phoneNumber = `+260 9X XXX ${Math.floor(1000 + Math.random() * 9000)}`; // Simulated phone
           if (!lot.website) lot.website = `https://www.google.com/maps/search/?api=1&query=${lot.latitude},${lot.longitude}&query_place_id=${lot.id}`; // Link to Google Maps place
       }
     return { ...lot, subscriptionStatus: updatedStatus, currentOccupancy: occupancy };
   }
  return null;
}

// Mock function to update services for a lot (Admin/Owner)
// (Note: This function inherently requires an online connection)
export async function updateParkingLotServices(lotId: string, services: ParkingLotService[]): Promise<boolean> {
    console.log(`Simulating update services for lot ${lotId}:`, services);
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
       console.error("Cannot update services: Offline.");
       // TODO: Queue update if offline
       return false;
    }
    await new Promise(resolve => setTimeout(resolve, 800));
    // In a real app, update the backend data source
    const lotIndex = sampleCarpsoLots.findIndex(l => l.id === lotId && l.isCarpsoManaged); // Can only update managed lots
    if (lotIndex !== -1) {
        sampleCarpsoLots[lotIndex].services = services;
        // Invalidate or update cache (simplified: remove cache, next fetch will get fresh)
        if (typeof window !== 'undefined') {
            localStorage.removeItem('cachedParkingLotsWithExternal_v2');
            localStorage.removeItem('cachedParkingLotsWithExternal_v2Timestamp');
        }
        return true; // Indicate success
    }
    console.warn(`Cannot update services for non-Carpso managed lot or lot not found: ${lotId}`);
    return false; // Indicate failure
}


// Mock function to update subscription status (Admin)
export async function updateLotSubscriptionStatus(lotId: string, status: ParkingLot['subscriptionStatus'], trialEndDate?: string): Promise<boolean> {
    console.log(`Simulating update subscription for lot ${lotId}:`, { status, trialEndDate });
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
       console.error("Cannot update subscription: Offline.");
       // TODO: Queue update if offline
       return false;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    const lotIndex = sampleCarpsoLots.findIndex(l => l.id === lotId && l.isCarpsoManaged); // Can only update managed lots
    if (lotIndex !== -1) {
        sampleCarpsoLots[lotIndex].subscriptionStatus = status;
        sampleCarpsoLots[lotIndex].trialEndDate = status === 'trial' ? trialEndDate : undefined; // Only set trial end date if status is trial
         // Invalidate or update cache
        if (typeof window !== 'undefined') {
             localStorage.removeItem('cachedParkingLotsWithExternal_v2');
             localStorage.removeItem('cachedParkingLotsWithExternal_v2Timestamp');
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

// --- Google Places API Helper (Conceptual & Simulated) ---

/**
 * Fetches parking locations from Google Places API for a given region.
 * NOTE: This is a SIMULATED function. Replace with actual Google Places API calls.
 *       Requires setting up Google Places API and handling API keys securely.
 *       Also requires handling pagination for more than 20-60 results.
 *
 * @param region The region to search within (e.g., "Zambia").
 * @param apiKey Your Google Maps API Key (required, even if unused in simulation).
 * @param maxResults Maximum number of simulated results to generate.
 * @returns A promise resolving to an array of ParkingLot objects derived from simulated Google Places data.
 */
async function fetchGooglePlacesParking(region: string, apiKey: string, maxResults: number = 100): Promise<ParkingLot[]> { // Increased default maxResults
    console.log(`SIMULATING Google Places parking search for region: ${region} (Max: ${maxResults})`);
    if (!apiKey) {
         console.warn("Google API Key missing - simulation will proceed but real fetch would fail.");
         // return []; // Optionally return empty if key is critical
    }

    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay

    // --- Simulation Logic ---
    // Generate more varied simulated results in Zambia
    const zambiaLatRange = [-18.0, -8.0];
    const zambiaLonRange = [22.0, 34.0];
    const simulatedResults: ParkingLot[] = [];
    const names = ["Central", "North", "South", "East", "West", "Plaza", "Tower", "Square", "Junction", "Heights", "Park", "Complex", "Center"];
    const suffixes = ["Parking", "Garage", "Lot", "Parkade", "Deck", "Area", "Spot"];
    const cities = ["Lusaka", "Ndola", "Kitwe", "Kabwe", "Livingstone", "Chipata", "Kasama", "Solwezi", "Chingola", "Mongu"];

    // Simple deduplication helper (based on name and city)
    const generatedNames = new Set<string>();

    for (let i = 0; i < maxResults * 1.5 && simulatedResults.length < maxResults; i++) { // Generate more initially to allow for duplicates
        const lat = Math.random() * (zambiaLatRange[1] - zambiaLatRange[0]) + zambiaLatRange[0];
        const lon = Math.random() * (zambiaLonRange[1] - zambiaLonRange[0]) + zambiaLonRange[0];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const namePart1 = names[Math.floor(Math.random() * names.length)];
        const namePart2 = suffixes[Math.floor(Math.random() * suffixes.length)];
        const name = `${namePart1} ${city} ${namePart2} #${i % 10 + 1}`; // Keep number small to increase potential duplicates for demo
        const nameKey = `${name}-${city}`;

        if (generatedNames.has(nameKey)) continue; // Skip duplicate name/city combo

        generatedNames.add(nameKey);
        const place_id = `g_sim_${city.toLowerCase()}_${i}_${Date.now().toString().slice(-4)}`;

        simulatedResults.push({
            id: place_id,
            name: name,
            address: `${Math.floor(100 + Math.random() * 900)} ${namePart1} Rd, ${city}, ${region}`,
            capacity: Math.floor(20 + Math.random() * 280), // Random capacity
            latitude: parseFloat(lat.toFixed(6)),
            longitude: parseFloat(lon.toFixed(6)),
            services: Math.random() > 0.8 ? ['Restroom'] : [], // Occasionally add a service
            subscriptionStatus: 'external',
            isCarpsoManaged: false,
            dataSource: 'google_places_simulated',
            // Simulate contact details occasionally
            phoneNumber: Math.random() > 0.5 ? `+260 9${Math.floor(Math.random()*3)+5} XXX ${Math.floor(1000 + Math.random() * 9000)}` : undefined,
            website: Math.random() > 0.6 ? `https://www.google.com/maps/search/?api=1&query_place_id=${place_id}` : undefined,
            contactStatus: 'prospect', // Mark as prospect
        });
    }
    // --- End Simulation Logic ---

    // --- Real API Call Placeholder ---
    // try {
    //   // --- Google Places Text Search API Call ---
    //   // NOTE: This usually requires enabling billing on your Google Cloud project.
    //   let nextPageToken: string | undefined = undefined;
    //   let allPlaces: any[] = [];
    //   const MAX_API_RESULTS = 60; // Google limits to ~60 results total even with pagination for nearby/text search
    //   const BATCH_SIZE = 20; // Max per page token usually
    //
    //   while (allPlaces.length < MAX_API_RESULTS) {
    //       let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=parking+in+${encodeURIComponent(region)}&key=${apiKey}`;
    //       if (nextPageToken) {
    //           searchUrl += `&pagetoken=${nextPageToken}`;
    //           await new Promise(resolve => setTimeout(resolve, 2000)); // Required delay before using next_page_token
    //       }
    //
    //       const response = await fetch(searchUrl);
    //       if (!response.ok) throw new Error(`Google Places Text Search API error: ${response.statusText}`);
    //       const data = await response.json();
    //
    //       if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    //            throw new Error(`Google Places Text Search API Status: ${data.status} - ${data.error_message || ''}`);
    //       }
    //
    //       allPlaces.push(...(data.results || []));
    //       nextPageToken = data.next_page_token;
    //
    //       if (!nextPageToken || data.results?.length === 0) break; // Exit loop if no more pages
    //   }
    //
    //   // --- Optional: Fetch Details for Each Place (Expensive!) ---
    //   // This significantly increases cost and time. Only fetch details if absolutely necessary (e.g., for phone/website).
    //   const detailedPlaces = await Promise.all(allPlaces.map(async (place) => {
    //       try {
    //           const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=place_id,name,formatted_address,vicinity,geometry/location,formatted_phone_number,website&key=${apiKey}`;
    //           const detailsResponse = await fetch(detailsUrl);
    //           if (!detailsResponse.ok) throw new Error(`Details API error: ${detailsResponse.statusText}`);
    //           const detailsData = await detailsResponse.json();
    //           if (detailsData.status !== 'OK') throw new Error(`Details API Status: ${detailsData.status}`);
    //           return { ...place, details: detailsData.result }; // Combine original place with details
    //       } catch (detailsError) {
    //           console.error(`Failed to fetch details for place ${place.place_id}:`, detailsError);
    //           return place; // Return original place data on details error
    //       }
    //   }));
    //
    //   // --- Map to ParkingLot Structure ---
    //   const externalLots: ParkingLot[] = detailedPlaces.map((place: any) => ({
    //     id: place.place_id,
    //     name: place.name,
    //     address: place.details?.formatted_address || place.formatted_address || place.vicinity || 'Address unavailable',
    //     capacity: 0, // Usually unknown from Places API
    //     latitude: place.geometry.location.lat,
    //     longitude: place.geometry.location.lng,
    //     phoneNumber: place.details?.formatted_phone_number,
    //     website: place.details?.website,
    //     services: [], // Cannot reliably get services from Places API
    //     subscriptionStatus: 'external',
    //     isCarpsoManaged: false,
    //     dataSource: 'google_places',
    //     contactStatus: 'prospect',
    //   }));
    //
    //   return externalLots;
    // } catch (error) {
    //   console.error("Error contacting Google Places API:", error);
    //   throw error; // Re-throw
    // }
    // --- End Real API Call Placeholder ---

    // Return simulated results
    return simulatedResults;
}

// Added sampleUsers definition from admin page for filtering logic
const sampleUsers = [
  { id: 'usr_1', name: 'Alice Smith', email: 'alice@example.com', role: 'User', associatedLots: ['lot_A'] },
  { id: 'usr_2', name: 'Bob Johnson', email: 'bob@example.com', role: 'ParkingLotOwner', associatedLots: ['lot_B', 'lot_D'] }, // Owns B and D
  { id: 'usr_3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', associatedLots: ['lot_A', 'lot_C'] },
  { id: 'usr_4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', associatedLots: ['*'] }, // '*' means all lots
  { id: 'usr_5', name: 'Eve Adams', email: 'eve@example.com', role: 'ParkingLotOwner', associatedLots: ['lot_C'] }, // Owns C
];
