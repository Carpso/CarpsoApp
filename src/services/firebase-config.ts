// src/services/firebase-config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional: if you use Analytics

const firebaseConfig = {
  apiKey: "AIzaSyCC67PuNVKIFxgebRmfuO7eFljCv5ybWEI",
  authDomain: "carpso-11zv0.firebaseapp.com",
  projectId: "carpso-11zv0",
  storageBucket: "carpso-11zv0.firebasestorage.app", // Corrected from firebasestorage.app to .appspot.com if that's the standard
  messagingSenderId: "29146253573",
  appId: "1:29146253573:web:7b7e936fcca337d5a00f6c",
  // measurementId is optional and not provided in the new config
};

// Check if all required Firebase config values are present in the hardcoded config
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
  if (!firebaseConfig[key]) {
    // If hardcoding, this error message might be slightly misleading about "environment variable"
    // but the check for presence of the key in the object is still valid.
    let expectedEnvVar = `NEXT_PUBLIC_FIREBASE_`;
    if (key === 'apiKey') {
      expectedEnvVar += 'API_KEY';
    } else if (key === 'authDomain') {
      expectedEnvVar += 'AUTH_DOMAIN';
    } else if (key === 'projectId') {
      expectedEnvVar += 'PROJECT_ID';
    } else if (key === 'storageBucket') {
      expectedEnvVar += 'STORAGE_BUCKET';
    } else if (key === 'messagingSenderId') {
      expectedEnvVar += 'MESSAGING_SENDER_ID';
    } else if (key === 'appId') {
      expectedEnvVar += 'APP_ID';
    }
    console.error(`Firebase config error: Hardcoded config is missing required key: ${key}. Expected corresponding environment variable: ${expectedEnvVar}`);
    missingKeys = true;
  }
}

if (missingKeys) {
  console.error("One or more Firebase configuration values are missing in the hardcoded config. Please ensure all required fields are provided.");
}


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  if (!missingKeys) { // Only initialize if all keys are present
    app = initializeApp(firebaseConfig);
  } else {
    console.error("Firebase app not initialized due to missing configuration in the hardcoded firebaseConfig object.");
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
    console.warn("Firebase services not initialized because the Firebase app could not be initialized (missing or invalid config in hardcoded object).");
  } else if (!isRealFirebaseApp) {
    console.warn("Firebase services not initialized because a valid Firebase app instance is not available.");
  }
}


// const analytics: Analytics | undefined = typeof window !== 'undefined' && isRealFirebaseApp && !missingKeys ? getAnalytics(app) : undefined; // Optional

export { app, auth, firestore, storage /*, analytics */ };
