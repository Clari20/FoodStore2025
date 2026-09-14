from datetime import date
from typing import List

from pydantic import BaseModel

class KPI(BaseModel):
    ventas_mes: float
    pedidos_mes: int
    ticket_promedio: float

class VentasPorDia(BaseModel):
    fecha: str
    manana: int
    mediodia: int
    tarde: int
    noche: int

class ProductoMasVendido(BaseModel):
    producto_id: int
    nombre: str
    cantidad: int

class PedidosPorEstado(BaseModel):
    estado: str
    cantidad: int

class DashboardEstadisticas(BaseModel):
    kpis: KPI
    ventas_por_dia: List[VentasPorDia]
    productos_mas_vendidos: List[ProductoMasVendido]
    pedidos_por_estado: List[PedidosPorEstado]
