export interface FeedbackModel {
  id: string;
  uid: string;
  feedback: string;
  rating?: number;
  createdAt: Date;
  relatedDocId?: string; // e.g., agreement, process, or case
  metadata?: Record<string, any>;
}
