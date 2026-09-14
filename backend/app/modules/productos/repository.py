"""Repositorios del módulo Productos."""
from datetime import date
from typing import Optional, List
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from app.core.base_repository import BaseRepository
from app.modules.productos.model import (
    Producto, ProductoCategoria, ProductoIngrediente, UnidadMedida
)
from app.modules.ingredientes.model import Ingrediente


class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, session: Session):
        super().__init__(Producto, session)

    def get_by_id_with_relations(self, product_id: int) -> Optional[Producto]:
        """Producto con sus categorías e ingredientes cargados (selectinload)."""
        stmt = (
            select(Producto)
            .where(
                Producto.id == product_id,
                Producto.deleted_at.is_(None),  # Nunca mostrar eliminados
            )
            .options(
                selectinload(Producto.categorias).selectinload(ProductoCategoria.categoria),
                selectinload(Producto.ingredientes).selectinload(ProductoIngrediente.ingrediente).selectinload(Ingrediente.unidad_medida),
                selectinload(Producto.ingredientes).selectinload(ProductoIngrediente.unidad_medida),
                selectinload(Producto.unidad_venta),
            )
        )
        result = self.session.exec(stmt)
        return result.first()

    def get_by_ingrediente_id(self, ingrediente_id: int) -> List[Producto]:
        """Devuelve todos los productos (con relaciones) que utilizan un ingrediente específico."""
        stmt = (
            select(Producto)
            .join(ProductoIngrediente)
            .where(
                ProductoIngrediente.ingrediente_id == ingrediente_id,
                Producto.deleted_at.is_(None)
            )
            .options(
                selectinload(Producto.categorias).selectinload(ProductoCategoria.categoria),
                selectinload(Producto.ingredientes).selectinload(ProductoIngrediente.ingrediente).selectinload(Ingrediente.unidad_medida),
                selectinload(Producto.ingredientes).selectinload(ProductoIngrediente.unidad_medida),
                selectinload(Producto.unidad_venta),
            )
        )
        result = self.session.exec(stmt)
        return list(result.all())

    def get_paginated(
        self,
        page: int = 1,
        per_page: int = 20,
        search: str | None = None,
        categoria_id: int | None = None,
        disponible: bool | None = None,
        estado: str = "activo",
        sort_by: str = "nombre",
        sort_order: str = "asc",
        created_from: date | None = None,
        created_to: date | None = None,
        updated_from: date | None = None,
        updated_to: date | None = None,
        starts_with: str | None = None,
    ) -> dict:
        """Lista productos con filtros avanzados + paginación."""
        import math
        from sqlalchemy import asc, desc, func, or_
        from app.modules.productos.model import ProductoCategoria

        query = select(Producto)

        # SIEMPRE excluir eliminados lógicos (irreversible, invisible)
        query = query.where(Producto.deleted_at.is_(None))

        # Estado (Baja via active_at)
        if estado == "activo":
            query = query.where(Producto.active_at.is_(None))
        elif estado == "inactivo":
            query = query.where(Producto.active_at.isnot(None))

        # Relaciones (Selectinload)
        query = query.options(
            selectinload(Producto.categorias).selectinload(ProductoCategoria.categoria),
            selectinload(Producto.ingredientes).selectinload(ProductoIngrediente.ingrediente).selectinload(Ingrediente.unidad_medida),
            selectinload(Producto.ingredientes).selectinload(ProductoIngrediente.unidad_medida),
            selectinload(Producto.unidad_venta),
        )

        # Cuando se listan productos activos sin filtro de categoría,
        # excluir los que SOLO pertenecen a categorías inactivas/eliminadas
        if estado == "activo" and not categoria_id:
            from app.modules.categorias.model import Categoria
            productos_con_cat_activa = (
                select(ProductoCategoria.producto_id)
                .join(Categoria, Categoria.id == ProductoCategoria.categoria_id)
                .where(Categoria.active_at.is_(None))
                .where(Categoria.deleted_at.is_(None))
            )
            query = query.where(Producto.id.in_(productos_con_cat_activa))

        # Filtros específicos
        if disponible is not None:
            query = query.where(Producto.disponible == disponible)
        
        if categoria_id:
            from app.modules.categorias.model import Categoria
            
            # CTE 1: Categoría solicitada + descendientes ACTIVOS (para incluir productos)
            cte_active = (
                select(Categoria.id)
                .where(Categoria.id == categoria_id)
                .where(Categoria.deleted_at.is_(None))
                .where(Categoria.active_at.is_(None))
                .cte(name="cat_active", recursive=True)
            )
            cte_active = cte_active.union_all(
                select(Categoria.id)
                .where(Categoria.padre_id == cte_active.c.id)
                .where(Categoria.deleted_at.is_(None))
                .where(Categoria.active_at.is_(None))
            )
            
            # CTE 2: TODOS los descendientes (incluidos inactivos) para detectar
            # categorías hijas dadas de baja
            cte_all = (
                select(Categoria.id, Categoria.active_at)
                .where(Categoria.id == categoria_id)
                .where(Categoria.deleted_at.is_(None))
                .cte(name="cat_all", recursive=True)
            )
            cte_all = cte_all.union_all(
                select(Categoria.id, Categoria.active_at)
                .where(Categoria.padre_id == cte_all.c.id)
                .where(Categoria.deleted_at.is_(None))
            )
            
            # IDs de categorías inactivas dentro de esta rama
            inactive_cat_ids = (
                select(cte_all.c.id)
                .where(cte_all.c.active_at.isnot(None))
            )
            
            # Productos que pertenecen a alguna categoría inactiva de esta rama → excluir
            productos_en_cat_inactiva = (
                select(ProductoCategoria.producto_id)
                .where(ProductoCategoria.categoria_id.in_(inactive_cat_ids))
            )
            
            query = query.join(ProductoCategoria).where(
                ProductoCategoria.categoria_id.in_(select(cte_active.c.id))
            ).where(
                Producto.id.notin_(productos_en_cat_inactiva)
            )

        if search:
            query = query.where(
                or_(
                    Producto.nombre.ilike(f"%{search}%"),
                    Producto.descripcion.ilike(f"%{search}%")
                )
            )

        if created_from:
            query = query.where(func.date(Producto.created_at) >= created_from)
        if created_to:
            query = query.where(func.date(Producto.created_at) <= created_to)

        if updated_from:
            query = query.where(func.date(Producto.updated_at) >= updated_from)
        if updated_to:
            query = query.where(func.date(Producto.updated_at) <= updated_to)

        if starts_with:
            query = query.where(Producto.nombre.ilike(f"{starts_with}%"))

        # Total count (antes de paginar)
        # Usamos distinct en el count para no contar duplicados por el join de categorías
        subquery = query.subquery()
        total_stmt = select(func.count(func.distinct(subquery.c.id))).select_from(subquery)
        try:
            total = self.session.exec(total_stmt).one()
        except Exception:
            # Fallback si la subconsulta falla por alguna razón de dialecto
            total = len(self.session.exec(query.distinct()).all())

        # Sort
        sort_column = getattr(Producto, sort_by, Producto.nombre)
        order_func = asc if sort_order == "asc" else desc
        query = query.order_by(order_func(sort_column))

        # Pagination
        pages = math.ceil(total / per_page) if total > 0 else 1
        offset = (page - 1) * per_page
        
        # Obtenemos los items con distinct para evitar duplicados
        items = self.session.exec(query.distinct().offset(offset).limit(per_page)).all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": pages,
        }

    def dar_de_baja(self, producto: Producto) -> Producto:
        """Da de baja: setea active_at. Reversible, visible en filtro 'inactivo'."""
        from datetime import datetime, timezone
        producto.active_at = datetime.now(timezone.utc)
        return self.update(producto)

    def restore(self, producto: Producto) -> Producto:
        """Restaura un producto dado de baja (limpia active_at) y lo habilita para la venta."""
        producto.active_at = None
        producto.disponible = True
        return self.update(producto)

    def eliminar(self, producto: Producto) -> Producto:
        """Eliminación lógica: setea deleted_at. Irreversible, invisible para el usuario."""
        from datetime import datetime, timezone
        producto.deleted_at = datetime.now(timezone.utc)
        return self.update(producto)


