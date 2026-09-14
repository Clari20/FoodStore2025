import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ingredientesApi } from "../api/ingredientesApi";
import type { IngredientesFilters, IngredienteCreate, IngredienteUpdate } from "../types";

// 1. Hook para listar ingredientes con filtros y paginación
export const useIngredientes = (filters: IngredientesFilters) => {
  return useQuery({
    queryKey: ["ingredientes", filters],
    queryFn: () => ingredientesApi.list(filters),
    placeholderData: (previousData) => previousData,
  });
};

export const useIngredientesPublicos = () => {
  return useQuery({
    queryKey: ["ingredientes-public"],
    queryFn: () => ingredientesApi.getPublicList(),
    placeholderData: (previousData) => previousData,
  });
};

// 2. Hooks para mutaciones (Crear, Actualizar, Eliminar) de ingredientes
export const useCrearIngrediente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: IngredienteCreate) => ingredientesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredientes"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useActualizarIngrediente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: IngredienteUpdate }) => 
      ingredientesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredientes"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useEliminarIngrediente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ingredientesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredientes"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useDarDeBajaIngrediente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ingredientesApi.darDeBaja(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredientes"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};

export const useRestaurarIngrediente = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ingredientesApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredientes"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
  });
};