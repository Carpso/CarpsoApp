// src/services/firebase-config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional: if you use Analytics

// Firebase configuration using environment variables
// User has provided specific values, these will override environment variables for local testing.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCC67PuNVKIFxgebRmfuO7eFljCv5ybWEI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "carpso-11zv0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "carpso-11zv0",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "carpso-11zv0.appspot.com", // Keep .appspot.com for storage
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "29146253573",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:29146253573:web:19e0732a64f8623aa00f6c",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Keep measurementId from env or undefined
};

// Check if all required Firebase config values are present
const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

let missingKeys = false;
for (const key of requiredConfigKeys) {
  if (!firebaseConfig[key]) {
    // Simplified error message
    console.error(`Firebase config error: Missing value for '${key}'. This should be provided either via environment variables (e.g., NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}) or directly in the firebaseConfig object in firebase-config.ts.`);
    missingKeys = true;
  }
}

if (missingKeys) {
  console.error("One or more Firebase configuration values are missing. Firebase services will not be initialized correctly. Please check your Firebase console and ensure all necessary values are provided.");
}

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  if (!missingKeys) {
    try {
        app = initializeApp(firebaseConfig);
        console.log("Firebase app initialized successfully.");
    } catch(e: any) {
        console.error("Critical Firebase initialization error:", e.message);
        app = {} as FirebaseApp; // Fallback to dummy app
        missingKeys = true; // Treat as missing if init fails
    }
  } else {
    // Create a dummy app object to prevent crashes if used, but Firebase services will not function correctly.
    app = {} as FirebaseApp; // This is a fallback, ideally the app shouldn't proceed if config is missing
    console.warn("Firebase app NOT initialized due to missing configuration values.");
  }
} else {
  app = getApps()[0];
  // console.log("Firebase app already initialized."); // Less verbose
}

// Conditionally initialize Firebase services
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let storage: FirebaseStorage | undefined;
// let analytics: Analytics | undefined; // Optional

const isRealFirebaseApp = app && typeof app.options === 'object' && app.options.apiKey;

if (isRealFirebaseApp && !missingKeys) {
  try {
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
    // analytics = typeof window !== 'undefined' ? getAnalytics(app) : undefined; // Optional
    // console.log("Firebase services (Auth, Firestore, Storage) initialized."); // Less verbose
  } catch (e: any) {
    console.error("Error initializing Firebase services. This might be due to invalid configuration values:", e);
    auth = undefined;
    firestore = undefined;
    storage = undefined;
    // analytics = undefined;
  }
} else {
  if (missingKeys) {
    console.warn("Firebase services (Auth, Firestore, Storage) NOT initialized because Firebase app config is missing/invalid.");
  } else if (!isRealFirebaseApp) {
    // This case should ideally not be hit if the dummy app is structured correctly, but good for safety
    console.warn("Firebase services (Auth, Firestore, Storage) NOT initialized because a valid Firebase app instance is not available.");
  }
}

export { app, auth, firestore, storage /*, analytics */ };
