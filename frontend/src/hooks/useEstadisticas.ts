import { useQuery } from '@tanstack/react-query';
import axiosClient from "../api/axiosClient";
import type { DashboardEstadisticas } from '../types/estadisticas';

export function useDashboardEstadisticas() {
  return useQuery({
    queryKey: ['estadisticas', 'dashboard'],
    queryFn: async () => {
      const response = await axiosClient.get<DashboardEstadisticas>('/estadisticas/dashboard');
      return response.data;
    },
  });
}
