
// Model for storing case history/metadata (for judges, search, etc.)
export interface CaseModel {
  id: string; // Firestore doc ID
  caseNumber: string;
  title: string;
  parties: string[];
  judge?: string;
  status: string;
  summary?: string;
  relatedLaws?: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}
