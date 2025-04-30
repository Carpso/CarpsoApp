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
 * Simulates fetching advertisements.
 * @param locationId Optional filter by target location ID. If undefined, returns all ads.
 * @returns A promise resolving to an array of advertisements.
 */
export async function getAdvertisements(locationId?: string): Promise<Advertisement[]> {
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
  console.log(`Fetching ads for locationId: ${locationId}`);

  let filteredAds: Advertisement[];

  if (locationId) {
    // Filter ads that target the specific location OR are global (no targetLocationId)
    filteredAds = sampleAdvertisements.filter(ad => ad.targetLocationId === locationId || !ad.targetLocationId);
  } else {
    // If no locationId is specified, return all ads (for admin or potentially global views)
    filteredAds = [...sampleAdvertisements];
  }

  // Filter by status - only return 'active' ads unless maybe in admin context?
  // For Explore page, we likely only want active ads.
  // For Admin page, we might want all statuses.
  // Let's assume this function is generic for now and returns based on location filter primarily.
  // Filtering by status can happen in the component calling this service if needed.

  // Return sorted by creation date (newest first)
  return filteredAds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}


/**
 * Simulates creating a new advertisement.
 * @param adData Data for the new advertisement (excluding id, createdAt, updatedAt).
 * @returns A promise resolving to the newly created advertisement.
 */
export async function createAdvertisement(adData: Partial<Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Advertisement | null> {
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
  console.log("Created ad:", newAd);
  return newAd;
}

/**
 * Simulates updating an existing advertisement.
 * @param adId The ID of the advertisement to update.
 * @param updateData The fields to update.
 * @returns A promise resolving to the updated advertisement or null if not found.
 */
export async function updateAdvertisement(adId: string, updateData: Partial<Omit<Advertisement, 'id' | 'createdAt' | 'targetLotName'>>): Promise<Advertisement | null> {
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
  console.log("Updated ad:", updatedAd);
  return updatedAd;
}


/**
 * Simulates deleting an advertisement.
 * @param adId The ID of the advertisement to delete.
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function deleteAdvertisement(adId: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
  const initialLength = sampleAdvertisements.length;
  sampleAdvertisements = sampleAdvertisements.filter(ad => ad.id !== adId);
  const success = sampleAdvertisements.length < initialLength;
  if (success) {
      console.log("Deleted ad:", adId);
  } else {
       console.warn("Ad not found for deletion:", adId);
  }
  return success;
}
