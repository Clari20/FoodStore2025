/** Hook para reconstruir el carrito desde un pedido existente ("Volver a pedir"). */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { pedidosApi } from "../api/pedidosApi";
import { productosApi } from "../api/productosApi";
import { useCartStore } from "../store/cartStore";

interface ReordenarResult {
  reordenar: (pedidoId: number) => Promise<void>;
  isLoading: boolean;
}

export function useReordenar(): ReordenarResult {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const clearCart = useCartStore((s) => s.clearCart);
  const addItem = useCartStore((s) => s.addItem);

  const reordenar = async (pedidoId: number) => {
    setIsLoading(true);
    try {
      const pedido = await pedidosApi.getById(pedidoId);

      // Fetch cada producto actual en paralelo
      const productosResult = await Promise.allSettled(
        pedido.detalles.map((d) => productosApi.getById(d.producto_id)),
      );

      // Mapear los detalles con los productos obtenidos
      const itemsParaCarrito: {
        producto: Awaited<ReturnType<typeof productosApi.getById>>;
        cantidad: number;
        personalizacion: number[];
      }[] = [];

      const noDisponibles: string[] = [];

      pedido.detalles.forEach((detalle, idx) => {
        const result = productosResult[idx];
        if (result.status === "rejected") {
          noDisponibles.push(detalle.nombre_snapshot);
          return;
        }

        const producto = result.value;
        if (!producto.disponible) {
          noDisponibles.push(detalle.nombre_snapshot);
          return;
        }

        itemsParaCarrito.push({
          producto,
          cantidad: detalle.cantidad,
          personalizacion: detalle.personalizacion ?? [],
        });
      });

      if (itemsParaCarrito.length === 0) {
        alert("Ninguno de los productos del pedido está disponible actualmente.");
        return;
      }

      // Limpiar carrito y agregar items
      clearCart();
      for (const item of itemsParaCarrito) {
        addItem(item.producto, item.cantidad, item.personalizacion);
      }

      if (noDisponibles.length > 0) {
        alert(
          `Algunos productos ya no están disponibles y no se agregaron al carrito:\n• ${noDisponibles.join("\n• ")}`,
        );
      }

      navigate("/carrito");
    } catch (error) {
      console.error("Error al reordenar:", error);
      alert("No se pudo cargar el pedido. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return { reordenar, isLoading };
}
