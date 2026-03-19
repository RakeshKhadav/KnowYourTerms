import axios from "axios";
import { Translate } from "@google-cloud/translate/build/src/v2";
import { ApiError } from "../utility/ApiError";

const getGeminiApiKey = (): string => {
  const geminiAPIKey = process.env.GEMINI_API_KEY;
  if (!geminiAPIKey) {
    throw new ApiError(500, "Missing Gemini API key");
  }
  return geminiAPIKey;
};

const getGeminiModel = (): string => {
  return process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
};

const getGeminiChatbotModel = (): string => {
  return process.env.GEMINI_CHAT_MODEL || process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
};

const buildGeminiUrl = (model: string): string => {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
};

const mapGeminiError = (error: any): ApiError => {
  const providerMessage =
    error?.response?.data?.error?.message || error?.message || "Gemini request failed";
  const normalized = String(providerMessage).toLowerCase();
  const statusCode = error?.response?.status || 500;

  if (
    normalized.includes("reported as leaked") ||
    normalized.includes("api key was reported as leaked")
  ) {
    return new ApiError(
      403,
      "Gemini API key is blocked as leaked. Generate a new key and restart backend.",
    );
  }

  if (normalized.includes("quota exceeded") || normalized.includes("resource_exhausted")) {
    return new ApiError(
      429,
      "Gemini quota exceeded. Enable billing or use a key/project with available quota.",
    );
  }

  if (
    normalized.includes("method doesn't allow unregistered callers") ||
    normalized.includes("api key not valid") ||
    normalized.includes("permission_denied")
  ) {
    return new ApiError(403, `Gemini key rejected: ${providerMessage}`);
  }

  if (
    normalized.includes("model not found") ||
    normalized.includes("unsupported model") ||
    normalized.includes("not found for api version")
  ) {
    return new ApiError(400, `Gemini model is invalid/unavailable: ${providerMessage}`);
  }

  return new ApiError(statusCode, providerMessage);
};

interface GeminiGenerateOptions {
  model?: string;
  systemInstruction?: string;
  tools?: any[];
  responseMimeType?: "application/json" | "text/plain";
  responseSchema?: Record<string, unknown>;
}

interface GeminiCitation {
  uri: string;
  title: string;
}

interface GeminiGenerateResult {
  text: string;
  citations: GeminiCitation[];
}

const SUPPORTED_MIME_TYPES = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const LOCAL_EXTRACTION_MIME_TYPES = new Set<string>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const extractFirstBalancedJsonObject = (text: string): string | null => {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  return null;
};

const parseJsonFromModelText = (rawText: string): unknown => {
  const text = String(rawText || "").trim();
  if (!text) {
    throw new Error("Model returned an empty response.");
  }

  const codeBlockMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  const candidateFromCodeBlock = codeBlockMatch?.[1]?.trim();

  const directCandidates = [candidateFromCodeBlock, text].filter(
    (item): item is string => Boolean(item && item.trim()),
  );

  for (const candidate of directCandidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      const objectCandidate = extractFirstBalancedJsonObject(candidate);
      if (!objectCandidate) continue;
      try {
        return JSON.parse(objectCandidate);
      } catch {
        continue;
      }
    }
  }

  throw new Error("Could not parse valid JSON object from model response.");
};

