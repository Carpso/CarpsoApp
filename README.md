# Carpso - Smart Parking

This is a NextJS application demonstrating a smart parking solution using IoT sensor data and AI predictions.

## Core Features (Current)

*   **Real-time Availability:** View the current occupancy status of parking spots.
*   **Spot Reservation:** Select and reserve an available parking spot.
*   **Availability Prediction:** Predict future parking availability based on historical data and trends using AI (Genkit).

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Set up Environment Variables:**
    *   Create a `.env` file in the root directory.
    *   Add your Google Generative AI API Key:
        ```
        GOOGLE_GENAI_API_KEY=YOUR_API_KEY
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

To manage different levels of access and functionality, the following user roles are planned:

*   **`User` (Standard):**
    *   Can view real-time parking availability.
    *   Can reserve parking spots.
    *   Can use predictive features.
    *   Manages their own profile and payment methods.
*   **`ParkingLotOwner`:**
    *   All `User` permissions.
    *   Can view detailed analytics and reports for their specific parking lot(s).
    *   Can manage spot availability overrides (e.g., for maintenance).
    *   Can manage pricing or special offers for their lot(s).
*   **`Admin`:**
    *   All `ParkingLotOwner` permissions (potentially across all lots).
    *   Can manage users and roles.
    *   Can manage system settings and configurations.
    *   Can oversee financial reports and transactions.
    *   Can manage integrations and overall application health.

**Implementation Strategy:**

*   **Authentication:** Integrate with an authentication provider (e.g., Firebase Auth, Auth0, NextAuth.js) to handle user login and session management.
*   **Role Storage:** Store the user's role within their user profile or authentication token claims.
*   **Access Control:**
    *   **Frontend:** Use conditional rendering based on the user's role to show/hide specific UI elements (e.g., Admin dashboard link, owner-specific analytics).
    *   **Backend/API:** Implement middleware or checks within API routes and Server Actions to verify the user's role before allowing access to protected resources or performing restricted actions.

## Future Features & Roadmap

This section outlines potential future enhancements and strategic considerations for the Carpso application.

### Monetization Strategies

*   **Subscription Tiers:** Offer different subscription levels (e.g., Basic, Premium) with varying benefits like extended reservation times, access to premium spots, or lower transaction fees. Cater tiers potentially to `User` vs. `ParkingLotOwner` needs.
*   **Transaction Fees:** Apply a small fee for each successful reservation or parking session.
*   **Premium Features:**
    *   **Guaranteed Spots:** Allow users to pay a premium for a guaranteed reservation, potentially involving holding a spot physically or through stricter enforcement.
    *   **Advanced Predictions:** Offer more granular or longer-term prediction insights for subscribers.
*   **Advertising:** Display unobtrusive ads from local businesses relevant to drivers (e.g., nearby restaurants, shops).
*   **Data Insights:** Anonymize and aggregate parking data to sell insights to urban planners, businesses, or municipalities for infrastructure planning and traffic management. Access to detailed data could be a feature for `Admin` or premium `ParkingLotOwner` tiers.

### Security & Compliance

Security is paramount for user trust and data protection.

*   **End-to-End Encryption:** Implement encryption for all data transmission, especially sensitive user information and payment details.
*   **Secure API Endpoints:** Protect all backend APIs with robust authentication and authorization mechanisms (e.g., OAuth 2.0, JWT), enforcing role-based access.
*   **Compliance:** Ensure adherence to data privacy regulations like GDPR, CCPA, etc., including clear user consent and data management policies.
*   **Regular Audits:** Conduct periodic security audits and penetration testing to identify and address vulnerabilities.
*   **Secure Payment Processing:** Integrate with reputable, PCI-DSS compliant payment gateways.

### MVP & Development Stages

*   **Phase 1 (Core MVP):** Focus on reliable real-time spot availability display (using `src/services/parking-sensor.ts` stub initially, later integrating with actual IoT sensors) and basic spot reservation functionality. Implement user authentication (`User` role).
*   **Phase 2 (Prediction & Basic Monetization):** Integrate the AI-powered prediction feature (`src/ai/flows/predict-parking-availability.ts`). Introduce basic transaction fees or a simple subscription model.
*   **Phase 3 (Role Expansion & Advanced Features):**
    *   Implement `Admin` and `ParkingLotOwner` roles with basic dashboards/analytics views.
    *   **AR Navigation:** Develop AR-based navigation within parking lots (requires camera access and AR capabilities).
    *   **Payment Integration:** Implement secure in-app payments.
    *   **User Profiles & History:** Add features for managing reservations, viewing parking history, and managing payment methods.
*   **Phase 4 (Expansion & Refinement):** Introduce premium features (guaranteed spots), expand advertising, develop data insight reports, refine role-specific features, and potentially integrate EV charging status.
*   **Ongoing:** Continuous user testing (especially for UI/UX and AR features), performance optimization, and security enhancements.

### Integration & Platform Expansion

*   **Mapping Apps:** Explore integration possibilities with popular navigation apps like Waze or Google Maps to show Carpso availability directly within those platforms or allow seamless navigation handover.
*   **Web Platform:** Develop a web-based version of the application for users who prefer desktop access or for administrative purposes (e.g., parking lot managers, admins).

### Environmental Impact

*   **Eco-Friendly Spotlighting:** Clearly identify and prioritize parking spots equipped with EV charging stations.
*   **Carpooling Incentives:** Offer discounts or priority reservations for users who register as carpooling, promoting shared vehicle usage.
*   **Data for Sustainability:** Provide data insights that help cities optimize parking infrastructure, potentially reducing cruising for spots and associated emissions.

## Overall Vision

Carpso aims to be a comprehensive solution combining IoT sensor technology, Artificial Intelligence (for predictions), potentially Augmented Reality (for navigation), and robust backend services. The goal is to offer a seamless, secure, efficient, and user-friendly smart parking experience that alleviates the common frustrations of finding and securing parking, while providing valuable tools for parking operators and administrators.
```