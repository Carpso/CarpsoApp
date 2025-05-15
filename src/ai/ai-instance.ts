
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const genAiApiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!genAiApiKey) {
  // This warning will appear in your build logs if the key is missing during build/initialization.
  // However, Genkit usually throws a more specific error at runtime if the key is missing when an API call is made.
  console.warn(
    'WARNING: GOOGLE_GENAI_API_KEY environment variable is not set. ' +
    'Genkit Google AI plugin might not initialize correctly or will fail at runtime. ' +
    'Ensure this variable is set in your build environment and for your deployed function/service.'
  );
}

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: genAiApiKey, // Use the checked variable
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});

