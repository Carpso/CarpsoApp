// src/services/calendar-integration.ts

/**
 * Represents a parking reservation event for calendar integration.
 */
export interface CalendarReservationEvent {
  summary: string; // Event title (e.g., "Parking Reservation - Spot A5")
  location: string; // Location address or name
  description: string; // Optional details (e.g., QR code info, notes)
  startTime: string; // ISO 8601 format
  endTime?: string; // ISO 8601 format (optional, might be calculated based on duration)
  // Add other relevant fields for calendar APIs (e.g., timezone, reminders)
}

/**
 * Simulates adding a parking reservation event to the user's calendar.
 * In a real application, this would interact with calendar APIs (Google Calendar, Outlook, Apple Calendar)
 * often requiring user authentication (OAuth) and specific API calls.
 * This function currently just logs the attempt.
 *
 * @param userId The ID of the user.
 * @param event The reservation event details.
 * @param calendarType The type of calendar to add to (e.g., 'google', 'outlook').
 * @returns A promise resolving to true if the simulation is successful, false otherwise.
 */
export async function addReservationToCalendar(
  userId: string,
  event: CalendarReservationEvent,
  calendarType: 'google' | 'outlook' | 'apple' | 'ics' // Added 'ics' for generic file download
): Promise<boolean> {
  console.log(`Simulating add reservation to ${calendarType} calendar for user ${userId}:`, event);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call delay

  // --- Mock Logic & Placeholder ---
  // 1. Check if user has authorized calendar access (OAuth flow needed).
  // 2. Call the respective calendar API (e.g., Google Calendar API insert event).
  // 3. Handle success/failure responses.

  // For 'ics', generate an .ics file content and trigger download.
  if (calendarType === 'ics') {
    try {
        const icsContent = generateICSFile(event);
        triggerICSDownload(icsContent, `carpso-reservation-${event.summary.replace(/ /g, '_')}.ics`);
        console.log("Triggered .ics file download.");
        return true; // Simulate success for ICS download trigger
    } catch (error) {
         console.error("Error generating/downloading ICS file:", error);
         return false;
    }
  }

  // Simulate API call success/failure for other types
  const success = Math.random() > 0.1; // 90% success rate

  if (success) {
    console.log(`Successfully simulated adding event to ${calendarType} calendar.`);
    return true;
  } else {
    console.error(`Failed to simulate adding event to ${calendarType} calendar.`);
    return false;
  }
  // --- End Mock Logic ---
}

// --- Helper function to generate .ics content ---
function generateICSFile(event: CalendarReservationEvent): string {
    // Basic ICS file structure
    // Note: Proper timezone handling and date formatting are crucial here.
    // Using UTC for simplicity in this example. Add TZID if needed.
    const formatICSDate = (isoString?: string) => {
        if (!isoString) return '';
        // Format: YYYYMMDDTHHMMSSZ (UTC)
        return new Date(isoString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startDate = formatICSDate(event.startTime);
    // Assume 1 hour duration if end time is missing
    const endDate = formatICSDate(event.endTime || new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000).toISOString());
    const now = formatICSDate(new Date().toISOString());
    const uid = `carpso-${Date.now()}@carpso.app`; // Simple unique ID

    let icsString = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Carpso//Parking Reservation//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startDate}
${endDate ? `DTEND:${endDate}` : ''}
SUMMARY:${event.summary || 'Parking Reservation'}
LOCATION:${event.location || ''}
DESCRIPTION:${event.description ? event.description.replace(/\n/g, '\\n') : ''}
END:VEVENT
END:VCALENDAR`;

    return icsString;
}

// --- Helper function to trigger .ics download ---
function triggerICSDownload(icsContent: string, filename: string): void {
     if (typeof window === 'undefined') return; // Only run client-side

     const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
     const link = document.createElement("a");

     const url = URL.createObjectURL(blob);
     link.setAttribute("href", url);
     link.setAttribute("download", filename);
     link.style.visibility = 'hidden';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url); // Clean up blob URL
}
