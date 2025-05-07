# Carpso - Smart Parking

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
    *   Create a `.env` file in the root directory by copying `.env.example` (if provided) or creating it manually.
    *   **Google Generative AI API Key:**
        ```
        GOOGLE_GENAI_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
        ```
        Obtain this key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   **Google Maps API Key:**
        ```
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
        ```
        This is **crucial** for map functionalities.
        *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
        *   Create a new project or select an existing one.
        *   Enable the **Maps JavaScript API** and **Places API** for your project.
        *   Go to "APIs & Services" > "Credentials".
        *   Create a new API key.
        *   **Important:** Restrict the API key:
            *   **Application restrictions:** Select "HTTP referrers (web sites)" and add your development (`http://localhost:9002/*`) and production domains.
            *   **API restrictions:** Select "Restrict key" and choose "Maps JavaScript API" and "Places API".
        *   Ensure **Billing is enabled** on your Google Cloud project. The Maps API requires a billing account, even for the free tier usage.
        *   **Troubleshooting `InvalidKeyMapError` or `ApiNotActivatedMapError`:** If you see map errors, double-check:
            1.  The API key is correctly copied into your `.env` file.
            2.  The Maps JavaScript API and Places API are enabled in the Google Cloud Console.
            3.  Your application/HTTP referrers are correctly set for the key.
            4.  Billing is active on the Google Cloud project associated with the API key.
    *   **(Optional) Tawk.to Live Chat:** For live chat functionality:
        ```
        NEXT_PUBLIC_TAWKTO_PROPERTY_ID=YOUR_TAWKTO_PROPERTY_ID
        NEXT_PUBLIC_TAWKTO_WIDGET_ID=YOUR_TAWKTO_WIDGET_ID
        ```
        Obtain these from your [Tawk.to Dashboard](https://dashboard.tawk.to/).
    *   **(Optional) Social Media Links:** For links in the user profile:
        ```
        NEXT_PUBLIC_FACEBOOK_LINK=YOUR_FACEBOOK_PAGE_URL
        NEXT_PUBLIC_TWITTER_LINK=YOUR_TWITTER_PROFILE_URL
        NEXT_PUBLIC_INSTAGRAM_LINK=YOUR_INSTAGRAM_PROFILE_URL
        NEXT_PUBLIC_TIKTOK_LINK=YOUR_TIKTOK_PROFILE_URL
        NEXT_PUBLIC_WEBSITE_LINK=YOUR_OFFICIAL_WEBSITE_URL
        ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    This starts the Next.js app on `http://localhost:9002`.
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
