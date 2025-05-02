// src/services/pricing-service.ts

import type { ParkingLot } from './parking-lot';

/**
 * Represents pricing rules for a parking lot. Can also represent fixed-duration passes.
 */
export interface PricingRule {
  ruleId: string;
  lotId?: string; // If null/undefined, it's a global rule or pass applicable everywhere allowed
  description: string;
  // Rate options (can be combined, but usually one type per specific rule/pass)
  baseRatePerHour?: number; // Standard hourly rate
  flatRate?: number; // Fixed price for the duration (pass price or event rate)
  flatRateDurationMinutes?: number; // Duration for the flat rate (e.g., 60=hourly pass, 1440=daily, 10080=weekly, etc.)
  discountPercentage?: number; // e.g., 10 for 10% off (applied to baseRate usually)
  // Conditions
  timeCondition?: { // Time-based conditions
    daysOfWeek?: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
    startTime?: string; // HH:MM
    endTime?: string; // HH:MM
  };
  eventCondition?: string; // e.g., 'Concert Night', 'Football Game'
  userTierCondition?: ('Basic' | 'Premium')[]; // Apply only to specific user tiers
  // Pass-specific attributes (optional)
  isPass?: boolean; // Flag to explicitly identify this rule as a purchasable pass
  passType?: 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'; // More descriptive pass type
  // System attributes
  priority: number; // Lower number means higher priority
}

// --- Mock Data Store ---
// In a real app, rules would come from a database and be more complex.
let pricingRules: PricingRule[] = [
    // Global rules (lower priority)
    { ruleId: 'global_base', description: 'Standard Hourly Rate', baseRatePerHour: 2.50, priority: 100 },
    { ruleId: 'global_weekend_discount', description: 'Weekend Discount (10%)', discountPercentage: 10, timeCondition: { daysOfWeek: ['Sat', 'Sun'] }, priority: 90 },
    { ruleId: 'global_premium_discount', description: 'Premium User Discount (5%)', discountPercentage: 5, userTierCondition: ['Premium'], priority: 80 },

    // Lot-specific rules (higher priority)
    { ruleId: 'lot_A_weekday_peak', lotId: 'lot_A', description: 'Downtown Weekday Peak (8am-6pm)', baseRatePerHour: 3.00, timeCondition: { daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '08:00', endTime: '18:00' }, priority: 10 },
    { ruleId: 'lot_B_airport_flat', lotId: 'lot_B', description: 'Airport Daily Flat Rate', flatRate: 15.00, flatRateDurationMinutes: 24 * 60, priority: 5 },
    { ruleId: 'lot_C_event', lotId: 'lot_C', description: 'Mall Event Parking', flatRate: 10.00, eventCondition: 'Concert Night', priority: 1 }, // Highest priority

    // Purchasable Passes (could be global or lot-specific)
    { ruleId: 'pass_daily_global', description: 'Global Daily Pass', flatRate: 12.00, flatRateDurationMinutes: 1440, isPass: true, passType: 'Daily', priority: 50 },
    { ruleId: 'pass_weekly_global', description: 'Global Weekly Pass', flatRate: 50.00, flatRateDurationMinutes: 7 * 1440, isPass: true, passType: 'Weekly', priority: 50 },
    { ruleId: 'pass_monthly_lot_A', lotId: 'lot_A', description: 'Downtown Monthly Pass', flatRate: 150.00, flatRateDurationMinutes: 30 * 1440, isPass: true, passType: 'Monthly', priority: 40 }, // More specific pass
    { ruleId: 'pass_yearly_premium', description: 'Premium Yearly Pass (All Locations)', flatRate: 500.00, flatRateDurationMinutes: 365 * 1440, isPass: true, passType: 'Yearly', userTierCondition: ['Premium'], priority: 30 },
];

// Mock store for user's purchased passes (Replace with database)
interface UserPass {
    userId: string;
    passRuleId: string; // Links to the PricingRule defining the pass
    purchaseDate: string;
    expiryDate: string;
    lotId?: string; // If the pass is lot-specific
}
let userPasses: UserPass[] = [
    { userId: 'user_abc123', passRuleId: 'pass_monthly_lot_A', purchaseDate: '2024-07-15T10:00:00Z', expiryDate: '2024-08-15T10:00:00Z', lotId: 'lot_A' },
];


// --- Mock Service Functions ---

