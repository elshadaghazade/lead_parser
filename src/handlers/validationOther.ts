import type { LineType, RuleHandler } from "../types";
import { reqParser } from "../utils/reqParser";

/**
 * Check email format is valid or not
 */
const isValidEmail = (email: string): boolean  => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Parse minimum company size value like "500+"
 */
const parseMinCompanySize = (value: string): number | null  => {
    const m = value.match(/(\d+)\s*\+/);
    return m ? Number(m[1]) : null;
}

/**
 * Parse employees range to minimum number
 */
const parseEmployeesBucket = (value: string): number | null  => {
    if (!value) return null;

    const plus = value.match(/(\d[\d,]*)\s*\+/);
    if (plus) return Number(plus[1].replace(/,/g, ""));

    const range = value.match(/(\d[\d,]*)\s*-/);
    if (range) return Number(range[1].replace(/,/g, ""));

    return null;
}

/**
 * Validate company and lead data for Other (auto) rule
 */
export const validationOther: RuleHandler = (line: LineType) => {
    const parsed = reqParser(line.req);
    const meta = parsed.meta ?? {};

    if (!line.company?.trim()) {
        return { result: "INVALID", comment: "Missing company" };
    }

    if (!line.email?.trim()) {
        return { result: "INVALID", comment: "Missing email" };
    }

    if (!isValidEmail(line.email)) {
        return { result: "INVALID", comment: "Invalid email format" };
    }
    
    if (meta.company_size && meta.company_size !== "ANY") {
        const reqMin = parseMinCompanySize(meta.company_size);
        const empMin = parseEmployeesBucket(line.employees);

        if (reqMin !== null && empMin !== null && empMin < reqMin) {
            return {
                result: "INVALID",
                comment: `Company size does not meet requirement (${meta.company_size})`
            };
        }
    }

    if (
        meta.industry &&
        meta.industry !== "ANY" &&
        meta.industry !== "see comment"
    ) {
        if (
            !line.industry ||
            !line.industry.toLowerCase().includes(meta.industry.toLowerCase())
        ) {
            return {
                result: "INVALID",
                comment: "Industry does not match requirement"
            };
        }
    }
    
    if (
        meta.geo &&
        meta.geo !== "ANY" &&
        meta.geo !== "see comment" &&
        line.location
    ) {
        const geoTokens = meta.geo
            .replace(/only/gi, "")
            .split(/[:&,]/)
            .map(v => v.trim().toLowerCase())
            .filter(Boolean);

        const loc = line.location.toLowerCase();
        const matched = geoTokens.some(t => loc.includes(t));

        if (!matched) {
            return {
                result: "INVALID",
                comment: "Location does not match Geo requirement"
            };
        }
    }

    return { result: "VALID" };
}