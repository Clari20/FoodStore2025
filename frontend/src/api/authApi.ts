/** API de autenticación. */
import axiosClient from "./axiosClient";
import type { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from "../types";

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await axiosClient.post<AuthResponse>("/auth/login", data);
    return res.data;
  },

  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const res = await axiosClient.post<UserResponse>("/auth/register", data);
    return res.data;
  },

  refresh: async (): Promise<AuthResponse> => {
    const res = await axiosClient.post<AuthResponse>("/auth/refresh");
    return res.data;
  },

  me: async (): Promise<UserResponse> => {
    const res = await axiosClient.get<UserResponse>("/auth/me");
    return res.data;
  },

  updateMe: async (data: { nombre: string; apellido: string; celular: string }): Promise<UserResponse> => {
    const res = await axiosClient.put<UserResponse>("/auth/me", data);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await axiosClient.post("/auth/logout");
  },
};
