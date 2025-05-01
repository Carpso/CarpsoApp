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
  nearbyParkingLots: z.string().describe('JSON string representing an array of nearby parking lots with their current availability and pricing.'),
  userHistorySummary: z.string().describe('A brief summary of the user\'s recent parking history and preferences.'),
  userBookmarks: z.string().optional().describe('JSON string representing an array of the user\'s saved location bookmarks (e.g., Home, Work).'),
});
export type RecommendParkingInput = z.infer<typeof RecommendParkingInputSchema>;

// Define output schema
const RecommendationSchema = z.object({
    lotId: z.string().describe('The ID of the recommended parking lot.'),
    lotName: z.string().describe('The name of the recommended parking lot.'),
    reason: z.string().describe('The reason why this lot is recommended (e.g., proximity, availability, price, services, user preference).'),
    estimatedCost: z.number().optional().describe('Estimated parking cost for a typical duration.'),
    availabilityScore: z.number().optional().describe('Score representing predicted availability (0 to 1).'),
});

const RecommendParkingOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('A list of personalized parking recommendations, ordered by relevance.'),
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
  prompt: `You are a smart parking assistant AI. Your goal is to provide personalized parking recommendations based on the user's context and preferences.

User Information:
- User ID: {{{userId}}}
- Current Location: {{#if currentLatitude}}Lat: {{{currentLatitude}}}, Lon: {{{currentLongitude}}}{{else}}Current location unknown.{{/if}}
- Destination: {{#if destinationLabel}}Label: "{{destinationLabel}}"{{#if destinationLatitude}} (Lat: {{{destinationLatitude}}}, Lon: {{{destinationLongitude}}}){{/if}}{{else}}Destination not specified.{{/if}}
- Preferences: {{#if preferredServices}}Prefers lots with: {{{json preferredServices}}}{{else}}No specific service preferences.{{/if}}{{#if maxDistanceKm}} Max distance: {{{maxDistanceKm}}}km.{{/if}}
- Past Behavior Summary: {{{userHistorySummary}}}
{{#if userBookmarks}}
- Saved Locations (JSON): {{{userBookmarks}}}
{{/if}}

Available Parking Lots Context (JSON):
{{{nearbyParkingLots}}}

Instructions:
1. Analyze the user's request, current location, destination (label or coordinates), preferences, saved locations, and past behavior.
2. Determine the target coordinates:
   - If destinationLatitude/Longitude are provided, use them.
   - If only destinationLabel is provided, try to find a matching saved location in userBookmarks. Use its coordinates if found.
   - If destinationLabel is provided but not found in bookmarks, state that the specific location is unknown but try to infer general area if possible (e.g., "downtown").
   - If no destination is specified, consider recommending lots near the user's current location or frequently visited locations from their history/bookmarks (e.g., near 'Work' if it's a weekday morning).
3. Evaluate the provided nearby parking lots based on proximity to the determined target coordinates, current availability, estimated cost, offered services, and alignment with user's past preferences.
4. Generate a list of the top 3-5 parking recommendations.
5. For each recommendation, provide the lot ID, name, a clear reason for the recommendation (be specific! Mention proximity, cost, services, history, etc.), estimated cost (if available), and an availability score (if available).
6. Order the recommendations by relevance, considering all factors. Prioritize lots closer to the target, with higher availability, matching services, and potentially lower cost, balanced with user history. If no specific destination, prioritize based on context (current location, time of day suggesting work/home, history).
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
    // In a real app, you might fetch nearby lots, user history, and bookmarks here if not passed in.
    // For this example, we assume they are passed in the input object.

    // Validate that nearbyParkingLots and userBookmarks (if provided) are valid JSON
    try {
      JSON.parse(input.nearbyParkingLots);
      if (input.userBookmarks) {
        JSON.parse(input.userBookmarks);
      }
    } catch (e) {
      console.error("Invalid JSON format for context data:", e);
      // Handle error - maybe return empty recommendations or a default message
      return { recommendations: [] };
    }


    const { output } = await recommendParkingPrompt(input);

    // Basic validation or post-processing of the output if needed
    if (!output || !Array.isArray(output.recommendations)) {
        console.error("Invalid output format from recommendation prompt.");
        return { recommendations: [] };
    }

    return output;
  }
);