const generateWithGemini = async (
  prompt: string,
  options: GeminiGenerateOptions = {},
): Promise<GeminiGenerateResult> => {
  const model = options.model || getGeminiModel();
  const requestBody: any = {
    contents: [{ parts: [{ text: String(prompt) }] }],
  };

  if (options.systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  if (options.tools?.length) {
    requestBody.tools = options.tools;
  }

  if (options.responseMimeType || options.responseSchema) {
    requestBody.generationConfig = {
      ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
      ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
    };
  }

  try {
    const response = await axios.post(
      `${buildGeminiUrl(model)}?key=${getGeminiApiKey()}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const candidate = response.data?.candidates?.[0];
    let modelText = candidate?.content?.parts?.[0]?.text || "";

    if (!modelText) {
      throw new ApiError(500, "No response from Gemini model");
    }

    const codeBlockMatch = modelText.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (codeBlockMatch) {
      modelText = codeBlockMatch[1];
    }

    const groundingMetadata = candidate?.groundingMetadata;
    const citations: GeminiCitation[] =
      groundingMetadata?.groundingAttributions
        ?.map((attribution: any) => ({
          uri: attribution?.web?.uri,
          title: attribution?.web?.title,
        }))
        .filter((item: GeminiCitation) => item.uri && item.title) || [];

    return {
      text: modelText,
      citations,
    };
  } catch (error: any) {
    throw mapGeminiError(error);
  }
};

export async function summarizeAgreementWithGemini(prompt: string): Promise<any> {
  const { text } = await generateWithGemini(prompt, {
    model: getGeminiModel(),
  });
  try {
    return parseJsonFromModelText(text);
  } catch {
    return text;
  }
}

export async function summarizeAgreementWithGeminiStructured<T>(
  prompt: string,
  validator: (raw: unknown) => T,
  options: {
    maxAttempts?: number;
    responseMimeType?: "application/json" | "text/plain";
    responseSchema?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const maxAttempts = Math.min(5, Math.max(1, options.maxAttempts ?? 2));
  let attemptPrompt = prompt;
  let lastErrorMessage = "Unknown validation error";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { text } = await generateWithGemini(attemptPrompt, {
      model: getGeminiModel(),
      responseMimeType: options.responseMimeType,
      responseSchema: options.responseSchema,
    });

    try {
      const parsed = parseJsonFromModelText(text);
      return validator(parsed);
    } catch (error: unknown) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      if (attempt === maxAttempts) break;

      attemptPrompt = `${prompt}

Important:
- Return ONLY one JSON object (no markdown, no extra text).
- The response MUST pass this validation: ${lastErrorMessage}
- Keep all required keys and correct data types.`;
    }
  }

  throw new ApiError(
    502,
    `Model returned invalid structured output after ${maxAttempts} attempts. ${lastErrorMessage}`,
  );
}

export async function processWithGemini(task: string): Promise<any> {
  const prompt = `Given the following task, answer these questions in JSON format with keys: processSteps, requiredDocuments, creationLinks, priceInfo, needExpert.

⚠️ Important formatting rules:
- Provide plain text only (no markdown, no bold, no numbering like 1., 2., etc).
- Each item should be a clean string.
- creationLinks must be an array of objects with keys: name, url, disclaimer.
- Do not invent or assume links. If no reliable link exists, set "url": "N/A".
- If a disclaimer is needed, write it in plain text without symbols like * or **.
- Prices must be given in Indian Rupees (₹), with approximate ranges.

Questions:
1. List the process steps as an array of plain text items (no numbering, just the description).
2. What are the documents required for this task?
3. From where can we create documents (websites/links)?
4. What are the prices of the document?
5. When do we need a lawyer or CA?

Task: ${task}`;

  const { text } = await generateWithGemini(prompt, {
    model: getGeminiModel(),
  });

  try {
    return parseJsonFromModelText(text);
  } catch {
    return { raw: text };
  }
}

export async function chatbotWithGemini(message: string): Promise<{
  text: string;
  citations: GeminiCitation[];
}> {
  const systemPrompt =
    "Act as an expert in Indian legal topics, with a focus on detailed and practical explanations. If a query is unrelated to Indian law, politely refuse and ask a legal-topic question instead. Remind users you are an AI assistant and not a lawyer. Keep answers concise and clear.";

  const result = await generateWithGemini(message, {
    model: getGeminiChatbotModel(),
    systemInstruction: systemPrompt,
    tools: [{ google_search: {} }],
  });

  return result;
}

const normalizeExtractedText = (text: string): string => {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const hasLegalSignals = (text: string): boolean => {
  const legalSignalPattern =
    /\b(agreement|contract|clause|party|parties|liability|termination|payment|jurisdiction|confidential|obligation|indemnity)\b/i;
  return legalSignalPattern.test(text);
};

const isHighQualityLocalExtraction = (text: string): boolean => {
  const normalized = normalizeExtractedText(text);
  if (normalized.length < 1200) return false;
  if (!hasLegalSignals(normalized)) return false;

  const alnumCount = (normalized.match(/[a-z0-9]/gi) || []).length;
  const symbolCount = (normalized.match(/[^a-z0-9\s]/gi) || []).length;

  if (alnumCount < 500) return false;
  if (symbolCount > alnumCount * 0.9) return false;

  return true;
};

const extractPdfLocally = async (fileBuffer: Buffer): Promise<string> => {
  const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text?: string }>;
  const parsed = await pdfParse(fileBuffer);
  return normalizeExtractedText(parsed?.text || "");
};

const extractDocxLocally = async (fileBuffer: Buffer): Promise<string> => {
  const mammoth = require("mammoth") as {
    extractRawText: (input: { buffer: Buffer }) => Promise<{ value?: string }>;
  };
  const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
  return normalizeExtractedText(parsed?.value || "");
};

const extractTextLocally = async (fileBuffer: Buffer, mimeType: string): Promise<string | null> => {
  if (!LOCAL_EXTRACTION_MIME_TYPES.has(mimeType)) {
    return null;
  }

  if (mimeType === "text/plain") {
    return normalizeExtractedText(fileBuffer.toString("utf-8"));
  }

  if (mimeType === "application/pdf") {
    return extractPdfLocally(fileBuffer);
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractDocxLocally(fileBuffer);
  }

  return null;
};

export async function extractTextFromFileWithGemini(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!fileBuffer?.length) {
    throw new ApiError(400, "Uploaded file is empty");
  }

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(400, `Unsupported file type: ${mimeType}`);
  }

  const model = process.env.GEMINI_DOC_MODEL || process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
  const extractionPrompt =
    "Extract all readable text from this legal document exactly as plain text. Preserve important clause numbering/structure where possible. Do not summarize, only extract text.";

  const requestBody: any = {
    contents: [
      {
        parts: [
          { text: extractionPrompt },
          {
            inlineData: {
              mimeType,
              data: fileBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
  };

  try {
    const response = await axios.post(
      `${buildGeminiUrl(model)}?key=${getGeminiApiKey()}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const extractedText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!extractedText.trim()) {
      throw new ApiError(500, "No extractable text found in uploaded file");
    }

    return extractedText;
  } catch (error: any) {
    throw mapGeminiError(error);
  }
}

export async function extractTextFromFileSmart(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!fileBuffer?.length) {
    throw new ApiError(400, "Uploaded file is empty");
  }

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(400, `Unsupported file type: ${mimeType}`);
  }

  try {
    const localExtraction = await extractTextLocally(fileBuffer, mimeType);
    if (localExtraction && isHighQualityLocalExtraction(localExtraction)) {
      return localExtraction;
    }
  } catch {
    // Fallback to Gemini OCR/extraction path for resilience.
  }

  return extractTextFromFileWithGemini(fileBuffer, mimeType);
}

const translate = new Translate();

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const [translation] = await translate.translate(text, targetLanguage);
    return translation;
  } catch (error: any) {
    throw new ApiError(500, error.message || "Translation failed");
  }
}
