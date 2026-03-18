export type UserRole = "USER" | "ADMIN" | "JUDGE";

export interface AuthUser {
  uid: string;
  email: string;
  emailVerified?: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  roles?: UserRole[];
  providerId?: string;
  region?: string;
  language?: string;
  status?: "active" | "pending" | "suspended";
  isBlocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
}
