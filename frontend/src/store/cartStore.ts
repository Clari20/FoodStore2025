/** Carrito de compras — persistido en localStorage con zustand persist. */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Producto } from "../types";

interface CartState {
  items: CartItem[];
  addItem: (producto: Producto, cantidad?: number, personalizacion?: number[]) => void;
  removeItem: (cartItemId: string) => void;
  updateCantidad: (cartItemId: string, cantidad: number) => void;
  updateQuantity: (cartItemId: string, cantidad: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (producto, cantidad = 1, personalizacion = []) => {
        set((state) => {
          // Generar cartItemId único basado en ID y personalización ordenada
          const sortedPers = [...personalizacion].sort();
          const cartItemId = `${producto.id}-${sortedPers.join(',')}`;

          const existing = state.items.find((i) => i.cartItemId === cartItemId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cartItemId === cartItemId
                  ? { ...i, cantidad: i.cantidad + cantidad }
                  : i
              ),
            };
          }
          return { items: [...state.items, { cartItemId, producto, cantidad, personalizacion }] };
        });
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => (i.cartItemId || `legacy-${i.producto.id}`) !== cartItemId),
        }));
      },

      updateCantidad: (cartItemId, cantidad) => {
        if (cantidad < 1) return;
        set((state) => ({
          items: state.items.map((i) =>
            (i.cartItemId || `legacy-${i.producto.id}`) === cartItemId ? { ...i, cantidad } : i
          ),
        }));
      },

      updateQuantity: (cartItemId, cantidad) => {
        if (cantidad < 1) return;
        set((state) => ({
          items: state.items.map((i) =>
            (i.cartItemId || `legacy-${i.producto.id}`) === cartItemId ? { ...i, cantidad } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce(
          (sum, i) => sum + Number(i.producto.precio_base) * i.cantidad,
          0
        ),

      itemCount: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),

      getTotalPrice: () =>
        get().items.reduce(
          (sum, i) => sum + Number(i.producto.precio_base) * i.cantidad,
          0
        ),
    }),
    { name: "cartStore" }
  )
);
