import { Request, Response, NextFunction } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

// Extend Express Request type to include 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        roles: string[];
        language?: string;
      };
    }
  }
}

import { asyncHandler } from "../utility/asyncHandler";
import { ApiError } from "../utility/ApiError";
import { verifyAccessToken } from "../utility/authTokens";

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const cookieToken = req.cookies?.accessToken || null;
  const accessToken = bearerToken || cookieToken;

  if (!accessToken) {
    throw new ApiError(401, 'No token provided');
  }

  try {
    const decodedToken = verifyAccessToken(accessToken);
    if (!decodedToken || decodedToken.tokenType !== "access") {
      throw new ApiError(401, 'You are not authorized to access this resource');
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      roles: decodedToken.roles,
      language: decodedToken.language,
    };

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
      throw new ApiError(401, 'Invalid or expired token');
    }
    throw error;
  }
});
