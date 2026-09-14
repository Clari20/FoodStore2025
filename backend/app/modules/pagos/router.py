import logging
from typing import Annotated
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.deps import get_current_user, require_role
from app.core.uow import UnitOfWork, get_uow
from app.modules.usuarios.model import Usuario
from app.modules.pagos.schemas import (
    CrearPagoRequest,
    ConfirmarPagoRequest,
    PagoCrearResponse,
    PagoEstadoResponse,
)
from app.modules.pagos.service import PaymentService

logger = logging.getLogger("app.modules.pagos.router")

router = APIRouter(prefix="/api/v1/pagos", tags=["Pagos"])


def get_payment_service(uow: UnitOfWork = Depends(get_uow)) -> PaymentService:
    return PaymentService(uow)


@router.post(
    "/create-preference",
    response_model=PagoCrearResponse,
    dependencies=[Depends(require_role(["CLIENT", "ADMIN"]))],
)
def create_preference(
    data: CrearPagoRequest,
    svc: PaymentService = Depends(get_payment_service),
    current_user: Usuario = Depends(get_current_user),
):
    """Crea una preferencia de pago en Mercado Pago para un pedido."""
    # Podríamos verificar que el pedido pertenece al current_user, pero el service ya
    # se encarga de las validaciones de existencia.
    # Hagamos una validación extra aquí o en el service para asegurar que solo el
    # dueño del pedido (o un admin) puede pagar.
    # En FoodStore, la validación de propiedad del pedido es buena práctica de seguridad.
    # Vamos a verificar que el pedido pertenezca al usuario que intenta pagar.
    with svc.uow:
        pedido = svc.uow.pedidos.get_by_id(data.pedido_id)
        if not pedido:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        if current_user.role == "CLIENT" and pedido.usuario_id != current_user.id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="No tenés permiso para pagar este pedido")

    return svc.crear_pago(data.pedido_id)


@router.post("/webhook")
async def webhook(
    request: Request,
    svc: PaymentService = Depends(get_payment_service),
):
    """Webhook para notificaciones asíncronas de Mercado Pago (IPN)."""
    try:
        query_params = dict(request.query_params)
        if request.headers.get("content-type", "").startswith("application/json"):
            data = await request.json()
        else:
            data = dict(await request.form())
        return await svc.procesar_webhook(data, query_params=query_params)
    except Exception as e:
        logger.exception("Error en webhook de Mercado Pago")
        # Siempre responder con status ok / HTTP 200 para evitar que MP nos bloquee la IP
        return {"status": "error", "reason": str(e)}


@router.post(
    "/confirm",
    response_model=PagoEstadoResponse,
    dependencies=[Depends(get_current_user)],
)
async def confirm_payment(
    data: ConfirmarPagoRequest,
    svc: PaymentService = Depends(get_payment_service),
):
    """Endpoint síncrono que llama el frontend al volver del flujo para confirmar el pago contra MP."""
    return await svc.confirmar_pago(data.pedido_id, data.payment_id)


@router.get("/redirect/{pedido_id}/{status}")
async def redirect_after_pago(pedido_id: int, status: str, request: Request):
    """Recibe la redirección de MP y la reenvía al frontend."""
    frontend_url = settings.VITE_FRONTEND_URL or "http://localhost:5173"
    qs = request.url.query
    url = f"{frontend_url}/orders/{pedido_id}/{status}"
    if qs:
        url += f"?{qs}"
    return RedirectResponse(url=url)
