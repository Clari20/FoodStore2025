"""Router de Pedidos — endpoints CRUD con FSM de estados."""

import json
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Path, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from app.core.deps import get_current_user, require_role
from app.core.security import decode_access_token
from app.core.uow import UnitOfWork, get_uow
from app.core.websocket import manager
from app.modules.pedidos.schemas import (
    AvanzarEstadoRequest,
    EstadoPedidoResponse,
    FormaPagoResponse,
    PaginatedPedidos,
    PedidoCreate,
    PedidoDetail,
    PedidoResponse,
)
from app.modules.pedidos.service import PedidoService
from app.modules.usuarios.model import Usuario

router = APIRouter(prefix="/api/v1/pedidos", tags=["Pedidos"])


class CancelarRequest(BaseModel):
    motivo: str


@router.get("/estados", response_model=List[EstadoPedidoResponse])
def listar_estados(uow: Annotated[UnitOfWork, Depends(get_uow)]):
    return PedidoService(uow).listar_estados()


@router.get("/formas-pago", response_model=List[FormaPagoResponse])
def listar_formas_pago(uow: Annotated[UnitOfWork, Depends(get_uow)]):
    return PedidoService(uow).listar_formas_pago()


@router.get("", response_model=PaginatedPedidos)
def listar_pedidos(
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 10,
    estado: Annotated[Optional[str], Query(description="Filtrar por estado")] = None,
    pedido_id: Annotated[Optional[int], Query(description="Filtrar por ID de pedido")] = None,
    fecha_desde: Annotated[Optional[str], Query(description="Fecha desde YYYY-MM-DD")] = None,
    fecha_hasta: Annotated[Optional[str], Query(description="Fecha hasta YYYY-MM-DD")] = None,
    forma_pago: Annotated[Optional[str], Query(description="Filtrar por forma de pago")] = None,
    uow: Annotated[UnitOfWork, Depends(get_uow)] = None,
    current_user: Annotated[Usuario, Depends(get_current_user)] = None,
):
    return PedidoService(uow).listar_pedidos(
        page=page,
        per_page=per_page,
        estado_codigo=estado,
        usuario=current_user,
        pedido_id=pedido_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        forma_pago_codigo=forma_pago,
    )


@router.get(
    "/cocina",
    response_model=List[PedidoResponse],
    dependencies=[Depends(require_role(["ADMIN", "COCINA_STOCK"]))],
)
def listar_pedidos_cocina(uow: Annotated[UnitOfWork, Depends(get_uow)]):
    return PedidoService(uow).listar_pedidos_cocina()


@router.post(
    "",
    response_model=PedidoResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["CLIENT", "ADMIN"]))],
)
async def crear_pedido(
    data: PedidoCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)] = None,
    current_user: Annotated[Usuario, Depends(get_current_user)] = None,
):
    return await PedidoService(uow).crear_pedido(data, current_user)


@router.get("/{pedido_id}", response_model=PedidoDetail, responses={404: {"description": "Pedido no encontrado"}})
def obtener_pedido(
    pedido_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)] = None,
    current_user: Annotated[Usuario, Depends(get_current_user)] = None,
):
    return PedidoService(uow).obtener_detalle(pedido_id, current_user)


@router.patch(
    "/{pedido_id}/estado",
    response_model=PedidoResponse,
    responses={404: {"description": "Pedido no encontrado"}, 409: {"description": "Transición inválida"}},
    dependencies=[Depends(require_role(["ADMIN", "CAJERO", "COCINA_STOCK"]))],
)
async def avanzar_estado(
    pedido_id: Annotated[int, Path(ge=1)],
    data: AvanzarEstadoRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)] = None,
    current_user: Annotated[Usuario, Depends(get_current_user)] = None,
):
    return await PedidoService(uow).avanzar_estado(pedido_id, data, current_user)


@router.post(
    "/{pedido_id}/cancelar",
    response_model=PedidoResponse,
    responses={404: {"description": "Pedido no encontrado"}, 409: {"description": "No se puede cancelar"}},
)
async def cancelar_pedido(
    pedido_id: Annotated[int, Path(ge=1)],
    data: CancelarRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)] = None,
    current_user: Annotated[Usuario, Depends(get_current_user)] = None,
):
    return await PedidoService(uow).cancelar_pedido(pedido_id, data.motivo, current_user)


@router.websocket("/ws")
async def pedidos_websocket(websocket: WebSocket):
    token = websocket.cookies.get("access_token")
    if not token:
        await websocket.accept()
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token requerido")
        return

    payload = decode_access_token(token)
    user_id_raw = payload.get("sub") if payload else None
    if user_id_raw is None:
        await websocket.accept()
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token invalido")
        return

    try:
        user_id = int(user_id_raw)
    except ValueError:
        await websocket.accept()
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token invalido")
        return

    roles: list[str] = payload.get("roles", []) if payload else []
    with UnitOfWork() as uow:
        user = uow.usuarios.get_by_id(user_id)
        if user is None or user.deleted_at is not None:
            await websocket.accept()
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Usuario invalido")
            return

    await manager.connect(websocket, roles=roles, user_id=user_id)
    staff_roles = {"ADMIN", "CAJERO", "COCINA_STOCK"}

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"event": "ERROR", "data": {"detail": "JSON invalido"}})
                continue

            action = message.get("action")
            order_id = message.get("order_id")
            if not isinstance(order_id, int):
                await websocket.send_json({"event": "ERROR", "data": {"detail": "order_id invalido"}})
                continue

            if action == "subscribe-order":
                if not any(role in staff_roles for role in roles):
                    with UnitOfWork() as uow:
                        pedido = uow.pedidos.get_by_id_with_relations(order_id)
                        if pedido is None or pedido.usuario_id != user_id:
                            await websocket.send_json({
                                "event": "ERROR",
                                "data": {"detail": "No autorizado para este pedido"},
                            })
                            continue
                manager.join_order_room(websocket, order_id)
                await websocket.send_json({"event": "SUBSCRIBED", "data": {"order_id": order_id}})
            elif action == "unsubscribe-order":
                manager.leave_order_room(websocket, order_id)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)
