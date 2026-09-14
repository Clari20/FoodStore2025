import { create } from 'zustand';
import { authApi } from '../api/authApi';
import { useCartStore } from './cartStore';
import type { LoginRequest, UserResponse } from '../types';

interface AuthState {
  usuario: UserResponse | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;

  initializeAuth: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (role: string) => boolean;
  setUsuario: (usuario: UserResponse) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  usuario: null,
  isAuthenticated: false,
  isAuthLoading: true,

  initializeAuth: async () => {
    localStorage.removeItem('authStore');

    try {
      const usuario = await authApi.me();

      set({
        usuario,
        isAuthenticated: true,
      });
    } catch {
      set({
        usuario: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isAuthLoading: false });
    }
  },

  login: async (credentials) => {
    const authResponse = await authApi.login(credentials);

    set({
      usuario: authResponse.user,
      isAuthenticated: true,
      isAuthLoading: false,
    });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({
        usuario: null,
        isAuthenticated: false,
        isAuthLoading: false,
      });
      useCartStore.getState().clearCart();
    }
  },

  refreshToken: async () => {
    try {
      const authResponse = await authApi.refresh();

      set({
        usuario: authResponse.user,
        isAuthenticated: true,
        isAuthLoading: false,
      });
    } catch (error) {
      set({
        usuario: null,
        isAuthenticated: false,
        isAuthLoading: false,
      });
      throw error;
    }
  },

  hasRole: (role) => {
    const roles = get().usuario?.roles || [];
    return roles.includes(role);
  },

  setUsuario: (usuario) => {
    set({ usuario, isAuthenticated: true, isAuthLoading: false });
  },
}));
