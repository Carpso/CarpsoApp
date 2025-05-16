// src/ai/ai-instance.ts
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const genAiApiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!genAiApiKey) {
  // This warning will appear in your build logs if the key is missing during build/initialization.
  console.warn(
    'WARNING: GOOGLE_GENAI_API_KEY environment variable is not set. ' +
    'Genkit Google AI plugin is being initialized with an empty API key. ' +
    'AI features WILL FAIL at runtime. ' +
    'Ensure this variable is set in your build environment (e.g., Firebase App Hosting settings) and for your deployed function/service.'
  );
}

export const ai = genkit({
  promptDir: './prompts', // Ensure this directory exists if you have prompts defined here.
  plugins: [
    googleAI({
      apiKey: genAiApiKey || "", // Pass an empty string if genAiApiKey is undefined/null/empty
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // This might still be an issue if the plugin can't truly initialize without a key.
});
