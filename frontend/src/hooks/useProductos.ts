import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productosApi } from "../api/productosApi";
import type { ProductosFilters, ProductoCreate, ProductoUpdate } from "../types";

export const useProductos = (filters: ProductosFilters) => {
  return useQuery({
    queryKey: ["productos", filters],
    queryFn: () => productosApi.list(filters),
    placeholderData: (previousData) => previousData,
  });
};

export const useProducto = (id: number) => {
  return useQuery({
    queryKey: ["productos", id],
    queryFn: () => productosApi.getById(id),
    enabled: !!id,
  });
};

export const useCrearProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductoCreate) => productosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useActualizarProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductoUpdate }) => 
      productosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useActualizarStockProducto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stock_cantidad }: { id: number; stock_cantidad: number }) =>
      productosApi.updateStock(id, stock_cantidad),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useActualizarDisponibilidadProducto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, disponible }: { id: number; disponible: boolean }) =>
      productosApi.updateDisponibilidad(id, disponible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useDarDeBajaProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productosApi.darDeBaja(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useEliminarProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useRestaurarProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productosApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};
