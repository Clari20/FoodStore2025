import time
import uuid
from typing import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logger import get_logger

# Logger específico para este middleware.
logger = get_logger("app.middleware.logging")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware que registra cada request y su response correspondiente.

    Información loggeada:
      - method: GET, POST, etc.
      - path: ruta accedida (sin query string).
      - status_code: código HTTP de la response.
      - duration_ms: cuánto tardó el request completo.
      - request_id: identificador único (para correlacionar logs).
      - client_ip: IP del cliente (con cuidado si hay proxy reverso).
      - user_agent: navegador/cliente.

    NOTA: este middleware lee el body de la response para loguearlo.
    En producción, loggear bodies grandes puede ser un problema de:
      - PERFORMANCE: serializar JSON es caro.
      - SEGURIDAD: si la response tiene datos sensibles, los filtrás.
    Por eso está DESACTIVADO por defecto. Activar solo en debugging.
    """

    # Rutas a EXCLUIR del logging (suelen ser muy verbosas y poco útiles).
    EXCLUDED_PATHS: set[str] = {
        "/health",
        "/favicon.ico",
        "/openapi.json",
        "/docs",
        "/redoc",
    }

    def __init__(self, app: ASGIApp, log_body: bool = False) -> None:
        """
        Args:
            app: la siguiente capa en la cadena ASGI.
            log_body: si True, loggea el body de la response (peligroso en prod).
        """
        super().__init__(app)
        self.log_body = log_body

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """
        Lógica del middleware: se ejecuta una vez por request.

        `call_next` es el puntero al siguiente eslabón (otro middleware o el endpoint).
        Devuelve la Response producida.
        """
        # ── FASE 1: PRE-request ──────────────────────────────────────────────
        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()  # Más preciso que time.time().
        request.state.request_id = request_id
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)
        logger.info(
            "→ %s %s [id=%s] from=%s ua=%s",
            request.method,
            request.url.path,
            request_id,
            self._get_client_ip(request),
            request.headers.get("user-agent", "unknown"),
        )
        # ── FASE 2: llamada al siguiente eslabón ─────────────────────────────
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "✗ %s %s [id=%s] EXCEPTION after %.1fms: %s",
                request.method,
                request.url.path,
                request_id,
                duration_ms,
                repr(exc),
            )
            raise  

        # ── FASE 3: POST-request ─────────────────────────────────────────────
        duration_ms = (time.perf_counter() - start_time) * 1000
        if response.status_code >= 500:
            log_level = logger.error
        elif response.status_code >= 400:
            log_level = logger.warning
        else:
            log_level = logger.info

        log_level(
            "← %s %s [id=%s] %d in %.1fms",
            request.method,
            request.url.path,
            request_id,
            response.status_code,
            duration_ms,
        )
        response.headers["X-Request-ID"] = request_id

        return response

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """
        Extrae la IP del cliente, considerando proxies.

        En producción suele haber un load balancer / reverse proxy
        (nginx, CloudFront, etc.) que agrega el header X-Forwarded-For.
        La IP REAL del cliente está en ese header, no en request.client.

        Confiar en X-Forwarded-For es PELIGROSO si no hay un proxy de
        confianza (cualquiera puede mandar el header falsificado).
        En producción, configurar trusted_proxies en el LB.
        """
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # X-Forwarded-For: "client, proxy1, proxy2"
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
