import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { CookieOptions, Request, Response } from "express";
import { User, UserDocument, UserRole } from "../models/user.models";
import { asyncHandler } from "../utility/asyncHandler";
import { ApiError } from "../utility/ApiError";
import ApiResponse from "../utility/ApiResponse";
import {
  ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  AuthUserPayload,
  REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  decodeJwtExpiry,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utility/authTokens";
import { createAuditLog } from "./admin.controller";

type RequestUser = {
  uid: string;
  email: string;
  roles: UserRole[];
  language?: string;
};

const isProduction = process.env.NODE_ENV === "production";
const cookieBaseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const sanitizeUser = (user: UserDocument) => ({
  uid: user.uid,
  email: user.email,
  emailVerified: user.emailVerified || false,
  displayName: user.displayName || "",
  photoURL: user.photoURL || "",
  phoneNumber: user.phoneNumber || "",
  roles: user.roles || ["USER"],
  providerId: user.providerId || "password",
  region: user.region || "",
  language: user.language || "en",
  status: user.status || "active",
  isBlocked: user.isBlocked || false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLoginAt: user.lastLoginAt || null,
});

const getRequestUser = (req: Request): RequestUser | undefined => {
  return req.user as RequestUser | undefined;
};

const buildAuthPayload = (user: UserDocument): AuthUserPayload => ({
  uid: user.uid,
  email: user.email,
  roles: (user.roles as UserRole[]) || ["USER"],
  language: user.language || "en",
});

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie("accessToken", accessToken, {
    ...cookieBaseOptions,
    maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieBaseOptions,
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  });
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie("accessToken", cookieBaseOptions);
  res.clearCookie("refreshToken", cookieBaseOptions);
};

const issueSessionTokens = async (
  user: UserDocument,
  req: Request,
  res: Response,
): Promise<{ accessToken: string }> => {
  const authPayload = buildAuthPayload(user);
  const accessToken = signAccessToken(authPayload);
  const jti = randomUUID();
  const refreshToken = signRefreshToken(authPayload, jti);
  const refreshExpiry = decodeJwtExpiry(refreshToken);

  if (!refreshExpiry) {
    throw new ApiError(500, "Failed to generate refresh token");
  }

  const now = new Date();
  const tokenHash = hashToken(refreshToken);
  const existingSessions = (user.refreshSessions || [])
    .filter((session) => !session.revokedAt && new Date(session.expiresAt) > now)
    .slice(-4);

  const nextSessions = [
    ...existingSessions,
    {
      jti,
      tokenHash,
      createdAt: now,
      expiresAt: refreshExpiry,
      userAgent: req.get("user-agent") || "",
      ipAddress: req.ip || "",
    },
  ];

  user.set("refreshSessions", nextSessions);
  await user.save();

  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken };
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, displayName, roles, region, language } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ApiError(400, "Invalid email format.");
  }

  if (String(password).length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long.");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email.");
  }

  const allowedRoles = new Set<UserRole>(["USER", "ADMIN", "JUDGE"]);
  const requestedRoles = Array.isArray(roles) ? roles : ["USER"];
  const safeRoles = requestedRoles.filter((role) => allowedRoles.has(role)) as UserRole[];

  const passwordHash = await bcrypt.hash(String(password), 12);

  const user = await User.create({
    uid: randomUUID(),
    email: normalizedEmail,
    passwordHash,
    displayName: displayName || "",
    roles: safeRoles.length ? safeRoles : ["USER"],
    providerId: "password",
    region: region || "",
    language: language || "en",
    status: "active",
    isBlocked: false,
  });

  await createAuditLog({
    uid: user.uid,
    action: "USER_REGISTERED",
    status: "success",
    entityType: "User",
    details: `User registered with email: ${user.email}`,
  });

  const { accessToken } = await issueSessionTokens(user, req, res);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {
          user: sanitizeUser(user),
          accessToken,
        },
        "User registered successfully",
      ),
    );
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.passwordHash) {
    await createAuditLog({
      uid: "unknown",
      action: "USER_LOGIN",
      status: "failure",
      entityType: "User",
      details: `Invalid login attempt for email: ${normalizedEmail}`,
    });
    throw new ApiError(401, "Invalid email or password.");
  }

  const isPasswordValid = await bcrypt.compare(String(password), user.passwordHash);
  if (!isPasswordValid) {
    await createAuditLog({
      uid: user.uid,
      action: "USER_LOGIN",
      status: "failure",
      entityType: "User",
      details: `Invalid password attempt for email: ${normalizedEmail}`,
    });
    throw new ApiError(401, "Invalid email or password.");
  }

  if (user.isBlocked) {
    await createAuditLog({
      uid: user.uid,
      action: "USER_LOGIN",
      status: "failure",
      entityType: "User",
      details: `Blocked user login attempt for email: ${normalizedEmail}`,
    });
    throw new ApiError(403, "User is blocked.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  await createAuditLog({
    uid: user.uid,
    action: "USER_LOGIN",
    status: "success",
    entityType: "User",
    details: `User logged in with email: ${user.email}`,
  });

  const { accessToken } = await issueSessionTokens(user, req, res);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          user: sanitizeUser(user),
          accessToken,
        },
        "Login successful",
      ),
    );
});

const refreshUserToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingToken) {
    throw new ApiError(401, "Refresh token is missing");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingToken);
  } catch (_error) {
    clearAuthCookies(res);
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (decoded.tokenType !== "refresh" || !decoded.jti) {
    clearAuthCookies(res);
    throw new ApiError(401, "Invalid refresh token payload");
  }

  const user = await User.findOne({ uid: decoded.uid });
  if (!user) {
    clearAuthCookies(res);
    throw new ApiError(401, "User not found");
  }

  const tokenHash = hashToken(incomingToken);
  const now = new Date();
  const activeSession = (user.refreshSessions || []).find(
    (session) =>
      session.jti === decoded.jti &&
      session.tokenHash === tokenHash &&
      !session.revokedAt &&
      new Date(session.expiresAt) > now,
  );

  if (!activeSession) {
    clearAuthCookies(res);
    throw new ApiError(401, "Refresh session is invalid or expired");
  }

  activeSession.revokedAt = now;
  const { accessToken } = await issueSessionTokens(user, req, res);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: sanitizeUser(user),
        accessToken,
      },
      "Token refreshed successfully",
    ),
  );
});

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (incomingToken) {
    try {
      const decoded = verifyRefreshToken(incomingToken);
      const user = await User.findOne({ uid: decoded.uid });

      if (user) {
        const tokenHash = hashToken(incomingToken);
        const session = (user.refreshSessions || []).find(
          (entry) => entry.jti === decoded.jti && entry.tokenHash === tokenHash && !entry.revokedAt,
        );
        if (session) {
          session.revokedAt = new Date();
          await user.save();
        }
      }
    } catch (_error) {
      // Silent clear is enough for logout when token is stale/invalid.
    }
  }

  clearAuthCookies(res);
  return res.status(200).json(new ApiResponse(200, {}, "Logged out successfully"));
});

const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  const uid = authUser?.uid;

  if (!uid) {
    throw new ApiError(401, "User is not authenticated.");
  }

  const user = await User.findOne({ uid });
  if (!user) {
    throw new ApiError(404, "User profile not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, sanitizeUser(user), "User profile retrieved successfully"));
});

const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find({}).sort({ createdAt: -1 });
  if (users.length === 0) {
    throw new ApiError(404, "No users found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, users.map((user) => sanitizeUser(user)), "Users retrieved successfully"));
});

const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const authUser = getRequestUser(req);
  if (!authUser?.uid) {
    throw new ApiError(401, "Unauthorized");
  }

  const { uid, displayName, phoneNumber, region, language } = req.body;
  const targetUid = uid || authUser.uid;
  const isAdmin = Array.isArray(authUser.roles) && authUser.roles.includes("ADMIN");

  if (targetUid !== authUser.uid && !isAdmin) {
    throw new ApiError(403, "You can only update your own profile");
  }

  const updateData: Record<string, string> = {};
  if (typeof displayName === "string") updateData.displayName = displayName;
  if (typeof phoneNumber === "string") updateData.phoneNumber = phoneNumber;
  if (typeof region === "string") updateData.region = region;
  if (typeof language === "string") updateData.language = language;

  const updatedUser = await User.findOneAndUpdate({ uid: targetUid }, updateData, {
    new: true,
  });

  if (!updatedUser) {
    await createAuditLog({
      uid: targetUid,
      action: "USER_PROFILE_UPDATED",
      status: "failure",
      entityType: "User",
      details: `Failed to update user profile for uid: ${targetUid}`,
    });
    throw new ApiError(404, "User not found.");
  }

  await createAuditLog({
    uid: targetUid,
    action: "USER_PROFILE_UPDATED",
    status: "success",
    entityType: "User",
    details: `User profile updated for uid: ${targetUid}`,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, sanitizeUser(updatedUser), "Profile updated successfully"));
});

export {
  registerUser,
  loginUser,
  refreshUserToken,
  logoutUser,
  getUserProfile,
  getAllUsers,
  updateUserProfile,
};
