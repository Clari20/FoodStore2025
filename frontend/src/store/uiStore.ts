import { create } from 'zustand';

interface ConfirmModalData {
  title: string;
  message?: string;
  onConfirm: () => void;
}

interface UiState {
  cartOpen: boolean;
  sidebarOpen: boolean;
  confirmModal: ConfirmModalData | null;
  openCart: () => void;
  closeCart: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openConfirmModal: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  cartOpen: false,
  sidebarOpen: false,
  confirmModal: null,
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  openConfirmModal: (title, message, onConfirm) => set({ confirmModal: { title, message, onConfirm } }),
  closeConfirmModal: () => set({ confirmModal: null }),
}));