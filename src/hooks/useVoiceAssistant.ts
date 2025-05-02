// src/hooks/useVoiceAssistant.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Check for Web Speech API support
const isSpeechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
const isSpeechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// Get the correct SpeechRecognition object based on browser prefix
const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

const WAKE_WORD = "hey carpso";
const STOP_WORD = "carpso stop";

interface VoiceAssistantOptions {
  onCommand: (transcript: string) => void; // Callback when a command is recognized
  onStateChange?: (state: VoiceAssistantState) => void; // Optional callback for state changes
}

export type VoiceAssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error' | 'activated'; // Added 'activated' state

export interface VoiceAssistantResult {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isActivated: boolean; // New state indicator
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
  const isActivatedRef = useRef(false); // Use ref to track activation state internally
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For restarting recognition

   const updateState = useCallback((newState: VoiceAssistantState, errorMsg: string | null = null) => {
       // Update ref based on state
       if (newState === 'activated' || newState === 'listening') {
           isActivatedRef.current = newState === 'activated';
       } else if (newState === 'idle' || newState === 'error' || newState === 'speaking') {
           isActivatedRef.current = false; // Deactivate on idle, error, or speaking
       }

       setState(newState);
       setError(errorMsg);
       onStateChange?.(newState);
       console.log("Voice Assistant State Updated:", newState, "Activated:", isActivatedRef.current);
   }, [onStateChange]);

    // --- Speech Synthesis (TTS) Setup ---
    // Moved cancelSpeech definition before startListening which uses it
    const cancelSpeech = useCallback(() => {
        clearTimeout(speakingTimeoutRef.current!);
        if (isSpeechSynthesisSupported && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            if (state === 'speaking') {
                updateState('idle');
            }
        }
    }, [state, updateState]);


  const speak = useCallback((text: string) => {
    if (!isSpeechSynthesisSupported || !text) {
      console.warn('Speech synthesis not supported or text is empty.');
      // Even if TTS fails, reset state if processing
      if (state === 'processing') updateState('idle');
      return;
    }

     // Cancel any ongoing speech
     cancelSpeech();
     // Don't stop listening here for continuous mode, maybe just pause?
     // For now, let's allow potential overlap or handle interruption

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
       // Restart listening after speaking if it was active before
       // This restart logic might need refinement based on desired UX
       // startListening();
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
  }, [state, updateState, cancelSpeech]); // Added dependencies


    // --- Control Functions ---
  const startListening = useCallback(() => {
     if (!recognitionRef.current || state === 'listening' || state === 'activated') {
       console.log(`Cannot start listening, already active or not supported. State: ${state}`);
       return;
     }
      if (state === 'speaking') {
          cancelSpeech(); // Cancel speech if starting to listen
      }

     try {
        console.log("Manually starting recognition...");
        recognitionRef.current.start();
        // Update state optimistically, onstart will confirm if successful
        updateState('listening'); // Indicate intent to listen
     } catch (err: any) {
       console.error("Error starting speech recognition:", err);
       if (err.name !== 'InvalidStateError'){ // Ignore if already started
           updateState('error', 'Failed to start listening.');
           setTimeout(() => {
               if (state === 'error') updateState('idle');
           }, 2000);
       } else {
            // If it's InvalidStateError, it might already be running, update state if needed
            console.log("Recognition likely already started.");
            if (state !== 'listening' && state !== 'activated') {
                updateState('listening');
            }
       }
     }
  }, [state, cancelSpeech, updateState]);

  const stopListening = useCallback(() => {
     clearTimeout(silenceTimeoutRef.current!);
     clearTimeout(restartTimeoutRef.current!);
    if (recognitionRef.current && (state === 'listening' || state === 'activated')) {
       console.log("Manually stopping recognition...");
      recognitionRef.current.stop(); // onend should handle state change to idle
    }
     // Ensure state is set to idle immediately if not listening/activated
     if (state !== 'idle') {
        updateState('idle');
     }
  }, [state, updateState]);

