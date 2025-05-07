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
    let expectedEnvVar = `NEXT_PUBLIC_FIREBASE_`;
    if (key === 'apiKey') {
      expectedEnvVar += 'API_KEY';
    } else if (key === 'appId') {
      expectedEnvVar += 'APP_ID';
    } else if (key === 'messagingSenderId') {
      expectedEnvVar += 'MESSAGING_SENDER_ID';
    } else if (key === 'projectId') {
      expectedEnvVar += 'PROJECT_ID';
    } else {
      expectedEnvVar += key.toUpperCase();
    }
    console.error(`Firebase config error: Missing environment variable ${expectedEnvVar}`);
    missingKeys = true;
  }
}

if (missingKeys) {
  console.error("One or more Firebase environment variables are missing. Please check your .env.local or environment configuration as per the README.md.");
}


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  if (!missingKeys) { // Only initialize if all keys are present
    app = initializeApp(firebaseConfig);
  } else {
    console.error("Firebase app not initialized due to missing configuration. Please ensure all NEXT_PUBLIC_FIREBASE_... environment variables are set correctly.");
    // Create a dummy app object to prevent crashes in some parts of the app,
    // but Firebase services will not function correctly.
    app = {} as FirebaseApp;
  }
} else {
  app = getApps()[0];
}

// Conditionally initialize Firebase services if the app was initialized successfully
// and no keys were missing initially.
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let storage: FirebaseStorage | undefined;

// Check if 'app' is a real FirebaseApp instance and not the dummy object
const isRealFirebaseApp = app && typeof app.options === 'object' && app.options.apiKey;

if (isRealFirebaseApp && !missingKeys) {
  try {
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
  } catch (e) {
    console.error("Error initializing Firebase services. This is likely due to invalid or missing Firebase config values.", e);
    auth = undefined;
    firestore = undefined;
    storage = undefined;
  }
} else {
  if (missingKeys) {
    console.warn("Firebase services not initialized because the Firebase app could not be initialized (missing or invalid config).");
  } else if (!isRealFirebaseApp) {
    console.warn("Firebase services not initialized because a valid Firebase app instance is not available.");
  }
}


// const analytics: Analytics | undefined = typeof window !== 'undefined' && isRealFirebaseApp && !missingKeys ? getAnalytics(app) : undefined; // Optional

export { app, auth, firestore, storage /*, analytics */ };
