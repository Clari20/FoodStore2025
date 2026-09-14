import axiosClient from "./axiosClient";
import type { DireccionCreate, DireccionResponse } from "../types";

export const direccionesApi = {
  listar: async (): Promise<DireccionResponse[]> => {
    const res = await axiosClient.get<DireccionResponse[]>("/direcciones");
    return res.data;
  },

  crear: async (data: DireccionCreate): Promise<DireccionResponse> => {
    const res = await axiosClient.post<DireccionResponse>("/direcciones", data);
    return res.data;
  },

  actualizar: async (id: number, data: DireccionCreate): Promise<DireccionResponse> => {
    const res = await axiosClient.put<DireccionResponse>(`/direcciones/${id}`, data);
    return res.data;
  },

  eliminar: async (id: number): Promise<void> => {
    await axiosClient.delete(`/direcciones/${id}`);
  },

  marcarPrincipal: async (id: number): Promise<DireccionResponse> => {
    const res = await axiosClient.patch<DireccionResponse>(`/direcciones/${id}/principal`);
    return res.data;
  },
};