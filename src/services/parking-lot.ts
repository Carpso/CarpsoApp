// src/services/parking-lot.ts

/**
 * Represents a service offered at a parking lot.
 */
export type ParkingLotService = 'EV Charging' | 'Car Wash' | 'Mobile Money Agent' | 'Valet' | 'Restroom';


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
  { id: 'lot_A', name: 'Downtown Garage', address: '123 Main St, Anytown', capacity: 50, latitude: 34.0522, longitude: -118.2437, services: ['EV Charging', 'Mobile Money Agent'] },
  { id: 'lot_B', name: 'Airport Lot B', address: '456 Airport Rd, Anytown', capacity: 150, latitude: 34.0550, longitude: -118.2500, services: ['Restroom', 'EV Charging'] },
  { id: 'lot_C', name: 'Mall Parking Deck', address: '789 Retail Ave, Anytown', capacity: 200, latitude: 34.0500, longitude: -118.2400, services: ['Car Wash', 'Valet', 'Mobile Money Agent', 'Restroom'] },
   { id: 'lot_D', name: 'University Campus Lot', address: '1 College Way, Anytown', capacity: 80, latitude: 34.0580, longitude: -118.2450 }, // No services listed
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
  // For now, return the sample data with current occupancy simulation
   const lotsWithOccupancy = sampleParkingLots.map(lot => ({
       ...lot,
       // Simulate current occupancy if not present
       currentOccupancy: lot.currentOccupancy ?? Math.floor(Math.random() * lot.capacity * 0.9) // Simulate up to 90% occupancy
   }));

  return lotsWithOccupancy;
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

```