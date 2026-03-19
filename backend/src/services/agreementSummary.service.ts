export type SummaryTargetGroup = "citizen" | "student" | "business_owner";

export interface SummaryCitation {
  quote: string;
  location: string;
}

export interface BusinessClauseOutput {
  title: string;
  explanation: string;
  risk: string;
  improvement: string;
  citations: SummaryCitation[];
}

export interface DeterministicRiskFinding {
  ruleId: string;
  title: string;
  severity: "high" | "medium" | "low";
  issue: string;
  recommendation: string;
  citations: SummaryCitation[];
}

export interface BusinessSummaryOutput {
  title: string;
  about: string;
  clauses: BusinessClauseOutput[];
  financials: {
    totalFee: string;
    paymentMilestones: string[];
    lateFee: string;
  };
  keyComplianceNotes: string[];
  finalAssessment: {
    overallScore: number;
    comment: string;
    recommendations: string[];
  };
  deterministicRiskFindings: DeterministicRiskFinding[];
}

export interface CitizenSummaryOutput {
  title: string;
  about: string;
  benefits: string[];
  risks: string[];
  clarity: { score: number; comment: string };
  fairness: { score: number; comment: string };
  repaymentDetails: {
    emiAmount: string;
    totalRepayment: string;
    interestExtra: string;
    note: string;
  };
  suggestions: string[];
  analogy: string;
  benefitCitations: Array<{ insight: string; citations: SummaryCitation[] }>;
  riskCitations: Array<{ insight: string; citations: SummaryCitation[] }>;
  suggestionCitations: Array<{ insight: string; citations: SummaryCitation[] }>;
  deterministicRiskFindings: DeterministicRiskFinding[];
}

export interface StudentSummaryOutput {
  title: string;
  about: string;
  clauses: Array<{
    title: string;
    explanation: string;
    citations: SummaryCitation[];
  }>;
  keyLegalNotes: string[];
  finalTips: string[];
  deterministicRiskFindings: DeterministicRiskFinding[];
}

export const SUMMARY_RESPONSE_SCHEMAS: Record<SummaryTargetGroup, Record<string, unknown>> = {
  citizen: {
    type: "object",
    required: [
      "title",
      "about",
      "benefits",
      "risks",
      "clarity",
      "fairness",
      "repaymentDetails",
      "suggestions",
      "analogy",
    ],
    properties: {
      title: { type: "string" },
      about: { type: "string" },
      benefits: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      clarity: {
        type: "object",
        required: ["score", "comment"],
        properties: {
          score: { type: "number" },
          comment: { type: "string" },
        },
      },
      fairness: {
        type: "object",
        required: ["score", "comment"],
        properties: {
          score: { type: "number" },
          comment: { type: "string" },
        },
      },
      repaymentDetails: {
        type: "object",
        required: ["emiAmount", "totalRepayment", "interestExtra", "note"],
        properties: {
          emiAmount: { type: "string" },
          totalRepayment: { type: "string" },
          interestExtra: { type: "string" },
          note: { type: "string" },
        },
      },
      suggestions: { type: "array", items: { type: "string" } },
      analogy: { type: "string" },
    },
  },
  student: {
    type: "object",
    required: ["title", "about", "clauses", "keyLegalNotes", "finalTips"],
    properties: {
      title: { type: "string" },
      about: { type: "string" },
      clauses: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "explanation"],
          properties: {
            title: { type: "string" },
            explanation: { type: "string" },
          },
        },
      },
      keyLegalNotes: { type: "array", items: { type: "string" } },
      finalTips: { type: "array", items: { type: "string" } },
    },
  },
  business_owner: {
    type: "object",
    required: [
      "title",
      "about",
      "clauses",
      "financials",
      "keyComplianceNotes",
      "finalAssessment",
    ],
    properties: {
      title: { type: "string" },
      about: { type: "string" },
      clauses: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "explanation", "risk", "improvement"],
          properties: {
            title: { type: "string" },
            explanation: { type: "string" },
            risk: { type: "string" },
            improvement: { type: "string" },
          },
        },
      },
      financials: {
        type: "object",
        required: ["totalFee", "paymentMilestones", "lateFee"],
        properties: {
          totalFee: { type: "string" },
          paymentMilestones: { type: "array", items: { type: "string" } },
          lateFee: { type: "string" },
        },
      },
      keyComplianceNotes: { type: "array", items: { type: "string" } },
      finalAssessment: {
        type: "object",
        required: ["overallScore", "comment", "recommendations"],
        properties: {
          overallScore: { type: "number" },
          comment: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const STOP_WORDS = new Set<string>([
  "about",
  "shall",
  "this",
  "that",
  "with",
  "from",
  "their",
  "there",
  "under",
  "between",
  "where",
  "which",
  "would",
  "could",
  "should",
  "into",
  "have",
  "has",
  "been",
  "being",
  "were",
  "will",
  "also",
  "including",
  "clause",
  "agreement",
  "document",
  "party",
  "parties",
  "business",
  "owner",
  "terms",
  "conditions",
]);

type UnknownObject = Record<string, unknown>;

interface EvidenceUnit {
  text: string;
  line: number;
}

const isObject = (value: unknown): value is UnknownObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const clipText = (value: string, maxLength = 260): string => {
  const trimmed = normalizeWhitespace(value);
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
};

const asString = (value: unknown, fallback = "N/A"): string => {
  if (typeof value !== "string") return fallback;
  const normalized = normalizeWhitespace(value);
  return normalized.length ? normalized : fallback;
};

const asLongString = (value: unknown, fallback: string): string => {
  const normalized = asString(value, "");
  if (!normalized) return fallback;
  return normalized;
};

const asStringArray = (value: unknown, fallback: string[] = []): string[] => {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => asString(item, ""))
    .filter((item) => item.length > 0);
  return items.length ? items : fallback;
};

const asScore = (value: unknown, fallback = 5): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.round(numeric);
  return Math.max(1, Math.min(10, rounded));
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values));

