from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.custom_exceptions import (
    AppError,
    RateLimitExceededError,
)
from app.core.logger import get_logger

logger = get_logger("app.exceptions")


def _build_error_response(
    *,
    code: str,
    message: str,
    status_code: int,
    request_id: str | None = None,
    extra: dict | None = None,
) -> JSONResponse:
    """
    Construye la respuesta JSON estándar para todos los errores.
    Centralizar este formato es CLAVE para que el frontend pueda
    parsear errores de forma uniforme sin importar el tipo.
    Args:
        code: código interno del error (estable, para i18n).
        message: mensaje legible (puede mostrarse al usuario).
        status_code: código HTTP de la response.
        request_id: ID del request (para correlación con logs).
        extra: campos adicionales específicos del error (ej: validation errors).
    """
    body = {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }
    if extra:
        body["error"].update(extra)
    return JSONResponse(status_code=status_code, content=body)

def _get_request_id(request: Request) -> str | None:
    """
    Recupera el request_id guardado por LoggingMiddleware.
    Si el middleware no se ejecutó (caso raro, ej: tests sin middleware),
    devuelve None.
    """
    return getattr(request.state, "request_id", None)

# ─── HANDLER 1: Excepciones de dominio (AppError) ─────────────────────────────

async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """
    Handler para TODA excepción que hereda de AppError.
    Captura: ResourceNotFoundError, DuplicateResourceError, BusinessRuleError,
    AuthenticationError, AuthorizationError, RateLimitExceededError, etc.
    Loggea como WARNING (4xx) o ERROR (5xx) según el status.
    """
    request_id = _get_request_id(request)
    if exc.status_code >= 500:
        logger.error(
            "[%s] AppError %d %s: %s",
            request_id, exc.status_code, exc.code, exc.message,
        )
    else:
        logger.warning(
            "[%s] AppError %d %s: %s",
            request_id, exc.status_code, exc.code, exc.message,
        )

    response = _build_error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        request_id=request_id,
    )

    if isinstance(exc, RateLimitExceededError):
        response.headers["Retry-After"] = str(exc.retry_after)

    return response


# ─── HANDLER 2: HTTPException (404 manual, 401, 403, etc.) ────────────────────

async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """
    Handler para HTTPException estándar de FastAPI.
    FastAPI ya tiene un handler por defecto que devuelve {"detail": "..."}.
    Lo override para que use NUESTRO formato consistente.
    Caso típico: raise HTTPException(404) en el service (sin custom exception).
    """
    request_id = _get_request_id(request)
    logger.warning(
        "[%s] HTTPException %d: %s",
        request_id, exc.status_code, exc.detail,
    )

    code_map = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
        422: "validation_error",
        429: "rate_limit_exceeded",
        500: "internal_error",
    }
    code = code_map.get(exc.status_code, "http_error")

    return _build_error_response(
        code=code,
        message=str(exc.detail),
        status_code=exc.status_code,
        request_id=request_id,
    )


# ─── HANDLER 3: Errores de validación de Pydantic (422) ──────────────────────

async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handler para errores de validación de Pydantic (request body mal formado).

    Pydantic produce una lista de errores con estructura:
        [{"loc": ["body", "email"], "msg": "value is not a valid email", ...}]

    La reformateamos a algo más amigable para el frontend.
    """
    request_id = _get_request_id(request)
    errors = []
    for err in exc.errors():
        location = ".".join(str(x) for x in err.get("loc", []))
        errors.append({
            "field": location,
            "message": err.get("msg", "Error de validación"),
            "type": err.get("type", "validation_error"),
        })

    logger.info(
        "[%s] Validation error: %d errores en %s",
        request_id, len(errors), request.url.path,
    )

    return _build_error_response(
        code="validation_error",
        message="Los datos enviados no son válidos",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        request_id=request_id,
        extra={"fields": errors},
    )


# ─── HANDLER 4: Errores de base de datos ──────────────────────────────────────

async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """
    Handler para excepciones de SQLAlchemy (errores de BD no capturados).
    Distinguimos IntegrityError (constraint violation, ej: unique) del resto.
    ⚠️ SEGURIDAD: NO exponemos el mensaje original de SQLAlchemy al cliente
    porque puede contener detalles del schema, queries, o datos sensibles.
    En su lugar, loggeamos internamente y devolvemos un mensaje genérico.
    """
    request_id = _get_request_id(request)

    if isinstance(exc, IntegrityError):
        # Lo más común: UNIQUE constraint violation.
        logger.warning(
            "[%s] IntegrityError en %s: %s",
            request_id, request.url.path, str(exc.orig),
        )
        return _build_error_response(
            code="duplicate_resource",
            message="La operación viola una restricción de unicidad o integridad.",
            status_code=status.HTTP_409_CONFLICT,
            request_id=request_id,
        )

    # Otro error de BD: lo loggeamos con stack trace y devolvemos 500 genérico.
    logger.error(
        "[%s] SQLAlchemyError en %s: %s",
        request_id, request.url.path, repr(exc),
        exc_info=True,  # Incluye el stack trace completo en el log.
    )
    return _build_error_response(
        code="database_error",
        message="Error de base de datos. Contacta al administrador.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=request_id,
    )


# ─── HANDLER 5: Catch-all (cualquier excepción no manejada) ───────────────────

async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handler de ÚLTIMO RECURSO. Captura cualquier excepción que no fue
    manejada por los handlers más específicos.
    ⚠️ Esto es la red de seguridad. Si llegamos acá, es un bug.
    Loggeamos con stack trace completo para debugging.
    """
    request_id = _get_request_id(request)
    logger.critical(
        "[%s] UNHANDLED EXCEPTION en %s: %s",
        request_id, request.url.path, repr(exc),
        exc_info=True,
    )
    return _build_error_response(
        code="internal_error",
        message="Error interno del servidor. El equipo ha sido notificado.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=request_id,
    )

# ─── FUNCIÓN DE REGISTRO ─────────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """
    Registra TODOS los handlers en la app de FastAPI.
    Llamar UNA VEZ al configurar la app (en main.py).
    ORDEN DE REGISTRO vs EJECUCIÓN:
    FastAPI intenta matchear el handler más específico primero. Si una
    excepción no matchea con ninguno, usa el catch-all (unhandled).
    """
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
