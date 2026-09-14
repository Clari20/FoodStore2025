import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriasApi } from "../api/categoriasApi";
import type { CategoriaCreate, CategoriaUpdate, CategoriasFilters } from "../types";

export const useCategoriasTree = (estado: string = "activo") => {
  return useQuery({
    queryKey: ["categorias", "tree", estado],
    queryFn: () => categoriasApi.listTree(estado),
  });
};

export const useCategoria = (id: number) => {
  return useQuery({
    queryKey: ["categorias", id],
    queryFn: () => categoriasApi.getById(id),
    enabled: !!id,
  });
};

export const useCategoriasPaginated = (filters: CategoriasFilters) => {
  return useQuery({
    queryKey: ["categorias", "list", filters],
    queryFn: () => categoriasApi.listPaginated(filters),
    placeholderData: (previousData) => previousData,
  });
};

export const useCategoriasFlat = () => {
  return useQuery({
    queryKey: ["categorias", "flat"],
    queryFn: () => categoriasApi.listFlat(),
  });
};

export const useCrearCategoria = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoriaCreate) => categoriasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
    },
  });
};

export const useActualizarCategoria = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoriaUpdate }) => 
      categoriasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
    },
  });
};

export const useEliminarCategoria = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoriasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
    },
  });
};

export const useDarDeBajaCategoria = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoriasApi.darDeBaja(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
    },
  });
};

export const useRestaurarCategoria = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => categoriasApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
    },
  });
};
