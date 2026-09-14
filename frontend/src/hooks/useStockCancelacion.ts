import { useQueries } from "@tanstack/react-query";
import { productosApi } from "../api/productosApi";
import type { DetallePedido } from "../types";

export interface ItemStockCancelacion {
  producto_id: number;
  nombre_snapshot: string;
  cantidad: number;
  stock_repuesto: boolean;
  ingredientes: { nombre: string; es_alergeno: boolean }[];
}

export interface ResumenStock {
  items: ItemStockCancelacion[];
  total_repuestos: number;
  total_no_recuperados: number;
}

export function useResumenStockCancelacion(detalles: DetallePedido[], estadoPedido?: string) {
  const queries = useQueries({
    queries: detalles.map((d) => ({
      queryKey: ["productos", d.producto_id],
      queryFn: () => productosApi.getById(d.producto_id),
      staleTime: 1000 * 60 * 10,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  if (isLoading || isError || !detalles.length) {
    return { resumen: null, isLoading, isError };
  }

  const items: ItemStockCancelacion[] = detalles.map((detalle, idx) => {
    const producto = queries[idx].data;
    const esElaborable = (producto?.ingredientes.length ?? 0) > 0;
    const recuperaInsumos = estadoPedido === "PENDIENTE" || estadoPedido === "CONFIRMADO";
    return {
      producto_id: detalle.producto_id,
      nombre_snapshot: detalle.nombre_snapshot,
      cantidad: detalle.cantidad,
      stock_repuesto: !esElaborable || recuperaInsumos,
      ingredientes: esElaborable
        ? (producto?.ingredientes ?? []).map((pi) => ({
            nombre: pi.ingrediente.nombre,
            es_alergeno: pi.ingrediente.es_alergeno,
          }))
        : [],
    };
  });

  return {
    resumen: {
      items,
      total_repuestos: items.filter((i) => i.stock_repuesto).length,
      total_no_recuperados: items.filter((i) => !i.stock_repuesto).length,
    } as ResumenStock,
    isLoading: false,
    isError: false,
  };
}
