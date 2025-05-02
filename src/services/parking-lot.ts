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
   * Geographical coordinates. Required for map view.
   */
  latitude: number;
  longitude: number;
  /**
   * List of services offered at the parking lot (optional).
   */
  services?: ParkingLotService[];
  /**
   * User ID of the owner/manager of this parking lot.
   */
  ownerUserId?: string;
  /**
   * Subscription status for this lot on the Carpso platform.
   */
  subscriptionStatus: 'active' | 'trial' | 'inactive' | 'expired';
  /**
   * Date when the trial period ends (ISO 8601 format), if applicable.
   */
  trialEndDate?: string;
}

// Sample data - replace with actual API calls or database queries
// Simulate trial end dates relative to 'now'
const now = Date.now();
const futureDate = (days: number) => new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
const pastDate = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

let sampleParkingLots: ParkingLot[] = [
  { id: 'lot_A', name: 'Downtown Garage', address: '123 Main St, Lusaka', capacity: 50, latitude: -15.4167, longitude: 28.2833, services: ['EV Charging', 'Mobile Money Agent', 'Wifi', 'Restroom'], ownerUserId: 'usr_1', subscriptionStatus: 'active' },
  { id: 'lot_B', name: 'Airport Lot B (KKIA)', address: '456 Airport Rd, Lusaka', capacity: 150, latitude: -15.3300, longitude: 28.4522, services: ['Restroom', 'Wifi'], ownerUserId: 'usr_2', subscriptionStatus: 'trial', trialEndDate: futureDate(15) },
  { id: 'lot_C', name: 'East Park Mall Deck', address: '789 Great East Rd, Lusaka', capacity: 200, latitude: -15.4000, longitude: 28.3333, services: ['Car Wash', 'Valet', 'Mobile Money Agent', 'Restroom', 'EV Charging'], ownerUserId: 'usr_5', subscriptionStatus: 'trial', trialEndDate: pastDate(5) },
  { id: 'lot_D', name: 'Levy Junction Upper Level', address: '101 Church Rd, Lusaka', capacity: 80, latitude: -15.4150, longitude: 28.2900, services: ['Valet', 'Wifi'], ownerUserId: 'usr_2', subscriptionStatus: 'active' },
  { id: 'lot_E', name: 'Arcades Park & Shop', address: '200 Great East Rd, Lusaka', capacity: 120, latitude: -15.4050, longitude: 28.3200, services: ['Mobile Money Agent', 'Restroom', 'Car Wash'], ownerUserId: 'usr_admin', subscriptionStatus: 'active'},
  { id: 'lot_F', name: 'UTH Parking Zone 1', address: 'Hospital Rd, Lusaka', capacity: 60, latitude: -15.4200, longitude: 28.3000, services: ['Restroom'], ownerUserId: 'usr_admin', subscriptionStatus: 'inactive' },
];


/**
 * Asynchronously retrieves a list of available parking lots.
 * In a real application, this would fetch data from a backend API or database.
 * Includes basic offline caching support using localStorage.
 * Filters out lots with 'inactive' or 'expired' status for regular users.
 * Admins/Owners see all lots associated with them.
 *
 * @param userRole The role of the user requesting the lots ('User', 'Admin', 'ParkingLotOwner').
 * @param userId The ID of the user requesting the lots.
 * @returns A promise that resolves to an array of ParkingLot objects.
 */
export async function getAvailableParkingLots(userRole: string = 'User', userId?: string): Promise<ParkingLot[]> {
  const cacheKey = 'cachedParkingLots';
  const cacheTimestampKey = 'cachedParkingLotsTimestamp';
  const maxCacheAge = 60 * 60 * 1000; // 1 hour in milliseconds
  let isOnline = true; // Assume online by default

  // Check online status (client-side only)
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    isOnline = navigator.onLine;
  }

  let fetchedLots: ParkingLot[] = [];

  if (isOnline) {
    try {
      console.log("Fetching fresh parking lots...");
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate fetching fresh data and adding occupancy
      fetchedLots = sampleParkingLots.map(lot => ({
        ...lot,
        // Update status if trial has ended
        subscriptionStatus: (lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date()) ? 'expired' : lot.subscriptionStatus,
        currentOccupancy: lot.currentOccupancy ?? Math.floor(Math.random() * lot.capacity * 0.9)
      }));

      // Cache the fresh data if on client
      if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(cacheKey, JSON.stringify(fetchedLots));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            console.log("Cached fresh parking lots.");
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
          fetchedLots = JSON.parse(cachedData);
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
        fetchedLots = JSON.parse(cachedData);
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

  // --- Filter based on user role and subscription status ---
  if (userRole === 'Admin') {
      return fetchedLots; // Admins see all lots
  } else if (userRole === 'ParkingLotOwner' && userId) {
      // Owners see all lots they own, regardless of subscription status
      return fetchedLots.filter(lot => lot.ownerUserId === userId);
  } else {
      // Regular users only see lots that are 'active' or in 'trial' (and not expired)
      return fetchedLots.filter(lot => lot.subscriptionStatus === 'active' || (lot.subscriptionStatus === 'trial' && (!lot.trialEndDate || new Date(lot.trialEndDate) >= new Date())));
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
  let lot = sampleParkingLots.find(l => l.id === lotId);
   if (lot) {
     // Check and update trial status before returning
     const updatedStatus = (lot.subscriptionStatus === 'trial' && lot.trialEndDate && new Date(lot.trialEndDate) < new Date()) ? 'expired' : lot.subscriptionStatus;
     return {
       ...lot,
       subscriptionStatus: updatedStatus,
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
        // Update cache if online
        if (typeof window !== 'undefined' && navigator.onLine) {
            const cacheKey = 'cachedParkingLots';
             try {
                localStorage.setItem(cacheKey, JSON.stringify(sampleParkingLots));
                localStorage.setItem('cachedParkingLotsTimestamp', Date.now().toString());
             } catch (e) {
                 console.error("Failed to update cache after service update:", e);
             }
        }
        return true;
    }
    return false;
}

// Mock function to update subscription status (Admin)
export async function updateLotSubscriptionStatus(lotId: string, status: ParkingLot['subscriptionStatus'], trialEndDate?: string): Promise<boolean> {
    console.log(`Simulating update subscription for lot ${lotId}:`, { status, trialEndDate });
    await new Promise(resolve => setTimeout(resolve, 500));
    const lotIndex = sampleParkingLots.findIndex(l => l.id === lotId);
    if (lotIndex !== -1) {
        sampleParkingLots[lotIndex].subscriptionStatus = status;
        sampleParkingLots[lotIndex].trialEndDate = status === 'trial' ? trialEndDate : undefined; // Only set trial end date if status is trial
        // Update cache if online
        if (typeof window !== 'undefined' && navigator.onLine) {
            const cacheKey = 'cachedParkingLots';
             try {
                 localStorage.setItem(cacheKey, JSON.stringify(sampleParkingLots));
                 localStorage.setItem('cachedParkingLotsTimestamp', Date.now().toString());
             } catch (e) {
                 console.error("Failed to update cache after subscription update:", e);
             }
        }
        return true;
    }
    return false;
}

// Function to start a trial period for a lot (Admin)
export async function startLotTrial(lotId: string, trialDays: number = 14): Promise<boolean> {
    const endDate = futureDate(trialDays);
    return updateLotSubscriptionStatus(lotId, 'trial', endDate);
}
