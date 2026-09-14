"""Servicio de Ingrediente — lógica de negocio."""
from fastapi import HTTPException, status

from app.core.uow import UnitOfWork
from app.modules.ingredientes.model import Ingrediente
from app.modules.ingredientes.schemas import (
    IngredienteCreate,
    IngredienteUpdate,
    PaginatedIngredientes,
    ProductoAfectadoResponse,
)
from app.modules.productos.service import recalcular_precios_base_por_ingrediente


class IngredienteService:
    """Capa de servicio para ingredientes."""

    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def list_paginated(
        self,
        page: int,
        per_page: int,
        search: str | None,
        estado: str,
        es_alergeno: bool | None,
        sort_by: str,
        sort_order: str,
        created_from=None,
        created_to=None,
        updated_from=None,
        updated_to=None,
        starts_with: str | None = None,
        es_producto_terminado: bool | None = None,
    ) -> PaginatedIngredientes:
        """Lista ingredientes activos con filtros y paginación. Eliminados nunca aparecen."""
        with self.uow:
            result = self.uow.ingredientes.get_paginated(
                page=page,
                per_page=per_page,
                search=search,
                estado=estado,
                es_alergeno=es_alergeno,
                sort_by=sort_by,
                sort_order=sort_order,
                created_from=created_from,
                created_to=created_to,
                updated_from=updated_from,
                updated_to=updated_to,
                starts_with=starts_with,
                es_producto_terminado=es_producto_terminado,
            )
        return PaginatedIngredientes(**result)

    def export_csv(
        self,
        search: str | None,
        estado: str,
        es_alergeno: bool | None,
        sort_by: str,
        sort_order: str,
        created_from=None,
        created_to=None,
        updated_from=None,
        updated_to=None,
        starts_with: str | None = None,
        es_producto_terminado: bool | None = None,
    ) -> str:
        """Exporta ingredientes activos a formato CSV aplicando filtros."""
        import csv
        import io
        
        with self.uow:
            result = self.uow.ingredientes.get_paginated(
                page=1,
                per_page=1000000,
                search=search,
                estado=estado,
                es_alergeno=es_alergeno,
                sort_by=sort_by,
                sort_order=sort_order,
                created_from=created_from,
                created_to=created_to,
                updated_from=updated_from,
                updated_to=updated_to,
                starts_with=starts_with,
                es_producto_terminado=es_producto_terminado,
            )
        
        output = io.StringIO()
        writer = csv.writer(output, delimiter=",", quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["ID", "Nombre", "Descripcion", "Alergeno", "Fecha Creacion", "Fecha Actualizacion"])
        
        for item in result["items"]:
            alergeno_txt = "Si" if item.es_alergeno else "No"
            created_txt = item.created_at.strftime("%Y-%m-%d %H:%M") if item.created_at else ""
            updated_txt = item.updated_at.strftime("%Y-%m-%d %H:%M") if item.updated_at else ""
            writer.writerow([
                item.id,
                item.nombre,
                item.descripcion or "",
                alergeno_txt,
                created_txt,
                updated_txt
            ])
            
        return output.getvalue()

    def get_by_id(self, ingrediente_id: int):
        """Obtiene un ingrediente por ID o lanza 404."""
        with self.uow:
            ingrediente = self.uow.ingredientes.get_by_id(ingrediente_id)
        if not ingrediente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ingrediente no encontrado",
            )
        return ingrediente

    def get_productos_afectados(self, ingrediente_id: int) -> list[ProductoAfectadoResponse]:
        """Obtiene la lista de productos que dependen de este ingrediente."""
        with self.uow:
            ingrediente = self.uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ingrediente no encontrado",
                )
            
            productos = self.uow.productos.get_by_ingrediente_id(ingrediente_id)
            
            afectados = []
            for p in productos:
                prod_ing = next((pi for pi in p.ingredientes if pi.ingrediente_id == ingrediente_id), None)
                cantidad = 0.0
                unidad_simbolo = "u"
                if prod_ing:
                    cantidad = float(prod_ing.cantidad)
                    unidad_simbolo = prod_ing.unidad_medida.simbolo if prod_ing.unidad_medida else "u"

                afectados.append(
                    ProductoAfectadoResponse(
                        id=p.id,
                        nombre=p.nombre,
                        precio_base_actual=float(p.precio_base),
                        margen_ganancia=float(p.margen_ganancia),
                        cantidad_ingrediente=cantidad,
                        unidad_ingrediente=unidad_simbolo,
                    )
                )
            return afectados

    def create(self, data: IngredienteCreate):
        """Crea un ingrediente con transacción atómica."""
        with self.uow:
            ingrediente = Ingrediente(**data.model_dump())
            ingrediente = self.uow.ingredientes.add(ingrediente)
            # Forzar carga de relación para el schema de retorno
            if ingrediente.unidad_medida_id:
                _ = ingrediente.unidad_medida
        return ingrediente

    def update(self, ingrediente_id: int, data: IngredienteUpdate):
        """Actualiza un ingrediente y opcionalmente recalcula precios de productos seleccionados."""
        from sqlalchemy.exc import IntegrityError
        with self.uow:
            ingrediente = self.uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ingrediente no encontrado",
                )
            update_data = data.model_dump(exclude_unset=True, exclude={"activo", "actualizar_precios_productos", "productos_a_actualizar"})
            
            # Manejo de estado (activo/inactivo)
            if data.activo is True:
                ingrediente.active_at = None
                if ingrediente.es_producto_terminado:
                    productos = self.uow.productos.get_by_ingrediente_id(ingrediente_id)
                    for p in productos:
                        if p.active_at is not None:
                            self.uow.productos.restore(p)
            elif data.activo is False:
                from datetime import datetime, timezone
                ingrediente.active_at = datetime.now(timezone.utc)
                if ingrediente.es_producto_terminado:
                    productos = self.uow.productos.get_by_ingrediente_id(ingrediente_id)
                    for p in productos:
                        if p.active_at is None:
                            self.uow.productos.dar_de_baja(p)
                
                # Marcar disponibilidad como False para todos los productos que lo usan
                productos = self.uow.productos.get_by_ingrediente_id(ingrediente_id)
                for p in productos:
                    if p.disponible:
                        p.disponible = False
                        self.uow.productos.update(p)

            for key, value in update_data.items():
                setattr(ingrediente, key, value)
            try:
                self.uow.ingredientes.update(ingrediente)
                # Forzar carga de relación para el schema
                if ingrediente.unidad_medida_id:
                    _ = ingrediente.unidad_medida
                # Si la bandera está activa y se actualizó correctamente
                if data.actualizar_precios_productos:
                    recalcular_precios_base_por_ingrediente(self.uow, ingrediente_id, limit_productos=data.productos_a_actualizar)
            except IntegrityError:
                self.uow.rollback()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Este ingrediente ya existe"
                )
        return ingrediente

    def eliminar(self, ingrediente_id: int):
        """Eliminación lógica de un ingrediente. Irreversible e invisible."""
        with self.uow:
            ingrediente = self.uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ingrediente no encontrado",
                )
            if ingrediente.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El ingrediente ya fue eliminado",
                )
            self.uow.ingredientes.eliminar(ingrediente)
            
            # Si es ingrediente terminado, eliminar los productos relacionados
            if ingrediente.es_producto_terminado:
                productos = self.uow.productos.get_by_ingrediente_id(ingrediente_id)
                for p in productos:
                    if p.deleted_at is None:
                        self.uow.productos.eliminar(p)
        return ingrediente

    def dar_de_baja(self, ingrediente_id: int):
        """Da de baja (reversible) a un ingrediente."""
        with self.uow:
            ingrediente = self.uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ingrediente no encontrado",
                )
            self.uow.ingredientes.dar_de_baja(ingrediente)
            
            # Si es ingrediente terminado, dar de baja los productos relacionados
            if ingrediente.es_producto_terminado:
                productos = self.uow.productos.get_by_ingrediente_id(ingrediente_id)
                for p in productos:
                    if p.active_at is None:
                        self.uow.productos.dar_de_baja(p)

            # Para cualquier ingrediente dado de baja: marcar productos que lo usan como NO disponibles
            productos = self.uow.productos.get_by_ingrediente_id(ingrediente_id)
            for p in productos:
                if p.disponible:
                    p.disponible = False
                    self.uow.productos.update(p)
        return ingrediente

    def restaurar(self, ingrediente_id: int):
        """Restaura a activo a un ingrediente dado de baja."""
        with self.uow:
            ingrediente = self.uow.ingredientes.get_by_id(ingrediente_id)
            if not ingrediente:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Ingrediente no encontrado",
                )
            self.uow.ingredientes.restaurar(ingrediente)
            
            # Si es ingrediente terminado, restaurar los productos relacionados
            if ingrediente.es_producto_terminado:
                productos = self.uow.productos.get_by_ingrediente_id(ingrediente_id)
                for p in productos:
                    if p.active_at is not None:
                        self.uow.productos.restore(p)
        return ingrediente
