
# Carpso - Smart Parking

## **VERY IMPORTANT: API Key Setup for Development & Production**

This application relies on several external services that require API keys and proper configuration. Please follow these instructions carefully.

### **1. Google Maps API Key (ESSENTIAL for Map Functionality)**

If you see errors like `InvalidKeyMapError`, `ApiNotActivatedMapError`, `MissingKeyMapError`, or `RefererNotAllowedMapError`, or if maps are simply not loading, it is **EXTREMELY LIKELY** due to an issue with your `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` or its configuration in the Google Cloud Console.

**PLEASE FOLLOW THESE STEPS METICULOUSLY for both Development and Production environments:**

1.  **Obtain/Verify API Key:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   **Project Selection:** Ensure you have selected the correct Google Cloud Project.

2.  **Billing Enabled (CRUCIAL):**
    *   Verify that **Billing is enabled** for your Google Cloud Project. The Google Maps Platform **requires** a billing account, even if your usage is within the free tier. This is the **MOST COMMON CAUSE** of `InvalidKeyMapError`.
    *   Ensure the project's billing account is in good standing.

3.  **Enable APIs (CRUCIAL):**
    *   For the selected project, go to "APIs & Services" > "Library".
    *   Ensure **Maps JavaScript API** AND **Places API** are **ENABLED**. If these are not enabled, you might encounter `ApiNotActivatedMapError`.

4.  **Credentials & API Key Creation:**
    *   Go to "APIs & Services" > "Credentials". Create or use an existing API key. If the key is missing entirely in your `.env.local` or `.env` file, you'll see `MissingKeyMapError`.

5.  **API Key Restrictions (CRITICAL for Security & Functionality):**
    *   **Application restrictions:** Select "HTTP referrers (web sites)".
        *   **For Development (Local):**
            *   Add `http://localhost:PORT/*` (e.g., `http://localhost:9002/*`). Ensure `PORT` matches your development port.
        *   **For Development (IDX/Cloud IDEs - VERY IMPORTANT!):**
            *   If you are developing in an environment like Google IDX or a cloud-based IDE and see a `RefererNotAllowedMapError`, **the error message will tell you the exact URL that needs to be authorized.**
            *   **FOR EXAMPLE: If your error message says:**
                `Google Maps JavaScript API error: RefererNotAllowedMapError`
                `Your site URL to be authorized: https://6000-idx-studio-1745967548236.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev`
            *   **THEN YOU MUST ADD THIS EXACT URL PATTERN TO YOUR API KEY'S "HTTP referrers (web sites)" list in the Google Cloud Console:**
                `https://6000-idx-studio-1745967548236.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev/*`
            *   **Always include the `/*` at the end of the URL pattern.**
            *   If you see a different URL in your error message (e.g., `https://*.cloudworkstations.dev/*` or `https://*.google.com/*`), add that specific pattern instead.
        *   **For Production:** Add your production domain(s) (e.g., `https://your-carpso-app.com/*`).
        *   *Incorrect referrer restrictions are a common cause of `RefererNotAllowedMapError`.*
    *   **API restrictions:** Select "Restrict key". In the dropdown, select **BOTH** "Maps JavaScript API" AND "Places API".
        *   *If the key is not authorized for these APIs, you might see `ApiNotActivatedMapError` or `InvalidKeyMapError`.*

