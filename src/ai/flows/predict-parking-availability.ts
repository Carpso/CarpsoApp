// src/ai/flows/predict-parking-availability.ts
'use server';

/**
 * @fileOverview Predicts parking availability based on historical data and trends.
 *
 * - predictParkingAvailability - A function that predicts parking availability.
 * - PredictParkingAvailabilityInput - The input type for the predictParkingAvailability function.
 * - PredictParkingAvailabilityOutput - The return type for the predictParkingAvailability function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const PredictParkingAvailabilityInputSchema = z.object({
  spotId: z.string().describe('The ID of the parking spot.'),
  historicalData: z.string().describe('Historical data of parking spot occupancy.'),
  trends: z.string().describe('Trends affecting parking availability (e.g., events, time of day).'),
});
export type PredictParkingAvailabilityInput = z.infer<
  typeof PredictParkingAvailabilityInputSchema
>;

const PredictParkingAvailabilityOutputSchema = z.object({
  predictedAvailability: z
    .number()
    .describe('The predicted availability of the parking spot (0 to 1).'),
  confidenceLevel: z
    .string()
    .describe('The confidence level of the prediction (low, medium, high).'),
  factors: z.string().describe('Factors influencing the predicted availability.'),
});
export type PredictParkingAvailabilityOutput = z.infer<
  typeof PredictParkingAvailabilityOutputSchema
>;

export async function predictParkingAvailability(
  input: PredictParkingAvailabilityInput
): Promise<PredictParkingAvailabilityOutput> {
  return predictParkingAvailabilityFlow(input);
}

const predictParkingAvailabilityPrompt = ai.definePrompt({
  name: 'predictParkingAvailabilityPrompt',
  input: {
    schema: z.object({
      spotId: z.string().describe('The ID of the parking spot.'),
      historicalData: z
        .string()
        .describe('Historical data of parking spot occupancy.'),
      trends: z
        .string()
        .describe('Trends affecting parking availability (e.g., events, time of day).'),
    }),
  },
  output: {
    schema: z.object({
      predictedAvailability:
        z.number().describe('The predicted availability of the parking spot (0 to 1).'),
      confidenceLevel:
        z.string().describe('The confidence level of the prediction (low, medium, high).'),
      factors: z.string().describe('Factors influencing the predicted availability.'),
    }),
  },
  prompt: `You are an AI expert in predicting parking availability.

  Based on the provided historical data and trends, predict the availability of the parking spot.

  Spot ID: {{{spotId}}}
  Historical Data: {{{historicalData}}}
  Trends: {{{trends}}}

  Consider factors like time of day, day of the week, and any upcoming events that might affect parking.

  Provide the predicted availability as a number between 0 and 1, a confidence level (low, medium, high), and a list of factors influencing the prediction.
  `,
});

const predictParkingAvailabilityFlow = ai.defineFlow<
  typeof PredictParkingAvailabilityInputSchema,
  typeof PredictParkingAvailabilityOutputSchema
>(
  {
    name: 'predictParkingAvailabilityFlow',
    inputSchema: PredictParkingAvailabilityInputSchema,
    outputSchema: PredictParkingAvailabilityOutputSchema,
  },
  async input => {
    const {output} = await predictParkingAvailabilityPrompt(input);
    return output!;
  }
);
