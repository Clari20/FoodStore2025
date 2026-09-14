"""Servicio de Pedidos — lógica de negocio y máquina de estados (FSM)."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status

from app.core.uow import UnitOfWork
from app.core.websocket import manager
from app.modules.pedidos.model import DetallePedido, HistorialEstadoPedido, Pedido
from app.modules.pedidos.schemas import (
    AvanzarEstadoRequest,
    PedidoCreate,
    PedidoDetail,
    PedidoResponse,
    PaginatedPedidos,
)
from app.modules.usuarios.model import Usuario


# Mapa de transiciones válidas. Si el estado no está → es terminal (RN-01)
FSM_TRANSITIONS: dict[str, list[str]] = {
    "PENDIENTE": ["CONFIRMADO", "CANCELADO"],
    "CONFIRMADO": ["EN_PREP", "CANCELADO"],
    "EN_PREP": ["LISTO", "CANCELADO"],
    "LISTO": ["EN_CAMINO", "ENTREGADO", "CANCELADO"],
    "EN_CAMINO": ["ENTREGADO", "CANCELADO"],
}

ROLE_TRANSITIONS: dict[str, dict[str, list[str]]] = {
    "ADMIN": FSM_TRANSITIONS,
    "CAJERO": {
        "PENDIENTE": ["CONFIRMADO", "CANCELADO"],
        "CONFIRMADO": ["CANCELADO"],
        "EN_PREP": ["CANCELADO"],
        "LISTO": ["EN_CAMINO", "ENTREGADO", "CANCELADO"],
        "EN_CAMINO": ["ENTREGADO", "CANCELADO"],
    },
    "COCINA_STOCK": {
        "CONFIRMADO": ["EN_PREP"],
        "EN_PREP": ["LISTO"],
    },
}

COSTO_ENVIO_DEFAULT = Decimal("50.00")
COSTO_RETIRO_LOCAL = Decimal("0.00")

EVENTOS_WS: dict[str, str] = {
    "PENDIENTE": "NUEVO_PEDIDO",
    "CONFIRMADO": "PEDIDO_CONFIRMADO",
    "EN_PREP": "PEDIDO_EN_PREPARACION",
    "LISTO": "PEDIDO_LISTO",
    "EN_CAMINO": "PEDIDO_EN_CAMINO",
    "ENTREGADO": "PEDIDO_ENTREGADO",
    "CANCELADO": "PEDIDO_CANCELADO",
}

ROLES_POR_ESTADO: dict[str, list[str]] = {
    "PENDIENTE": ["CAJERO", "ADMIN"],
    "CONFIRMADO": ["COCINA_STOCK", "ADMIN"],
    "EN_PREP": ["COCINA_STOCK", "ADMIN"],
    "LISTO": ["CAJERO", "ADMIN"],
    "EN_CAMINO": ["CAJERO", "ADMIN"],
    "ENTREGADO": ["CAJERO", "ADMIN"],
    "CANCELADO": ["CAJERO", "COCINA_STOCK", "ADMIN"],
}

ESTADOS_COCINA = ("CONFIRMADO", "EN_PREP")
ESTADOS_VISIBLES_POR_ROL: dict[str, list[str]] = {
    "CAJERO": ["PENDIENTE", "CONFIRMADO", "EN_PREP", "LISTO", "EN_CAMINO", "ENTREGADO", "CANCELADO"],
    "COCINA_STOCK": ["CONFIRMADO", "EN_PREP"],
}


class PedidoService:

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def crear_pedido(self, data: PedidoCreate, usuario: Usuario) -> PedidoResponse:
        """Crea un pedido desde el carrito con transacción atómica (Unit of Work)."""
        with self.uow:
            forma_pago = self.uow.formas_pago.get_by_codigo(data.forma_pago_codigo)
            if not forma_pago or not forma_pago.habilitado:
                raise HTTPException(status_code=400, detail=f"Forma de pago '{data.forma_pago_codigo}' no disponible")
                
            if data.direccion_id is not None:
                direccion = self.uow.direcciones.get_by_id(data.direccion_id)
                if not direccion or direccion.usuario_id != usuario.id:
                    raise HTTPException(status_code=400, detail="Dirección de entrega inválida")

            subtotal = Decimal("0.00")
            detalles_data = []
            productos_a_decrementar = []

            for item in data.items:
                producto = self.uow.productos.get_by_id_with_relations(item.producto_id)
                if not producto or producto.deleted_at is not None:
                    raise HTTPException(status_code=404, detail=f"Producto id={item.producto_id} no encontrado")
                if not producto.disponible:
                    raise HTTPException(status_code=400, detail=f"El producto '{producto.nombre}' no está disponible")
                
                es_elaborable = len(producto.ingredientes) > 0
                
                if es_elaborable:
                    unidades_posibles = []
                    for pi in producto.ingredientes:
                        if pi.ingrediente and (item.personalizacion is None or pi.ingrediente.id not in item.personalizacion):
                            f_ing = float(pi.ingrediente.unidad_medida.factor_conversion) if pi.ingrediente.unidad_medida else 1.0
                            f_receta = float(pi.unidad_medida.factor_conversion) if pi.unidad_medida else 1.0
                            qty_base = pi.cantidad * Decimal(str(f_receta))
                            if qty_base > 0:
                                stock_base = pi.ingrediente.stock_actual * Decimal(str(f_ing))
                                unidades = stock_base / qty_base
                                unidades_posibles.append(float(unidades))
                    
                    stock_disponible = int(min(unidades_posibles)) if unidades_posibles else 0
                    if stock_disponible < item.cantidad:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Stock de ingredientes insuficiente para '{producto.nombre}'. Posible: {stock_disponible}, solicitado: {item.cantidad}"
                        )
                else:
                    if producto.stock_cantidad < item.cantidad:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock_cantidad}, solicitado: {item.cantidad}",
                        )

                precio_snap = producto.precio_base
                subtotal_item = precio_snap * Decimal(str(item.cantidad))
                subtotal += subtotal_item

                detalles_data.append({
                    "producto_id": item.producto_id,
                    "cantidad": item.cantidad,
                    "nombre_snapshot": producto.nombre,
                    "precio_snapshot": precio_snap,
                    "subtotal_snap": subtotal_item,
                    "personalizacion": item.personalizacion,
                })
                productos_a_decrementar.append((producto, item.cantidad, es_elaborable, item.personalizacion))

            costo_envio = COSTO_RETIRO_LOCAL if data.direccion_id is None else COSTO_ENVIO_DEFAULT
            total = subtotal - Decimal("0.00") + costo_envio

            pedido = Pedido(
                usuario_id=usuario.id,
                direccion_id=data.direccion_id,
                estado_codigo="PENDIENTE",
                forma_pago_codigo=data.forma_pago_codigo,
                subtotal=subtotal,
                descuento=Decimal("0.00"),
                costo_envio=costo_envio,
                total=total,
                notas=data.notas,
            )
            pedido = self.uow.pedidos.add(pedido)

            for d in detalles_data:
                self.uow.detalles_pedido.add(DetallePedido(pedido_id=pedido.id, **d))

            # Decrementar stock de cada producto incluido en el pedido
            for producto, cantidad, es_elaborable, personalizacion in productos_a_decrementar:
                if es_elaborable:
                    for pi in producto.ingredientes:
                        if pi.ingrediente and (personalizacion is None or pi.ingrediente.id not in personalizacion):
                            f_ing = float(pi.ingrediente.unidad_medida.factor_conversion) if pi.ingrediente.unidad_medida else 1.0
                            f_receta = float(pi.unidad_medida.factor_conversion) if pi.unidad_medida else 1.0
                            qty_base_total = pi.cantidad * Decimal(str(f_receta)) * Decimal(str(cantidad))
                            deduccion = qty_base_total / Decimal(str(f_ing))
                            pi.ingrediente.stock_actual -= deduccion
                            self.uow.ingredientes.update(pi.ingrediente)
                else:
                    producto.stock_cantidad -= cantidad
                    self.uow.productos.update(producto)

            # Primer registro del historial: estado_desde=NULL (RN-02)
            self.uow.historial_estados.add(HistorialEstadoPedido(
                pedido_id=pedido.id,
                estado_desde=None,
                estado_hacia="PENDIENTE",
                usuario_id=usuario.id,
                motivo="Pedido creado",
            ))

            result = PedidoResponse.model_validate(pedido)

        await self._emit_ws_events(result)
        return result

    def listar_pedidos(
        self,
        page: int,
        per_page: int,
        estado_codigo: Optional[str],
        usuario: Usuario,
        pedido_id: Optional[int] = None,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        forma_pago_codigo: Optional[str] = None,
    ) -> PaginatedPedidos:
        """CLIENT ve solo sus pedidos. ADMIN/CAJERO/COCINA_STOCK ven todos."""
        with self.uow:
            filtro_usuario = usuario.id if usuario.role == "CLIENT" else None
            estados_visibles = ESTADOS_VISIBLES_POR_ROL.get(usuario.role)
            if estados_visibles and estado_codigo and estado_codigo not in estados_visibles:
                result = {"items": [], "total": 0, "page": page, "per_page": per_page, "pages": 1}
                return PaginatedPedidos(**result)

            result = self.uow.pedidos.get_paginated(
                page=page,
                per_page=per_page,
                usuario_id=filtro_usuario,
                estado_codigo=estado_codigo,
                estados_codigos=estados_visibles,
                pedido_id=pedido_id,
                fecha_desde=fecha_desde,
                fecha_hasta=fecha_hasta,
                forma_pago_codigo=forma_pago_codigo,
            )
        return PaginatedPedidos(**result)

    def obtener_detalle(self, pedido_id: int, usuario: Usuario) -> PedidoDetail:
        """CLIENT solo puede ver sus propios pedidos."""
        with self.uow:
            pedido = self.uow.pedidos.get_by_id_with_relations(pedido_id)
            if not pedido:
                raise HTTPException(status_code=404, detail=f"Pedido id={pedido_id} no encontrado")
            if usuario.role == "CLIENT" and pedido.usuario_id != usuario.id:
                raise HTTPException(status_code=403, detail="No tenés permiso para ver este pedido")
            return PedidoDetail.model_validate(pedido)

    async def avanzar_estado(self, pedido_id: int, data: AvanzarEstadoRequest, usuario: Usuario) -> PedidoResponse:
        """Avanza el estado validando la FSM. La validación ocurre en el Service, nunca en el Router."""
        with self.uow:
            pedido = self.uow.pedidos.get_by_id_with_relations(pedido_id)
            if not pedido:
                raise HTTPException(status_code=404, detail=f"Pedido id={pedido_id} no encontrado")

            estado_actual = pedido.estado_codigo
            estado_destino = data.estado_hacia

            if usuario.role == "CLIENT":
                if pedido.usuario_id != usuario.id:
                    raise HTTPException(status_code=403, detail="No tenés permiso para modificar este pedido")
                if estado_destino != "CANCELADO":
                    raise HTTPException(status_code=403, detail="Solo podés cancelar tus pedidos")
                if estado_actual not in ("PENDIENTE", "CONFIRMADO"):
                    raise HTTPException(status_code=409, detail=f"No podés cancelar un pedido en estado '{estado_actual}'")

            # Validar transición en el mapa FSM (RN-01)
            transiciones_validas = FSM_TRANSITIONS.get(estado_actual, [])
            if estado_destino not in transiciones_validas:
                raise HTTPException(
                    status_code=409,
                    detail=f"Transición inválida: '{estado_actual}' → '{estado_destino}'. Válidas: {transiciones_validas}",
                )

            if pedido.direccion_id is None and estado_actual == "LISTO" and estado_destino == "EN_CAMINO":
                raise HTTPException(
                    status_code=409,
                    detail="Los pedidos con retiro en local no pueden pasar a 'EN_CAMINO'. Usar 'ENTREGADO'.",
                )

            if pedido.direccion_id is not None and estado_actual == "LISTO" and estado_destino == "ENTREGADO":
                raise HTTPException(
                    status_code=409,
                    detail="Los pedidos con envío a domicilio deben pasar por 'EN_CAMINO' antes de 'ENTREGADO'.",
                )

            if usuario.role != "CLIENT":
                transiciones_por_rol = ROLE_TRANSITIONS.get(usuario.role, {})
                transiciones_permitidas = transiciones_por_rol.get(estado_actual, [])
                if estado_destino not in transiciones_permitidas:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=(
                            f"Tu rol '{usuario.role}' no puede realizar la transicion "
                            f"'{estado_actual}' -> '{estado_destino}'"
                        ),
                    )

            if not self.uow.estados_pedido.get_by_codigo(estado_destino):
                raise HTTPException(status_code=400, detail=f"Estado '{estado_destino}' no existe")

            # Si se cancela, devolver el stock al inventario
            if estado_destino == "CANCELADO":
                recupera_insumos = estado_actual in ("PENDIENTE", "CONFIRMADO")
                for detalle in pedido.detalles:
                    producto = self.uow.productos.get_by_id_with_relations(detalle.producto_id)
                    if producto:
                        es_elaborable = len(producto.ingredientes) > 0
                        if es_elaborable:
                            if recupera_insumos:
                                # Devolver el stock de ingredientes al inventario
                                for pi in producto.ingredientes:
                                    if pi.ingrediente and (detalle.personalizacion is None or pi.ingrediente.id not in detalle.personalizacion):
                                        f_ing = float(pi.ingrediente.unidad_medida.factor_conversion) if pi.ingrediente.unidad_medida else 1.0
                                        f_receta = float(pi.unidad_medida.factor_conversion) if pi.unidad_medida else 1.0
                                        qty_base_total = pi.cantidad * Decimal(str(f_receta)) * Decimal(str(detalle.cantidad))
                                        reposicion = qty_base_total / Decimal(str(f_ing))
                                        pi.ingrediente.stock_actual += reposicion
                                        self.uow.ingredientes.update(pi.ingrediente)
                        else:
                            # Los productos finalizados siempre reponen stock
                            producto.stock_cantidad += detalle.cantidad
                            self.uow.productos.update(producto)

            pedido.estado_codigo = estado_destino
            pedido.updated_at = datetime.now(timezone.utc)
            self.uow.pedidos.update(pedido)

            # INSERT append-only en historial (RN-03)
            self.uow.historial_estados.add(HistorialEstadoPedido(
                pedido_id=pedido.id,
                estado_desde=estado_actual,
                estado_hacia=estado_destino,
                usuario_id=usuario.id,
                motivo=data.motivo,
            ))

            result = PedidoResponse.model_validate(pedido)

        await self._emit_ws_events(result)
        return result

    async def cancelar_pedido(self, pedido_id: int, motivo: str, usuario: Usuario) -> PedidoResponse:
        """Atajo de cancelación para el cliente. Delega a avanzar_estado()."""
        return await self.avanzar_estado(
            pedido_id,
            AvanzarEstadoRequest(estado_hacia="CANCELADO", motivo=motivo),
            usuario,
        )

    def listar_pedidos_cocina(self) -> list[PedidoResponse]:
        with self.uow:
            pedidos = self.uow.pedidos.get_by_estados(ESTADOS_COCINA, sort_order="asc")
            return [PedidoResponse.model_validate(pedido) for pedido in pedidos]

    def listar_estados(self):
        with self.uow:
            return self.uow.estados_pedido.get_all_ordenados()

    def listar_formas_pago(self):
        with self.uow:
            return self.uow.formas_pago.get_habilitadas()

    async def _emit_ws_events(self, pedido: PedidoResponse) -> None:
        event = EVENTOS_WS.get(pedido.estado_codigo)
        if event is None:
            return

        data = pedido.model_dump(mode="json")

        # Contexto de cancelación para notificaciones
        if pedido.estado_codigo == "CANCELADO":
            from sqlmodel import select
            from sqlalchemy import desc
            from app.modules.pedidos.model import HistorialEstadoPedido
            stmt = (
                select(HistorialEstadoPedido)
                .where(HistorialEstadoPedido.pedido_id == pedido.id)
                .order_by(desc(HistorialEstadoPedido.created_at))
            )
            ultimo_historial = self.uow.session.exec(stmt).first()
            if ultimo_historial:
                data["motivo_cancelacion"] = ultimo_historial.motivo
                if ultimo_historial.usuario_id == pedido.usuario_id:
                    data["cancelado_por"] = "cliente"
                elif ultimo_historial.motivo and "Mercado Pago" in ultimo_historial.motivo:
                    data["cancelado_por"] = "mercadopago"
                else:
                    data["cancelado_por"] = "operador"

        await manager.broadcast_to_order(pedido.id, event, data)
        await manager.broadcast_to_roles(ROLES_POR_ESTADO.get(pedido.estado_codigo, []), event, data)