/**
 * Calculates the estimated parking cost for a given lot and duration, considering dynamic rules and passes.
 * This is a simplified simulation. A real implementation would be much more complex.
 *
 * @param lot The parking lot.
 * @param durationMinutes The estimated parking duration in minutes.
 * @param userId Optional user ID to check for user-specific discounts or active passes.
 * @param userTier Optional user subscription tier.
 * @param currentDateTime Optional current date/time to evaluate time-based rules.
 * @returns A promise resolving to the estimated cost and the applied rule description.
 */
export async function calculateEstimatedCost(
    lot: ParkingLot,
    durationMinutes: number,
    userId?: string,
    userTier: 'Basic' | 'Premium' = 'Basic', // Default to Basic
    currentDateTime: Date = new Date()
): Promise<{ cost: number; appliedRule: string; isCoveredByPass?: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate minimal delay

    // 1. Check for active user passes applicable to this lot and time
    let activePass: UserPass | undefined = undefined;
    if (userId) {
        activePass = userPasses.find(pass =>
            pass.userId === userId &&
            new Date(pass.expiryDate) > currentDateTime && // Pass hasn't expired
            (!pass.lotId || pass.lotId === lot.id) // Pass is global or matches the lot
        );
    }

    if (activePass) {
        // Find the pass definition
        const passRule = pricingRules.find(rule => rule.ruleId === activePass.passRuleId);
        if (passRule) {
             // Check if the parking duration is covered by the pass duration (simplified check)
             // A more complex check might be needed if passes have usage limits etc.
             // For now, assume pass covers any duration if active.
             // TODO: Refine pass duration vs parking duration logic if needed.
            console.log(`Parking covered by active pass: ${passRule.description}`);
             return { cost: 0, appliedRule: `Covered by active pass: ${passRule.description}`, isCoveredByPass: true };
        }
    }


    // 2. If no active pass covers parking, find the best applicable pricing rule
    const applicableRules = pricingRules
        .filter(rule => !rule.isPass) // Exclude purchasable pass definitions from rate calculation
        .filter(rule => {
            // Match lot-specific or global rules
            if (rule.lotId && rule.lotId !== lot.id) return false;

            // Check time conditions
            if (rule.timeCondition) {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const currentDay = dayNames[currentDateTime.getDay()];
                if (rule.timeCondition.daysOfWeek && !rule.timeCondition.daysOfWeek.includes(currentDay)) {
                    return false;
                }
                // Simplified time range check (doesn't handle overnight)
                if (rule.timeCondition.startTime || rule.timeCondition.endTime) {
                    const currentTime = `${currentDateTime.getHours().toString().padStart(2, '0')}:${currentDateTime.getMinutes().toString().padStart(2, '0')}`;
                    if (rule.timeCondition.startTime && currentTime < rule.timeCondition.startTime) return false;
                    if (rule.timeCondition.endTime && currentTime >= rule.timeCondition.endTime) return false;
                }
            }

            // Check event conditions (simplified - assumes event is 'active' if rule exists)
            if (rule.eventCondition /* && !isEventActive(rule.eventCondition, currentDateTime) */) {
                 // In real app, check if event is actually happening now
                 // For simulation, assume event match means rule applies if no time condition contradicts
                 if (rule.eventCondition === 'Concert Night' && lot.id === 'lot_C') {
                      // Example: Concert rule only applies on Fri/Sat evenings
                     const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                     const currentDay = dayNames[currentDateTime.getDay()];
                     const currentHour = currentDateTime.getHours();
                     if (!( (currentDay === 'Fri' || currentDay === 'Sat') && currentHour >= 18)) {
                          return false; // Event rule not active now
                     }
                 } else {
                    // Other event rules apply if condition matches (simplified)
                 }
            }

            // Check user tier conditions
            if (rule.userTierCondition && !rule.userTierCondition.includes(userTier)) {
                return false;
            }

            return true; // Rule is potentially applicable
        })
        .sort((a, b) => a.priority - b.priority); // Sort by priority (lowest number first)

    const bestRule = applicableRules[0]; // Highest priority rule

    if (!bestRule) {
        // Should not happen if a global base rule exists, but as fallback:
        return { cost: 0, appliedRule: 'No applicable pricing rule found.', isCoveredByPass: false };
    }

    let calculatedCost = 0;
    let finalAppliedRuleDesc = bestRule.description;

    if (bestRule.flatRate !== undefined && bestRule.flatRateDurationMinutes !== undefined) {
        // Apply flat rate (e.g., for events)
        // This calculation might need refinement - is it per entry, or prorated? Assuming per entry for event flat rate.
        calculatedCost = bestRule.flatRate; // Assume event flat rate applies regardless of duration within event time
    } else if (bestRule.baseRatePerHour !== undefined) {
        // Apply hourly rate
        calculatedCost = (bestRule.baseRatePerHour / 60) * durationMinutes;
    } else {
        // If the best rule is only a discount, find the next applicable rate rule
        const baseRateRule = applicableRules.slice(1).find(r => r.baseRatePerHour !== undefined || r.flatRate !== undefined);
        if (baseRateRule?.baseRatePerHour !== undefined) {
             calculatedCost = (baseRateRule.baseRatePerHour / 60) * durationMinutes;
             finalAppliedRuleDesc = `${baseRateRule.description} with ${bestRule.description}`; // Combine descriptions
        } else if (baseRateRule?.flatRate !== undefined && baseRateRule.flatRateDurationMinutes !== undefined) {
             // This scenario (discount applying to a flat rate) might be complex. Let's assume discount doesn't apply to flat rates for now.
             calculatedCost = baseRateRule.flatRate; // Apply the underlying flat rate
             finalAppliedRuleDesc = `${baseRateRule.description}`; // Don't mention the discount rule if it doesn't apply
        } else {
             // Fallback if somehow no rate rule is found (should have global default)
             calculatedCost = (2.50 / 60) * durationMinutes; // Use absolute default
             finalAppliedRuleDesc = `Default Rate (applied ${bestRule.description})`;
        }
    }

    // Apply discount if present in the best rule (only apply to hourly rates for simplicity now)
    if (bestRule.discountPercentage !== undefined && bestRule.baseRatePerHour !== undefined) {
        calculatedCost *= (1 - bestRule.discountPercentage / 100);
        // Ensure description reflects the discount if it wasn't already part of the combined description
        if (!finalAppliedRuleDesc.includes(bestRule.description)) {
             finalAppliedRuleDesc += ` (${bestRule.description})`;
        }
    }

    // Round to 2 decimal places
    calculatedCost = parseFloat(calculatedCost.toFixed(2));

    return { cost: Math.max(0, calculatedCost), appliedRule: finalAppliedRuleDesc, isCoveredByPass: false }; // Ensure cost is not negative
}


