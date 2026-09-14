/** API de Pedidos — crear, listar, avanzar estado. */
import axiosClient from "./axiosClient";
import type {
  PedidoCreate,
  PedidoResponse,
  PedidoDetail,
  PaginatedPedidos,
  PedidosFilters,
  EstadoPedido,
  FormaPago,
  AvanzarEstadoRequest,
} from "../types";

export const pedidosApi = {
  listarEstados: async (): Promise<EstadoPedido[]> => {
    const res = await axiosClient.get<EstadoPedido[]>("/pedidos/estados");
    return res.data;
  },

  listarFormasPago: async (): Promise<FormaPago[]> => {
    const res = await axiosClient.get<FormaPago[]>("/pedidos/formas-pago");
    return res.data;
  },

  list: async (filters: PedidosFilters): Promise<PaginatedPedidos> => {
    const params: Record<string, any> = {
      page: filters.page,
      per_page: filters.per_page,
    };
    if (filters.estado) params.estado = filters.estado;
    if (filters.id) params.pedido_id = filters.id;
    if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
    if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
    if (filters.forma_pago) params.forma_pago = filters.forma_pago;
    const res = await axiosClient.get<PaginatedPedidos>("/pedidos", { params });
    return res.data;
  },

  listCocina: async (): Promise<PedidoResponse[]> => {
    const res = await axiosClient.get<PedidoResponse[]>("/pedidos/cocina");
    return res.data;
  },

  create: async (data: PedidoCreate): Promise<PedidoResponse> => {
    const res = await axiosClient.post<PedidoResponse>("/pedidos", data);
    return res.data;
  },

  getById: async (id: number): Promise<PedidoDetail> => {
    const res = await axiosClient.get<PedidoDetail>(`/pedidos/${id}`);
    return res.data;
  },

  avanzarEstado: async (id: number, data: AvanzarEstadoRequest): Promise<PedidoResponse> => {
    const res = await axiosClient.patch<PedidoResponse>(`/pedidos/${id}/estado`, data);
    return res.data;
  },

  cancelar: async (id: number, motivo: string): Promise<PedidoResponse> => {
    const res = await axiosClient.post<PedidoResponse>(`/pedidos/${id}/cancelar`, { motivo });
    return res.data;
  },
};
