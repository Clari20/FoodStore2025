import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { direccionesApi } from "../api/direccionesApi";
import type { DireccionCreate } from "../types";

export const useDirecciones = () =>
  useQuery({
    queryKey: ["direcciones"],
    queryFn: direccionesApi.listar,
  });

export const useCrearDireccion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DireccionCreate) => direccionesApi.crear(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["direcciones"] }),
  });
};

export const useActualizarDireccion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DireccionCreate }) =>
      direccionesApi.actualizar(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["direcciones"] }),
  });
};

export const useEliminarDireccion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => direccionesApi.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["direcciones"] }),
  });
};

export const useMarcarPrincipal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => direccionesApi.marcarPrincipal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["direcciones"] }),
  });
};