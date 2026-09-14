"""
Repositorio de Pedidos — acceso a la base de datos.
Hereda de BaseRepository[T] igual que los demás módulos del proyecto.
"""

import math
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import asc, desc
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.core.base_repository import BaseRepository
from app.modules.pedidos.model import (
    DetallePedido,
    EstadoPedido,
    FormaPago,
    HistorialEstadoPedido,
    Pedido,
)


class PedidoRepository(BaseRepository[Pedido]):

    def __init__(self, session: Session):
        super().__init__(Pedido, session)

    def get_paginated(
        self,
        page: int = 1,
        per_page: int = 10,
        usuario_id: Optional[int] = None,
        estado_codigo: Optional[str] = None,
        sort_order: str = "desc",
        pedido_id: Optional[int] = None,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        forma_pago_codigo: Optional[str] = None,
        estados_codigos: Optional[list[str]] = None,
    ) -> dict:
        """Lista pedidos con filtros. usuario_id=None devuelve segun permisos del rol."""
        from datetime import timedelta
        query = (
            select(Pedido)
            .options(
                selectinload(Pedido.estado),
                selectinload(Pedido.forma_pago),
                selectinload(Pedido.detalles),
            )
            .where(Pedido.deleted_at.is_(None))
        )

        if usuario_id is not None:
            query = query.where(Pedido.usuario_id == usuario_id)

        if pedido_id is not None:
            query = query.where(Pedido.id == pedido_id)

        if estado_codigo:
            query = query.where(Pedido.estado_codigo == estado_codigo)
        elif estados_codigos:
            query = query.where(Pedido.estado_codigo.in_(estados_codigos))

        if fecha_desde:
            query = query.where(Pedido.created_at >= datetime.fromisoformat(fecha_desde))

        if fecha_hasta:
            query = query.where(
                Pedido.created_at < datetime.fromisoformat(fecha_hasta) + timedelta(days=1)
            )

        if forma_pago_codigo:
            query = query.where(Pedido.forma_pago_codigo == forma_pago_codigo)

        total = len(self.session.exec(query).all())

        order_func = desc if sort_order == "desc" else asc
        query = query.order_by(order_func(Pedido.created_at))

        pages = math.ceil(total / per_page) if total > 0 else 1
        offset = (page - 1) * per_page
        items = self.session.exec(query.offset(offset).limit(per_page)).all()

        return {"items": list(items), "total": total, "page": page, "per_page": per_page, "pages": pages}

    def get_by_id_with_relations(self, pedido_id: int) -> Optional[Pedido]:
        """Obtiene un pedido con todas sus relaciones cargadas."""
        stmt = (
            select(Pedido)
            .where(Pedido.id == pedido_id)
            .where(Pedido.deleted_at.is_(None))
            .options(
                selectinload(Pedido.estado),
                selectinload(Pedido.forma_pago),
                selectinload(Pedido.detalles),
                selectinload(Pedido.historial),
            )
        )
        return self.session.exec(stmt).first()

    def get_by_estados(self, estados: tuple[str, ...], sort_order: str = "asc") -> list[Pedido]:
        """Lista pedidos activos que coinciden con alguno de los estados dados."""
        order_func = desc if sort_order == "desc" else asc
        stmt = (
            select(Pedido)
            .where(Pedido.deleted_at.is_(None))
            .where(Pedido.estado_codigo.in_(estados))
            .options(
                selectinload(Pedido.estado),
                selectinload(Pedido.forma_pago),
                selectinload(Pedido.detalles),
            )
            .order_by(order_func(Pedido.created_at))
        )
        return list(self.session.exec(stmt).all())

    def soft_delete(self, pedido: Pedido) -> Pedido:
        """Eliminación lógica."""
        pedido.deleted_at = datetime.now(timezone.utc)
        return self.update(pedido)


class DetallePedidoRepository(BaseRepository[DetallePedido]):
    """Solo INSERT — DetallePedido es inmutable (RN-04)."""

    def __init__(self, session: Session):
        super().__init__(DetallePedido, session)


class HistorialEstadoRepository(BaseRepository[HistorialEstadoPedido]):
    """Append-only — solo INSERT, nunca UPDATE/DELETE (RN-03)."""

    def __init__(self, session: Session):
        super().__init__(HistorialEstadoPedido, session)

    def get_by_pedido(self, pedido_id: int) -> list[HistorialEstadoPedido]:
        """Historial completo de un pedido ordenado cronológicamente."""
        stmt = (
            select(HistorialEstadoPedido)
            .where(HistorialEstadoPedido.pedido_id == pedido_id)
            .order_by(asc(HistorialEstadoPedido.created_at))
        )
        return list(self.session.exec(stmt).all())


class EstadoPedidoRepository(BaseRepository[EstadoPedido]):

    def __init__(self, session: Session):
        super().__init__(EstadoPedido, session)

    def get_by_codigo(self, codigo: str) -> Optional[EstadoPedido]:
        """Busca por PK semántica (string) en lugar de int."""
        stmt = select(EstadoPedido).where(EstadoPedido.codigo == codigo)
        return self.session.exec(stmt).first()

    def get_all_ordenados(self) -> list[EstadoPedido]:
        stmt = select(EstadoPedido).order_by(asc(EstadoPedido.orden))
        return list(self.session.exec(stmt).all())


class FormaPagoRepository(BaseRepository[FormaPago]):

    def __init__(self, session: Session):
        super().__init__(FormaPago, session)

    def get_by_codigo(self, codigo: str) -> Optional[FormaPago]:
        stmt = select(FormaPago).where(FormaPago.codigo == codigo)
        return self.session.exec(stmt).first()

    def get_habilitadas(self) -> list[FormaPago]:
        stmt = select(FormaPago).where(FormaPago.habilitado == True)
        return list(self.session.exec(stmt).all())