6.  **Set Environment Variable (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`):**
    *   **For Development:** Create a `.env.local` file (or `.env`) in your project root. Add:
        ```
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_DEV_GOOGLE_MAPS_API_KEY_HERE
        ```
        Ensure there are no typos in the key or the variable name. **An empty or incorrect key here is a primary cause of `InvalidKeyMapError` or `MissingKeyMapError`.**
    *   **For Production:** Set this in your production environment settings (e.g., Vercel, Netlify, Firebase Hosting Environment Config). **Do not commit production keys to Git.**

7.  **Wait & Restart/Redeploy:** Allow a few minutes for changes to propagate. Restart your dev server or redeploy your production app.

**TROUBLESHOOTING MAP ERRORS:**
If you see:
*   `InvalidKeyMapError`:
    1.  **Check your `.env.local` file**: Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is **not empty** and contains the correct API key string without typos.
    2.  **Verify Billing**: Go to your Google Cloud Console, select your project, and confirm that **Billing is ENABLED** and the billing account is active. This is the most common cause.
    3.  **API Authorization**: In "APIs & Services" > "Credentials", select your API key. Under "API restrictions", ensure "Maps JavaScript API" AND "Places API" are selected.
*   `ApiNotActivatedMapError`: Make sure "Maps JavaScript API" and "Places API" are explicitly ENABLED in the Google Cloud Console library for your project.
*   `MissingKeyMapError`: Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is correctly set (and not empty) in your `.env.local` or production environment.
*   `RefererNotAllowedMapError`: **CRITICAL: Verify your "HTTP referrers" in the API key restrictions within the Google Cloud Console. THE ERROR MESSAGE ITSELF USUALLY TELLS YOU THE EXACT URL that needs to be whitelisted.**
    *   **For IDX/Cloud IDEs:** The error message will look like:
        `Your site URL to be authorized: https://YOUR_SPECIFIC_IDX_URL.cloudworkstations.dev`
        You **MUST** add `https://YOUR_SPECIFIC_IDX_URL.cloudworkstations.dev/*` to your API Key's "HTTP referrers (web sites)" list.
    *   **For Local Dev:** `http://localhost:YOUR_PORT/*` is common.
    *   **For Production:** It must be your live domain (e.g., `https://your-app.com/*`).

Review all steps above, especially the API key value in `.env.local`, Billing enablement, API enablement for Maps JavaScript & Places, HTTP referrers, and API restrictions. Check the browser console for detailed errors.

---

### **2. Firebase Configuration (ESSENTIAL for Auth, Database, Chat, etc.)**

If you encounter errors related to Firebase authentication (like `auth/invalid-api-key`), database access (`FirebaseError: Missing or insufficient permissions`), or chat functionality, it's likely due to an issue with your Firebase project setup, environment variables, or **Firebase Security Rules**.

**PLEASE FOLLOW THESE STEPS METICULOUSLY:**

1.  **Create/Select Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Create a new project or select an existing one for Carpso.

2.  **Add a Web App to Your Project:**
    *   In your Firebase project, go to Project settings (gear icon near "Project Overview").
    *   Under "Your apps", click the Web icon (`</>`) to add a new web app.
    *   Register your app (give it a nickname, e.g., "Carpso Web"). **Firebase Hosting setup is optional at this stage if you plan to host elsewhere, but it's recommended if using Firebase Hosting.**
    *   After registering, Firebase will provide you with a `firebaseConfig` object. **Copy these values carefully.**

3.  **Enable Firebase Services:**
    *   **Authentication:** In the Firebase Console, go to "Authentication" (under Build). Click "Get started".
        *   Enable the sign-in methods you want to support (e.g., Email/Password, Phone, Google, Facebook, Apple).
    *   **Firestore Database:** Go to "Firestore Database" (under Build). Click "Create database".
        *   Start in **production mode**. Test mode rules are very open (`allow read, write: if true;`) and **NOT SUITABLE FOR PRODUCTION**.
        *   Choose a Cloud Firestore location.
        *   **Security Rules (CRITICAL for preventing `Missing or insufficient permissions` errors):**
            *   After creating the database, go to the "Rules" tab within Firestore.
            *   **For Production:** Define rules to protect your data. Start with restrictive rules and open them up as needed.
            *   **Example Rules (ADAPT THESE TO YOUR SPECIFIC NEEDS - DO NOT COPY-PASTE BLINDLY):**
                ```firestore-rules
                rules_version = '2';
                service cloud.firestore {
                  match /databases/{database}/documents {

                    // Users: Users can read their own profile, admins can read any.
                    // Users can only create their own profile document initially.
                    // Users can only update their own profile.
                    match /users/{userId} {
                      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
                      allow create: if request.auth != null && request.auth.uid == userId;
                      allow update: if request.auth != null && request.auth.uid == userId;
                      // allow delete: if isAdmin(); // Or other specific conditions
                    }

                    // ParkingLots: Authenticated users can read, specific roles can write.
                    match /parkingLots/{lotId} {
                      allow read: if request.auth != null;
                      allow create, update, delete: if request.auth != null && (isAdmin() || isParkingLotOwner(lotId));
                      // Consider if attendants need specific write access for overrides.
                    }

                    // Conversations: Participants can read/write. Admins can read.
                    match /conversations/{conversationId} {
                      allow read: if request.auth != null && (resource.data.participantIds.hasAny([request.auth.uid]) || isAdmin()); // Corrected: Check against resource.data
                      allow create: if request.auth != null && request.resource.data.participantIds.hasAny([request.auth.uid]); // User must be in the new conversation
                      allow update: if request.auth != null && resource.data.participantIds.hasAny([request.auth.uid]); // e.g., for lastMessage, unreadCounts
                      // allow delete: if request.auth != null && isAdmin(); // Or only by participants if appropriate
                    }

                    // Messages: Participants can read/write within their conversations.
                    match /conversations/{conversationId}/messages/{messageId} {
                      allow read: if request.auth != null && (get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds.hasAny([request.auth.uid]) || isAdmin());
                      allow create: if request.auth != null && request.resource.data.senderId == request.auth.uid && get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantIds.hasAny([request.auth.uid]);
                      // allow update, delete: if request.auth != null && (request.resource.data.senderId == request.auth.uid || isAdmin()); // Sender or admin can modify/delete
                    }

                    // Add rules for other collections (e.g., advertisements, pricingRules, parkingRecords, loyaltyPrograms)
                    // Example for advertisements: Admins can manage all, owners can manage for their lots
                    match /advertisements/{adId} {
                        allow read: if true; // Publicly readable
                        allow create, update, delete: if request.auth != null && (isAdmin() || (isParkingLotOwnerForAd(request.resource.data.targetLocationId)));
                    }
                     match /pricingRules/{ruleId} {
                        allow read: if true; // Publicly readable
                        allow create, update, delete: if request.auth != null && (isAdmin() || isParkingLotOwnerForRule(request.resource.data.lotId));
                     }
                     match /parkingRecords/{recordId} {
                        allow read: if request.auth != null && (request.auth.uid == resource.data.userId || isAdmin() || isParkingLotOwner(resource.data.lotId) || isParkingAttendantForLot(resource.data.lotId));
                        allow create: if request.auth != null; // Or more specific: only by system/attendant
                        allow update: if request.auth != null && (isAdmin() || isParkingAttendantForLot(resource.data.lotId)); // e.g. attendant marking as paid
                        // allow delete: if isAdmin();
                     }
                     match /userPreferences/{userId} {
                         allow read, write: if request.auth != null && request.auth.uid == userId;
                     }
                     match /userGamification/{userId} {
                         allow read: if request.auth != null && request.auth.uid == userId;
                         // Write might be restricted to server-side logic (e.g., Cloud Functions) for awarding points/badges
                         allow write: if request.auth != null && (isAdmin() || isServerAdmin()); // Allow admin or server to update
                     }
                     match /userBookmarks/{userId}/bookmarks/{bookmarkId} {
                        allow read, create, update, delete: if request.auth != null && request.auth.uid == userId
                                                               && isValidBookmarkData(request.resource.data);
                     }


                    // Helper functions (define these at the top of your rules or in a separate file if supported)
                    function isAdmin() {
                      // Check custom claim or a specific user document field
                      return request.auth.token.admin == true || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
                    }
                     function isServerAdmin() {
                         // This is a placeholder. In a real app, you'd use Firebase Admin SDK on your server
                         // which bypasses security rules. This function is illustrative for conceptual server-side operations.
                         // For client-side, you'd rely on isAdmin() or specific role checks.
                         // If you have callable functions that need to write, they run with admin privileges by default.
                         return false; // Client cannot claim this.
                     }

                    function isParkingLotOwner(lotId) {
                      // Check if user owns the specific lot
                      // This might involve checking a field in the user's profile or the parkingLot document itself.
                      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
                      return userDoc.data.role == 'ParkingLotOwner' &&
                             (userDoc.data.associatedLots.hasAny(['*']) || // Owner of all lots
                              (lotId != null && userDoc.data.associatedLots.hasAny([lotId]))); // Owner of specific lot
                    }
                     function isParkingLotOwnerForAd(targetLocationId) {
                        // Check if the user is an owner and if the ad is for one of their lots or a global ad they can manage
                        let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
                        return userDoc.data.role == 'ParkingLotOwner' &&
                               (userDoc.data.associatedLots.hasAny(['*']) || // Admin-like owner can manage global
                                (targetLocationId != null && userDoc.data.associatedLots.hasAny([targetLocationId])) || // Ad for their lot
                                (targetLocationId == null && userDoc.data.associatedLots.hasAny(['*'])) // Owner managing global ads (if permitted)
                               );
                    }
                     function isParkingLotOwnerForRule(ruleLotId) {
                        let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
                        return userDoc.data.role == 'ParkingLotOwner' &&
                               (userDoc.data.associatedLots.hasAny(['*']) || // Owner of all lots
                                (ruleLotId != null && userDoc.data.associatedLots.hasAny([ruleLotId])) || // Rule for their lot
                                (ruleLotId == null && userDoc.data.associatedLots.hasAny(['*'])) // Owner managing global rules
                               );
                     }
                      function isParkingAttendantForLot(lotId) {
                        let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
                        // Assumes attendant role and their associated lot ID is stored in user profile
                        return userDoc.data.role == 'ParkingAttendant' &&
                               userDoc.data.assignedLotId == lotId;
                      }
                      function isValidBookmarkData(data) {
                          return data.keys().hasOnly(['label', 'address', 'latitude', 'longitude'])
                                 && data.label is string
                                 && (data.address is string || !('address' in data))
                                 && (data.latitude is number || !('latitude' in data))
                                 && (data.longitude is number || !('longitude' in data));
                       }
                  }
                }
                ```
            *   **IMPORTANT:** The `isAdmin()`, `isParkingLotOwner()`, `isParkingAttendantForLot()` functions in the example above are conceptual. You need to implement how roles are stored (e.g., custom claims on the Firebase Auth token, or a `role` field in the user's profile document in Firestore) and reference that in your rules.
            *   **Regularly review and test your security rules.** Use the Firebase Console's Rules Playground.
    *   **Firebase Storage (Optional, if using for image uploads):** Go to "Storage" (under Build). Click "Get started". Set up security rules.
        *   Example rules (similar to Firestore, control who can upload/download):
            ```storage-rules
            rules_version = '2';
            service firebase.storage {
              match /b/{bucket}/o {
                // Allow users to upload to their own folder, or a specific path for reports
                match /user_uploads/{userId}/{allPaths=**} {
                  allow read, write: if request.auth != null && request.auth.uid == userId;
                }
                match /issue_reports/{reportId}/{fileName} {
                  allow write: if request.auth != null; // Anyone authenticated can upload for a report
                  // Allow read only by involved parties or admins
                  allow read: if request.auth != null && (get(/databases/$(database)/documents/issueReportsMeta/$(reportId)).data.involvedUserIds.hasAny([request.auth.uid]) || isAdmin());
                }
                 match /advertisement_images/{adImageId}/{fileName} {
                   allow read: if true; // Publicly readable advertisement images
                   allow write: if request.auth != null && (isAdmin() || isParkingLotOwnerForAdImage()); // Check if user is admin or owner associated with the ad's target
                 }
              }
            }
            // Helper (conceptual - adapt to your Firestore structure for ad ownership)
            // function isAdmin() { ... } // Same as Firestore
            // function isParkingLotOwnerForAdImage() {
            //   // Complex: This needs to verify that the user uploading is an owner
            //   // of the lot the ad (associated with this image) is targeting.
            //   // This might require an intermediate Firestore document linking adImageId to an adId and its targetLocationId.
            //   // For simplicity, let's assume for now that only admin can upload ad images directly to storage
            //   // or that the ad creation flow handles permissions more tightly.
            //   return isAdmin();
            // }
            ```
    *   **Firebase Functions (Optional, if using for backend logic):** You'll set this up via Firebase CLI later if needed.

4.  **Set Environment Variables (Firebase Config):**
    *   **For Development:** In your `.env.local` file (or `.env`), add the values from the `firebaseConfig` object you copied in Step 2. Ensure they are prefixed with `NEXT_PUBLIC_`:
        ```
        NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN_HERE
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID_HERE
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET_HERE
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID_HERE
        NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID_HERE
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID_HERE # Optional
        ```
    *   **For Production:** Set these same environment variables in your production hosting environment (e.g., Vercel, Netlify, Firebase Hosting environment settings). **Do not commit these keys to Git if they contain sensitive information.**

5.  **Restart/Redeploy:** After making changes to environment variables or security rules, **restart your Next.js development server** or **redeploy your production application**. Allow a few minutes for security rule changes to propagate.

**TROUBLESHOOTING FIREBASE ERRORS (`auth/invalid-api-key`, `Missing or insufficient permissions`, etc.):**

1.  **Are ALL `NEXT_PUBLIC_FIREBASE_...` variables correctly set in your `.env.local` (for dev) AND in your production environment?**
    *   Double-check for typos or missing prefixes.
    *   Ensure the values are copied exactly from your Firebase project settings.
2.  **Is the Firebase project ID in your environment variables the SAME as the one in the Firebase Console?**
3.  **Are the required Firebase services (Authentication, Firestore) ENABLED in the Firebase Console for your project?**
4.  **SECURITY RULES:** This is the most common cause of `Missing or insufficient permissions`.
    *   Did you deploy your rules?
    *   Are your rules correctly allowing the logged-in user (or public, if intended) to perform the action (read, write, create, update, delete) on the specific path in Firestore/Storage?
    *   Use the Firebase Console's Rules Playground to test your rules against specific operations.
    *   Check the browser's Network tab and Console for detailed Firebase error messages. They often provide hints about which rule failed.
5.  **Did you RESTART your Next.js development server (for dev) or REDEPLOY (for production) after changes?**
6.  **Check the Browser Console:** Open your browser's developer console (F12) for more specific Firebase error messages.
7.  **Firebase Console Project Health:** Check for any alerts or issues in your Firebase project dashboard.

---

This is a NextJS application demonstrating a smart parking solution using IoT sensor data and AI predictions.

## Core Features (Current)

*   **Real-time Availability:** View the current occupancy status of parking spots on an interactive map.
*   **Spot Reservation:** Select and reserve an available parking spot.
*   **Availability Prediction:** Predict future parking availability based on historical data and trends using AI (Genkit).
*   **User Roles:** Differentiated access and features for Users, Parking Lot Owners, and Admins.
*   **Wallet System:** In-app wallet for payments, top-ups, sending money, and paying for others.
*   **Gamification:** Points, badges, and referral system.
*   **Voice Assistant:** Control core app functions using voice commands.
*   **Admin Dashboard:** Comprehensive management tools for system administrators and parking lot owners.
*   **Offline Support:** Basic offline functionality with cached data and user notifications.
*   **External Lot Listing:** Displays parking lots from Google Maps in addition to Carpso-managed ones.
*   **Lot Recommendation:** Users can suggest new parking lots to be added to the platform.
*   **Chat System:** Real-time messaging between users, admins, and potentially lot owners/attendants (powered by Firebase).
*   **Parking Passes:** Hourly, Daily, Weekly, Monthly, and Yearly passes.
*   **External Integrations:** Calendar sync, Tawk.to live chat (optional).

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Set up Environment Variables:**
    *   Create a `.env.local` file in the root directory. Refer to the **API Key Setup** sections above for detailed instructions on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_FIREBASE_...` variables.
    *   **Google Generative AI API Key:**
        ```
        GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
        ```
        Obtain this key from [Google AI Studio](https://aistudio.google.com/app/apikey). Ensure this is also set in your production environment.
    *   **(Optional) Tawk.to Live Chat:** For alternative live chat functionality:
        ```
        NEXT_PUBLIC_TAWKTO_PROPERTY_ID=YOUR_TAWKTO_PROPERTY_ID
        NEXT_PUBLIC_TAWKTO_WIDGET_ID=YOUR_TAWKTO_WIDGET_ID
        ```
        Obtain these from your [Tawk.to Dashboard](https://dashboard.tawk.to/). Set these in production if using this feature.
    *   **(Optional) Social Media Links:** For links in the user profile (editable in Admin settings):
        ```
        NEXT_PUBLIC_FACEBOOK_LINK=YOUR_FACEBOOK_PAGE_URL
        NEXT_PUBLIC_TWITTER_LINK=YOUR_TWITTER_PROFILE_URL
        NEXT_PUBLIC_INSTAGRAM_LINK=YOUR_INSTAGRAM_PROFILE_URL
        NEXT_PUBLIC_TIKTOK_LINK=YOUR_TIKTOK_PROFILE_URL
        NEXT_PUBLIC_WEBSITE_LINK=YOUR_OFFICIAL_WEBSITE_URL
        ```
        Set these in production if these links are desired.

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    This starts the Next.js app on `http://localhost:9002` (or your configured port).
4.  **(Optional) Run Genkit Development Server:**
    If you are actively developing or testing the Genkit flows, run:
    ```bash
    npm run genkit:watch
    ```
    This starts the Genkit development UI, typically on `http://localhost:4000`.

## User Roles & Access Control

*   **`User` (Standard):**
    *   Can view real-time parking availability.
    *   Can reserve parking spots.
    *   Can use predictive features.
    *   Manages their own profile and payment methods.
    *   Can use wallet, earn points, refer users.
    *   Can purchase and use parking passes.
    *   Can chat with support/admins.
*   **`ParkingLotOwner`:**
    *   All `User` permissions.
    *   Can view detailed analytics and reports for their specific parking lot(s).
    *   Can manage spot availability overrides (e.g., for maintenance).
    *   Can manage pricing or special offers for their lot(s).
    *   Can manage services offered at their lots.
    *   Can manage advertisements targeted at their lots.
    *   Can assign `ParkingAttendant` roles for their lots.
    *   Can chat with users regarding their lot(s) and with admins.
*   **`ParkingAttendant`:**
    *   Can search user/vehicle information by license plate or phone number.
    *   Can confirm user arrivals.
    *   Can manually confirm spot occupancy (free/occupied).
    *   Can scan QR codes for validation.
    *   Can chat with lot owner and admins.
*   **`Admin`:**
    *   All `ParkingLotOwner` permissions (across all lots).
    *   Can manage users and roles (create, edit, delete users; assign roles).
    *   Can manage system settings and configurations (e.g., global fees, integrations).
    *   Can oversee financial reports and transactions for the entire platform.
    *   Can manage all parking lots, including their subscription status (active, trial, inactive).
    *   Can create global advertisements and pricing rules, including pass definitions.
    *   Can chat with any user, owner, or attendant.

**Implementation Strategy:**

*   **Authentication:** Uses Firebase Authentication.
*   **Role Storage:** The user's role is stored within their user profile (Firebase Firestore). This is checked by security rules and client-side logic.
*   **Access Control:**
    *   **Frontend:** Conditional rendering based on the user's role to show/hide specific UI elements and features.
    *   **Backend/API:** Server Actions and Firebase Security Rules verify the user's role before allowing access to protected resources or performing restricted actions.

## Future Features & Roadmap

This section outlines potential future enhancements and strategic considerations for the Carpso application.

### Monetization Strategies

*   **Subscription Tiers:** Offer different subscription levels (e.g., Basic, Premium for Users; different tiers for ParkingLotOwners based on lot size/features) with varying benefits like extended reservation times, access to premium spots, or lower transaction fees.
*   **Transaction Fees:** Apply a small fee for each successful reservation or parking session.
*   **Premium Features:**
    *   **Guaranteed Spots:** Allow users to pay a premium for a guaranteed reservation.
    *   **Advanced Predictions:** Offer more granular or longer-term prediction insights for subscribers.
*   **Advertising:** Display unobtrusive ads from local businesses relevant to drivers (e.g., nearby restaurants, shops). Admins manage global ads, Owners can manage ads for their lots.
*   **Data Insights:** Anonymize and aggregate parking data to sell insights to urban planners, businesses, or municipalities.
*   **Passes:** Offer hourly, daily, weekly, monthly, and yearly parking passes (implemented).

### Security & Compliance

Security is paramount for user trust and data protection.

*   **End-to-End Encryption:** Implement encryption for all data transmission, especially sensitive user information and payment details (HTTPS is standard).
*   **Secure API Endpoints:** Protect all backend APIs with robust authentication and authorization mechanisms (e.g., OAuth 2.0, JWT), enforcing role-based access. Firebase security rules play a key part.
*   **Compliance:** Ensure adherence to data privacy regulations like GDPR, CCPA, etc., including clear user consent and data management policies.
*   **Regular Audits:** Conduct periodic security audits and penetration testing.
*   **Secure Payment Processing:** Integrate with reputable, PCI-DSS compliant payment gateways (e.g., Stripe, PayPal, DPO Pay, local Mobile Money APIs).

### MVP & Development Stages

*   **Phase 1 (Core MVP):** Reliable real-time spot availability display and basic spot reservation functionality. Implement user authentication (`User` role). Basic Chat system. (Largely complete)
*   **Phase 2 (Prediction & Basic Monetization):** Integrate AI-powered prediction. Introduce basic transaction fees or a simple subscription model. Implement parking passes. (Largely complete - AI prediction and passes exist)
*   **Phase 3 (Role Expansion & Advanced Features):**
    *   Implement `Admin` and `ParkingLotOwner` roles with dashboards/analytics. (Partially complete - Admin dashboard exists, Owner features expanding)
    *   **AR Navigation:** Develop AR-based navigation within parking lots. (Conceptual)
    *   **Payment Integration:** Implement secure in-app payments for wallet top-up and parking pass purchases. (Partially complete - Wallet system exists, needs real gateway for top-up)
    *   **User Profiles & History:** Enhance profile management, reservation history, payment methods. (Largely complete)
*   **Phase 4 (Expansion & Refinement):** Introduce premium features, expand advertising, develop data insight reports, refine role-specific features, integrate EV charging status.
*   **Ongoing:** Continuous user testing, performance optimization, security enhancements.

### Integration & Platform Expansion

*   **Mapping Apps:** Explore integration possibilities with Waze or Google Maps (partially done with displaying external lots).
*   **Web Platform:** Current Next.js app serves as the web platform.
*   **POS Integration:** Develop capabilities for attendant-operated POS devices (partially considered in UI for TopUp).
*   **Calendar Integration:** Allow users to add reservations to personal calendars (conceptual, simple .ics download can be added).

### Environmental Impact

*   **Eco-Friendly Spotlighting:** Identify and prioritize EV charging spots.
*   **Carpooling Incentives:** Offer discounts/priority for carpooling users.
*   **Data for Sustainability:** Provide data to help cities optimize parking infrastructure.

## Overall Vision

Carpso aims to be a comprehensive solution combining IoT sensor technology (future), AI, potentially AR, and robust backend services. The goal is to offer a seamless, secure, efficient, and user-friendly smart parking experience.

**GitHub Repository:** Carpso-App
```
    