    // --- Speech Recognition (STT) Setup ---
  useEffect(() => {
    if (!isSpeechRecognitionSupported || !SpeechRecognition) {
      updateState('error', 'Speech recognition not supported in this browser.');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = true; // Keep listening after speech
    recognition.interimResults = false; // We only want final results
    recognition.lang = 'en-US'; // Set language

    recognition.onstart = () => {
      // Don't immediately set to listening state, wait for actual speech/activation
      console.log("Recognition started.");
      clearTimeout(silenceTimeoutRef.current!); // Clear any pending silence timeout
    };

    recognition.onresult = (event) => {
       clearTimeout(silenceTimeoutRef.current!); // Clear silence timeout on result
       clearTimeout(restartTimeoutRef.current!); // Clear restart timeout

      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
      console.log('Transcript received:', transcript);

       // Check for Stop Word first
       if (transcript.includes(STOP_WORD)) {
           console.log("Stop word detected.");
           stopListening(); // Will transition to idle
           return; // Stop processing further
       }

       // Check for Wake Word
       if (!isActivatedRef.current) {
           if (transcript.includes(WAKE_WORD)) {
               console.log("Wake word detected.");
               updateState('activated');
               // Optional: Speak confirmation
               speak("How can I help?");
               // Clear transcript after wake word? Maybe not necessary with continuous=true
           } else {
                console.log("No wake word detected, ignoring transcript.");
                // If continuous=true, recognition should continue automatically
           }
       } else {
            // Assistant is activated, process the command
            console.log('Activated - Processing Command:', transcript);
            updateState('processing');
            onCommand(transcript); // Send command to be processed
            // Deactivate after processing a command (require wake word again)
            // updateState('idle'); // Or maybe keep activated? Let's try deactivating.
            // Reset activation after sending command
            isActivatedRef.current = false;
             // Ensure recognition continues or restarts after processing command if needed
             // The onend handler will attempt restart
       }

       // Reset silence timer after each result
       resetSilenceTimer();
    };

    recognition.onerror = (event) => {
       clearTimeout(silenceTimeoutRef.current!);
       clearTimeout(restartTimeoutRef.current!);
      console.error('Speech Recognition Error:', event.error, event.message);
      let errorMsg = `Speech recognition error: ${event.error}`;
       if (event.error === 'no-speech') {
           errorMsg = 'No speech detected for a while.'; // More accurate for continuous
           // Attempt to restart recognition after 'no-speech' error
           restartRecognition();
           return; // Don't set error state, just log and restart
       } else if (event.error === 'audio-capture') {
           errorMsg = 'Audio capture failed. Check microphone permissions or hardware.';
       } else if (event.error === 'not-allowed') {
           errorMsg = 'Microphone access denied. Please enable permissions.';
           // Don't try to restart if permission denied
           updateState('error', errorMsg);
           return;
       } else if (event.error === 'network') {
           errorMsg = 'Network error during speech recognition.';
           // Attempt to restart recognition after network error
           restartRecognition();
           return;
       } else if (event.error === 'aborted'){
            // Usually happens when stop() is called, can be ignored or handled gracefully
            console.log("Recognition aborted (likely intentional stop).");
             // Ensure state is idle if aborted while listening/activated
            if (state === 'listening' || state === 'activated') {
                updateState('idle');
            }
            return; // Don't set error state
       }
      updateState('error', errorMsg);
      // Automatically transition back to idle after showing error
       setTimeout(() => {
           if (state === 'error') updateState('idle');
       }, 3000);
    };

    recognition.onend = () => {
       clearTimeout(silenceTimeoutRef.current!);
       console.log("Recognition ended. Current state:", state);
       // Automatically restart recognition if it ends unexpectedly unless explicitly stopped or error
       if (state !== 'idle' && state !== 'error' && state !== 'speaking') {
            console.log("Recognition ended unexpectedly, attempting restart...");
            restartRecognition();
       } else if (state === 'listening' || state === 'activated') {
            // If it ends while it *should* be listening (e.g. after start call failed silently)
            updateState('idle');
       }
    };

    // Function to handle restarting recognition with a delay
    const restartRecognition = () => {
        clearTimeout(restartTimeoutRef.current!); // Clear previous restart attempts
        restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && state !== 'listening' && state !== 'speaking' && state !== 'processing') {
                try {
                     console.log("Restarting recognition...");
                     recognitionRef.current.start();
                     // No state change needed here, onstart handles it if successful
                } catch (err: any) {
                    console.error("Error restarting recognition:", err);
                     if (err.name !== 'InvalidStateError'){ // Ignore if already started
                         updateState('error', 'Failed to automatically restart listening.');
                         setTimeout(() => { if (state === 'error') updateState('idle'); }, 3000);
                     }
                }
            }
        }, 500); // Short delay before restarting
    };

     // Function to reset the silence timer
     const resetSilenceTimer = () => {
         clearTimeout(silenceTimeoutRef.current!);
         silenceTimeoutRef.current = setTimeout(() => {
             if (state === 'listening' || state === 'activated') {
                 console.log("Silence detected, stopping listening.");
                 // Don't call stopListening directly as it might cause state issues
                 // Recognition might stop on its own (triggering onend/onerror 'no-speech')
                 // Or we can force it if needed, but 'no-speech' error handling might be better
                 // recognitionRef.current?.stop();
             }
         }, 8000); // Increased silence timeout to 8 seconds for continuous mode
     };


    // Cleanup function
    return () => {
       clearTimeout(silenceTimeoutRef.current!);
       clearTimeout(restartTimeoutRef.current!);
       if (recognitionRef.current) {
           recognitionRef.current.onstart = null;
           recognitionRef.current.onresult = null;
           recognitionRef.current.onerror = null;
           recognitionRef.current.onend = null;
           recognitionRef.current.abort(); // Use abort for immediate stop
           recognitionRef.current = null;
           console.log("Recognition cleaned up.");
       }

    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCommand, updateState, speak, stopListening]); // Added speak and stopListening dependencies


  return {
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    isProcessing: state === 'processing',
    isActivated: state === 'activated', // Expose activated state
    state,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    isSupported: isSpeechRecognitionSupported && isSpeechSynthesisSupported,
    error,
  };
}

