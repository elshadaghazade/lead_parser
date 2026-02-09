import type { LineType, RuleHandler } from "../types";

/**
 * Validate NWC rule using status column values
 */
export const validationNWC: RuleHandler = (line: LineType) => {
    const lowerStatus = line.status.trim().toLowerCase();

    if (!lowerStatus) {
        return { result: 'VALID' }
    }

    switch (lowerStatus) {
        case 'valid':
            return { result: 'VALID' }
        case 'a':
            return {
                result: 'INVALID',
                comment: 'retired lead'
            }
        case '!':
            return {
            result: 'INVALID',
            comment: 'suspicious lead'
        }
        case 'r':
        case 'no info':
        case 'no company match':
            return {
                result: 'RECHECK',
                comment: `status is ${lowerStatus}`
            }
        default:
            return {
                result: 'INVALID',
                comment: 'line is corrupted'
            }
    }
}