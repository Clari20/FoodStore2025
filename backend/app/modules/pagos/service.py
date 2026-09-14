import uuid
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
import mercadopago

from app.core.config import settings
from app.core.uow import UnitOfWork
from app.core.websocket import manager
from app.modules.pedidos.model import Pedido, HistorialEstadoPedido
from app.modules.pagos.model import Pago
from app.modules.pagos.schemas import PagoCrearResponse, PagoEstadoResponse

logger = logging.getLogger("app.modules.pagos.service")


class PaymentService:

    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow

    # ── Helpers privados ───────────────────────────────────────────────────

    def _get_sdk(self) -> mercadopago.SDK:
        token = settings.MP_ACCESS_TOKEN
        if not token:
            raise RuntimeError(
                "MercadoPago no está configurado. Configure MP_ACCESS_TOKEN"
            )
        return mercadopago.SDK(token)

    def _crear_preferencia_mp(self, monto: Decimal, titulo: str,
                               pedido_id: int, back_urls: dict) -> dict:
        sdk = self._get_sdk()
        try:
            preference_data = {
                "items": [{
                    "title": titulo,
                    "quantity": 1,
                    "unit_price": float(monto),  # El SDK de MP requiere float
                    "currency_id": "ARS",
                }],
                "external_reference": str(pedido_id),
                "back_urls": back_urls,
                "notification_url": (
                    settings.MP_WEBHOOK_URL
                    or f"{settings.VITE_API_URL}/api/v1/pagos/webhook"
                ),
                "auto_return": "approved",
            }

            result = sdk.preference().create(preference_data)

            if result.get("status") not in (200, 201):
                logger.error("Error creando preferencia MP: %s", result)
                raise RuntimeError(
                    "Error al crear preferencia: "
                    f"{result.get('response', {}).get('message', 'desconocido')}"
                )

            response = result.get("response", {})
            return {
                "preference_id": response.get("id"),
                "init_point": response.get("init_point"),
            }
        except Exception as e:
            logger.exception("Error inesperado al crear preferencia MP")
            raise RuntimeError(f"Error de conexión con MP: {str(e)}")

    def _consultar_pago_mp(self, payment_id: int) -> dict:
        sdk = self._get_sdk()
        try:
            result = sdk.payment().get(payment_id)

            if result.get("status") != 200:
                logger.error("Error consultando pago MP %s: %s", payment_id, result)
                raise RuntimeError(f"Error al consultar pago {payment_id}")

            response = result.get("response", {})
            return {
                "mp_payment_id": response.get("id"),
                "mp_status": response.get("status"),
                "mp_status_detail": response.get("status_detail"),
                "mp_merchant_order_id": response.get("merchant_order_id"),
                "external_reference": response.get("external_reference"),
            }
        except Exception as e:
            logger.exception("Error consultando pago MP %s", payment_id)
            raise RuntimeError(f"Error de conexión con MP: {str(e)}")

    async def _actualizar_pedido_a_confirmado(self, pedido: Pedido, pago: Pago):
        """Cambia el estado del pedido a CONFIRMADO, guarda en historial y notifica WebSocket."""
        # Solo avanzar si está en PENDIENTE
        if pedido.estado_codigo == "PENDIENTE":
            estado_actual = pedido.estado_codigo
            estado_destino = "CONFIRMADO"

            pedido.estado_codigo = estado_destino
            pedido.updated_at = datetime.now(timezone.utc)
            self.uow.pedidos.update(pedido)

            # Insert append-only en el historial (sistema es usuario_id = None)
            self.uow.historial_estados.add(HistorialEstadoPedido(
                pedido_id=pedido.id,
                estado_desde=estado_actual,
                estado_hacia=estado_destino,
                usuario_id=pedido.usuario_id,  # Registramos que corresponde al usuario dueño del pedido
                motivo=f"Pago MP #{pago.mp_payment_id} aprobado automáticamente",
            ))

            # Notificación WebSocket en tiempo real
            # Replicamos el mapeo de websocket de PedidoService
            event = "PEDIDO_CONFIRMADO"
            # Serializamos la respuesta para el WebSocket
            from app.modules.pedidos.schemas import PedidoResponse
            pedido_res = PedidoResponse.model_validate(pedido)
            data = pedido_res.model_dump(mode="json")

            try:
                await manager.broadcast_to_order(pedido.id, event, data)
                # roles a notificar para CONFIRMADO: COCINA_STOCK y ADMIN
                await manager.broadcast_to_roles(["cocina_stock", "admin"], event, data)
            except Exception as ws_err:
                logger.error("Error enviando notificación WebSocket: %s", ws_err)

    async def _actualizar_pedido_a_cancelado(self, pedido: Pedido, pago: Pago):
        """Cancela el pedido cuando MP rechaza el pago: repone stock y notifica."""
        if pedido.estado_codigo != "PENDIENTE":
            return

        estado_actual = pedido.estado_codigo
        estado_destino = "CANCELADO"

        # Reponer stock de ingredientes (ya que el pedido cancelado por MP siempre estuvo en PENDIENTE)
        for detalle in pedido.detalles:
            producto = self.uow.productos.get_by_id_with_relations(detalle.producto_id)
            if producto:
                es_elaborable = len(producto.ingredientes) > 0
                if es_elaborable:
                    for pi in producto.ingredientes:
                        if pi.ingrediente and (detalle.personalizacion is None or pi.ingrediente.id not in detalle.personalizacion):
                            f_ing = float(pi.ingrediente.unidad_medida.factor_conversion) if pi.ingrediente.unidad_medida else 1.0
                            f_receta = float(pi.unidad_medida.factor_conversion) if pi.unidad_medida else 1.0
                            qty_base_total = pi.cantidad * Decimal(str(f_receta)) * Decimal(str(detalle.cantidad))
                            reposicion = qty_base_total / Decimal(str(f_ing))
                            pi.ingrediente.stock_actual += reposicion
                            self.uow.ingredientes.update(pi.ingrediente)
                else:
                    producto.stock_cantidad += detalle.cantidad
                    self.uow.productos.update(producto)

        pedido.estado_codigo = estado_destino
        pedido.updated_at = datetime.now(timezone.utc)
        self.uow.pedidos.update(pedido)

        self.uow.historial_estados.add(HistorialEstadoPedido(
            pedido_id=pedido.id,
            estado_desde=estado_actual,
            estado_hacia=estado_destino,
            usuario_id=pedido.usuario_id,
            motivo=f"Pago rechazado por Mercado Pago (MP #{pago.mp_payment_id})",
        ))

        # Notificación WebSocket
        event = "PEDIDO_CANCELADO"
        from app.modules.pedidos.schemas import PedidoResponse
        pedido_res = PedidoResponse.model_validate(pedido)
        data = pedido_res.model_dump(mode="json")
        data["cancelado_por"] = "mercadopago"
        data["motivo_cancelacion"] = f"Pago rechazado por Mercado Pago (MP #{pago.mp_payment_id})"

        try:
            await manager.broadcast_to_order(pedido.id, event, data)
            await manager.broadcast_to_roles(["cajero", "admin"], event, data)
        except Exception as ws_err:
            logger.error("Error enviando notificación WebSocket: %s", ws_err)

    # ── Operaciones públicas ───────────────────────────────────────────────

    def crear_pago(self, pedido_id: int) -> PagoCrearResponse:
        with self.uow:
            pedido = self.uow.pedidos.get_by_id(pedido_id)
            if not pedido:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pedido no encontrado",
                )

            # Verificar que sea Mercado Pago la forma de pago elegida
            if pedido.forma_pago_codigo != "MERCADOPAGO":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El pedido #{pedido_id} no tiene seleccionada la forma de pago MERCADOPAGO",
                )

            if not settings.MP_ACCESS_TOKEN or not settings.MP_PUBLIC_KEY:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mercado Pago no está configurado en el servidor",
                )

            # La API de MP valida que back_urls.success sea una URL pública
            # https cuando se usa auto_return — rechaza http://localhost.
            # Por eso, aunque el navegador del usuario es quien las abre
            # (no los servidores de MP), igual deben pasar por ngrok.
            ngrok_url = settings.NGROK_URL or "http://localhost:8000"
            back_urls = {
                "success": f"{ngrok_url}/api/v1/pagos/redirect/{pedido_id}/success",
                "failure": f"{ngrok_url}/api/v1/pagos/redirect/{pedido_id}/failure",
                "pending": f"{ngrok_url}/api/v1/pagos/redirect/{pedido_id}/pending",
            }

            try:
                mp_data = self._crear_preferencia_mp(
                    monto=pedido.total,
                    titulo=f"Pedido #{pedido_id} - FoodStore",
                    pedido_id=pedido_id,
                    back_urls=back_urls,
                )
            except RuntimeError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e),
                )

            pago = Pago(
                pedido_id=pedido_id,
                monto=pedido.total,
                estado="pendiente",
                mp_preference_id=mp_data["preference_id"],
                mp_init_point=mp_data.get("init_point"),
                idempotency_key=str(uuid.uuid4()),
            )
            self.uow.pagos.add(pago)

            return PagoCrearResponse(
                pago_id=pago.id,
                preference_id=mp_data["preference_id"],
                init_point=mp_data.get("init_point"),
                public_key=settings.MP_PUBLIC_KEY,
            )

    async def procesar_webhook(self, data: dict,
                               query_params: Optional[dict] = None) -> dict:
        logger.info("Webhook recibido: data=%s qs=%s", data, query_params or {})

        if not data and query_params:
            data = query_params

        topic = data.get("type") or data.get("topic")
        data_id = data.get("data_id") or (data.get("data") or {}).get("id")
        payment_id = data.get("id")

        if not data_id and query_params:
            data_id = query_params.get("data.id") or query_params.get("id")
        if not topic and query_params:
            topic = query_params.get("topic") or query_params.get("type")

        # data_id es el ID real del pago (viene en data.id en notificaciones
        # tipo payment.created, o en data.id del querystring). payment_id
        # (el "id" top-level) es el ID de la NOTIFICACIÓN, no del pago — solo
        # coincide con el pago real en notificaciones legacy por querystring.
        pago_mp_id = data_id or payment_id

        if not pago_mp_id:
            return {"status": "ignored", "reason": "No payment ID"}

        # Las notificaciones topic=merchant_order traen un merchant_order_id,
        # no un payment_id: sdk.payment().get() siempre devuelve 404 para ese
        # ID. MP manda en paralelo una notificación duplicada topic=payment
        # con el ID correcto, así que esta la ignoramos sin loguear error.
        if topic == "merchant_order":
            return {"status": "ignored",
                    "reason": "merchant_order topic — se espera el duplicado topic=payment"}

        # Solo procesamos pagos
        if topic not in (None, "payment"):
            return {"status": "ignored", "reason": f"Topic: {topic}"}

        try:
            mp_info = self._consultar_pago_mp(int(pago_mp_id))
            estado_mp = mp_info.get("mp_status")

            if estado_mp == "approved":
                nuevo_estado = "aprobado"
            elif estado_mp in ("rejected", "cancelled",
                               "refunded", "charged_back"):
                nuevo_estado = "rechazado"
            elif estado_mp in ("pending", "in_process", "authorized"):
                nuevo_estado = "pendiente"
            else:
                return {"status": "ignored",
                        "reason": f"Unknown status: {estado_mp}"}

            with self.uow:
                pago = self.uow.pagos.get_by_mp_payment_id(int(pago_mp_id))
                if not pago and mp_info.get("mp_merchant_order_id"):
                    pago = self.uow.pagos.get_by_mp_merchant_order_id(
                        mp_info["mp_merchant_order_id"]
                    )
                if not pago:
                    # Última opción: external_reference es el pedido_id que
                    # seteamos al crear la preferencia (ver _crear_preferencia_mp).
                    # Cubre el caso del primer webhook, cuando el pago local
                    # todavía no tiene mp_payment_id seteado.
                    external_ref = mp_info.get("external_reference")
                    if external_ref:
                        try:
                            pago = self.uow.pagos.get_ultimo_by_pedido(int(external_ref))
                        except (TypeError, ValueError):
                            pago = None
                if not pago:
                    return {"status": "ignored",
                            "reason": "Pago not found in local DB"}

                if pago.estado != "pendiente":
                    return {"status": "already_processed",
                            "estado": pago.estado}

                pago.mp_payment_id = int(pago_mp_id)
                pago.mp_status = estado_mp
                pago.mp_status_detail = mp_info.get("mp_status_detail")
                pago.mp_merchant_order_id = mp_info.get("mp_merchant_order_id")
                pago.estado = nuevo_estado
                pago.updated_at = datetime.now(timezone.utc)
                self.uow.pagos.update(pago)

                if nuevo_estado == "aprobado":
                    pedido = self.uow.pedidos.get_by_id_with_relations(pago.pedido_id)
                    if pedido:
                        await self._actualizar_pedido_a_confirmado(pedido, pago)
                elif nuevo_estado == "rechazado":
                    pedido = self.uow.pedidos.get_by_id_with_relations(pago.pedido_id)
                    if pedido:
                        await self._actualizar_pedido_a_cancelado(pedido, pago)

            return {
                "status": "processed",
                "pago_id": pago.id,
                "estado": nuevo_estado,
                "pedido_id": pago.pedido_id,
            }

        except Exception as e:
            logger.exception("Error procesando webhook MP")
            return {"status": "error", "reason": str(e)}

    async def confirmar_pago(self, pedido_id: int,
                               payment_id: Optional[int] = None) -> PagoEstadoResponse:
        with self.uow:
            pedido = self.uow.pedidos.get_by_id(pedido_id)
            if not pedido:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Pedido no encontrado",
                )

            resolved_payment_id = payment_id
            if not resolved_payment_id:
                pago_local = self.uow.pagos.get_ultimo_by_pedido(pedido_id)
                if pago_local and pago_local.mp_payment_id:
                    resolved_payment_id = pago_local.mp_payment_id

            if resolved_payment_id:
                try:
                    mp_info = self._consultar_pago_mp(resolved_payment_id)
                except RuntimeError as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=str(e),
                    )

                estado_mp = mp_info.get("mp_status")
                if estado_mp == "approved":
                    nuevo_estado = "aprobado"
                elif estado_mp in ("rejected", "cancelled",
                                   "refunded", "charged_back"):
                    nuevo_estado = "rechazado"
                else:
                    nuevo_estado = "pendiente"

                pago = self.uow.pagos.get_by_mp_payment_id(resolved_payment_id)
                if not pago:
                    pago = self.uow.pagos.get_ultimo_by_pedido(pedido_id)

                if pago:
                    pago.mp_payment_id = resolved_payment_id
                    pago.mp_status = estado_mp
                    pago.mp_status_detail = mp_info.get("mp_status_detail")
                    pago.mp_merchant_order_id = mp_info.get(
                        "mp_merchant_order_id"
                    )
                    pago.estado = nuevo_estado
                    pago.updated_at = datetime.now(timezone.utc)
                    self.uow.pagos.update(pago)

                    if nuevo_estado == "aprobado":
                        await self._actualizar_pedido_a_confirmado(pedido, pago)
                    elif nuevo_estado == "rechazado":
                        await self._actualizar_pedido_a_cancelado(pedido, pago)

                return PagoEstadoResponse(estado=nuevo_estado, pedido_id=pedido_id)

            pago_local = self.uow.pagos.get_ultimo_by_pedido(pedido_id)
            return PagoEstadoResponse(
                estado=pago_local.estado if pago_local else None,
                pedido_id=pedido_id,
            )
