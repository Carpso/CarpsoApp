// src/hooks/useVoiceAssistant.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Check for Web Speech API support
const isSpeechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
const isSpeechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Get the correct SpeechRecognition object based on browser prefix
const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

interface VoiceAssistantOptions {
  onCommand: (transcript: string) => void; // Callback when a command is recognized
  onStateChange?: (state: VoiceAssistantState) => void; // Optional callback for state changes
}

export type VoiceAssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VoiceAssistantResult {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  state: VoiceAssistantState;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
  isSupported: boolean;
  error: string | null;
}

export function useVoiceAssistant({ onCommand, onStateChange }: VoiceAssistantOptions): VoiceAssistantResult {
  const [state, setState] = useState<VoiceAssistantState>('idle');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

   const updateState = useCallback((newState: VoiceAssistantState, errorMsg: string | null = null) => {
       setState(newState);
       setError(errorMsg);
       onStateChange?.(newState);
   }, [onStateChange]);


  // --- Speech Recognition (STT) Setup ---
  useEffect(() => {
    if (!isSpeechRecognitionSupported || !SpeechRecognition) {
      updateState('error', 'Speech recognition not supported in this browser.');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = false; // Process speech after pauses
    recognition.interimResults = false; // We only want final results
    recognition.lang = 'en-US'; // Set language

    recognition.onstart = () => {
      updateState('listening');
      // Set a timeout to stop listening after a period of silence
      clearTimeout(silenceTimeoutRef.current!);
      silenceTimeoutRef.current = setTimeout(() => {
          if (state === 'listening') { // Check if still listening
              console.log("Silence detected, stopping listening.");
              stopListening();
          }
      }, 5000); // Stop after 5 seconds of silence
    };

    recognition.onresult = (event) => {
       clearTimeout(silenceTimeoutRef.current!); // Clear silence timeout on result
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      console.log('Voice Command Recognized:', transcript);
      if (transcript) {
        updateState('processing');
        onCommand(transcript); // Send command to be processed
      } else {
          // If transcript is empty, might be noise, restart listening briefly or stop
          console.log("Empty transcript received.");
          stopListening(); // Stop if nothing useful was said
      }
    };

    recognition.onerror = (event) => {
       clearTimeout(silenceTimeoutRef.current!);
      console.error('Speech Recognition Error:', event.error);
      let errorMsg = `Speech recognition error: ${event.error}`;
       if (event.error === 'no-speech') {
           errorMsg = 'No speech detected. Please try speaking again.';
       } else if (event.error === 'audio-capture') {
           errorMsg = 'Audio capture failed. Check microphone permissions.';
       } else if (event.error === 'not-allowed') {
           errorMsg = 'Microphone access denied. Please enable permissions.';
       }
      updateState('error', errorMsg);
      // Automatically transition back to idle after showing error
       setTimeout(() => {
           if (state === 'error') updateState('idle');
       }, 3000);
    };

    recognition.onend = () => {
       clearTimeout(silenceTimeoutRef.current!);
       // Only transition to idle if not already processing, speaking, or in error
      if (state === 'listening') {
        updateState('idle');
      }
    };

    // Cleanup function
    return () => {
       clearTimeout(silenceTimeoutRef.current!);
      recognition.stop(); // Ensure recognition stops on unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCommand]); // Re-run effect if onCommand changes (should be stable with useCallback)


  // --- Speech Synthesis (TTS) Setup ---
  const speak = useCallback((text: string) => {
    if (!isSpeechSynthesisSupported || !text) {
      console.warn('Speech synthesis not supported or text is empty.');
      return;
    }

     // Cancel any ongoing speech or listening
     cancelSpeech();
     stopListening(); // Stop listening when starting to speak

     // Set a timeout in case speech synthesis gets stuck
     clearTimeout(speakingTimeoutRef.current!);
     speakingTimeoutRef.current = setTimeout(() => {
         console.warn("Speech synthesis timed out.");
         if (state === 'speaking') {
             updateState('error', 'Speech synthesis timed out.');
             setTimeout(() => updateState('idle'), 2000);
         }
     }, 15000); // 15 second timeout for speech

    utteranceRef.current = new SpeechSynthesisUtterance(text);
    const utterance = utteranceRef.current;

    utterance.lang = 'en-US';
    // Optional: Configure voice, rate, pitch
    // const voices = window.speechSynthesis.getVoices();
    // utterance.voice = voices.find(v => v.lang === 'en-US') || voices[0];
    // utterance.rate = 1.0;
    // utterance.pitch = 1.0;

    utterance.onstart = () => {
       clearTimeout(speakingTimeoutRef.current!); // Clear timeout when speech starts
      updateState('speaking');
    };

    utterance.onend = () => {
       clearTimeout(speakingTimeoutRef.current!);
       updateState('idle'); // Back to idle when finished speaking
    };

    utterance.onerror = (event) => {
       clearTimeout(speakingTimeoutRef.current!);
      console.error('Speech Synthesis Error:', event.error);
      updateState('error', `Speech synthesis error: ${event.error}`);
       setTimeout(() => {
           if (state === 'error') updateState('idle');
       }, 3000);
    };

    window.speechSynthesis.speak(utterance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]); // Dependency on state to avoid issues if called during error

  const cancelSpeech = useCallback(() => {
     clearTimeout(speakingTimeoutRef.current!);
    if (isSpeechSynthesisSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (state === 'speaking') {
          updateState('idle');
      }
    }
  }, [state, updateState]);

  // --- Control Functions ---
  const startListening = useCallback(() => {
     if (!recognitionRef.current || state === 'listening' || state === 'processing' || state === 'speaking') {
       console.log(`Cannot start listening in current state: ${state}`);
       return;
     }
     cancelSpeech(); // Ensure not speaking
     try {
       recognitionRef.current.start();
     } catch (err: any) {
       console.error("Error starting speech recognition:", err);
        // Handle potential DOMException if start() is called too soon after stopping
       if (err.name === 'InvalidStateError') {
           updateState('error', 'Please wait a moment before trying again.');
       } else {
           updateState('error', 'Failed to start listening.');
       }
       setTimeout(() => {
           if (state === 'error') updateState('idle');
       }, 2000);
     }
  }, [state, cancelSpeech, updateState]);

  const stopListening = useCallback(() => {
     clearTimeout(silenceTimeoutRef.current!);
    if (recognitionRef.current && state === 'listening') {
      recognitionRef.current.stop();
      // onend handler will set state to idle if appropriate
    }
  }, [state]);

  return {
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    isProcessing: state === 'processing',
    state,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    isSupported: isSpeechRecognitionSupported && isSpeechSynthesisSupported,
    error,
  };
}
