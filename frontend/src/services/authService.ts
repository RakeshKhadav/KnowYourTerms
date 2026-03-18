import api from "../utils/baseApi";
import type { AuthResponseData, AuthUser } from "../types/auth";

interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  region: string;
  role?: "USER";
  language?: string;
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponseData> {
    const response = await api.post('/users/register', data);
    return response.data.data; 
  },

  async login(data: { email: string; password: string }): Promise<AuthResponseData> {
    const response = await api.post('/users/login', data);
    return response.data.data;
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await api.get('/users/user-profile');
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/users/logout', {});
    localStorage.removeItem("accessToken");
  },

  // Token management for agent services
  async getToken(): Promise<string | null> {
    return localStorage.getItem("accessToken");
  },
};