/**
 * Retrieves all pricing rules (primarily for admin use). Includes pass definitions.
 * @returns A promise resolving to an array of all pricing rules.
 */
export async function getAllPricingRules(): Promise<PricingRule[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...pricingRules];
}

/**
 * Adds or updates a pricing rule or pass definition (primarily for admin use).
 * @param rule The pricing rule or pass definition to add or update.
 * @returns A promise resolving to the added/updated rule.
 */
export async function savePricingRule(rule: PricingRule): Promise<PricingRule> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const existingIndex = pricingRules.findIndex(r => r.ruleId === rule.ruleId);
    const ruleToSave = { ...rule }; // Copy to avoid modifying original state if async fails

    // Basic validation for passes
    if (ruleToSave.isPass) {
        if (ruleToSave.flatRate === undefined || ruleToSave.flatRateDurationMinutes === undefined) {
            throw new Error("Pass definitions must have a flatRate and flatRateDurationMinutes.");
        }
        // Ensure passType is set if isPass is true
        if (!ruleToSave.passType) {
            // Infer passType from duration if missing
            const durationDays = ruleToSave.flatRateDurationMinutes / 1440;
            if (ruleToSave.flatRateDurationMinutes === 60) ruleToSave.passType = 'Hourly';
            else if (durationDays === 1) ruleToSave.passType = 'Daily';
            else if (durationDays === 7) ruleToSave.passType = 'Weekly';
            else if (durationDays >= 28 && durationDays <= 31) ruleToSave.passType = 'Monthly'; // Approximate month
            else if (durationDays >= 365) ruleToSave.passType = 'Yearly';
        }
    }


    if (existingIndex !== -1) {
        pricingRules[existingIndex] = ruleToSave;
        console.log("Updated pricing rule/pass:", ruleToSave);
    } else {
        // Assign a new ID if it's a new rule without one (should normally be generated in modal)
        if (!ruleToSave.ruleId) ruleToSave.ruleId = `rule_${Date.now()}`;
        pricingRules.push(ruleToSave);
        console.log("Added pricing rule/pass:", ruleToSave);
    }
    // Re-sort rules by priority after adding/updating
    pricingRules.sort((a, b) => a.priority - b.priority);
    return ruleToSave;
}

