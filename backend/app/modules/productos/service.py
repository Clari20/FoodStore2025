"""Servicio de Productos. Lógica de negocio con manejo de relaciones N:N."""
from fastapi import HTTPException, status
from decimal import Decimal
from app.core.uow import UnitOfWork
from app.modules.productos.model import Producto, ProductoCategoria, ProductoIngrediente
from app.modules.productos.schemas import (
    ProductoRead, ProductoCreate, ProductoUpdate,
    CategoriaSimple, IngredienteSimple, UnidadMedidaSimple,
    ProductoCategoriaDetail, ProductoIngredienteDetail
)
from datetime import datetime, timezone


def calcular_costo_total(prod: Producto) -> Decimal:
    """Calcula el costo total de un producto en base a sus ingredientes actuales."""
    costo_total = Decimal("0.0")
    for pi in prod.ingredientes:
        if pi.ingrediente:
            f_ing = float(pi.ingrediente.unidad_medida.factor_conversion) if pi.ingrediente.unidad_medida else 1.0
            f_receta = float(pi.unidad_medida.factor_conversion) if pi.unidad_medida else 1.0
            qty_base = pi.cantidad * Decimal(str(f_receta))
            price_base = pi.ingrediente.precio_costo / Decimal(str(f_ing))
            costo_total += qty_base * price_base
    return costo_total

def _build_producto_response(prod: Producto) -> ProductoRead:
    """Calcula costos, stock y sugeridos para un producto dado (Helper)."""
    
    # Categorías simplificadas
    categorias = [
        ProductoCategoriaDetail(
            categoria=CategoriaSimple(id=pc.categoria.id, nombre=pc.categoria.nombre),
            es_principal=pc.es_principal
        )
        for pc in prod.categorias
        if pc.categoria
    ]
    
    costo_total = calcular_costo_total(prod)
    ingredientes_detail = []
    unidades_posibles = []
    
    for pi in prod.ingredientes:
        if pi.ingrediente:
            f_ing = float(pi.ingrediente.unidad_medida.factor_conversion) if pi.ingrediente.unidad_medida else 1.0
            f_receta = float(pi.unidad_medida.factor_conversion) if pi.unidad_medida else 1.0
            qty_base = pi.cantidad * Decimal(str(f_receta))
            
            if qty_base > 0:
                stock_base = pi.ingrediente.stock_actual * Decimal(str(f_ing))
                unidades = stock_base / qty_base
                unidades_posibles.append(float(unidades))
            
            ingredientes_detail.append(
                ProductoIngredienteDetail(
                    ingrediente=IngredienteSimple(
                        id=pi.ingrediente.id,
                        nombre=pi.ingrediente.nombre,
                        es_alergeno=pi.ingrediente.es_alergeno,
                        precio_costo=pi.ingrediente.precio_costo,
                    ),
                    cantidad=pi.cantidad,
                    unidad_medida=UnidadMedidaSimple(
                        id=pi.unidad_medida.id,
                        nombre=pi.unidad_medida.nombre,
                        simbolo=pi.unidad_medida.simbolo,
                        tipo=pi.unidad_medida.tipo,
                        factor_conversion=pi.unidad_medida.factor_conversion
                    ) if pi.unidad_medida else None,
                    es_removible=pi.es_removible
                )
            )
            
    # El stock real es el mínimo que permite el ingrediente más escaso
    if ingredientes_detail:
        stock_disponible = int(min(unidades_posibles)) if unidades_posibles else 0
    else:
        # Si no tiene ingredientes, usamos su stock físico cargado
        stock_disponible = prod.stock_cantidad

    # Precio Sugerido = Costo Total * (1 + Margen)
    precio_sugerido = costo_total * (Decimal("1.0") + prod.margen_ganancia)

    unidad_venta_detail = UnidadMedidaSimple(
        id=prod.unidad_venta.id,
        nombre=prod.unidad_venta.nombre,
        simbolo=prod.unidad_venta.simbolo,
        tipo=prod.unidad_venta.tipo,
        factor_conversion=prod.unidad_venta.factor_conversion
    ) if prod.unidad_venta else None

    return ProductoRead(
        id=prod.id,
        nombre=prod.nombre,
        descripcion=prod.descripcion,
        imagen_url=prod.imagen_url,
        imagenes=prod.imagenes,
        precio_base=prod.precio_base,
        costo_total=costo_total,
        stock_cantidad=prod.stock_cantidad,
        stock_disponible=stock_disponible,
        margen_ganancia=prod.margen_ganancia,
        precio_sugerido=precio_sugerido,
        disponible=prod.disponible,
        unidad_venta=unidad_venta_detail,
        categorias=categorias,
        ingredientes=ingredientes_detail,
        created_at=prod.created_at,
        updated_at=prod.updated_at,
        active_at=prod.active_at
    )


