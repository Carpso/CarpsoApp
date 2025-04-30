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

// Define input schema
const RecommendParkingInputSchema = z.object({
  userId: z.string().describe('The ID of the user requesting recommendations.'),
  currentLatitude: z.number().optional().describe('User\'s current latitude (optional).'),
  currentLongitude: z.number().optional().describe('User\'s current longitude (optional).'),
  destinationLatitude: z.number().optional().describe('User\'s destination latitude (optional).'),
  destinationLongitude: z.number().optional().describe('User\'s destination longitude (optional).'),
  preferredServices: z.array(z.string()).optional().describe('List of preferred parking lot services (e.g., EV Charging, Car Wash).'),
  maxDistanceKm: z.number().optional().describe('Maximum distance from destination in kilometers (optional).'),
  // Simulate passing relevant context data that the flow itself cannot easily fetch
  nearbyParkingLots: z.string().describe('JSON string representing an array of nearby parking lots with their current availability and pricing.'),
  userHistorySummary: z.string().describe('A brief summary of the user\'s recent parking history and preferences.'),
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
- Location: {{#if currentLatitude}}Current Lat: {{{currentLatitude}}}, Current Lon: {{{currentLongitude}}}{{else}}Current location unknown.{{/if}}
- Destination: {{#if destinationLatitude}}Lat: {{{destinationLatitude}}}, Lon: {{{destinationLongitude}}}{{else}}Destination unknown.{{/if}}
- Preferences: {{#if preferredServices}}Prefers lots with: {{{json preferredServices}}}{{else}}No specific service preferences.{{/if}}{{#if maxDistanceKm}} Max distance: {{{maxDistanceKm}}}km.{{/if}}
- Past Behavior Summary: {{{userHistorySummary}}}

Available Parking Lots Context (JSON):
{{{nearbyParkingLots}}}

Instructions:
1. Analyze the user's request, location, destination, preferences, and past behavior.
2. Evaluate the provided nearby parking lots based on proximity to destination (if available), current availability, estimated cost, offered services, and alignment with user's past preferences.
3. Generate a list of the top 3-5 parking recommendations.
4. For each recommendation, provide the lot ID, name, a clear reason for the recommendation (be specific!), estimated cost (if calculable), and an availability score (if predictable).
5. Order the recommendations by relevance, considering all factors. Prioritize lots closer to the destination, with higher availability, matching services, and potentially lower cost, balanced with user history.
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
    // In a real app, you might fetch nearby lots & user history here if not passed in.
    // For this example, we assume they are passed in the input object.

    // Validate that nearbyParkingLots is valid JSON before passing to the prompt
    try {
      JSON.parse(input.nearbyParkingLots);
    } catch (e) {
      console.error("Invalid JSON format for nearbyParkingLots:", e);
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
