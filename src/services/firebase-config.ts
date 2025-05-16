// src/services/firebase-config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from "firebase/analytics"; // Import getAnalytics

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional.
// Environment variables will take precedence over these hardcoded values.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyABnIcl5qZ3fJ3zfm8sKigBns0DvXHoR1M",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "carpso-11zv0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "carpso-11zv0",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "carpso-11zv0.firebasestorage.app", // Updated fallback
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "29146253573",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:29146253573:web:620e99d4b505628ba00f6c",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-HQFG8K8KLH", // Added fallback
};

// Check if all required Firebase config values are present
// MeasurementId is optional, so it's not in requiredConfigKeys.
const requiredConfigKeys: (keyof Omit<typeof firebaseConfig, 'measurementId'>)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

let missingKeys = false;
for (const key of requiredConfigKeys) {
  // Check if the environment variable is set OR if the hardcoded fallback is present
  if (!process.env[`NEXT_PUBLIC_FIREBASE_${key.toUpperCase().replace('ID', '_ID')}`] && !firebaseConfig[key]) {
    console.error(`Firebase config error: Missing value for '${key}'. This should be provided either via environment variables (e.g., NEXT_PUBLIC_FIREBASE_${key.toUpperCase().replace('ID', '_ID')}) or as a fallback in firebase-config.ts.`);
    missingKeys = true;
  }
}

if (missingKeys) {
  console.error("One or more critical Firebase configuration values are missing. Firebase services will not be initialized correctly. Please check your environment variables and the firebaseConfig object in firebase-config.ts.");
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
    app = {} as FirebaseApp;
    console.warn("Firebase app NOT initialized due to missing configuration values.");
  }
} else {
  app = getApps()[0];
}

// Conditionally initialize Firebase services
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let analytics: Analytics | undefined;

const isRealFirebaseApp = app && typeof app.options === 'object' && app.options.apiKey;

if (isRealFirebaseApp && !missingKeys) {
  try {
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
    if (firebaseConfig.measurementId && typeof window !== 'undefined') {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized.");
    }
  } catch (e: any) {
    console.error("Error initializing Firebase services. This might be due to invalid configuration values:", e);
    auth = undefined;
    firestore = undefined;
    storage = undefined;
    analytics = undefined;
  }
} else {
  if (missingKeys) {
    console.warn("Firebase services (Auth, Firestore, Storage, Analytics) NOT initialized because Firebase app config is missing/invalid.");
  } else if (!isRealFirebaseApp) {
    console.warn("Firebase services NOT initialized because a valid Firebase app instance is not available.");
  }
}

export { app, auth, firestore, storage, analytics };
