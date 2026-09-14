from datetime import date, datetime, timezone
from typing import List
from sqlmodel import Session, select

from app.core.base_repository import BaseRepository
from app.modules.categorias.model import Categoria


class CategoriaRepository(BaseRepository[Categoria]):
    def __init__(self, session: Session):
        super().__init__(Categoria, session)

    def dar_de_baja(self, categoria: Categoria) -> Categoria:
        """Da de baja: setea active_at (inactivo)."""
        categoria.active_at = datetime.now(timezone.utc)
        return self.update(categoria)

    def restaurar(self, categoria: Categoria) -> Categoria:
        """Restaura una categoría (activo)."""
        categoria.active_at = None
        return self.update(categoria)

    def get_descendant_ids(self, categoria_id: int) -> List[int]:
        """IDs de todas las subcategorías descendientes (CTE recursiva)."""
        cte = (
            select(Categoria.id)
            .where(Categoria.padre_id == categoria_id)
            .where(Categoria.deleted_at.is_(None))
            .cte(name="descendants", recursive=True)
        )
        cte = cte.union_all(
            select(Categoria.id)
            .where(Categoria.padre_id == cte.c.id)
            .where(Categoria.deleted_at.is_(None))
        )
        stmt = select(cte.c.id)
        return list(self.session.exec(stmt).all())

    def eliminar(self, categoria: Categoria) -> Categoria:
        """Eliminación lógica: irreversible para el usuario."""
        categoria.deleted_at = datetime.now(timezone.utc)
        return self.update(categoria)

    def get_tree(self, estado: str = "activo") -> List[Categoria]:
        """Retorna todas las categorías activas para armar el árbol."""
        stmt = select(Categoria)

        # Siempre excluimos los eliminados lógicamente
        stmt = stmt.where(Categoria.deleted_at.is_(None))

        # Estado (Baja)
        if estado == "activo":
            stmt = stmt.where(Categoria.active_at.is_(None))
        elif estado == "inactivo":
            stmt = stmt.where(Categoria.active_at.isnot(None))

        stmt = stmt.order_by(Categoria.nombre)
        result = self.session.exec(stmt)
        return list(result.all())

    def get_paginated(
        self,
        page: int = 1,
        per_page: int = 10,
        search: str | None = None,
        estado: str = "activo",
        sort_by: str = "nombre",
        sort_order: str = "asc",
        created_from: date | None = None,
        created_to: date | None = None,
        updated_from: date | None = None,
        updated_to: date | None = None,
        starts_with: str | None = None,
    ) -> dict:
        """Lista categorías con filtros avanzados + paginación."""
        import math
        from sqlalchemy import asc, desc, func, or_
        
        query = select(Categoria)

        # Siempre excluimos los eliminados lógicamente
        query = query.where(Categoria.deleted_at.is_(None))

        # Estado (Baja)
        if estado == "activo":
            query = query.where(Categoria.active_at.is_(None))
        elif estado == "inactivo":
            query = query.where(Categoria.active_at.isnot(None))

        if search:
            query = query.where(
                or_(
                    Categoria.nombre.ilike(f"%{search}%"),
                    Categoria.descripcion.ilike(f"%{search}%")
                )
            )

        if created_from:
            query = query.where(func.date(Categoria.created_at) >= created_from)
        if created_to:
            query = query.where(func.date(Categoria.created_at) <= created_to)

        if updated_from:
            query = query.where(func.date(Categoria.updated_at) >= updated_from)
        if updated_to:
            query = query.where(func.date(Categoria.updated_at) <= updated_to)

        if starts_with:
            query = query.where(Categoria.nombre.ilike(f"{starts_with}%"))

        # Total count (antes de paginar)
        total = len(self.session.exec(query).all())

        # Sort
        sort_column = getattr(Categoria, sort_by, Categoria.nombre)
        order_func = asc if sort_order == "asc" else desc
        query = query.order_by(order_func(sort_column))

        # Pagination
        pages = math.ceil(total / per_page) if total > 0 else 1
        offset = (page - 1) * per_page
        items = self.session.exec(query.offset(offset).limit(per_page)).all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
        }

    def has_active_products(self, categoria_id: int) -> bool:
        """Verifica si la categoría tiene productos activos asociados."""
        from app.modules.productos.model import ProductoCategoria, Producto
        from app.modules.categorias.model import Categoria
        
        # CTE para incluir todas las subcategorías en la verificación
        cte = select(Categoria.id).where(Categoria.id == categoria_id).cte(name="cat_hierarchy", recursive=True)
        cte = cte.union_all(
            select(Categoria.id).where(Categoria.padre_id == cte.c.id)
        )

        stmt = (
            select(ProductoCategoria)
            .join(Producto)
            .where(ProductoCategoria.categoria_id.in_(select(cte.c.id)))
            .where(Producto.deleted_at.is_(None))
            .limit(1)
        )
        result = self.session.exec(stmt)
        return result.first() is not None
