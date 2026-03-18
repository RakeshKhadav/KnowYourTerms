import {  useCallback, type ReactNode } from "react";
import { 
  Chat, 
  useCreateChatClient,
  type User,
} from "../lib/components";
import { LoadingScreen } from "../components/loading-screen";
import { useTheme } from "../hooks/use-theme";
import { agentService } from "../services/agentService";
import { streamKey } from "../utils/baseApi";

interface ChatProviderProps {
  user: User;
  children: ReactNode;
}

if (!streamKey) {
  throw new Error("Missing streamKey");
}

export const ChatProvider = ({ user, children }: ChatProviderProps) => {
  const { theme } = useTheme();

  /**
   * Token provider function that fetches authentication tokens from our backend-term.
   * This is called automatically by the Stream Chat client when:
   * - Initial connection is established
   * - Token expires and needs refresh
   * - Connection is re-established after network issues
   */
  const tokenProvider = useCallback(async () => {
    if (!user) {
      throw new Error("User not available");
    }

    try {
      const response = await agentService.getStreamToken();
      return response.data.token;
    } catch (err) {
      console.error("Error fetching token:", err);
      throw err;
    }
  }, [user]);

  /**
   * Create the Stream Chat client with automatic token management.
   * This handles:
   * - Initial authentication with JWT-authenticated backend
   * - WebSocket connection management
   * - Automatic token refresh
   * - Real-time event handling
   */
  const client = useCreateChatClient({
    apiKey: streamKey,
    tokenOrProvider: tokenProvider,
    userData: user,
  });

  // Show loading screen while client is being initialized
  if (!client) {
    return <LoadingScreen />;
  }

  return (
    <Chat
      client={client}
      theme={
        theme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light"
      }
    >
      {children}
    </Chat>
  );
};