def list_productos(
    uow: UnitOfWork,
    page: int = 1,
    per_page: int = 10,
    search: str | None = None,
    categoria_id: int | None = None,
    disponible: bool | None = None,
    estado: str = "activo",
    sort_by: str = "nombre",
    sort_order: str = "asc",
    created_from: str | None = None,
    created_to: str | None = None,
    updated_from: str | None = None,
    updated_to: str | None = None,
    starts_with: str | None = None,
):
    """Listado paginado de productos con cálculos de costo y stock dinámicos."""
    d_created_from = datetime.strptime(created_from, "%Y-%m-%d").date() if created_from else None
    d_created_to = datetime.strptime(created_to, "%Y-%m-%d").date() if created_to else None
    d_updated_from = datetime.strptime(updated_from, "%Y-%m-%d").date() if updated_from else None
    d_updated_to = datetime.strptime(updated_to, "%Y-%m-%d").date() if updated_to else None

    result = uow.productos.get_paginated(
        page=page,
        per_page=per_page,
        search=search,
        categoria_id=categoria_id,
        disponible=disponible,
        estado=estado,
        sort_by=sort_by,
        sort_order=sort_order,
        created_from=d_created_from,
        created_to=d_created_to,
        updated_from=d_updated_from,
        updated_to=d_updated_to,
        starts_with=starts_with
    )
    
    # Procesar cada producto para calcular stock y costos antes de enviar al frontend
    result["items"] = [_build_producto_response(p) for p in result["items"]]
    return result


