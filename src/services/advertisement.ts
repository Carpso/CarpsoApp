// src/services/advertisement.ts

import type { ParkingLotService } from './parking-lot'; // Import service type if needed

/**
 * Represents an advertisement displayed within the Carpso app.
 */
export interface Advertisement {
  /**
   * Unique identifier for the advertisement.
   */
  id: string;
  /**
   * Title of the advertisement.
   */
  title: string;
  /**
   * Detailed description or body of the ad.
   */
  description: string;
  /**
   * URL of the image associated with the ad.
   */
  imageUrl?: string;
  /**
   * ID of the parking lot this ad targets (optional, undefined/null/empty for global ads).
   */
  targetLocationId?: string;
   /**
    * Name of the target parking lot (for display purposes, might be added during fetch).
    */
   targetLotName?: string;
  /**
   * Optional service this ad is associated with (e.g., promote EV charging).
   */
  associatedService?: ParkingLotService;
  /**
   * Start date when the ad should become visible (ISO 8601 format or similar).
   */
  startDate?: string;
  /**
   * End date when the ad should expire (ISO 8601 format or similar). If omitted, the ad runs indefinitely.
   */
  endDate?: string;
  /**
   * Timestamp of creation.
   */
  createdAt: string;
   /**
    * Timestamp of last update.
    */
   updatedAt: string;
   /**
    * Status (e.g., active, inactive, draft).
    */
   status?: 'active' | 'inactive' | 'draft';
}

// Cache key for advertisements
const AD_CACHE_KEY = 'cachedAdvertisements';
const AD_CACHE_TIMESTAMP_KEY = `${AD_CACHE_KEY}Timestamp`;
const AD_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

// Sample data store - Replace with actual database interaction
let sampleAdvertisements: Advertisement[] = [
  {
    id: 'ad_1',
    title: '20% Off Weekend Parking!',
    description: 'Park at Downtown Garage this weekend and enjoy a 20% discount. Use code WEEKEND20.',
    imageUrl: 'https://picsum.photos/seed/ad1/400/200',
    targetLocationId: 'lot_A',
    startDate: '2024-08-01',
    endDate: '2024-08-31',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'ad_2',
    title: 'Charge Up While You Park',
    description: 'New EV chargers installed at Airport Lot B. Convenient and fast!',
    imageUrl: 'https://picsum.photos/seed/ad2/400/200',
    targetLocationId: 'lot_B',
    associatedService: 'EV Charging',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  },
    {
    id: 'ad_3',
    title: 'Get Your Car Washed',
    description: 'Premium car wash service available at the Mall Parking Deck.',
    imageUrl: 'https://picsum.photos/seed/ad3/400/200',
    targetLocationId: 'lot_C',
    associatedService: 'Car Wash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  },
];

/**
 * Retrieves advertisements, attempting to use cache when offline or within cache age.
 * Fetches fresh data when online and cache is stale or missing.
 * NOTE: Does not filter by locationId in this version for simplicity, filtering should be done by the caller if needed.
 * @param forceRefresh Bypasses cache and fetches fresh data if true.
 * @returns A promise resolving to an array of all advertisements (active or inactive).
 */
export async function getAdvertisements(forceRefresh: boolean = false): Promise<Advertisement[]> {
  let isOnline = true;
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    isOnline = navigator.onLine;
  }

  let allAds: Advertisement[] = [];
  let needsServerFetch = true;

  // 1. Try loading from cache first (unless forceRefresh)
  if (!forceRefresh && typeof window !== 'undefined') {
    const cachedTimestamp = localStorage.getItem(AD_CACHE_TIMESTAMP_KEY);
    const cachedData = localStorage.getItem(AD_CACHE_KEY);
    if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < AD_CACHE_MAX_AGE) {
      try {
        allAds = JSON.parse(cachedData);
        console.log("Using valid cached advertisements.");
        needsServerFetch = false; // Cache is valid
      } catch (e) {
        console.error("Failed to parse cached advertisements, will fetch fresh.", e);
        localStorage.removeItem(AD_CACHE_KEY);
        localStorage.removeItem(AD_CACHE_TIMESTAMP_KEY);
        needsServerFetch = true;
      }
    }
  }

  // 2. Fetch from server if needed (online and cache invalid/missing/forced)
  if (needsServerFetch && isOnline) {
    try {
      console.log("Fetching fresh advertisements...");
      await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay

      // Simulate fetching ALL ads from backend (active, inactive, etc.)
      allAds = [...sampleAdvertisements]; // In real app, replace with API call

      // Cache the fresh data
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(AD_CACHE_KEY, JSON.stringify(allAds));
          localStorage.setItem(AD_CACHE_TIMESTAMP_KEY, Date.now().toString());
          console.log("Cached fresh advertisements.");
        } catch (e) {
          console.error("Failed to cache advertisements:", e);
        }
      }
    } catch (error) {
      console.error("Online ad fetch failed, using potentially stale/empty cache:", error);
      // If fetch fails but we had cached data, `allAds` still holds it.
      if (allAds.length === 0) {
        throw error; // Re-throw if fetch fails and no usable cache exists
      }
    }
  } else if (needsServerFetch && !isOnline) {
    // Offline and cache was invalid/missing
    console.warn("Offline and no valid ad cache available.");
    return []; // Return empty if offline and no valid cache
  }

  // Return all fetched/cached ads, sorted by creation date (newest first)
  return allAds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}


