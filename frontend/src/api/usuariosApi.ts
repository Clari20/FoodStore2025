import axiosClient from "./axiosClient";
import type {
  PaginatedUsuarios,
  Rol,
  UsuarioAdmin,
  UsuarioRolesUpdate,
  UsuarioUpdate,
} from "../types";

export interface UsuariosFilters {
  page: number;
  per_page: number;
  search?: string;
  rol?: string;
  estado?: "activo" | "inactivo" | "todos";
}

export const usuariosApi = {
  list: async (filters: UsuariosFilters): Promise<PaginatedUsuarios> => {
    const res = await axiosClient.get<PaginatedUsuarios>("/usuarios", {
      params: filters,
    });
    return res.data;
  },

  listRoles: async (): Promise<Rol[]> => {
    const res = await axiosClient.get<Rol[]>("/usuarios/roles");
    return res.data;
  },

  update: async (id: number, data: UsuarioUpdate): Promise<UsuarioAdmin> => {
    const res = await axiosClient.put<UsuarioAdmin>(`/usuarios/${id}`, data);
    return res.data;
  },

  updateRoles: async (id: number, data: UsuarioRolesUpdate): Promise<UsuarioAdmin> => {
    const res = await axiosClient.put<UsuarioAdmin>(`/usuarios/${id}/roles`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/usuarios/${id}`);
  },

  restore: async (id: number): Promise<UsuarioAdmin> => {
    const res = await axiosClient.patch<UsuarioAdmin>(`/usuarios/${id}/restore`);
    return res.data;
  },

  getDetalle: async (id: number) => {
    const res = await axiosClient.get(`/usuarios/${id}/detalle`);
    return res.data;
  },
};