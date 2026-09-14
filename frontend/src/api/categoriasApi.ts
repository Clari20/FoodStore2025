/** API de Categorías — CRUD + Tree. */
import axiosClient from "./axiosClient";
import type {
  Categoria,
  CategoriaCreate,
  CategoriaUpdate,
  CategoriaTree,
  PaginatedResponse,
  CategoriasFilters,
} from "../types";

export const categoriasApi = {
  listTree: async (estado?: string): Promise<CategoriaTree[]> => {
    const params = estado ? { estado } : {};
    const res = await axiosClient.get<CategoriaTree[]>("/categorias", { params });
    return res.data;
  },

  listPaginated: async (filters: CategoriasFilters): Promise<PaginatedResponse<Categoria>> => {
    const params: Record<string, any> = {
      page: filters.page,
      per_page: filters.per_page,
    };
    if (filters.search) params.search = filters.search;
    if (filters.estado) params.estado = filters.estado;
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_order) params.sort_order = filters.sort_order;
    if (filters.created_from) params.created_from = filters.created_from;
    if (filters.created_to) params.created_to = filters.created_to;
    if (filters.updated_from) params.updated_from = filters.updated_from;
    if (filters.updated_to) params.updated_to = filters.updated_to;
    if (filters.starts_with) params.starts_with = filters.starts_with;

    const res = await axiosClient.get<PaginatedResponse<Categoria>>("/categorias/list", { params });
    return res.data;
  },

  listFlat: async (): Promise<Categoria[]> => {
    const res = await axiosClient.get<Categoria[]>("/categorias/flat");
    return res.data;
  },

  getById: async (id: number): Promise<Categoria> => {
    const res = await axiosClient.get<Categoria>(`/categorias/${id}`);
    return res.data;
  },

  create: async (data: CategoriaCreate): Promise<Categoria> => {
    const res = await axiosClient.post<Categoria>("/categorias", data);
    return res.data;
  },

  update: async (id: number, data: CategoriaUpdate): Promise<Categoria> => {
    const res = await axiosClient.put<Categoria>(`/categorias/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/categorias/${id}`);
  },

  darDeBaja: async (id: number): Promise<void> => {
    await axiosClient.patch(`/categorias/${id}/baja`);
  },

  restore: async (id: number): Promise<void> => {
    await axiosClient.patch(`/categorias/${id}/restore`);
  },
};