/**
 * Deletes a pricing rule or pass definition (primarily for admin use).
 * @param ruleId The ID of the rule to delete.
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function deletePricingRule(ruleId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const initialLength = pricingRules.length;
    pricingRules = pricingRules.filter(r => r.ruleId !== ruleId);
    const success = pricingRules.length < initialLength;
    if (success) {
        console.log("Deleted pricing rule/pass:", ruleId);
        // TODO: Consider implications if users have active passes based on a deleted rule.
        // Maybe archive instead of delete, or notify users.
    }
    return success;
}

/**
 * Simulates purchasing a pass for a user.
 * @param userId The user purchasing the pass.
 * @param passRuleId The ID of the PricingRule that defines the pass.
 * @returns A promise resolving to the created UserPass object.
 */
export async function purchasePass(userId: string, passRuleId: string): Promise<UserPass> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate purchase delay

    const passRule = pricingRules.find(rule => rule.ruleId === passRuleId && rule.isPass);
    if (!passRule || passRule.flatRate === undefined || passRule.flatRateDurationMinutes === undefined) {
        throw new Error("Invalid pass definition selected.");
    }

    // TODO: Integrate with payment/wallet service to charge passRule.flatRate

    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate.getTime() + passRule.flatRateDurationMinutes * 60 * 1000);

    const newUserPass: UserPass = {
        userId,
        passRuleId,
        purchaseDate: purchaseDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        lotId: passRule.lotId,
    };

    userPasses.push(newUserPass);
    console.log(`User ${userId} purchased pass ${passRule.description}. Expires: ${expiryDate.toISOString()}`);
    return newUserPass;
}

/**
 * Fetches the active passes for a user.
 * @param userId The ID of the user.
 * @returns A promise resolving to an array of active UserPass objects with their definitions.
 */
export async function getActiveUserPasses(userId: string): Promise<(UserPass & { definition?: PricingRule })[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const now = new Date();
    return userPasses
        .filter(pass => pass.userId === userId && new Date(pass.expiryDate) > now)
        .map(pass => ({
            ...pass,
            definition: pricingRules.find(rule => rule.ruleId === pass.passRuleId),
        }))
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()); // Sort by expiry soonest
}

/**
 * Fetches all purchasable pass definitions.
 * @returns A promise resolving to an array of PricingRule objects that are passes.
 */
export async function getAvailablePassDefinitions(): Promise<PricingRule[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return pricingRules.filter(rule => rule.isPass);
}


// --- Transaction/Record Simulation ---

// Simplified structure for parking records (can be expanded)
interface ParkingRecord {
    recordId: string;
    userId: string;
    userName?: string; // Denormalized for easier reporting
    lotId: string;
    lotName?: string; // Denormalized
    spotId: string;
    startTime: string;
    endTime?: string; // Null if currently parked
    durationMinutes?: number;
    cost: number;
    status: 'Active' | 'Completed' | 'Cancelled';
    paymentMethod?: string; // e.g., 'Wallet', 'Pass', 'Card'
    appliedPricingRule?: string;
}

let parkingRecords: ParkingRecord[] = [
     { recordId: 'rec_1', userId: 'user_abc123', userName: 'Alice Smith (Simulated)', lotId: 'lot_A', lotName: 'Downtown Garage', spotId: 'lot_A-S5', startTime: new Date(Date.now() - 2 * 86400000).toISOString(), endTime: new Date(Date.now() - (2 * 86400000 - 90 * 60000)).toISOString(), durationMinutes: 90, cost: 3.50, status: 'Completed', paymentMethod: 'Wallet', appliedPricingRule: 'Downtown Weekday Peak (8am-6pm)' },
     { recordId: 'rec_2', userId: 'user_def456', userName: 'Bob Johnson (Simulated)', lotId: 'lot_B', lotName: 'Airport Lot B', spotId: 'lot_B-S22', startTime: new Date(Date.now() - 5 * 86400000).toISOString(), endTime: new Date(Date.now() - (5 * 86400000 - 120 * 60000)).toISOString(), durationMinutes: 120, cost: 5.00, status: 'Completed', paymentMethod: 'Card', appliedPricingRule: 'Standard Hourly Rate' },
     { recordId: 'rec_3', userId: 'user_abc123', userName: 'Alice Smith (Simulated)', lotId: 'lot_A', lotName: 'Downtown Garage', spotId: 'lot_A-S10', startTime: new Date(Date.now() - 86400000).toISOString(), endTime: new Date(Date.now() - (86400000 - 60 * 60000)).toISOString(), durationMinutes: 60, cost: 2.50, status: 'Completed', paymentMethod: 'Wallet', appliedPricingRule: 'Standard Hourly Rate' },
     { recordId: 'rec_4', userId: 'user_ghi789', userName: 'Charlie Zulu (Simulated)', lotId: 'lot_C', lotName: 'Mall Parking Deck', spotId: 'lot_C-P10', startTime: new Date(Date.now() - 3 * 86400000).toISOString(), endTime: new Date(Date.now() - (3 * 86400000 - 180 * 60000)).toISOString(), durationMinutes: 180, cost: 7.50, status: 'Completed', paymentMethod: 'MobileMoney', appliedPricingRule: 'Standard Hourly Rate' },
      // Add more sample records...
];

