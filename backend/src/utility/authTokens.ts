import "dotenv/config";
import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import type { UserRole } from "../models/user.models";

export interface AuthUserPayload {
  uid: string;
  email: string;
  roles: UserRole[];
  language?: string;
}

export interface AccessTokenPayload extends AuthUserPayload {
  tokenType: "access";
}

export interface RefreshTokenPayload extends AuthUserPayload {
  tokenType: "refresh";
  jti: string;
}

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "7d";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}

if (!JWT_REFRESH_SECRET) {
  throw new Error("Missing JWT_REFRESH_SECRET or JWT_SECRET environment variable");
}

const parseDurationToMs = (duration: string): number => {
  const normalized = duration.trim().toLowerCase();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    return 15 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
};

export const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = parseDurationToMs(ACCESS_TOKEN_EXPIRES_IN);
export const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN);

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const signAccessToken = (user: AuthUserPayload): string => {
  const payload: AccessTokenPayload = {
    uid: user.uid,
    email: user.email,
    roles: user.roles,
    language: user.language,
    tokenType: "access",
  };

  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  });
};

export const signRefreshToken = (user: AuthUserPayload, jti: string): string => {
  const payload: RefreshTokenPayload = {
    uid: user.uid,
    email: user.email,
    roles: user.roles,
    language: user.language,
    tokenType: "refresh",
    jti,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET as string, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, JWT_SECRET as string) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET as string) as RefreshTokenPayload;
};

export const decodeJwtExpiry = (token: string): Date | null => {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
};
