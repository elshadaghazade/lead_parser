import type { reqParser } from "./utils/reqParser";

export enum SUB_RULES_ENUM {
    TITLE_PL_SUMMARY = "N/A: Title/PL Summary",
    PROOFLINK = "N/A: Prooflink",
    NWC = "N1: NWC",
    OTHER = "N/A: Other (auto)",
    // OUT_OF_BUSINESS = "N2: Out of Business/Bad data (company)"
}

export type LineType = {
    first_name: string;
    last_name: string;
    company: string;
    title: string;
    prooflink: string;
    location: string;
    status: string;
    email: string;
    employees: string;
    employees_prooflink: string;
    industry: string;
    req: string;
    sub_status: string;
};

export type ValidationResult = {
  result: "VALID" | "INVALID" | "RECHECK";
  comment?: string;
};

export type RuleHandler = (line: LineType) => ValidationResult;

export type ParsedReq = ReturnType<typeof reqParser>;

export type ValidationCfg = {
    minTotalCoverage: number;     
    minLevelCoverage: number;     
    minKeywordCoverage: number;   
    requireTitle: boolean;
};

export type Dict = Record<string, string[]>;
export type Nested = Record<string, Dict>;

export type ReqParsed = {
    meta: Record<string, string>;
    comments: Nested;
};