import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DireccionResponse } from "../types";

interface OrdersState {
  checkoutStep: number;
  selectedAddress: DireccionResponse | null;
  paymentMethod: string | null;
  setCheckoutStep: (step: number) => void;
  setSelectedAddress: (address: DireccionResponse | null) => void;
  setPaymentMethod: (method: string) => void;
  resetCheckout: () => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set) => ({
      checkoutStep: 1,
      selectedAddress: null,
      paymentMethod: null,

      setCheckoutStep: (step) => set({ checkoutStep: step }),
      
      setSelectedAddress: (address) => set({ selectedAddress: address }),
      
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      
      resetCheckout: () => set({
        checkoutStep: 1,
        selectedAddress: null,
        paymentMethod: null
      }),
    }),
    { name: "ordersStore" }
  )
);
