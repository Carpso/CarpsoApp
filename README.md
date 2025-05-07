# Carpso - Smart Parking

## **VERY IMPORTANT: Google Maps API Key Setup for Development & Production**

The Google Maps functionality is **ABSOLUTELY ESSENTIAL** for this application to work correctly. If you see errors like `InvalidKeyMapError`, `ApiNotActivatedMapError`, `MissingKeyMapError`, or `RefererNotAllowedMapError`, or if maps are simply not loading, it is **EXTREMELY LIKELY** due to an issue with your `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` or its configuration in the Google Cloud Console.

**PLEASE FOLLOW THESE STEPS METICULOUSLY for both Development and Production environments:**

1.  **Obtain/Verify API Key:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   **Project Selection:** Ensure you have selected the correct Google Cloud Project for your environment (one for development, potentially a separate one for production, or ensure your single project is configured for both).

2.  **Billing Enabled (CRUCIAL):**
    *   Verify that **Billing is enabled** for your Google Cloud Project. The Google Maps Platform **requires** a billing account, even if your usage is within the free tier. This is the **MOST COMMON CAUSE** of `InvalidKeyMapError` or maps failing to load.
    *   Ensure the project's billing account is in good standing.

3.  **Enable APIs (CRUCIAL):**
    *   For the selected project, go to "APIs & Services" > "Library".
    *   Ensure **BOTH** the **Maps JavaScript API** AND the **Places API** are **ENABLED**. If one is missing, maps or related features will fail.

4.  **Credentials & API Key Creation:**
    *   Go to "APIs & Services" > "Credentials".
    *   Create a new API key or use an existing one. It's recommended to use separate keys for development and production for better security and quota management.

5.  **API Key Restrictions (CRITICAL for Security & Functionality):**
    *   **Application restrictions:**
        *   Select "HTTP referrers (web sites)".
        *   **For Development:** Add your development domain(s) (e.g., `http://localhost:3000/*`, `http://localhost:9002/*`, or your specific dev port). Ensure the port number and wildcard `/*` are correct. If using a custom domain for development (e.g., via `/etc/hosts` or a proxy), ensure that domain is listed.
        *   **For Production:** Add your production domain(s) (e.g., `https://your-carpso-app.com/*`). **This is critical for the map to work when deployed.**
    *   **API restrictions:**
        *   Select "Restrict key".
        *   In the dropdown, select **BOTH** "Maps JavaScript API" AND "Places API". Missing one will cause errors.

