import { Router } from "express";

import { 
  registerUser,
  loginUser,
  refreshUserToken,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth";
import { getAgreementHistory, getProcessHistory } from "../controllers/history.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshUserToken);
router.post("/logout", logoutUser);
router.get("/all-users", authenticate, getAllUsers);

// Protected routes (require authentication)
router.get("/user-profile", authenticate, getUserProfile);
router.put("/update-profile", authenticate, updateUserProfile);
router.get("/agreement-history", authenticate, getAgreementHistory);
router.get("/process-history", authenticate, getProcessHistory);

export default router;

