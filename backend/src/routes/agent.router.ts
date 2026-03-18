import { Router } from 'express';
import {
  startAiAgent,
  stopAiAgent,
  getAgentStatus,
  generateToken,
  getSystemInfo
} from '../controllers/agent.controller';
import { publicLegalChatbot } from '../controllers/chatbot.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post("/public-chatbot", publicLegalChatbot);

// AI Agent management routes
router.post("/start-ai-agent", authenticate, startAiAgent);
router.post("/stop-ai-agent", authenticate, stopAiAgent);
router.get("/agent-status", authenticate, getAgentStatus);
router.post("/token", authenticate, generateToken);
router.get("/info", authenticate, getSystemInfo);

export default router;
