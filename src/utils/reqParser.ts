import * as cheerio from "cheerio";
import type { Dict, Nested, ReqParsed } from "../types";

/**
 * Normalize text to simple key format for compare
 */
const normalizeKey = (str: string): string => {
    return str
        .trim()
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "");
}

/**
 * Add values to key list and skip empty or duplicate items
 */
const push = (obj: Dict, key: string, values: string[]) => {
    if (!values.length) {
        return;
    }

    obj[key] ??= [];

    for (const v of values) {
        const vv = v.trim();
        if (!vv) {
            continue;
        }

        if (!obj[key].includes(vv)) {
            obj[key].push(vv);
        }
    }
}

/**
 * Check if line is empty or has only spaces
 */
const isBlankLine = (text: string) => {
    return !text || !text.trim();
}

/**
 * Check if line start with number like "1)"
 */
const isNumberedHeader = (text: string) => {
    return /^\s*\d+\)\s*/.test(text);
}

/**
 * Remove number prefix like "1)" from text
 */
const stripNumberedPrefix = (text: string) => {
    return text.replace(/^\s*\d+\)\s*/, "").trim();
}

/**
 * Split line to key and value by colon symbol
 */
const parseKeyColonValue = (line: string): { key: string; value: string } | null => {
    const idx = line.indexOf(":");

    if (idx === -1) {
        return null;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    return { key, value };
}

/**
 * Split comma separated text to list of values
 */
const splitCsvLike = (v: string): string[] => {
  return v
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

/**
 * Parse req string to meta and comments objects
 */
export const reqParser = (req: string): ReqParsed => {
    const parts = req.split(/\|\s*comments\s*:/i);

    const mainPart = (parts[0] ?? "").trim();
    const commentHtml = (parts[1] ?? "").trim();

    const meta: Record<string, string> = {};

    if (mainPart) {
        for (const raw of mainPart.split("|")) {
            const seg = raw.trim();
            if (!seg) {
                continue;
            }

            const kv = parseKeyColonValue(seg);
            if (!kv) {
                continue;
            }

            meta[normalizeKey(kv.key)] = kv.value;
        }
    }

    const comments: Nested = {};
    if (!commentHtml) {
        return { meta, comments };
    }

    const $ = cheerio.load(commentHtml);

    const nodes = $("p, div").toArray();

    let currentSection = "root";
    let currentGroup = "default";

    let pendingKey: string | null = null;

    /** 
    * Create section object if not exist 
    */
    const ensureSection = (name: string) => {
        const s = normalizeKey(name) || "root";
        comments[s] ??= {};
        return s;
    };

    /**
     * Prepare section/group, now group not used deeply
     */
    const ensureGroup = (section: string, group: string) => {
        const s = ensureSection(section);
        const g = normalizeKey(group) || "default";
        return s;
    };

    /** Add key/value to current section, support "value in next line" */
    const addKV = (keyRaw: string, valueRaw: string) => {
        const sec = ensureGroup(currentSection, currentGroup);
        const dict = comments[sec]!;
        const key = normalizeKey(keyRaw);

        if (!key) return;

        if (valueRaw.trim()) {
            const values =
                key === "keywords" || key === "job_area" || key === "comment" || key.includes("industr") ? splitCsvLike(valueRaw) : [valueRaw.trim()];

            push(dict, key, values);
            pendingKey = null;
        } else {
            pendingKey = key;
        }
    };

    /** Put current line as value for previous key */
    const addToPending = (valueLine: string) => {
        if (!pendingKey) return false;
        const sec = ensureGroup(currentSection, currentGroup);
        const dict = comments[sec]!;
        const values = pendingKey === "keywords" || pendingKey === "job_area" || pendingKey === "comment" || pendingKey.includes("industr") ? splitCsvLike(valueLine) : [valueLine.trim()];
        push(dict, pendingKey, values);
        pendingKey = null;
        return true;
    };

    for (const el of nodes) {
        const text = $(el).text().replace(/\u00a0/g, " ").trim();

        if (isBlankLine(text)) {
            pendingKey = null;
            currentGroup = "default";
            continue;
        }

        if (pendingKey) {
            addToPending(text);
            continue;
        }

        let line = text;
        if (isNumberedHeader(line)) {
            line = stripNumberedPrefix(line);
        }

        const kv = parseKeyColonValue(line);

        if (kv) {
            const kNorm = normalizeKey(kv.key);

            if ((kNorm === "titles" || kNorm === "industry") && !kv.value) {
                currentSection = kNorm;     // switch main section
                currentGroup = "default";
                pendingKey = null;
                ensureSection(currentSection);
                continue;
            }

            if (kNorm === "custom_industries") {
                currentSection = "custom_industries";
                currentGroup = "default";
                pendingKey = null;
                ensureSection(currentSection);

                if (kv.value) {
                    addKV("custom_industries", kv.value);
                }

                continue;
            }

            addKV(kv.key, kv.value);
            continue;
        }

        const sec = ensureGroup(currentSection, currentGroup);
        const dict = comments[sec]!;
        push(dict, "lines", [line]);
    }

    const ret = { meta, comments };

    return ret;
}
