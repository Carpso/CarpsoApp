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
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [onStateChange]); // Include onStateChange dependency, but be mindful of potential loops if it changes often

    // --- Speech Synthesis (TTS) Setup ---
    // Define cancelSpeech first
    const cancelSpeech = useCallback(() => {
        clearTimeout(speakingTimeoutRef.current!);
        if (isSpeechSynthesisSupported && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            // Check current state before setting to idle, ensure it's 'speaking'
            if (state === 'speaking') {
                updateState('idle');
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, updateState]); // Add state and updateState dependencies


  const speak = useCallback((text: string) => {
    if (!isSpeechSynthesisSupported || !text) {
      console.warn('Speech synthesis not supported or text is empty.');
      if (state === 'processing') updateState('idle');
      return;
    }

     cancelSpeech(); // Call the defined cancelSpeech

     clearTimeout(speakingTimeoutRef.current!);
     speakingTimeoutRef.current = setTimeout(() => {
         console.warn("Speech synthesis timed out.");
         if (state === 'speaking') {
             updateState('error', 'Speech synthesis timed out.');
             setTimeout(() => updateState('idle'), 2000);
         }
     }, 15000);

    utteranceRef.current = new SpeechSynthesisUtterance(text);
    const utterance = utteranceRef.current;

    utterance.lang = 'en-US';

    utterance.onstart = () => {
       clearTimeout(speakingTimeoutRef.current!);
       updateState('speaking');
    };

    utterance.onend = () => {
       clearTimeout(speakingTimeoutRef.current!);
       updateState('idle');
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
  }, [state, updateState, cancelSpeech]);


    // --- Control Functions ---
  const startListening = useCallback(() => {
     if (!recognitionRef.current || state === 'listening' || state === 'activated') {
       console.log(`Cannot start listening, already active or not supported. State: ${state}`);
       return;
     }
      if (state === 'speaking') {
          cancelSpeech(); // Call the defined cancelSpeech
      }

     try {
        console.log("Manually starting recognition...");
        recognitionRef.current.start();
        updateState('listening');
     } catch (err: any) {
       console.error("Error starting speech recognition:", err);
       if (err.name !== 'InvalidStateError'){
           updateState('error', 'Failed to start listening.');
           setTimeout(() => {
               if (state === 'error') updateState('idle');
           }, 2000);
       } else {
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
      recognitionRef.current.stop();
    }
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

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

     // Function to handle restarting recognition with a delay
     const restartRecognition = () => {
        clearTimeout(restartTimeoutRef.current!); // Clear previous restart attempts
        restartTimeoutRef.current = setTimeout(() => {
            // Check state again before restarting
            if (recognitionRef.current && state !== 'listening' && state !== 'speaking' && state !== 'processing') {
                try {
                     console.log("Restarting recognition...");
                     recognitionRef.current.start();
                } catch (err: any) {
                    console.error("Error restarting recognition:", err);
                     if (err.name !== 'InvalidStateError'){
                         updateState('error', 'Failed to automatically restart listening.');
                         setTimeout(() => { if (state === 'error') updateState('idle'); }, 3000);
                     }
                }
            }
        }, 500);
    };

     // Function to reset the silence timer
     const resetSilenceTimer = () => {
         clearTimeout(silenceTimeoutRef.current!);
         silenceTimeoutRef.current = setTimeout(() => {
             if (state === 'listening' || state === 'activated') {
                 console.log("Silence detected, stopping listening.");
                 // Recognition might stop on its own (triggering onend/onerror 'no-speech')
             }
         }, 8000);
     };


    recognition.onstart = () => {
      console.log("Recognition started.");
      clearTimeout(silenceTimeoutRef.current!);
    };

    recognition.onresult = (event) => {
       clearTimeout(silenceTimeoutRef.current!);
       clearTimeout(restartTimeoutRef.current!);

      const lastResultIndex = event.results.length - 1;
      const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
      console.log('Transcript received:', transcript);

       if (transcript.includes(STOP_WORD)) {
           console.log("Stop word detected.");
           stopListening();
           return;
       }

       if (!isActivatedRef.current) {
           if (transcript.includes(WAKE_WORD)) {
               console.log("Wake word detected.");
               updateState('activated');
               speak("How can I help?");
           } else {
                console.log("No wake word detected, ignoring transcript.");
           }
       } else {
            console.log('Activated - Processing Command:', transcript);
            updateState('processing');
            onCommand(transcript);
            isActivatedRef.current = false; // Deactivate after command processing starts
            // Restart might be handled by onend
       }
       resetSilenceTimer();
    };

    recognition.onerror = (event) => {
       clearTimeout(silenceTimeoutRef.current!);
       clearTimeout(restartTimeoutRef.current!);
      console.error('Speech Recognition Error:', event.error, event.message);
      let errorMsg = `Speech recognition error: ${event.error}`;
       if (event.error === 'no-speech') {
           errorMsg = 'No speech detected for a while.';
           restartRecognition();
           return;
       } else if (event.error === 'audio-capture') {
           errorMsg = 'Audio capture failed. Check microphone permissions or hardware.';
       } else if (event.error === 'not-allowed') {
           errorMsg = 'Microphone access denied. Please enable permissions.';
           updateState('error', errorMsg);
           return;
       } else if (event.error === 'network') {
           errorMsg = 'Network error during speech recognition.';
           restartRecognition();
           return;
       } else if (event.error === 'aborted'){
            console.log("Recognition aborted (likely intentional stop).");
            if (state === 'listening' || state === 'activated') {
                updateState('idle');
            }
            return;
       }
      updateState('error', errorMsg);
       setTimeout(() => {
           if (state === 'error') updateState('idle');
       }, 3000);
    };

    recognition.onend = () => {
       clearTimeout(silenceTimeoutRef.current!);
       console.log("Recognition ended. Current state:", state);
       if (state !== 'idle' && state !== 'error' && state !== 'speaking') {
            console.log("Recognition ended unexpectedly, attempting restart...");
            restartRecognition();
       } else if (state === 'listening' || state === 'activated') {
            updateState('idle');
       }
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
           recognitionRef.current.abort();
           recognitionRef.current = null;
           console.log("Recognition cleaned up.");
       }

    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCommand, updateState, speak, stopListening]); // Removed state dependency to avoid re-running effect unnecessarily


  return {
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    isProcessing: state === 'processing',
    isActivated: state === 'activated',
    state,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    isSupported: isSpeechRecognitionSupported && isSpeechSynthesisSupported,
    error,
  };
}
