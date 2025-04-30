// src/services/parking-lot.ts

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
}

// Sample data - replace with actual API calls or database queries
const sampleParkingLots: ParkingLot[] = [
  { id: 'lot_A', name: 'Downtown Garage', address: '123 Main St, Anytown', capacity: 50, latitude: 34.0522, longitude: -118.2437 },
  { id: 'lot_B', name: 'Airport Lot B', address: '456 Airport Rd, Anytown', capacity: 150, latitude: 34.0550, longitude: -118.2500 },
  { id: 'lot_C', name: 'Mall Parking Deck', address: '789 Retail Ave, Anytown', capacity: 200, latitude: 34.0500, longitude: -118.2400 },
   { id: 'lot_D', name: 'University Campus Lot', address: '1 College Way, Anytown', capacity: 80, latitude: 34.0580, longitude: -118.2450 },
];

/**
 * Asynchronously retrieves a list of available parking lots.
 * In a real application, this would fetch data from a backend API or database.
 *
 * @returns A promise that resolves to an array of ParkingLot objects.
 */
export async function getAvailableParkingLots(): Promise<ParkingLot[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // TODO: Replace with actual data fetching logic
  // For now, return the sample data
  return sampleParkingLots;
}

/**
 * Asynchronously retrieves details for a specific parking lot.
 *
 * @param lotId The ID of the parking lot to retrieve.
 * @returns A promise that resolves to a ParkingLot object or null if not found.
 */
export async function getParkingLotDetails(lotId: string): Promise<ParkingLot | null> {
   // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));

   // TODO: Replace with actual data fetching logic
  const lot = sampleParkingLots.find(l => l.id === lotId);
  return lot || null;
}

// Add more functions as needed, e.g., updateParkingLot, addParkingLot (for admins)
