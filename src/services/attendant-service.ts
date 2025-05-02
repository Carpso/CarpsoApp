// src/services/attendant-service.ts

/**
 * Interface for the result of an attendant confirmation action.
 */
export interface AttendantConfirmationResult {
  success: boolean;
  message: string;
}

/**
 * Simulates confirming a user's arrival based on a reservation or QR code identifier.
 * In a real app, this would update the reservation status in the database.
 *
 * @param identifier The identifier from QR scan or search (e.g., reservation ID, spot ID).
 * @returns A promise resolving to an AttendantConfirmationResult.
 */
export async function confirmUserArrival(identifier: string): Promise<AttendantConfirmationResult> {
  console.log(`Attendant confirming arrival for identifier: ${identifier}`);
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API call

  // --- Mock Logic ---
  const success = Math.random() > 0.1; // 90% success rate

  if (success) {
    // TODO: In real app, update reservation status to 'Active' or 'Checked-In'.
    // Link the identifier to the actual reservation if needed.
    console.log(`Successfully confirmed arrival for ${identifier}.`);
    return { success: true, message: `Arrival confirmed for ${identifier}.` };
  } else {
    console.error(`Failed to confirm arrival for ${identifier} (Simulated error).`);
    return { success: false, message: `Could not confirm arrival for ${identifier}. Reservation might be invalid or already active.` };
  }
  // --- End Mock Logic ---
}

/**
 * Simulates confirming the occupancy status of a specific spot by an attendant.
 * In a real app, this might override the sensor data or trigger alerts.
 *
 * @param spotId The ID of the parking spot being confirmed.
 * @param isOccupied The confirmed status (true if occupied, false if free).
 * @returns A promise resolving to an AttendantConfirmationResult.
 */
export async function confirmSpotOccupancy(spotId: string, isOccupied: boolean): Promise<AttendantConfirmationResult> {
  console.log(`Attendant confirming spot ${spotId} as ${isOccupied ? 'OCCUPIED' : 'FREE'}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

  // --- Mock Logic ---
  const success = Math.random() > 0.05; // 95% success rate

  if (success) {
    // TODO: In real app:
    // 1. Update the spot status in the database (potentially overriding sensor).
    // 2. Log the manual confirmation event.
    // 3. If confirming as FREE and there's a queue, trigger notification to the next user (call queue-service).
    // 4. If confirming as OCCUPIED and sensor says FREE, log discrepancy or alert admin.
    console.log(`Successfully confirmed spot ${spotId} status.`);
    return { success: true, message: `Spot ${spotId} status confirmed as ${isOccupied ? 'Occupied' : 'Free'}.` };
  } else {
    console.error(`Failed to confirm occupancy for ${spotId} (Simulated error).`);
    return { success: false, message: `Could not update status for spot ${spotId}. Please try again.` };
  }
  // --- End Mock Logic ---
}

// Add other attendant-specific functions here, e.g.,
// - Assisting with payments
// - Reporting incidents
// - Managing temporary spot closures