def get_producto_detail(uow: UnitOfWork, prod_id: int) -> ProductoRead:
    """Obtiene detalle de producto con todos los cálculos procesados."""
    prod = uow.productos.get_by_id_with_relations(prod_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return _build_producto_response(prod)


def create_producto(uow: UnitOfWork, data: ProductoCreate) -> Producto:
    """Crea un producto y sincroniza relaciones N:N con categorías e ingredientes."""
    prod = Producto(
        nombre=data.nombre,
        descripcion=data.descripcion,
        imagen_url=data.imagen_url,
        imagenes=data.imagenes,
        precio_base=data.precio_base,
        stock_cantidad=data.stock_cantidad,
        disponible=data.disponible,
        unidad_venta_id=data.unidad_venta_id,
        margen_ganancia=data.margen_ganancia
    )
    uow.productos.add(prod)
    uow.session.flush()

    # Agregar categorías
    for cat in data.categorias:
        pc = ProductoCategoria(producto_id=prod.id, categoria_id=cat.categoria_id, es_principal=cat.es_principal)
        uow.producto_categorias.add(pc)

    # Agregar ingredientes
    for ing in data.ingredientes:
        pi = ProductoIngrediente(
            producto_id=prod.id, 
            ingrediente_id=ing.ingrediente_id,
            cantidad=ing.cantidad,
            unidad_medida_id=ing.unidad_medida_id,
            es_removible=ing.es_removible
        )
        uow.producto_ingredientes.add(pi)

    return prod


def update_producto(uow: UnitOfWork, prod_id: int, data: ProductoUpdate) -> Producto:
    """Actualiza producto y sincroniza relaciones N:N."""
    prod = uow.productos.get_by_id_with_relations(prod_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_data = data.model_dump(exclude_unset=True, exclude={"categorias", "ingredientes", "activo"})
    for key, value in update_data.items():
        setattr(prod, key, value)

    if data.activo is True:
        prod.active_at = None
        # Si tiene ingredientes terminados vinculados, restaurarlos
        for pi in prod.ingredientes:
            if pi.ingrediente and pi.ingrediente.es_producto_terminado:
                if pi.ingrediente.active_at is not None:
                    uow.ingredientes.restaurar(pi.ingrediente)
    elif data.activo is False:
        prod.active_at = datetime.now(timezone.utc)
        # Si tiene ingredientes terminados vinculados, darlos de baja
        for pi in prod.ingredientes:
            if pi.ingrediente and pi.ingrediente.es_producto_terminado:
                if pi.ingrediente.active_at is None:
                    uow.ingredientes.dar_de_baja(pi.ingrediente)

    if data.categorias is not None:
        # Usamos la reasignación de colecciones; con cascade="all, delete-orphan",
        # SQLAlchemy borra automáticamente los registros huérfanos e inserta los nuevos.
        prod.categorias = [
            ProductoCategoria(producto_id=prod_id, categoria_id=cat.categoria_id, es_principal=cat.es_principal)
            for cat in data.categorias
        ]

    if data.ingredientes is not None:
        # Usamos la reasignación de colecciones; con cascade="all, delete-orphan",
        # SQLAlchemy borra automáticamente los registros huérfanos e inserta los nuevos.
        prod.ingredientes = [
            ProductoIngrediente(
                producto_id=prod_id, 
                ingrediente_id=ing.ingrediente_id,
                cantidad=ing.cantidad,
                unidad_medida_id=ing.unidad_medida_id,
                es_removible=ing.es_removible
            )
            for ing in data.ingredientes
        ]

    return uow.productos.update(prod)

def recalcular_precios_base_por_ingrediente(uow: UnitOfWork, ingrediente_id: int, limit_productos: list[int] | None = None):
    """Actualiza el precio_base de todos los productos que usan este ingrediente."""
    productos = uow.productos.get_by_ingrediente_id(ingrediente_id)
    for prod in productos:
        if limit_productos is not None and prod.id not in limit_productos:
            continue
        nuevo_costo = calcular_costo_total(prod)
        nuevo_precio_base = nuevo_costo * (Decimal("1.0") + prod.margen_ganancia)
        prod.precio_base = nuevo_precio_base
        prod.updated_at = datetime.now(timezone.utc)
        uow.productos.update(prod)

def update_stock_producto(uow: UnitOfWork, prod_id: int, stock_cantidad: int) -> Producto:
    """Actualiza solo el stock físico del producto."""
    prod = uow.productos.get_by_id(prod_id)
    if not prod or prod.deleted_at:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    prod.stock_cantidad = stock_cantidad
    prod.updated_at = datetime.now(timezone.utc)

    return uow.productos.update(prod)


def update_disponibilidad_producto(uow: UnitOfWork, prod_id: int, disponible: bool) -> Producto:
    """Actualiza solo la disponibilidad comercial del producto."""
    prod = uow.productos.get_by_id(prod_id)
    if not prod or prod.deleted_at:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    prod.disponible = disponible
    prod.updated_at = datetime.now(timezone.utc)

    return uow.productos.update(prod)

def dar_de_baja_producto(uow: UnitOfWork, prod_id: int):
    prod = uow.productos.get_by_id_with_relations(prod_id)
    if not prod or prod.deleted_at:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    uow.productos.dar_de_baja(prod)
    
    # Si tiene ingredientes terminados vinculados, darlos de baja
    for pi in prod.ingredientes:
        if pi.ingrediente and pi.ingrediente.es_producto_terminado:
            if pi.ingrediente.active_at is None:
                uow.ingredientes.dar_de_baja(pi.ingrediente)


def restore_producto(uow: UnitOfWork, prod_id: int):
    prod = uow.productos.get_by_id_with_relations(prod_id)
    if not prod or prod.deleted_at:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    uow.productos.restore(prod)
    
    # Si tiene ingredientes terminados vinculados, restaurarlos
    for pi in prod.ingredientes:
        if pi.ingrediente and pi.ingrediente.es_producto_terminado:
            if pi.ingrediente.active_at is not None:
                uow.ingredientes.restaurar(pi.ingrediente)


def eliminar_producto(uow: UnitOfWork, prod_id: int):
    prod = uow.productos.get_by_id_with_relations(prod_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    uow.productos.eliminar(prod)
    
    # Si tiene ingredientes terminados vinculados, convertirlos a insumos normales (es_producto_terminado = False)
    for pi in prod.ingredientes:
        if pi.ingrediente and pi.ingrediente.es_producto_terminado:
            pi.ingrediente.es_producto_terminado = False
            uow.ingredientes.update(pi.ingrediente)


def get_unidades_medida(uow: UnitOfWork):
    return uow.unidades_medida.get_all()
