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
}

interface GeminiCitation {
  uri: string;
  title: string;
}

interface GeminiGenerateResult {
  text: string;
  citations: GeminiCitation[];
}

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

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const candidateText = jsonMatch ? jsonMatch[0] : text;

  try {
    return JSON.parse(candidateText);
  } catch {
    return candidateText;
  }
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
    return JSON.parse(text);
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

export async function extractTextFromFileWithGemini(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!fileBuffer?.length) {
    throw new ApiError(400, "Uploaded file is empty");
  }

  const supportedMimeTypes = new Set<string>([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);

  if (!supportedMimeTypes.has(mimeType)) {
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

const translate = new Translate();

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const [translation] = await translate.translate(text, targetLanguage);
    return translation;
  } catch (error: any) {
    throw new ApiError(500, error.message || "Translation failed");
  }
}
