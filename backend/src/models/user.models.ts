import { model, Schema, type Document } from "mongoose";

export type UserRole = "USER" | "JUDGE" | "ADMIN";
export type UserStatus = "active" | "pending" | "suspended";

export interface RefreshSessionModel {
  jti: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface UserModel {
  uid: string;
  email: string;
  passwordHash?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  roles?: UserRole[];
  userStatus?: UserStatus;
  providerId?: string;
  region?: string;
  language?: string;
  profileCompleted?: boolean;
  status?: UserStatus;
  isBlocked?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  auditLogs?: string[];
  fcmToken?: string;
  isLawyer?: boolean;
  isCA?: boolean;
  availability?: boolean;
  isJudge?: boolean;
  metadata?: Record<string, any>;
  refreshSessions?: RefreshSessionModel[];
}

export interface UserDocument extends Omit<UserModel, "createdAt" | "updatedAt">, Document {
  createdAt: Date;
  updatedAt: Date;
}

const refreshSessionSchema = new Schema<RefreshSessionModel>(
  {
    jti: { type: String, required: true },
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    emailVerified: { type: Boolean, default: false },
    displayName: { type: String, default: "" },
    photoURL: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    roles: {
      type: [String],
      enum: ["USER", "JUDGE", "ADMIN"],
      default: ["USER"],
    },
    userStatus: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "active",
    },
    providerId: { type: String, default: "password" },
    region: { type: String, default: "" },
    language: { type: String, default: "en" },
    profileCompleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "active",
    },
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    auditLogs: { type: [String], default: [] },
    fcmToken: { type: String },
    isLawyer: { type: Boolean, default: false },
    isCA: { type: Boolean, default: false },
    availability: { type: Boolean, default: false },
    isJudge: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
    refreshSessions: { type: [refreshSessionSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const User = model<UserDocument>("User", userSchema);
