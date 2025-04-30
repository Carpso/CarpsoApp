// src/services/pricing-service.ts

import type { ParkingLot } from './parking-lot';

/**
 * Represents pricing rules for a parking lot.
 */
export interface PricingRule {
  ruleId: string;
  lotId?: string; // If null/undefined, it's a global rule
  description: string;
  baseRatePerHour?: number; // Standard hourly rate
  flatRate?: number; // Flat rate for a period (e.g., event parking)
  flatRateDurationMinutes?: number; // Duration for the flat rate
  discountPercentage?: number; // e.g., 10 for 10% off
  timeCondition?: { // Time-based conditions
    daysOfWeek?: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
    startTime?: string; // HH:MM
    endTime?: string; // HH:MM
  };
  eventCondition?: string; // e.g., 'Concert Night', 'Football Game'
  userTierCondition?: ('Basic' | 'Premium')[]; // Apply only to specific user tiers
  priority: number; // Lower number means higher priority
}

// --- Mock Data Store ---
// In a real app, rules would come from a database and be more complex.
let pricingRules: PricingRule[] = [
    // Global rules (lower priority)
    { ruleId: 'global_base', description: 'Standard Rate', baseRatePerHour: 2.50, priority: 100 },
    { ruleId: 'global_weekend_discount', description: 'Weekend Discount (10%)', discountPercentage: 10, timeCondition: { daysOfWeek: ['Sat', 'Sun'] }, priority: 90 },
    { ruleId: 'global_premium_discount', description: 'Premium User Discount (5%)', discountPercentage: 5, userTierCondition: ['Premium'], priority: 80 },

    // Lot-specific rules (higher priority)
    { ruleId: 'lot_A_weekday_peak', lotId: 'lot_A', description: 'Downtown Weekday Peak (8am-6pm)', baseRatePerHour: 3.00, timeCondition: { daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '08:00', endTime: '18:00' }, priority: 10 },
    { ruleId: 'lot_B_airport_flat', lotId: 'lot_B', description: 'Airport Daily Flat Rate', flatRate: 15.00, flatRateDurationMinutes: 24 * 60, priority: 5 },
    { ruleId: 'lot_C_event', lotId: 'lot_C', description: 'Mall Event Parking', flatRate: 10.00, eventCondition: 'Concert Night', priority: 1 }, // Highest priority
];


// --- Mock Service Functions ---

/**
 * Calculates the estimated parking cost for a given lot and duration, considering dynamic rules.
 * This is a simplified simulation. A real implementation would be much more complex.
 *
 * @param lot The parking lot.
 * @param durationMinutes The estimated parking duration in minutes.
 * @param userId Optional user ID to check for user-specific discounts.
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
): Promise<{ cost: number; appliedRule: string }> {
    await new Promise(resolve => setTimeout(resolve, 50)); // Simulate minimal delay

    const applicableRules = pricingRules
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
        return { cost: 0, appliedRule: 'No applicable pricing rule found.' };
    }

    let calculatedCost = 0;
    let finalAppliedRuleDesc = bestRule.description;

    if (bestRule.flatRate !== undefined && bestRule.flatRateDurationMinutes !== undefined) {
        // Apply flat rate
        calculatedCost = bestRule.flatRate * Math.ceil(durationMinutes / bestRule.flatRateDurationMinutes);
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
             calculatedCost = baseRateRule.flatRate * Math.ceil(durationMinutes / baseRateRule.flatRateDurationMinutes);
             finalAppliedRuleDesc = `${baseRateRule.description} with ${bestRule.description}`; // Combine descriptions
        } else {
             // Fallback if somehow no rate rule is found (should have global default)
             calculatedCost = (2.50 / 60) * durationMinutes; // Use absolute default
             finalAppliedRuleDesc = `Default Rate (applied ${bestRule.description})`;
        }
    }

    // Apply discount if present in the best rule
    if (bestRule.discountPercentage !== undefined) {
        calculatedCost *= (1 - bestRule.discountPercentage / 100);
        // Ensure description reflects the discount if it wasn't already part of the combined description
        if (!finalAppliedRuleDesc.includes(bestRule.description)) {
             finalAppliedRuleDesc += ` (${bestRule.description})`;
        }
    }

    // Round to 2 decimal places
    calculatedCost = parseFloat(calculatedCost.toFixed(2));

    return { cost: Math.max(0, calculatedCost), appliedRule: finalAppliedRuleDesc }; // Ensure cost is not negative
}


/**
 * Retrieves all pricing rules (primarily for admin use).
 * @returns A promise resolving to an array of all pricing rules.
 */
export async function getAllPricingRules(): Promise<PricingRule[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...pricingRules];
}

/**
 * Adds or updates a pricing rule (primarily for admin use).
 * @param rule The pricing rule to add or update.
 * @returns A promise resolving to the added/updated rule.
 */
export async function savePricingRule(rule: PricingRule): Promise<PricingRule> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const existingIndex = pricingRules.findIndex(r => r.ruleId === rule.ruleId);
    if (existingIndex !== -1) {
        pricingRules[existingIndex] = rule;
        console.log("Updated pricing rule:", rule);
    } else {
        pricingRules.push(rule);
        console.log("Added pricing rule:", rule);
    }
    // Re-sort rules by priority after adding/updating
    pricingRules.sort((a, b) => a.priority - b.priority);
    return rule;
}

/**
 * Deletes a pricing rule (primarily for admin use).
 * @param ruleId The ID of the rule to delete.
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function deletePricingRule(ruleId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const initialLength = pricingRules.length;
    pricingRules = pricingRules.filter(r => r.ruleId !== ruleId);
    const success = pricingRules.length < initialLength;
    if (success) {
        console.log("Deleted pricing rule:", ruleId);
    }
    return success;
}
