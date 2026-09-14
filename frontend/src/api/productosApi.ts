/** API de Productos — CRUD + filtros + paginación. */
import axiosClient from "./axiosClient";
import type {
  Producto,
  ProductoCreate,
  ProductoUpdate,
  PaginatedResponse,
  ProductosFilters,
  UnidadMedidaSimple,
} from "../types";

export const productosApi = {
  list: async (filters: ProductosFilters): Promise<PaginatedResponse<Producto>> => {
    const params: Record<string, any> = {
      page: filters.page,
      per_page: filters.per_page,
    };
    if (filters.search) params.search = filters.search;
    if (filters.categoria) params.categoria = filters.categoria;
    if (filters.estado) params.estado = filters.estado;
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_order) params.sort_order = filters.sort_order;
    if (filters.created_from) params.created_from = filters.created_from;
    if (filters.created_to) params.created_to = filters.created_to;
    if (filters.updated_from) params.updated_from = filters.updated_from;
    if (filters.updated_to) params.updated_to = filters.updated_to;
    if (filters.starts_with) params.starts_with = filters.starts_with;
    if (filters.disponible) params.disponible = filters.disponible === "true";

    const res = await axiosClient.get<PaginatedResponse<Producto>>("/productos", { params });
    return res.data;
  },

  getById: async (id: number): Promise<Producto> => {
    const res = await axiosClient.get<Producto>(`/productos/${id}`);
    return res.data;
  },

  create: async (data: ProductoCreate): Promise<Producto> => {
    const res = await axiosClient.post<Producto>("/productos", data);
    return res.data;
  },

  update: async (id: number, data: ProductoUpdate): Promise<Producto> => {
    const res = await axiosClient.put<Producto>(`/productos/${id}`, data);
    return res.data;
  },

  updateStock: async (id: number, stock_cantidad: number): Promise<Producto> => {
    const res = await axiosClient.patch<Producto>(`/productos/${id}/stock`, {
      stock_cantidad,
    });
    return res.data;
  },

  updateDisponibilidad: async (id: number, disponible: boolean): Promise<Producto> => {
    const res = await axiosClient.patch<Producto>(`/productos/${id}/disponibilidad`, {
      disponible,
    });
    return res.data;
  },

  darDeBaja: async (id: number): Promise<void> => {
    await axiosClient.patch(`/productos/${id}/baja`);
  },

  restore: async (id: number): Promise<void> => {
    await axiosClient.patch(`/productos/${id}/restore`);
  },

  delete: async (id: number): Promise<void> => {
    await axiosClient.delete(`/productos/${id}`);
  },

  getUnidadesMedida: async (): Promise<UnidadMedidaSimple[]> => {
    const res = await axiosClient.get<UnidadMedidaSimple[]>("/productos/unidades-medida");
    return res.data;
  },
};