6.  **Set Environment Variable (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`):**
    *   **For Development:** Create a `.env.local` file (or `.env`) in the root directory of your project. Add the following line, replacing `YOUR_DEV_GOOGLE_MAPS_API_KEY_HERE` with your actual development key:
        ```
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_DEV_GOOGLE_MAPS_API_KEY_HERE
        ```
    *   **For Production:** Set this environment variable in your production environment (e.g., Vercel, Netlify, Firebase Functions environment settings, Docker environment variables, etc.). **Do not commit your production API key to your Git repository.** Use your production-specific API key here.
        ```
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_PRODUCTION_GOOGLE_MAPS_API_KEY
        ```
    *   **Double-check:** Ensure the key is copied exactly without extra spaces or characters.
    *   **Prefix:** The `NEXT_PUBLIC_` prefix is essential for Next.js to expose the variable to the client-side.

7.  **Wait for Propagation:**
    *   Sometimes, it can take a few minutes (up to 5-10 minutes) for API key changes or enabled APIs to propagate through Google's systems.

8.  **Restart/Redeploy:**
    *   **For Development:** After making any changes to your `.env.local` file, **you MUST restart your Next.js development server** (e.g., `npm run dev`).
    *   **For Production:** After setting/updating environment variables in your hosting provider, you may need to **redeploy your application** for the changes to take effect.

**TROUBLESHOOTING MAP ERRORS (`InvalidKeyMapError`, `ApiNotActivatedMapError`, etc.):**

1.  **Is Billing ENABLED on your Google Cloud Project?** This is the **most frequent cause**.
2.  **Is the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` correctly set in your `.env.local` (for dev) AND in your production environment settings?**
    *   Does it have the `NEXT_PUBLIC_` prefix?
    *   Is the key copied exactly?
3.  **Are BOTH Maps JavaScript API AND Places API enabled in the Google Cloud Console for your project?**
4.  **Are HTTP Referrers configured correctly for `localhost:YOUR_PORT/*` (development) AND your production domain(s)?** Check for typos, ensure the port number is correct, and use `/*` at the end of the domain.
5.  **Is the API key restricted to BOTH Maps JavaScript API AND Places API under "API restrictions"?**
6.  **Did you RESTART your Next.js development server (for dev) or REDEPLOY (for production) after changes?**
7.  **Check the Browser Console:** Open your browser's developer console (usually F12) and look for more specific error messages from Google Maps.
8.  **Google Cloud Console Quotas & Errors:** Check the "APIs & Services" > "Dashboard" in the Google Cloud Console for your project. Look for any errors or quota issues.

If the map is still not working after these steps, please ensure there are no typos in the environment variable name in your code and that `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is being correctly accessed.

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

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Set up Environment Variables:**
    *   Create a `.env.local` file in the root directory for development (refer to the Google Maps API key setup above).
    *   **Google Generative AI API Key:**
        ```
        GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
        ```
        Obtain this key from [Google AI Studio](https://aistudio.google.com/app/apikey). Ensure this is also set in your production environment.
    *   **(Optional) Tawk.to Live Chat:** For live chat functionality:
        ```
        NEXT_PUBLIC_TAWKTO_PROPERTY_ID=YOUR_TAWKTO_PROPERTY_ID
        NEXT_PUBLIC_TAWKTO_WIDGET_ID=YOUR_TAWKTO_WIDGET_ID
        ```
        Obtain these from your [Tawk.to Dashboard](https://dashboard.tawk.to/). Set these in production if using the feature.
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
*   **`ParkingLotOwner`:**
    *   All `User` permissions.
    *   Can view detailed analytics and reports for their specific parking lot(s).
    *   Can manage spot availability overrides (e.g., for maintenance).
    *   Can manage pricing or special offers for their lot(s).
    *   Can manage services offered at their lots.
    *   Can manage advertisements targeted at their lots.
    *   Can assign `ParkingAttendant` roles for their lots.
*   **`ParkingAttendant`:**
    *   Can search user/vehicle information by license plate or phone number.
    *   Can confirm user arrivals.
    *   Can manually confirm spot occupancy (free/occupied).
    *   Can scan QR codes for validation.
*   **`Admin`:**
    *   All `ParkingLotOwner` permissions (across all lots).
    *   Can manage users and roles (create, edit, delete users; assign roles).
    *   Can manage system settings and configurations (e.g., global fees, integrations).
    *   Can oversee financial reports and transactions for the entire platform.
    *   Can manage all parking lots, including their subscription status (active, trial, inactive).
    *   Can create global advertisements and pricing rules.

**Implementation Strategy:**

*   **Authentication:** Currently uses a mock authentication system. For production, integrate with an authentication provider (e.g., Firebase Auth, Auth0, NextAuth.js).
*   **Role Storage:** The user's role is stored within their user profile (mocked for now).
*   **Access Control:**
    *   **Frontend:** Conditional rendering based on the user's role to show/hide specific UI elements and features.
    *   **Backend/API:** (Conceptual) Middleware or checks within API routes and Server Actions to verify the user's role before allowing access to protected resources or performing restricted actions.

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
*   **Passes:** Offer hourly, daily, weekly, monthly, and yearly parking passes.

### Security & Compliance

Security is paramount for user trust and data protection.

*   **End-to-End Encryption:** Implement encryption for all data transmission, especially sensitive user information and payment details.
*   **Secure API Endpoints:** Protect all backend APIs with robust authentication and authorization mechanisms (e.g., OAuth 2.0, JWT), enforcing role-based access.
*   **Compliance:** Ensure adherence to data privacy regulations like GDPR, CCPA, etc., including clear user consent and data management policies.
*   **Regular Audits:** Conduct periodic security audits and penetration testing.
*   **Secure Payment Processing:** Integrate with reputable, PCI-DSS compliant payment gateways (e.g., Stripe, PayPal, DPO Pay, local Mobile Money APIs).

### MVP & Development Stages

*   **Phase 1 (Core MVP):** Reliable real-time spot availability display (using `src/services/parking-sensor.ts` stub initially, later integrating with actual IoT sensors) and basic spot reservation functionality. Implement user authentication (`User` role). (Largely complete)
*   **Phase 2 (Prediction & Basic Monetization):** Integrate the AI-powered prediction feature (`src/ai/flows/predict-parking-availability.ts`). Introduce basic transaction fees or a simple subscription model. (Partially complete - AI prediction flow exists)
*   **Phase 3 (Role Expansion & Advanced Features):**
    *   Implement `Admin` and `ParkingLotOwner` roles with dashboards/analytics views. (Partially complete - Admin dashboard exists)
    *   **AR Navigation:** Develop AR-based navigation within parking lots (requires camera access and AR capabilities). (Conceptual)
    *   **Payment Integration:** Implement secure in-app payments via Mobile Money, Cards. (Partially complete - Wallet system exists, needs real gateway)
    *   **User Profiles & History:** Add features for managing reservations, viewing parking history, and managing payment methods. (Largely complete)
*   **Phase 4 (Expansion & Refinement):** Introduce premium features (guaranteed spots, passes), expand advertising, develop data insight reports, refine role-specific features, and potentially integrate EV charging status.
*   **Ongoing:** Continuous user testing (especially for UI/UX and AR features), performance optimization, and security enhancements.

### Integration & Platform Expansion

*   **Mapping Apps:** Explore integration possibilities with popular navigation apps like Waze or Google Maps to show Carpso availability directly or allow seamless navigation handover.
*   **Web Platform:** The current Next.js app serves as the web platform for users, admins, and owners.
*   **POS Integration:** Develop capabilities for attendant-operated POS devices to manage on-site payments, scan tickets, and confirm entries/exits.
*   **Calendar Integration:** Allow users to add reservations to their personal calendars (Google, Outlook, Apple via .ics files).

### Environmental Impact

*   **Eco-Friendly Spotlighting:** Clearly identify and prioritize parking spots equipped with EV charging stations.
*   **Carpooling Incentives:** Offer discounts or priority reservations for users who register as carpooling, promoting shared vehicle usage.
*   **Data for Sustainability:** Provide data insights that help cities optimize parking infrastructure, potentially reducing cruising for spots and associated emissions.

## Overall Vision

Carpso aims to be a comprehensive solution combining IoT sensor technology (future), Artificial Intelligence (for predictions and voice commands), potentially Augmented Reality (for navigation), and robust backend services. The goal is to offer a seamless, secure, efficient, and user-friendly smart parking experience that alleviates the common frustrations of finding and securing parking, while providing valuable tools for parking operators and administrators.

**GitHub Repository:** Carpso-App
