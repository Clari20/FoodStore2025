import time
from typing import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logger import get_logger
from app.core.config import settings

logger = get_logger("app.middleware.timing")

SLOW_REQUEST_THRESHOLD_MS = 500.0


class TimingMiddleware(BaseHTTPMiddleware):
    """
    Mide el tiempo de cada request y expone la métrica vía header Server-Timing.

    ¿POR QUÉ ES UN MIDDLEWARE Y NO UNA DEPENDENCY?
    ----------------------------------------------------
    - Un middleware ve TODO el request, incluyendo el tiempo que tardan
      las dependencias y otros middlewares.
    - Una dependency solo mide desde que arranca el endpoint en sí.
    - Para latency budgeting real, necesitamos el tiempo TOTAL.

    Implementación:
      - Marca t0 antes de call_next.
      - Deja que el endpoint se ejecute.
      - Mide t1 después y calcula la diferencia.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """
        Mide el tiempo total del request.

        NOTA sobre precisión: usamos time.perf_counter() en vez de time.time()
        porque es un contador monotónico de alta resolución. No se ve afectado
        por cambios del reloj del sistema (NTP, DST, etc.).
        """
        # ── FASE 1: marcar inicio ────────────────────────────────────────────
        start = time.perf_counter()

        # ── FASE 2: ejecutar el resto de la cadena ───────────────────────────
        response = await call_next(request)

        # ── FASE 3: calcular duración y reportar ─────────────────────────────
        duration_ms = (time.perf_counter() - start) * 1000.0

        # Header Server-Timing (estándar W3C).
        response.headers["Server-Timing"] = (
            f'total;dur={duration_ms:.2f};desc="Total request time"'
        )

        # Header custom con la duración en ms (más fácil de parsear).
        response.headers["X-Response-Time-ms"] = f"{duration_ms:.2f}"

        # Si supera el umbral, loggeamos como WARNING para detectar regresiones.
        if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
            logger.warning(
                "🐌 SLOW REQUEST: %s %s took %.1fms (threshold: %.0fms)",
                request.method,
                request.url.path,
                duration_ms,
                SLOW_REQUEST_THRESHOLD_MS,
            )

        return response
