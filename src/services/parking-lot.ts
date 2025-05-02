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
   * Unique identifier for the parking lot.
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
   * Total capacity of the parking lot.
   */
  capacity: number;
  /**
   * Current occupancy count (optional, might be derived from spot statuses).
   */
  currentOccupancy?: number;
  /**
   * Geographical coordinates (optional).
   */
  latitude?: number;
  longitude?: number;
  /**
   * List of services offered at the parking lot (optional).
   */
  services?: ParkingLotService[];
}

// Sample data - replace with actual API calls or database queries
const sampleParkingLots: ParkingLot[] = [
  { id: 'lot_A', name: 'Downtown Garage', address: '123 Main St, Anytown', capacity: 50, latitude: 34.0522, longitude: -118.2437, services: ['EV Charging', 'Mobile Money Agent', 'Wifi'] }, // Added Wifi
  { id: 'lot_B', name: 'Airport Lot B', address: '456 Airport Rd, Anytown', capacity: 150, latitude: 34.0550, longitude: -118.2500, services: ['Restroom', 'EV Charging'] },
  { id: 'lot_C', name: 'Mall Parking Deck', address: '789 Retail Ave, Anytown', capacity: 200, latitude: 34.0500, longitude: -118.2400, services: ['Car Wash', 'Valet', 'Mobile Money Agent', 'Restroom'] },
   { id: 'lot_D', name: 'University Campus Lot', address: '1 College Way, Anytown', capacity: 80, latitude: 34.0580, longitude: -118.2450 }, // No services listed
];

/**
 * Asynchronously retrieves a list of available parking lots.
 * In a real application, this would fetch data from a backend API or database.
 * Includes basic offline caching support using localStorage.
 *
 * @returns A promise that resolves to an array of ParkingLot objects.
 */
export async function getAvailableParkingLots(): Promise<ParkingLot[]> {
  const cacheKey = 'cachedParkingLots';
  const cacheTimestampKey = 'cachedParkingLotsTimestamp';
  const maxCacheAge = 60 * 60 * 1000; // 1 hour in milliseconds
  let isOnline = true; // Assume online by default

  // Check online status (client-side only)
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    isOnline = navigator.onLine;
  }

  if (isOnline) {
    try {
      console.log("Fetching fresh parking lots...");
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate fetching fresh data and adding occupancy
      const lotsWithOccupancy = sampleParkingLots.map(lot => ({
        ...lot,
        currentOccupancy: lot.currentOccupancy ?? Math.floor(Math.random() * lot.capacity * 0.9)
      }));

      // Cache the fresh data if on client
      if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(cacheKey, JSON.stringify(lotsWithOccupancy));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            console.log("Cached fresh parking lots.");
        } catch (e) {
             console.error("Failed to cache parking lots:", e); // Handle potential storage errors
        }
      }
      return lotsWithOccupancy;

    } catch (error) {
      console.error("Online fetch failed, attempting to use cache:", error);
      // Fallback to cache if online fetch fails
      if (typeof window !== 'undefined') {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          console.warn("Returning cached data due to online fetch failure.");
          return JSON.parse(cachedData);
        }
      }
      // If online fetch fails AND cache is unavailable, re-throw the error
      throw error;
    }
  } else {
    // Offline: Try to load from cache
    console.log("Offline: Attempting to load parking lots from cache...");
    if (typeof window !== 'undefined') {
      const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < maxCacheAge) {
        console.log("Using valid cached parking lots (offline).");
        return JSON.parse(cachedData);
      } else {
        console.warn("Offline: Cache is old or empty.");
        // Optionally return empty array or throw error depending on desired offline behavior
         return []; // Return empty array if cache is invalid/missing offline
        // throw new Error("Offline and no valid cached data available.");
      }
    } else {
       console.warn("Offline: localStorage not available.");
       // Server-side offline scenario? Might return empty or throw.
       return [];
       // throw new Error("Offline and cache unavailable.");
    }
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

   // TODO: Replace with actual data fetching logic
  const lot = sampleParkingLots.find(l => l.id === lotId);
   if (lot) {
     return {
       ...lot,
       // Simulate current occupancy if not present
       currentOccupancy: lot.currentOccupancy ?? Math.floor(Math.random() * lot.capacity * 0.9)
     };
   }
  return null;
}

// Mock function to update services for a lot (Admin/Owner)
// (Note: This function inherently requires an online connection)
export async function updateParkingLotServices(lotId: string, services: ParkingLotService[]): Promise<boolean> {
    console.log(`Simulating update services for lot ${lotId}:`, services);
    await new Promise(resolve => setTimeout(resolve, 800));
    // In a real app, update the backend data source
    const lotIndex = sampleParkingLots.findIndex(l => l.id === lotId);
    if (lotIndex !== -1) {
        sampleParkingLots[lotIndex].services = services;
        return true;
    }
    return false;
}


// Add more functions as needed, e.g., updateParkingLot, addParkingLot (for admins)