const toEvidenceUnits = (documentText: string): EvidenceUnit[] => {
  const lines = documentText.replace(/\r/g, "").split("\n");
  const units: EvidenceUnit[] = [];

  lines.forEach((line, lineIndex) => {
    const normalizedLine = normalizeWhitespace(line);
    if (!normalizedLine) return;

    const sentenceChunks = normalizedLine
      .split(/(?<=[.!?;:])\s+/)
      .map((chunk) => normalizeWhitespace(chunk))
      .filter(Boolean);

    if (!sentenceChunks.length) {
      units.push({ text: normalizedLine, line: lineIndex + 1 });
      return;
    }

    sentenceChunks.forEach((chunk) => {
      if (chunk.length >= 18) {
        units.push({ text: chunk, line: lineIndex + 1 });
      }
    });
  });

  if (!units.length) {
    const fallback = normalizeWhitespace(documentText);
    if (fallback) {
      units.push({ text: fallback, line: 1 });
    }
  }

  return units.slice(0, 5000);
};

const extractKeywords = (...segments: string[]): string[] => {
  const base = segments.join(" ").toLowerCase();
  const words = base
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
  return uniqueStrings(words);
};

const scoreEvidence = (text: string, keywords: string[]): number => {
  const lower = text.toLowerCase();
  return keywords.reduce((score, keyword) => {
    if (!lower.includes(keyword)) return score;
    return score + (keyword.length >= 8 ? 2 : 1);
  }, 0);
};

