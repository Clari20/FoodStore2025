import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usuariosApi, type UsuariosFilters } from "../api/usuariosApi";
import type { UsuarioRolesUpdate, UsuarioUpdate } from "../types";

export const useUsuarios = (filters: UsuariosFilters) =>
  useQuery({
    queryKey: ["usuarios", filters],
    queryFn: () => usuariosApi.list(filters),
  });

export const useRoles = () =>
  useQuery({
    queryKey: ["roles"],
    queryFn: usuariosApi.listRoles,
  });

export const useActualizarUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UsuarioUpdate }) =>
      usuariosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
};

export const useActualizarRolesUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UsuarioRolesUpdate }) =>
      usuariosApi.updateRoles(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
};

export const useEliminarUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usuariosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
};

export const useRestaurarUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usuariosApi.restore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
};