import { model, Schema, type Document } from "mongoose";

export interface ProcessHistory {
  uid: string;
  processType: string;
  processedAt: Date;
  processSteps: string[];
  requiredDocuments: string[];
  creationLinks: Array<Record<string, any> | string>;
  priceInfo: Array<Record<string, any> | string>;
  needExpert: string[] | string;
  aiRawOutput?: any;
  language?: string;
}

export interface AgreementHistory {
  uid: string;
  targetGroup?: string;
  processedAt: Date;
  summary: string;
  aiRawOutput?: any;
  language?: string;
}

export interface ProcessHistoryDocument extends ProcessHistory, Document {}
export interface AgreementHistoryDocument extends AgreementHistory, Document {}

const processHistorySchema = new Schema<ProcessHistoryDocument>(
  {
    uid: { type: String, required: true, index: true },
    processType: { type: String, required: true },
    processedAt: { type: Date, default: Date.now, index: true },
    processSteps: { type: [String], default: [] },
    requiredDocuments: { type: [String], default: [] },
    creationLinks: { type: [Schema.Types.Mixed], default: [] },
    priceInfo: { type: [Schema.Types.Mixed], default: [] },
    needExpert: { type: Schema.Types.Mixed, default: [] },
    aiRawOutput: { type: Schema.Types.Mixed },
    language: { type: String, default: "en" },
  },
  { versionKey: false },
);

const agreementHistorySchema = new Schema<AgreementHistoryDocument>(
  {
    uid: { type: String, required: true, index: true },
    targetGroup: { type: String, default: "student" },
    processedAt: { type: Date, default: Date.now, index: true },
    summary: { type: String, required: true },
    aiRawOutput: { type: Schema.Types.Mixed },
    language: { type: String, default: "en" },
  },
  { versionKey: false },
);

processHistorySchema.index({ uid: 1, processedAt: -1 });
agreementHistorySchema.index({ uid: 1, processedAt: -1 });

export const ProcessHistoryModel = model<ProcessHistoryDocument>(
  "ProcessHistory",
  processHistorySchema,
);

export const AgreementHistoryModel = model<AgreementHistoryDocument>(
  "AgreementHistory",
  agreementHistorySchema,
);
