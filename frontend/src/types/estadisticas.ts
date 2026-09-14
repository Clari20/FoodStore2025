
// --- ESTADÍSTICAS ---
export interface KPI {
  ventas_mes: number;
  pedidos_mes: number;
  ticket_promedio: number;
}

export interface VentasPorDia {
  fecha: string;
  manana: number;
  mediodia: number;
  tarde: number;
  noche: number;
}

export interface ProductoMasVendido {
  producto_id: number;
  nombre: string;
  cantidad: number;
}

export interface PedidosPorEstado {
  estado: string;
  cantidad: number;
}

export interface DashboardEstadisticas {
  kpis: KPI;
  ventas_por_dia: VentasPorDia[];
  productos_mas_vendidos: ProductoMasVendido[];
  pedidos_por_estado: PedidosPorEstado[];
}