/**
 * Simulates creating a new advertisement (requires online).
 * Invalidates cache on success.
 * @param adData Data for the new advertisement (excluding id, createdAt, updatedAt).
 * @returns A promise resolving to the newly created advertisement or null if offline.
 */
export async function createAdvertisement(adData: Partial<Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt' | 'targetLotName'>>): Promise<Advertisement | null> {
   let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
   if (!isOnline) {
       console.error("Cannot create advertisement: Offline.");
       // TODO: Add to offline queue if needed
       return null;
   }

  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network delay
  const newAd: Advertisement = {
    id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: adData.title || 'Untitled Ad',
    description: adData.description || '',
    imageUrl: adData.imageUrl,
    targetLocationId: adData.targetLocationId,
    associatedService: adData.associatedService,
    startDate: adData.startDate,
    endDate: adData.endDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: adData.status || 'active', // Default to active
  };
  sampleAdvertisements.push(newAd);

  // Invalidate cache
  if (typeof window !== 'undefined') {
     localStorage.removeItem(AD_CACHE_KEY);
     localStorage.removeItem(AD_CACHE_TIMESTAMP_KEY);
  }

  console.log("Created ad:", newAd);
  return newAd;
}

/**
 * Simulates updating an existing advertisement (requires online).
 * Invalidates cache on success.
 * @param adId The ID of the advertisement to update.
 * @param updateData The fields to update.
 * @returns A promise resolving to the updated advertisement or null if not found or offline.
 */
export async function updateAdvertisement(adId: string, updateData: Partial<Omit<Advertisement, 'id' | 'createdAt' | 'targetLotName'>>): Promise<Advertisement | null> {
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
       console.error("Cannot update advertisement: Offline.");
       // TODO: Add to offline queue if needed
       return null;
    }

  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const adIndex = sampleAdvertisements.findIndex(ad => ad.id === adId);
  if (adIndex === -1) {
    return null;
  }
  const updatedAd = {
    ...sampleAdvertisements[adIndex],
    ...updateData,
    updatedAt: new Date().toISOString(),
    // Ensure targetLotName is not persisted from the form state
    targetLotName: undefined,
  };
  sampleAdvertisements[adIndex] = updatedAd;

   // Invalidate cache
   if (typeof window !== 'undefined') {
      localStorage.removeItem(AD_CACHE_KEY);
      localStorage.removeItem(AD_CACHE_TIMESTAMP_KEY);
   }

  console.log("Updated ad:", updatedAd);
  return updatedAd;
}


/**
 * Simulates deleting an advertisement (requires online).
 * Invalidates cache on success.
 * @param adId The ID of the advertisement to delete.
 * @returns A promise resolving to true if successful, false otherwise (or if offline).
 */
export async function deleteAdvertisement(adId: string): Promise<boolean> {
    let isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
       console.error("Cannot delete advertisement: Offline.");
       // TODO: Add to offline queue if needed
       return false;
    }

  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
  const initialLength = sampleAdvertisements.length;
  sampleAdvertisements = sampleAdvertisements.filter(ad => ad.id !== adId);
  const success = sampleAdvertisements.length < initialLength;
  if (success) {
      console.log("Deleted ad:", adId);
       // Invalidate cache
       if (typeof window !== 'undefined') {
          localStorage.removeItem(AD_CACHE_KEY);
          localStorage.removeItem(AD_CACHE_TIMESTAMP_KEY);
       }
  } else {
       console.warn("Ad not found for deletion:", adId);
  }
  return success;
}