/**
 * Fetches parking records, potentially filtered.
 * @param filters Optional filters like userId, lotId, date range.
 * @returns A promise resolving to an array of ParkingRecord objects.
 */
export async function getParkingRecords(filters?: { userId?: string; lotId?: string; startDate?: string; endDate?: string }): Promise<ParkingRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    let results = [...parkingRecords];
    if (filters?.userId) {
        results = results.filter(rec => rec.userId === filters.userId);
    }
    // If lotId is provided and not 'all', filter by it. If 'all', show all accessible records (logic based on caller's role needed here or in component).
    if (filters?.lotId && filters.lotId !== 'all') {
        results = results.filter(rec => rec.lotId === filters.lotId);
    }
    if (filters?.startDate) {
         results = results.filter(rec => new Date(rec.startTime) >= new Date(filters.startDate!));
    }
     if (filters?.endDate) {
         // Adjust filter to include records STARTING before or ON the end date
         const end = new Date(filters.endDate);
         end.setHours(23, 59, 59, 999); // Set to end of the day
         results = results.filter(rec => new Date(rec.startTime) <= end);
     }
    return results.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

/**
 * Creates a new parking record when parking starts.
 * @param recordData Initial data for the parking record.
 * @returns The created parking record.
 */
export async function createParkingRecord(recordData: Omit<ParkingRecord, 'recordId' | 'status' | 'endTime' | 'durationMinutes' | 'cost' | 'paymentMethod' | 'appliedPricingRule'>): Promise<ParkingRecord> {
     await new Promise(resolve => setTimeout(resolve, 100));
     const newRecord: ParkingRecord = {
         ...recordData,
         recordId: `rec_${Date.now()}`,
         startTime: new Date().toISOString(),
         status: 'Active',
         cost: 0, // Cost calculated on completion
     };
     parkingRecords.push(newRecord);
     console.log("Created parking record:", newRecord);
     return newRecord;
}

/**
 * Updates a parking record when parking ends.
 * @param recordId The ID of the record to update.
 * @param endTime The time parking ended.
 * @param costDetails Details about the calculated cost and rule.
 * @returns The updated parking record or null if not found.
 */
export async function completeParkingRecord(
    recordId: string,
    endTime: Date,
    costDetails: { cost: number; appliedRule: string; isCoveredByPass?: boolean },
    paymentMethod: string = 'Wallet'
): Promise<ParkingRecord | null> {
     await new Promise(resolve => setTimeout(resolve, 100));
     const recordIndex = parkingRecords.findIndex(rec => rec.recordId === recordId);
     if (recordIndex === -1) return null;

     const startTime = new Date(parkingRecords[recordIndex].startTime);
     const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

     parkingRecords[recordIndex] = {
         ...parkingRecords[recordIndex],
         endTime: endTime.toISOString(),
         durationMinutes,
         cost: costDetails.cost,
         status: 'Completed',
         paymentMethod: costDetails.isCoveredByPass ? 'Pass' : paymentMethod,
         appliedPricingRule: costDetails.appliedRule,
     };
     console.log("Completed parking record:", parkingRecords[recordIndex]);
     // TODO: Trigger payment processing if cost > 0 and not covered by pass
     return parkingRecords[recordIndex];
}

// Function to simulate converting data to CSV (basic implementation)
export function convertToCSV<T extends object>(data: T[]): string {
    if (!data || data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(fieldName => {
                 let value = row[fieldName as keyof T];
                 // Handle potential objects or arrays if needed, stringify simply for this example
                 if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                 }
                 // Escape double quotes and wrap in double quotes if value contains comma, double quote, or newline
                 const stringValue = String(value ?? ''); // Ensure it's a string, handle null/undefined
                 if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                     return `"${stringValue.replace(/"/g, '""')}"`; // Escape double quotes
                 }
                 return stringValue;
            }).join(',')
        )
    ];
    return csvRows.join('\n');
}
