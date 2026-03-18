import { GoogleGenerativeAI, GenerativeModel, SchemaType } from "@google/generative-ai";
import type { Channel, DefaultGenerics, Event, StreamChat } from "stream-chat";
import type { AIAgent } from "../../types/agents";
import { GeminiResponseHandler } from "./GeminiResponseHandler";

export class GeminiAgent implements AIAgent {
  private genAI?: GoogleGenerativeAI;
  private model?: GenerativeModel;
  private chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  private lastInteractionTs = Date.now();

  private handlers: GeminiResponseHandler[] = [];
  private agreementSummary?: string;
  private authenticatedUser?: any;

  constructor(
    readonly chatClient: StreamChat,
    readonly channel: Channel,
    agreementSummary?: string,
    authenticatedUser?: any
  ) {
    this.agreementSummary = agreementSummary;
    this.authenticatedUser = authenticatedUser;
  }

  dispose = async () => {
    this.chatClient.off("message.new", this.handleMessage);
    await this.chatClient.disconnectUser();

    this.handlers.forEach((handler) => handler.dispose());
    this.handlers = [];
  };

  get user() {
    return this.chatClient.user;
  }

  getLastInteraction = (): number => this.lastInteractionTs;

  init = async () => {
    const apiKey = process.env.GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_AGENT_MODEL || "gemini-2.5-flash";
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: this.getWritingAssistantPrompt(this.agreementSummary),
      tools: [
        {
          functionDeclarations: [
            {
              name: "web_search",
              description:
                "Search the web for current information, news, facts, or research on any topic",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  query: {
                    type: SchemaType.STRING,
                    description: "The search query to find information about",
                  },
                },
                required: ["query"],
              },
            },
          ],
        },
      ],
    });

    this.chatClient.on("message.new", this.handleMessage);
  };

  private getWritingAssistantPrompt = (context?: string): string => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    const userContext = this.authenticatedUser 
      ? `User: ${this.authenticatedUser.email} (${this.authenticatedUser.uid})`
      : "Anonymous user";
      
    const agreementContext = this.agreementSummary ? 
      `\n\n**AGREEMENT SUMMARY TO ANALYZE:**\n${this.agreementSummary}\n` : 
      '\n\n**No agreement summary provided yet.**\n';
    
    return `You are a specialized Legal Document AI Assistant for "Know Your Terms" platform. Your ONLY purpose is to help users understand legal documents and answer questions about specific agreements.

**STRICT RESTRICTIONS:**
1. You can ONLY answer questions about the provided agreement summary below.
2. You can ONLY provide legal explanations, definitions, and clarifications related to the agreement.
3. You CANNOT provide general legal advice, personal opinions, or discuss topics unrelated to the specific agreement.
4. If asked about something not in the agreement, respond: "I can only answer questions about the specific agreement you uploaded. Please ask about clauses, terms, or conditions mentioned in your document."
5. If no agreement is provided, ask the user to upload their agreement first.

**Your Core Capabilities (ONLY for the provided agreement):**
- Explain specific clauses and their implications
- Define legal terms used in the agreement
- Highlight important obligations, rights, and responsibilities
- Explain potential risks or benefits of specific terms
- Clarify payment terms, termination conditions, and penalties
- **Web Search**: Use only for current legal precedents or law updates related to the agreement type

**Current Date**: ${currentDate}

**Response Guidelines:**
- Always reference specific parts of the agreement when answering
- Use simple, clear language to explain complex legal terms
- Be direct and factual
- If uncertain about a clause, suggest consulting a legal professional
- Never provide legal advice - only explanations

${agreementContext}

**Remember: You can ONLY discuss this specific agreement. Decline all other requests politely.**`;
  };

  private handleMessage = async (e: Event<DefaultGenerics>) => {
    if (!this.genAI || !this.model) {
      console.log("Gemini not initialized");
      return;
    }

    if (!e.message || e.message.ai_generated) {
      return;
    }

    const message = e.message.text;
    if (!message) return;

    this.lastInteractionTs = Date.now();

    const writingTask = (e.message.custom as { writingTask?: string })
      ?.writingTask;
    const context = writingTask ? `Writing Task: ${writingTask}` : undefined;

    // Add user message to chat history
    this.chatHistory.push({
      role: "user",
      parts: [{ text: message }],
    });

    const { message: channelMessage } = await this.channel.sendMessage({
      text: "",
      ai_generated: true,
    });

    await this.channel.sendEvent({
      type: "ai_indicator.update",
      ai_state: "AI_STATE_THINKING",
      cid: channelMessage.cid,
      message_id: channelMessage.id,
    });

    const handler = new GeminiResponseHandler(
      this.model,
      this.chatHistory,
      this.chatClient,
      this.channel,
      channelMessage,
      () => this.removeHandler(handler)
    );
    this.handlers.push(handler);
    void handler.run();
  };

  private removeHandler = (handlerToRemove: GeminiResponseHandler) => {
    this.handlers = this.handlers.filter(
      (handler) => handler !== handlerToRemove
    );
  };
}
