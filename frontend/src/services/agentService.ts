import api from "../utils/baseApi";
import { authService } from "./authService";

export interface StartAgentRequest {
  channel_id: string;
  channel_type?: string;
  agreementSummary: string;
}

export interface AgentResponse {
  success: boolean;
  data: {
    channel_id: string;
    agent_id: string;
    user_id: string;
    status?: string;
    activeAgents?: number;
  };
  message: string;
}

export interface StreamTokenResponse {
  success: boolean;
  data: {
    token: string;
  };
  message: string;
}

class AgentService {
  async startAgent(params: StartAgentRequest): Promise<AgentResponse> {
    const response = await api.post("/agents/start-ai-agent", params);
    return response.data;
  }

  async stopAgent(channelId: string): Promise<AgentResponse> {
    const response = await api.post("/agents/stop-ai-agent", { channel_id: channelId });
    return response.data;
  }

  async getAgentStatus(channelId: string): Promise<AgentResponse> {
    const response = await api.get("/agents/agent-status", {
      params: { channel_id: channelId },
    });
    return response.data;
  }

  async getStreamToken(): Promise<StreamTokenResponse> {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser?.uid) {
      throw new Error("No authenticated user found");
    }

    const response = await api.post("/agents/token", { userId: currentUser.uid });
    return response.data;
  }
}

export const agentService = new AgentService();
