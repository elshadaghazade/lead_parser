import type { LineType, RuleHandler } from "../types";

/**
 * Validate prooflink format and domain matching
 */
export const validationProofLink: RuleHandler = (line: LineType) => {
    const lowerProofLink = line.prooflink.trim().toLowerCase();
    const lowerEmail = line.prooflink.trim().toLowerCase();

    if (!lowerProofLink) {
        return {
            result: 'INVALID',
            comment: 'Prooflink is empty'
        }
    }

    if (!lowerEmail) {
        return {
            result: 'INVALID',
            comment: 'email is empty'
        }
    }

    const emailDomain = lowerEmail.split('@').slice(-1)[0];

    if (
        lowerProofLink.includes('linkedin.com/in/') ||
        lowerProofLink.includes('zoominfo.com/p/')
    ) {
        return { result: "VALID" };
    }

    if (lowerProofLink.includes(emailDomain)) {
        return { result: 'VALID' }
    }

    return {
        result: 'INVALID',
        comment: 'Prooflink is not linkedin, zoom or even email domain'
    }
}