class ProductoCategoriaRepository(BaseRepository[ProductoCategoria]):
    def __init__(self, session: Session):
        super().__init__(ProductoCategoria, session)

    def delete_by_producto(self, producto_id: int):
        """Elimina todas las asociaciones de un producto. Útil para sync en update."""
        stmt = select(ProductoCategoria).where(ProductoCategoria.producto_id == producto_id)
        result = self.session.exec(stmt)
        for pc in result.all():
            self.session.delete(pc)
        self.session.flush()

    def get_by_producto(self, producto_id: int) -> List[ProductoCategoria]:
        """Obtiene las categorías asociadas a un producto."""
        stmt = (
            select(ProductoCategoria)
            .where(ProductoCategoria.producto_id == producto_id)
            .options(selectinload(ProductoCategoria.categoria))
        )
        result = self.session.exec(stmt)
        return list(result.all())


class ProductoIngredienteRepository(BaseRepository[ProductoIngrediente]):
    def __init__(self, session: Session):
        super().__init__(ProductoIngrediente, session)

    def delete_by_producto(self, producto_id: int):
        """Elimina todas las asociaciones de un producto."""
        stmt = select(ProductoIngrediente).where(ProductoIngrediente.producto_id == producto_id)
        result = self.session.exec(stmt)
        for pi in result.all():
            self.session.delete(pi)
        self.session.flush()

    def get_by_producto(self, producto_id: int) -> List[ProductoIngrediente]:
        """Obtiene los ingredientes asociados a un producto."""
        stmt = (
            select(ProductoIngrediente)
            .where(ProductoIngrediente.producto_id == producto_id)
            .options(selectinload(ProductoIngrediente.ingrediente))
        )
        result = self.session.exec(stmt)
        return list(result.all())


class UnidadMedidaRepository(BaseRepository[UnidadMedida]):
    def __init__(self, session: Session):
        super().__init__(UnidadMedida, session)
