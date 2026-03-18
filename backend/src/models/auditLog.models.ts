import { model, Schema, type Document } from "mongoose";

export interface AuditLogModel {
  uid: string;
  action: string;
  status: "success" | "failure";
  entityType: "User" | "Agreement" | "Case" | "VideoSession" | "Other";
  details?: string;
  createdAt?: Date;
}

export interface AuditLogDocument extends AuditLogModel, Document {
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    uid: { type: String, required: true, index: true },
    action: { type: String, required: true },
    status: { type: String, enum: ["success", "failure"], required: true },
    entityType: {
      type: String,
      enum: ["User", "Agreement", "Case", "VideoSession", "Other"],
      required: true,
    },
    details: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const AuditLog = model<AuditLogDocument>("AuditLog", auditLogSchema);
