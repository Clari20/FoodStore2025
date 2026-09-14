/** API de Ingredientes — CRUD + filtros + paginación. */
import axiosClient from "./axiosClient";
import type {
  Ingrediente,
  IngredienteCreate,
  IngredienteUpdate,
  PaginatedResponse,
  IngredientesFilters,
  ProductoAfectadoResponse,
} from "../types";

export const ingredientesApi = {
  list: async (filters: IngredientesFilters): Promise<PaginatedResponse<Ingrediente>> => {
    const params: Record<string, string | number> = {
      page: filters.page,
      per_page: filters.per_page,
    };
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_order) params.sort_order = filters.sort_order;
    if (filters.search) params.search = filters.search;
    if (filters.estado) params.estado = filters.estado;
    if (filters.es_alergeno !== "") params.es_alergeno = filters.es_alergeno;
    if (filters.es_producto_terminado !== "") params.es_producto_terminado = filters.es_producto_terminado;
    if (filters.created_from) params.created_from = filters.created_from;
    if (filters.created_to) params.created_to = filters.created_to;
    if (filters.updated_from) params.updated_from = filters.updated_from;
    if (filters.updated_to) params.updated_to = filters.updated_to;
    if (filters.starts_with) params.starts_with = filters.starts_with;

    const res = await axiosClient.get<PaginatedResponse<Ingrediente>>("/ingredientes", { params });
    return res.data;
  },

  exportCsv: async (filters: IngredientesFilters): Promise<Blob> => {
    const params: Record<string, string | number> = {
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    };
    if (filters.search) params.search = filters.search;
    if (filters.estado) params.estado = filters.estado;
    if (filters.es_alergeno !== "") params.es_alergeno = filters.es_alergeno;
    if (filters.es_producto_terminado !== "") params.es_producto_terminado = filters.es_producto_terminado;
    if (filters.created_from) params.created_from = filters.created_from;
    if (filters.created_to) params.created_to = filters.created_to;
    if (filters.updated_from) params.updated_from = filters.updated_from;
    if (filters.updated_to) params.updated_to = filters.updated_to;
    if (filters.starts_with) params.starts_with = filters.starts_with;

    const res = await axiosClient.get("/ingredientes/export/csv", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  getPublicList: async (): Promise<{ id: number; nombre: string; es_alergeno: boolean }[]> => {
    const res = await axiosClient.get<{ id: number; nombre: string; es_alergeno: boolean }[]>('/productos/ingredientes-public');
    return res.data;
  },

  getById: async (id: number): Promise<Ingrediente> => {
    const res = await axiosClient.get<Ingrediente>(`/ingredientes/${id}`);
    return res.data;
  },

  getProductosAfectados: async (id: number): Promise<ProductoAfectadoResponse[]> => {
    const res = await axiosClient.get<ProductoAfectadoResponse[]>(`/ingredientes/${id}/productos-afectados`);
    return res.data;
  },

  create: async (data: IngredienteCreate): Promise<Ingrediente> => {
    const res = await axiosClient.post<Ingrediente>("/ingredientes", data);
    return res.data;
  },

  update: async (id: number, data: IngredienteUpdate): Promise<Ingrediente> => {
    const res = await axiosClient.put<Ingrediente>(`/ingredientes/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/ingredientes/${id}`);
  },

  darDeBaja: async (id: number): Promise<Ingrediente> => {
    const res = await axiosClient.patch<Ingrediente>(`/ingredientes/${id}/baja`);
    return res.data;
  },

  restore: async (id: number): Promise<Ingrediente> => {
    const res = await axiosClient.patch<Ingrediente>(`/ingredientes/${id}/restore`);
    return res.data;
  },
};
