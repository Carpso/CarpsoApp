// src/services/firebase-config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional: if you use Analytics

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
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
    // Construct the expected environment variable name string for the error message
    let expectedEnvVar = `NEXT_PUBLIC_FIREBASE_`;
    if (key === 'apiKey') expectedEnvVar += 'API_KEY';
    else if (key === 'authDomain') expectedEnvVar += 'AUTH_DOMAIN';
    else if (key === 'projectId') expectedEnvVar += 'PROJECT_ID';
    else if (key === 'storageBucket') expectedEnvVar += 'STORAGE_BUCKET';
    else if (key === 'messagingSenderId') expectedEnvVar += 'MESSAGING_SENDER_ID';
    else if (key === 'appId') expectedEnvVar += 'APP_ID';
    else if (key === 'measurementId') expectedEnvVar += 'MEASUREMENT_ID'; // Though optional, good to note if checking

    console.error(`Firebase config error: Missing environment variable ${expectedEnvVar}. Value for ${key} is undefined or empty.`);
    missingKeys = true;
  }
}

if (missingKeys) {
  console.error("One or more Firebase configuration values are missing. Firebase services will not be initialized. Please set the NEXT_PUBLIC_FIREBASE_... variables in your .env.local file as described in the README.md.");
}

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  if (!missingKeys) {
    app = initializeApp(firebaseConfig);
  } else {
    // Create a dummy app object to prevent crashes if used, but Firebase services will not function correctly.
    app = {} as FirebaseApp; // This is a fallback, ideally the app shouldn't proceed if config is missing
  }
} else {
  app = getApps()[0];
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
  } catch (e) {
    console.error("Error initializing Firebase services. This is likely due to invalid or missing Firebase config values in your .env.local file.", e);
    auth = undefined;
    firestore = undefined;
    storage = undefined;
    // analytics = undefined;
  }
} else {
  if (missingKeys) {
    console.warn("Firebase services (Auth, Firestore, Storage) NOT initialized because Firebase app config is missing/invalid. Check your .env.local file and README.md.");
  } else if (!isRealFirebaseApp) {
    // This case should ideally not be hit if the dummy app is structured correctly, but good for safety
    console.warn("Firebase services (Auth, Firestore, Storage) NOT initialized because a valid Firebase app instance is not available.");
  }
}

export { app, auth, firestore, storage /*, analytics */ };
