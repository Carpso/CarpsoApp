// src/ai/flows/recommend-parking-flow.ts
'use server';

/**
 * @fileOverview Provides personalized parking recommendations using AI.
 *
 * - recommendParking - A function that generates parking recommendations.
 * - RecommendParkingInput - The input type for the recommendParking function.
 * - RecommendParkingOutput - The return type for the recommendParking function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { ParkingLot } from '@/services/parking-lot'; // Import type for context
import type { UserBookmark } from '@/services/user-service'; // Import bookmark type

// Define input schema
const RecommendParkingInputSchema = z.object({
  userId: z.string().describe('The ID of the user requesting recommendations.'),
  currentLatitude: z.number().optional().describe('User\'s current latitude (optional).'),
  currentLongitude: z.number().optional().describe('User\'s current longitude (optional).'),
  destinationLabel: z.string().optional().describe('User\'s destination label (e.g., "Home", "Work", or address string).'), // Changed to label
  destinationLatitude: z.number().optional().describe('User\'s destination latitude (optional, derived from label if needed).'),
  destinationLongitude: z.number().optional().describe('User\'s destination longitude (optional, derived from label if needed).'),
  preferredServices: z.array(z.string()).optional().describe('List of preferred parking lot services (e.g., EV Charging, Car Wash).'),
  maxDistanceKm: z.number().optional().describe('Maximum distance from destination in kilometers (optional).'),
  // Simulate passing relevant context data that the flow itself cannot easily fetch
  nearbyParkingLots: z.string().describe('JSON string representing an array of nearby parking lots with their current availability, pricing, services, name, id, and coordinates.'),
  userHistorySummary: z.string().describe('A brief summary of the user\'s recent parking history and preferences.'),
  userBookmarks: z.string().optional().describe('JSON string representing an array of the user\'s saved location bookmarks (e.g., Home, Work), each with id, label, address, latitude, and longitude.'),
});
export type RecommendParkingInput = z.infer<typeof RecommendParkingInputSchema>;

// Define output schema
const RecommendationSchema = z.object({
    lotId: z.string().describe('The ID of the recommended parking lot.'),
    lotName: z.string().describe('The name of the recommended parking lot.'),
    reason: z.string().describe('The reason why this lot is recommended (e.g., proximity, availability, price, services, user preference). Be specific.'),
    estimatedCost: z.number().optional().describe('Estimated parking cost for a typical duration (e.g., 1 hour).'),
    availabilityScore: z.number().min(0).max(1).optional().describe('Score representing predicted availability (0 to 1).'), // Fixed order: min/max before optional
});

const RecommendParkingOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('A list of personalized parking recommendations, ordered by relevance. Aim for 3-5 recommendations.'),
});
export type RecommendParkingOutput = z.infer<typeof RecommendParkingOutputSchema>;

// Define the exported wrapper function
export async function recommendParking(input: RecommendParkingInput): Promise<RecommendParkingOutput> {
  return recommendParkingFlow(input);
}

// Define the prompt
const recommendParkingPrompt = ai.definePrompt({
  name: 'recommendParkingPrompt',
  input: {
    schema: RecommendParkingInputSchema,
  },
  output: {
    schema: RecommendParkingOutputSchema,
  },
  prompt: `You are a smart parking assistant AI. Your goal is to provide personalized parking recommendations based on the user's context and preferences. Analyze the available parking lots and return the top 3-5 recommendations ordered by relevance.

User Information:
- User ID: {{{userId}}}
- Current Location: {{#if currentLatitude}}Lat: {{{currentLatitude}}}, Lon: {{{currentLongitude}}}{{else}}Current location unknown.{{/if}}
- Destination: {{#if destinationLabel}}Label: "{{destinationLabel}}"{{#if destinationLatitude}} (Lat: {{{destinationLatitude}}}, Lon: {{{destinationLongitude}}}){{/if}}{{else}}Destination not specified. Recommend based on current location or user history/bookmarks (e.g., near 'Work' on weekday morning).{{/if}}
- Preferences: {{#if preferredServices}}Prefers lots with: {{{json preferredServices}}}{{else}}No specific service preferences.{{/if}}{{#if maxDistanceKm}} Max distance: {{{maxDistanceKm}}}km.{{/if}}
- Past Behavior Summary: {{{userHistorySummary}}}
{{#if userBookmarks}}
- Saved Locations (JSON): {{{userBookmarks}}}
{{/if}}

Available Nearby Parking Lots Context (JSON array of objects with id, name, address, capacity, currentOccupancy, services, estimatedCost, latitude, longitude):
{{{nearbyParkingLots}}}

Instructions:
1.  **Parse Context:** Carefully parse the 'Available Nearby Parking Lots Context' and 'Saved Locations' JSON strings. If parsing fails for either, state this in the reasoning for potentially less accurate recommendations, but still proceed if possible using other data.
2.  **Determine Target Coordinates:**
    *   If 'destinationLatitude'/'Longitude' are provided, use them as the primary target.
    *   If only 'destinationLabel' is provided:
        *   Attempt to find a matching label in the 'Saved Locations' JSON. If found, use its 'latitude' and 'longitude' as the target.
        *   If the label doesn't match a saved location, treat it as a general area (e.g., "downtown", "airport"). Recommend lots generally associated with that area if possible, or state that the exact location is unknown.
    *   If NO destination is provided:
        *   If 'currentLatitude'/'Longitude' are available, recommend lots near the user's current location.
        *   If current location is also unknown, recommend lots based on 'userHistorySummary' or frequently used 'Saved Locations' (e.g., 'Work' if it's a weekday morning, 'Home' if evening).
3.  **Evaluate Lots:** For each lot in 'Available Nearby Parking Lots Context', evaluate its relevance based on:
    *   **Proximity:** Distance to the determined target coordinates. Prioritize closer lots, respecting 'maxDistanceKm' if specified.
    *   **Availability:** Higher 'currentOccupancy' means lower availability. Calculate availability percentage if possible ('(capacity - currentOccupancy) / capacity'). Prefer lots with higher predicted/current availability.
    *   **Cost:** Consider 'estimatedCost'. Lower cost is generally better but balance with other factors.
    *   **Services:** Match 'services' offered by the lot with 'preferredServices'.
    *   **User History/Prefs:** Consider 'userHistorySummary'. Does the user prefer this lot?
4.  **Generate Recommendations:** Create a list of the top 3-5 recommendations.
5.  **Provide Details:** For each recommendation, include:
    *   'lotId': The ID of the parking lot.
    *   'lotName': The name of the parking lot.
    *   'reason': A **specific** reason (e.g., "Closest to destination with EV charging", "Good availability based on history", "Lowest cost nearby", "Matches preferred services"). Avoid generic reasons.
    *   'estimatedCost': (Optional) The estimated cost provided in the context.
    *   'availabilityScore': (Optional) Calculate as '(capacity - currentOccupancy) / capacity' if 'capacity > 0' and 'currentOccupancy' is available, otherwise omit. Ensure value is between 0 and 1.
6.  **Order:** Sort the recommendations by overall relevance, balancing proximity, availability, cost, services, and user preferences.
7.  **Output:** Ensure the output strictly adheres to the 'RecommendParkingOutputSchema' format. Return an empty array '[]' for 'recommendations' if no suitable lots are found.
`,
});

// Define the flow
const recommendParkingFlow = ai.defineFlow<
  typeof RecommendParkingInputSchema,
  typeof RecommendParkingOutputSchema
>(
  {
    name: 'recommendParkingFlow',
    inputSchema: RecommendParkingInputSchema,
    outputSchema: RecommendParkingOutputSchema,
  },
  async (input) => {
    // Validate input JSON strings before passing to the prompt
    let parsedLots: any[] = [];
    let parsedBookmarks: any[] = [];
    let parseError = false;

    try {
      parsedLots = JSON.parse(input.nearbyParkingLots);
      if (!Array.isArray(parsedLots)) throw new Error("nearbyParkingLots is not an array.");
    } catch (e: any) {
      console.error("Invalid JSON format for nearbyParkingLots:", e.message);
      parseError = true;
      // Proceed with potentially empty/invalid data, prompt should handle it
      input.nearbyParkingLots = "[]"; // Send empty array if parsing failed
    }

    if (input.userBookmarks) {
      try {
        parsedBookmarks = JSON.parse(input.userBookmarks);
        if (!Array.isArray(parsedBookmarks)) throw new Error("userBookmarks is not an array.");
      } catch (e: any) {
        console.error("Invalid JSON format for userBookmarks:", e.message);
        parseError = true;
        // Proceed without bookmarks or send empty array
        input.userBookmarks = "[]";
      }
    }

    let output;
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        console.log(`Calling recommendParkingPrompt (Attempt ${retryCount + 1})...`);
        const result = await recommendParkingPrompt(input);
        output = result.output;
        console.log(`recommendParkingPrompt successful (Attempt ${retryCount + 1}).`);
        lastError = null; // Clear last error on success
        break; // Success, exit the loop
      } catch (error: any) {
        lastError = error; // Store the error
        console.error(`Error calling recommendParkingPrompt (Attempt ${retryCount + 1}):`, error.message);
        // Check for specific overload error or rate limit errors
        if (error.message.includes('503') || error.message.includes('overloaded') || error.message.includes('rate limit')) {
          retryCount++;
          const delay = 1000 * (2 ** retryCount); // Exponential backoff (2s, 4s, 8s)
          console.log(`Retrying after ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Non-recoverable error, break the loop
          console.error("Non-recoverable error encountered.");
          break;
        }
      }
    }


    // Basic validation of the output structure after potential retries
    if (!output || !Array.isArray(output.recommendations)) {
        console.error("Invalid output format from recommendation prompt after retries. Expected { recommendations: [...] }", "Last Error:", lastError?.message);
        // Return empty recommendations if format is wrong or retries failed
        return { recommendations: [] };
    }

    // Further validation: Ensure required fields exist in recommendations
    const validatedRecommendations = output.recommendations.filter(rec => rec.lotId && rec.lotName && rec.reason);
    if (validatedRecommendations.length !== output.recommendations.length) {
        console.warn("Some recommendations from AI were missing required fields (lotId, lotName, reason).");
    }


    return { recommendations: validatedRecommendations };
  }
);
