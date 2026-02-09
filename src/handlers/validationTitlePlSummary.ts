import type { LineType, ParsedReq, RuleHandler, ValidationCfg } from "../types";
import { reqParser } from "../utils/reqParser";


/**
 * DEFAULT_CFG - Default thresholds for similarity checks
 *
 * minTotalCoverage: how many % of all required tokens must be in title
 * minLevelCoverage: how many % of job level tokens must be in title
 * minKeywordCoverage: how many % of keyword tokens must be in title
 * requireTitle: if true and title is empty -> INVALID
 */
const DEFAULT_CFG: ValidationCfg = {
    minTotalCoverage: 0.75,
    minLevelCoverage: 1.0,
    minKeywordCoverage: 0.3,
    requireTitle: true,
};

/**
 * Make text simple for compare
 */
const normalizeText = (s: string): string  => {
    return (s ?? "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9+\s/.-]+/g, " ") 
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Split text to list of words
 */
const tokenize = (s: string): string[]  => {
    const t = normalizeText(s);
    if (!t) return [];
    
    return t.split(" ").filter(Boolean);
}

/**
 * Remove duplicates from array
 */
const uniq = (arr: string[]): string[]  => {
    return [...new Set(arr)];
}

/**
 * Convert array of strings to unique tokens list
 */
const tokensFromList = (values: unknown): string[]  => {
    if (!Array.isArray(values)) return [];
    
    return uniq(values.flatMap(v => tokenize(String(v))));
}

/**
 * Calculate how many required tokens exist in title tokens
 */
const coverage = (required: string[], presentSet: Set<string>)  => {
    if (required.length === 0) return { ratio: 1, missing: [] as string[], matched: [] as string[] };

    const missing: string[] = [];
    const matched: string[] = [];

    for (const tok of required) {
        if (presentSet.has(tok)) matched.push(tok);
        else missing.push(tok);
    }

    return {
        ratio: matched.length / required.length,
        missing,
        matched,
    };
}

/**
 * Take first n count missing tokens for short comment
 */
const topMissing = (missing: string[], limit = 6): string  => {
    return missing.slice(0, limit).join(", ");
}

/**
 * Check title by requirements from req
 *
 * How it works:
 * - Parse req field by reqParser() to get meta and comments structure
 * - Take required words for title from:
 *    - comments.titles.job_levels
 *    - comments.titles.keywords
 * - Split title and required texts to small tokens (words)
 * - Check how many required tokens is inside title tokens
 * - If coverage is too low > INVALID with short comment
 * - If all checks pass > VALID
 */
export const validationTitlePlSummary: RuleHandler = (line: LineType) => {
    const cfg = DEFAULT_CFG;

    const title = normalizeText(line.title);
    if (cfg.requireTitle && !title) {
        return { result: "INVALID", comment: "Missing title" };
    }

    const parsed: ParsedReq = reqParser(line.req);

    const levelTokens = tokensFromList(parsed.comments?.titles?.job_levels);
    const keywordTokens = tokensFromList(parsed.comments?.titles?.keywords);

    const requiredLevel = levelTokens;
    const requiredKeywords = keywordTokens;

    const requiredAll = uniq([...requiredLevel, ...requiredKeywords]);

    if (requiredAll.length === 0) {
        return { result: "VALID" };
    }

    const titleTokens = new Set(tokenize(title));

    const lvl = coverage(requiredLevel, titleTokens);
    const kw = coverage(requiredKeywords, titleTokens);
    const total = coverage(requiredAll, titleTokens);

    
    if (requiredLevel.length > 0 && lvl.ratio < cfg.minLevelCoverage) {
        return {
            result: "INVALID",
            comment: `Title missing level terms: ${topMissing(lvl.missing)}`,
        };
    }

    if (requiredKeywords.length > 0 && kw.ratio < cfg.minKeywordCoverage) {
        return {
            result: "INVALID",
            comment: `Title missing keyword terms: ${topMissing(kw.missing)}`,
        };
    }

    if (total.ratio < cfg.minTotalCoverage) {
        return {
            result: "INVALID",
            comment: `Title similarity too low (${Math.round(total.ratio * 100)}%). Missing: ${topMissing(total.missing)}`,
        };
    }

    return { result: "VALID" };
};