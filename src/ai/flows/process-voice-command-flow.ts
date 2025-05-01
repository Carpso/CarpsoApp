// src/ai/flows/process-voice-command-flow.ts
'use server';
/**
 * @fileOverview Processes transcribed voice commands to understand user intent and extract relevant entities for the Carpso parking app.
 *
 * - processVoiceCommand - A function that interprets the user's spoken request.
 * - ProcessVoiceCommandInput - The input type for the processVoiceCommand function.
 * - ProcessVoiceCommandOutput - The return type for the processVoiceCommand function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { UserBookmark } from '@/services/user-service'; // Import bookmark type

// Define input schema
const ProcessVoiceCommandInputSchema = z.object({
  transcript: z.string().describe('The text transcribed from the user\'s voice command.'),
  userBookmarks: z.string().optional().describe('JSON string representing an array of the user\'s saved location bookmarks (e.g., Home, Work). Used to resolve location names.'),
});
export type ProcessVoiceCommandInput = z.infer<typeof ProcessVoiceCommandInputSchema>;

// Define output schema
const ProcessVoiceCommandOutputSchema = z.object({
  intent: z.enum([
    'find_parking',
    'reserve_spot',
    'check_availability',
    'cancel_reservation', // Added intent
    'get_directions',   // Added intent
    'report_issue',     // Added intent
    'add_bookmark',     // Intent to add a saved location
    'unknown',
  ]).describe('The primary goal identified from the user\'s command.'),
  entities: z.object({
    destination: z.string().optional().describe('The target location or address mentioned for finding parking or directions (could be a bookmark label like "Home" or "Work").'),
    spotId: z.string().optional().describe('The specific parking spot ID mentioned (e.g., A5, LotB-S10).'),
    locationId: z.string().optional().describe('The parking lot ID mentioned (e.g., lot_A, Downtown Garage).'),
    issueType: z.string().optional().describe('The type of issue being reported (e.g., occupied, blocked).'), // Added entity
    bookmarkLabel: z.string().optional().describe('The label for a new bookmark to be added (e.g., "Home", "Gym").'), // Added entity
    bookmarkLocation: z.string().optional().describe('The location details for a new bookmark (e.g., "current location", "123 Main St").'), // Added entity
  }).describe('Specific pieces of information extracted from the command.'),
  responseText: z.string().describe('A natural language response to be spoken back to the user, confirming understanding or asking for clarification.'),
});
export type ProcessVoiceCommandOutput = z.infer<typeof ProcessVoiceCommandOutputSchema>;

// Define the exported wrapper function
export async function processVoiceCommand(input: ProcessVoiceCommandInput): Promise<ProcessVoiceCommandOutput> {
  // Basic keyword check for simple commands before hitting LLM (optional optimization)
  const transcriptLower = input.transcript.toLowerCase();
  if (transcriptLower.includes('cancel') && transcriptLower.includes('reservation')) {
      return {
          intent: 'cancel_reservation',
          entities: {},
          responseText: "Okay, which reservation would you like to cancel? You can check your active reservations in your profile.", // Needs more info
      }
  }
  // Add more simple keyword checks if desired

  // Validate bookmark JSON if provided
  if (input.userBookmarks) {
      try {
          JSON.parse(input.userBookmarks);
      } catch (e) {
           console.error("Invalid JSON format for userBookmarks:", e);
           // Decide how to handle: proceed without bookmarks or return error?
           input.userBookmarks = undefined; // Proceed without bookmarks
           // Or: return { intent: 'unknown', entities: {}, responseText: "Sorry, I had trouble loading your saved locations." };
      }
  }

  // If not a simple command, proceed with the LLM flow
  return processVoiceCommandFlow(input);
}

// Define the prompt
const processVoiceCommandPrompt = ai.definePrompt({
  name: 'processVoiceCommandPrompt',
  input: {
    schema: ProcessVoiceCommandInputSchema,
  },
  output: {
    schema: ProcessVoiceCommandOutputSchema,
  },
  prompt: `You are a voice assistant for the Carpso smart parking app. Analyze the following user command transcript and determine the user's intent and any relevant entities. Consider the user's saved bookmarks if provided.

User Command: "{{{transcript}}}"

{{#if userBookmarks}}
User Bookmarks (JSON): {{{userBookmarks}}}
{{/if}}

Possible Intents:
- find_parking: User wants to find available parking spots, possibly near a destination.
- reserve_spot: User wants to reserve a specific parking spot.
- check_availability: User wants to know if a specific spot or area is free.
- cancel_reservation: User wants to cancel an existing reservation.
- get_directions: User wants directions to a parking lot, their pinned car, or a saved location (like 'Home' or 'Work').
- report_issue: User wants to report a problem with a spot (e.g., occupied, blocked).
- add_bookmark: User wants to save a location (e.g., 'Save this as Home', 'Add Work at 123 Main St').
- unknown: The intent is unclear or not related to parking.

Relevant Entities:
- destination: A place name, address, or bookmark label (e.g., "123 Main St", "the mall", "airport", "Home", "Work"). If a bookmark label is used, prioritize it.
- spotId: A specific spot identifier (e.g., "A5", "spot 12", "lot_B-S22").
- locationId: A specific parking lot name or ID (e.g., "Downtown Garage", "lot_A").
- issueType: The nature of the problem being reported (e.g., "occupied", "blocked", "damaged").
- bookmarkLabel: The name for a new bookmark (e.g., "Home", "Gym", "Mom's House").
- bookmarkLocation: The location to save for the bookmark (e.g., "here", "my current location", "123 Main Street").

Instructions:
1. Determine the most likely 'intent' based on the command.
2. Extract any 'entities' mentioned.
    - If the destination mentioned matches a label in the User Bookmarks, set the destination entity to that label.
    - Normalize spot/location IDs if possible (e.g., "spot a five" -> "A5").
3. Generate a concise 'responseText' to confirm understanding or ask for clarification if needed. If the intent is unknown, say so politely. If asking to reserve, confirm the spot ID. If finding parking, confirm the destination (using the bookmark label if applicable). If adding a bookmark, confirm the label and location.

Example 1:
Command: "Find parking near the train station"
Output: { intent: 'find_parking', entities: { destination: 'train station' }, responseText: 'Okay, looking for parking near the train station.' }

Example 2:
Command: "Reserve spot C twelve"
Output: { intent: 'reserve_spot', entities: { spotId: 'C12' }, responseText: 'Got it. You want to reserve spot C12. Please confirm on the screen.' }

Example 3:
Command: "Is lot A dash S 5 available?"
Output: { intent: 'check_availability', entities: { spotId: 'lot_A-S5' }, responseText: 'Let me check the availability of spot lot_A-S5 for you.' }

Example 4:
Command: "What's the weather like?"
Output: { intent: 'unknown', entities: {}, responseText: "Sorry, I can only help with parking tasks." }

Example 5:
Command: "Get directions to Downtown Garage"
Output: { intent: 'get_directions', entities: { destination: 'Downtown Garage' }, responseText: 'Okay, getting directions to Downtown Garage.' } // Destination can be a specific lot name too

Example 6:
Command: "Report spot A5 is occupied"
Output: { intent: 'report_issue', entities: { spotId: 'A5', issueType: 'occupied' }, responseText: 'Okay, I can help report an issue with spot A5. Can you confirm the license plate of the occupying vehicle?' }

Example 7 (with Bookmarks):
User Bookmarks: [{ "id": "bm_1", "label": "Home", "address": "10 Residential St" }]
Command: "Get directions home"
Output: { intent: 'get_directions', entities: { destination: 'Home' }, responseText: 'Okay, getting directions to Home.' }

Example 8 (with Bookmarks):
User Bookmarks: [{ "id": "bm_2", "label": "Work", "address": "1 Business Ave" }]
Command: "Find parking near work"
Output: { intent: 'find_parking', entities: { destination: 'Work' }, responseText: 'Okay, looking for parking near Work.' }

Example 9 (Add Bookmark):
Command: "Save my current location as Gym"
Output: { intent: 'add_bookmark', entities: { bookmarkLabel: 'Gym', bookmarkLocation: 'current location' }, responseText: 'Okay, I can save your current location as Gym. Please confirm.' }

Example 10 (Add Bookmark with address):
Command: "Add University at 1 College Way"
Output: { intent: 'add_bookmark', entities: { bookmarkLabel: 'University', bookmarkLocation: '1 College Way' }, responseText: 'Got it. Add "University" at 1 College Way?' }


Now, process the User Command provided above.
`,
});

// Define the flow
const processVoiceCommandFlow = ai.defineFlow<
  typeof ProcessVoiceCommandInputSchema,
  typeof ProcessVoiceCommandOutputSchema
>(
  {
    name: 'processVoiceCommandFlow',
    inputSchema: ProcessVoiceCommandInputSchema,
    outputSchema: ProcessVoiceCommandOutputSchema,
  },
  async (input) => {
    let output;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const result = await processVoiceCommandPrompt(input);
        output = result.output;
        break; // Success, exit the loop
      } catch (error: any) {
        console.error('Error processing voice command:', error);
        if (error.message.includes('The model is overloaded')) {
          retryCount++;
          console.log(`Retry attempt ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        } else {
          // Non-recoverable error, re-throw
          throw error;
        }
      }
    }

    if (!output) {
      console.error('Failed to process voice command after multiple retries.');
      return {
        intent: 'unknown',
        entities: {},
        responseText: "Sorry, I couldn't process that request. Please try again later.",
      };
    }

    // Basic validation or post-processing of the output if needed
    if (!output?.intent || !output.responseText) {
      console.error("Invalid output format from voice command prompt.");
      // Return a fallback response
      return {
        intent: 'unknown',
        entities: {},
        responseText: "Sorry, I didn't quite understand that. Can you please repeat or try phrasing it differently?",
      };
    }

    // Simple normalization example (can be expanded)
    if (output.entities.spotId) {
      output.entities.spotId = output.entities.spotId.replace(/\s+/g, '').toUpperCase();
    }
    if (output.entities.locationId) {
      // Map common names to IDs if necessary
      if (output.entities.locationId.toLowerCase().includes('downtown')) output.entities.locationId = 'lot_A';
      if (output.entities.locationId.toLowerCase().includes('airport')) output.entities.locationId = 'lot_B';
      if (output.entities.locationId.toLowerCase().includes('mall')) output.entities.locationId = 'lot_C';
    }

    // If destination matches a bookmark label, ensure the entity reflects that
    if (input.userBookmarks && output.entities.destination) {
        try {
            const bookmarks: UserBookmark[] = JSON.parse(input.userBookmarks);
            const matchedBookmark = bookmarks.find(bm => bm.label.toLowerCase() === output.entities.destination?.toLowerCase());
            if (matchedBookmark) {
                output.entities.destination = matchedBookmark.label; // Use the canonical label from the bookmark
            }
        } catch (e) {
             console.error("Error parsing bookmarks during post-processing:", e);
        }
    }


    return output;
  }
);