const findEvidenceForInsight = (
  evidenceUnits: EvidenceUnit[],
  insightText: string,
  fallbackLabel: string,
): SummaryCitation[] => {
  const keywords = extractKeywords(insightText);

  if (!keywords.length && evidenceUnits.length) {
    return [
      {
        quote: clipText(evidenceUnits[0].text),
        location: `Line ${evidenceUnits[0].line}`,
      },
    ];
  }

  const scored = evidenceUnits
    .map((unit) => ({
      unit,
      score: scoreEvidence(unit.text, keywords),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.unit.line - b.unit.line);

  const selected: SummaryCitation[] = [];
  const seenLines = new Set<number>();

  for (const item of scored) {
    if (seenLines.has(item.unit.line)) continue;
    seenLines.add(item.unit.line);
    selected.push({
      quote: clipText(item.unit.text),
      location: `Line ${item.unit.line}`,
    });
    if (selected.length >= 2) break;
  }

  if (!selected.length) {
    return [
      {
        quote: `No explicit clause text was matched for: ${fallbackLabel}`,
        location: "Document-wide scan",
      },
    ];
  }

  return selected;
};

const findRegexEvidence = (documentText: string, pattern: RegExp, max = 2): SummaryCitation[] => {
  const matcher = new RegExp(pattern.source, pattern.flags.replace(/g/g, ""));
  const lines = documentText.replace(/\r/g, "").split("\n");
  const citations: SummaryCitation[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const normalizedLine = normalizeWhitespace(lines[i]);
    if (!normalizedLine) continue;
    if (!matcher.test(normalizedLine)) continue;

    citations.push({
      quote: clipText(normalizedLine),
      location: `Line ${i + 1}`,
    });
    if (citations.length >= max) break;
  }

  return citations;
};

const runDeterministicRiskEngine = (documentText: string): DeterministicRiskFinding[] => {
  const findings: DeterministicRiskFinding[] = [];

  const missingClauseRules: Array<{
    ruleId: string;
    title: string;
    severity: "high" | "medium" | "low";
    issue: string;
    recommendation: string;
    pattern: RegExp;
  }> = [
    {
      ruleId: "missing-termination-clause",
      title: "Termination Terms Missing",
      severity: "high",
      issue: "No explicit termination/exit clause was detected.",
      recommendation:
        "Add clear termination triggers, cure periods, and notice timelines for both parties.",
      pattern: /\b(termination|terminate|exit clause|notice period|expiry|expiration)\b/i,
    },
    {
      ruleId: "missing-dispute-resolution",
      title: "Dispute Resolution Missing",
      severity: "high",
      issue: "No clear dispute resolution mechanism was detected.",
      recommendation:
        "Include arbitration/litigation route, venue, and governing law to reduce enforcement ambiguity.",
      pattern: /\b(arbitration|dispute resolution|governing law|jurisdiction|conciliation)\b/i,
    },
    {
      ruleId: "missing-payment-clarity",
      title: "Payment Terms Weak/Missing",
      severity: "medium",
      issue: "Payment timeline mechanics are not clearly detectable.",
      recommendation:
        "Define fee amount, milestone schedule, invoicing cadence, due date, and late-payment consequences.",
      pattern: /\b(payment|fee|invoice|milestone|consideration|due date|late fee)\b/i,
    },
    {
      ruleId: "missing-liability-cap",
      title: "Liability Cap Missing",
      severity: "high",
      issue: "No explicit cap/limitation of liability was detected.",
      recommendation:
        "Add a reasonable liability cap and carve-outs to prevent unbounded exposure.",
      pattern: /\b(limit(?:ation)? of liability|liability cap|capped liability)\b/i,
    },
    {
      ruleId: "missing-confidentiality",
      title: "Confidentiality Protection Weak/Missing",
      severity: "medium",
      issue: "No clear confidentiality/NDA language was detected.",
      recommendation:
        "Add confidentiality scope, permitted disclosures, and survival period after termination.",
      pattern: /\b(confidential|non[-\s]?disclosure|nda|proprietary information)\b/i,
    },
  ];

  const riskyPatternRules: Array<{
    ruleId: string;
    title: string;
    severity: "high" | "medium" | "low";
    issue: string;
    recommendation: string;
    pattern: RegExp;
  }> = [
    {
      ruleId: "unlimited-liability-detected",
      title: "Unlimited Liability Phrase Detected",
      severity: "high",
      issue: "Potential unlimited liability language was found.",
      recommendation: "Negotiate a liability cap tied to contract value and defined carve-outs.",
      pattern: /\b(unlimited liability|without limitation of liability|liability shall be unlimited)\b/i,
    },
    {
      ruleId: "one-sided-termination-detected",
      title: "Potentially One-Sided Termination",
      severity: "high",
      issue: "Termination rights may be unbalanced toward one party.",
      recommendation:
        "Balance termination rights and include reciprocal notice + cure windows.",
      pattern: /\b(sole discretion to terminate|terminate at any time without cause|unilateral termination)\b/i,
    },
    {
      ruleId: "auto-renewal-detected",
      title: "Auto-Renewal Obligation Detected",
      severity: "medium",
      issue: "Automatic renewal language may create hidden renewal risk.",
      recommendation:
        "Add explicit renewal notice period and a simple non-renewal mechanism.",
      pattern: /\b(auto(?:matic)? renewal|automatically renew|deemed renewed)\b/i,
    },
  ];

  for (const rule of missingClauseRules) {
    if (rule.pattern.test(documentText)) continue;

    findings.push({
      ruleId: rule.ruleId,
      title: rule.title,
      severity: rule.severity,
      issue: rule.issue,
      recommendation: rule.recommendation,
      citations: [
        {
          quote: `No explicit evidence matched: ${rule.pattern.source}`,
          location: "Document-wide scan",
        },
      ],
    });
  }

  for (const rule of riskyPatternRules) {
    if (!rule.pattern.test(documentText)) continue;

    const citations = findRegexEvidence(documentText, rule.pattern, 2);
    findings.push({
      ruleId: rule.ruleId,
      title: rule.title,
      severity: rule.severity,
      issue: rule.issue,
      recommendation: rule.recommendation,
      citations:
        citations.length > 0
          ? citations
          : [
              {
                quote: `Pattern detected: ${rule.pattern.source}`,
                location: "Document-wide scan",
              },
            ],
    });
  }

  return findings;
};

const normalizeFinancials = (
  value: unknown,
): {
  totalFee: string;
  paymentMilestones: string[];
  lateFee: string;
} => {
  const object = isObject(value) ? value : {};
  return {
    totalFee: asString(object.totalFee, "N/A"),
    paymentMilestones: asStringArray(object.paymentMilestones, ["N/A"]),
    lateFee: asString(object.lateFee, "N/A"),
  };
};

const normalizeBusinessFinalAssessment = (value: unknown): {
  overallScore: number;
  comment: string;
  recommendations: string[];
} => {
  const object = isObject(value) ? value : {};

  let score = asScore(object.overallScore, 5);
  if (!("overallScore" in object) && typeof object.overallRisk === "string") {
    const risk = object.overallRisk.toLowerCase();
    if (risk.includes("high")) score = 3;
    else if (risk.includes("medium")) score = 6;
    else if (risk.includes("low")) score = 8;
  }

  return {
    overallScore: score,
    comment: asLongString(
      object.comment,
      "Assessment generated from document-level legal risk signals.",
    ),
    recommendations: asStringArray(object.recommendations, []),
  };
};

export const parseCitizenSummaryOutput = (
  raw: unknown,
  agreementText: string,
): CitizenSummaryOutput => {
  if (!isObject(raw)) {
    throw new Error("Citizen summary must be a JSON object.");
  }

  const evidenceUnits = toEvidenceUnits(agreementText);
  const clarityRaw = isObject(raw.clarity) ? raw.clarity : {};
  const fairnessRaw = isObject(raw.fairness) ? raw.fairness : {};
  const repaymentRaw = isObject(raw.repaymentDetails) ? raw.repaymentDetails : {};
  const benefits = asStringArray(raw.benefits, []);
  const risks = asStringArray(raw.risks, []);
  const suggestions = asStringArray(raw.suggestions, []);

  return {
    title: asLongString(raw.title, "Citizen Agreement Summary"),
    about: asLongString(raw.about, "Agreement summary unavailable."),
    benefits,
    risks,
    clarity: {
      score: asScore(clarityRaw.score, 5),
      comment: asLongString(clarityRaw.comment, "Clarity assessment unavailable."),
    },
    fairness: {
      score: asScore(fairnessRaw.score, 5),
      comment: asLongString(fairnessRaw.comment, "Fairness assessment unavailable."),
    },
    repaymentDetails: {
      emiAmount: asString(repaymentRaw.emiAmount, "N/A"),
      totalRepayment: asString(repaymentRaw.totalRepayment, "N/A"),
      interestExtra: asString(repaymentRaw.interestExtra, "N/A"),
      note: asString(repaymentRaw.note, "N/A"),
    },
    suggestions,
    analogy: asLongString(raw.analogy, "No analogy available."),
    benefitCitations: benefits.map((insight) => ({
      insight,
      citations: findEvidenceForInsight(evidenceUnits, insight, "Benefit"),
    })),
    riskCitations: risks.map((insight) => ({
      insight,
      citations: findEvidenceForInsight(evidenceUnits, insight, "Risk"),
    })),
    suggestionCitations: suggestions.map((insight) => ({
      insight,
      citations: findEvidenceForInsight(evidenceUnits, insight, "Suggestion"),
    })),
    deterministicRiskFindings: runDeterministicRiskEngine(agreementText),
  };
};

export const parseStudentSummaryOutput = (
  raw: unknown,
  agreementText: string,
): StudentSummaryOutput => {
  if (!isObject(raw)) {
    throw new Error("Student summary must be a JSON object.");
  }

  const evidenceUnits = toEvidenceUnits(agreementText);
  const rawClauses = Array.isArray(raw.clauses) ? raw.clauses : [];
  const clauses = rawClauses
    .map((item) => (isObject(item) ? item : {}))
    .map((item) => ({
      title: asLongString(item.title, "Untitled Clause"),
      explanation: asLongString(item.explanation, "Explanation unavailable."),
      citations: findEvidenceForInsight(
        evidenceUnits,
        `${asString(item.title, "")} ${asString(item.explanation, "")}`,
        asString(item.title, "Clause"),
      ),
    }))
    .filter((item) => item.title.length > 0 && item.explanation.length > 0);

  return {
    title: asLongString(raw.title, "Student Agreement Summary"),
    about: asLongString(raw.about, "Agreement summary unavailable."),
    clauses,
    keyLegalNotes: asStringArray(raw.keyLegalNotes, []),
    finalTips: asStringArray(raw.finalTips, []),
    deterministicRiskFindings: runDeterministicRiskEngine(agreementText),
  };
};

export const parseBusinessSummaryOutput = (
  raw: unknown,
  agreementText: string,
): BusinessSummaryOutput => {
  if (!isObject(raw)) {
    throw new Error("Business summary must be a JSON object.");
  }

  const evidenceUnits = toEvidenceUnits(agreementText);
  const rawClauses = Array.isArray(raw.clauses) ? raw.clauses : [];
  const clauses = rawClauses
    .map((item) => (isObject(item) ? item : {}))
    .map((item) => {
      const title = asLongString(item.title, "Untitled Clause");
      const explanation = asLongString(item.explanation, "Explanation unavailable.");
      const risk = asString(item.risk, "N/A");
      const improvement = asString(item.improvement, "N/A");
      const citations = findEvidenceForInsight(
        evidenceUnits,
        `${title} ${explanation} ${risk} ${improvement}`,
        title,
      );

      return {
        title,
        explanation,
        risk,
        improvement,
        citations,
      };
    })
    .filter((item) => item.explanation.length > 0);

  const deterministicRiskFindings = runDeterministicRiskEngine(agreementText);
  const finalAssessment = normalizeBusinessFinalAssessment(raw.finalAssessment);

  const deterministicRecommendations = deterministicRiskFindings.map(
    (finding) => `[${finding.severity.toUpperCase()}] ${finding.recommendation}`,
  );

  finalAssessment.recommendations = uniqueStrings([
    ...finalAssessment.recommendations,
    ...deterministicRecommendations,
  ]).slice(0, 8);

  return {
    title: asLongString(raw.title, "Business Contract Summary"),
    about: asLongString(raw.about, "Agreement summary unavailable."),
    clauses,
    financials: normalizeFinancials(raw.financials),
    keyComplianceNotes: asStringArray(raw.keyComplianceNotes, []),
    finalAssessment,
    deterministicRiskFindings,
  };
};
