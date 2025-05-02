// src/services/parking-sensor.ts

/**
 * Represents the status of a parking spot.
 */
export interface ParkingSpotStatus {
  /**
   * The ID of the parking spot.
   */
  spotId: string;
  /**
   * Whether the spot is occupied or not.
   */
  isOccupied: boolean;
  /**
   * Optional: ISO string representing when the current reservation/occupation is expected to end.
   */
  reservationEndTime?: string;
}

/**
 * Asynchronously retrieves the real-time status of a parking spot.
 * Simulates occupancy and adds a potential reservation end time for occupied spots.
 *
 * @param spotId The ID of the parking spot to check.
 * @returns A promise that resolves to a ParkingSpotStatus object.
 */
export async function getParkingSpotStatus(spotId: string): Promise<ParkingSpotStatus> {
  // Simulate fetching status from a sensor/API
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100)); // Short random delay

  const isOccupied = Math.random() < 0.5; // Stub data: 50% chance of being occupied
  let reservationEndTime: string | undefined = undefined;

  if (isOccupied) {
    // Simulate a reservation end time within the next few hours (e.g., 15 mins to 3 hours)
    const minutesUntilEnd = Math.floor(Math.random() * (180 - 15 + 1)) + 15;
    reservationEndTime = new Date(Date.now() + minutesUntilEnd * 60 * 1000).toISOString();
  }

  return {
    spotId: spotId,
    isOccupied: isOccupied,
    reservationEndTime: reservationEndTime,
  };
}
