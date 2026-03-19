// Shared types for agreement summaries
export interface ClauseCitation {
  quote: string;
  location: string;
}

export interface BusinessClause {
  title: string;
  explanation: string;
  risk: string;
  improvement: string;
  citations?: ClauseCitation[];
}

export interface DeterministicRiskFinding {
  ruleId: string;
  title: string;
  severity: "high" | "medium" | "low";
  issue: string;
  recommendation: string;
  citations: ClauseCitation[];
}

export interface BusinessOutput {
  title?: string;
  about: string;
  clauses: BusinessClause[];
  financials: {
    totalFee: string;
    paymentMilestones: string[];
    lateFee: string;
  };
  keyComplianceNotes: string[];
  finalAssessment: {
    overallScore?: number;
    overallRisk?: string;
    comment: string;
    recommendations?: string[];
  };
  deterministicRiskFindings?: DeterministicRiskFinding[];
}
export interface User {
  name?: string;
  id: string;
  image?: string;
  email: string;
  emailVerified?: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  roles?: ('USER' | 'ADMIN')[];
  userStatus?: 'active' | 'pending' | 'suspended'; // Account status
  providerId?: string;
  region?: string;
  language?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface AgreementSummary {
  file: File;
  uid: string;
  targetGroup: string;
}

export interface AgreementProcess {
  uid: string;
  processType: string;
}
