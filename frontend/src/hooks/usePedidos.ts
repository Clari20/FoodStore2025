/** Hooks de TanStack Query para el módulo Pedidos. */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pedidosApi } from "../api/pedidosApi";
import type { PedidoCreate, PedidosFilters, AvanzarEstadoRequest } from "../types";

export const useEstadosPedido = () =>
  useQuery({
    queryKey: ["pedidos-estados"],
    queryFn: pedidosApi.listarEstados,
  });

export const useFormasPago = () =>
  useQuery({
    queryKey: ["formas-pago"],
    queryFn: pedidosApi.listarFormasPago,
  });

export const usePedidos = (filters: PedidosFilters) =>
  useQuery({
    queryKey: ["pedidos", filters],
    queryFn: () => pedidosApi.list(filters),
  });

export const usePedidosCocina = () =>
  useQuery({
    queryKey: ["pedidos", "cocina"],
    queryFn: pedidosApi.listCocina,
  });

export const usePedido = (id: number) =>
  useQuery({
    queryKey: ["pedidos", id],
    queryFn: () => pedidosApi.getById(id),
    enabled: !!id,
  });

export const useCrearPedido = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PedidoCreate) => pedidosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
};

export const useAvanzarEstado = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AvanzarEstadoRequest }) =>
      pedidosApi.avanzarEstado(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
};

export const useCancelarPedido = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      pedidosApi.cancelar(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
    },
  });
};
