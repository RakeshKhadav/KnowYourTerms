import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { ApiError } from "./utility/ApiError";
import ApiResponse from "./utility/ApiResponse";
import userRouter from "./routes/user.router";
import agreementRouter from "./routes/agreement.router";
import adminRouter from "./routes/admin.router";
import caseRouter from "./routes/case.routers";
import agentRouter from "./routes/agent.router";
dotenv.config();

const app = express();

// CORS middleware
const frontendUrl = process.env.FRONTEND_URL;
const allowedOrigins = frontendUrl
  ? frontendUrl.split(",").map((origin) => origin.trim())
  : [];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/agreements", agreementRouter);
app.use("/api/v1/admins", adminRouter);
app.use("/api/v1/cases", caseRouter);
app.use("/api/v1/agents", agentRouter);
app.get("/api/v1/active", (req: Request, res: Response) => {
  res.status(200).json(new ApiResponse(200, "Platform active"));
});

// Serve static files from React build
// const buildPath = path.join(__dirname, '../../frontend/dist');
// app.use(express.static(buildPath));

// app.use((req, res, next) => {
//   // Skip API routes
//   if (req.path.startsWith('/api')) {
//     return next();
//   }
//   res.sendFile(path.join(buildPath, 'index.html'));
// });

// Centralized error handler
const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  console.error("Global Error Handler Caught:", err); // Log full error for debugging

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }
  // JWT/Auth errors
  if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      message: err.message || "Authentication error",
    });
    return;
  }
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
};

app.use(errorHandler);

export { app };
