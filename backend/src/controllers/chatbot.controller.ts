import { Request, Response } from "express";
import ApiResponse from "../utility/ApiResponse";
import { ApiError } from "../utility/ApiError";
import { asyncHandler } from "../utility/asyncHandler";
import { chatbotWithGemini } from "../services/geminiApi.services";

export const publicLegalChatbot = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    throw new ApiError(400, "message is required");
  }

  const result = await chatbotWithGemini(message.trim());

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        text: result.text,
        citations: result.citations,
      },
      "Chatbot response generated",
    ),
  );
});

