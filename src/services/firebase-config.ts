// src/services/firebase-config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional: if you use Analytics

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
    console.error(`Firebase config error: Missing environment variable NEXT_PUBLIC_FIREBASE_${key.toUpperCase().replace('ID', '_ID')}`);
    missingKeys = true;
  }
}

if (missingKeys) {
  console.error("One or more Firebase environment variables are missing. Please check your .env.local or environment configuration.");
  // Optionally, you could throw an error here or prevent app initialization
  // For now, it will proceed and likely fail at Firebase service initialization, which is what the user is seeing.
}


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  if (!missingKeys) { // Only initialize if all keys are present
    app = initializeApp(firebaseConfig);
  } else {
    // Create a dummy app object or handle the error gracefully
    // This part depends on how you want to handle missing Firebase config
    // For now, we'll let it potentially error out later if services are used without a valid app
    console.error("Firebase app not initialized due to missing configuration.");
    // A proper fallback or error state in the UI would be ideal here.
    // For the purpose of fixing the immediate error, we ensure `app` is defined
    // but Firebase services might not work.
    app = {} as FirebaseApp; // This is a temporary measure to avoid undefined `app`
  }
} else {
  app = getApps()[0];
}

// Conditionally initialize Firebase services if the app was initialized successfully
// and no keys were missing initially.
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let storage: FirebaseStorage | undefined;

if (app && Object.keys(app).length > 0 && !missingKeys) { // Check if 'app' is a real FirebaseApp instance
  try {
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
  } catch (e) {
    console.error("Error initializing Firebase services. This is likely due to invalid or missing Firebase config values.", e);
    // Set services to undefined so the app doesn't crash immediately trying to use them
    auth = undefined;
    firestore = undefined;
    storage = undefined;
  }
} else {
  console.warn("Firebase services not initialized because the Firebase app could not be initialized (missing config).");
}


// const analytics: Analytics | undefined = typeof window !== 'undefined' && app && Object.keys(app).length > 0 && !missingKeys ? getAnalytics(app) : undefined; // Optional

export { app, auth, firestore, storage /*, analytics */ };
