import logging
import sys
from typing import Literal

from app.core.config import settings


def setup_logging(level_name: str | None = None) -> None:
    """
    Configura el sistema de logging de la aplicación.

    Idempotente: se puede llamar varias veces sin duplicar handlers.
    Esto importa porque uvicorn puede recargar la app en modo --reload.

    Args:
        level_name: nombre del nivel (ej: "INFO", "DEBUG"). Si es None,
                    usa `settings.LOG_LEVEL`.
    """
    # Lee el nivel desde el argumento o desde settings.
    if level_name is None:
        level_name = settings.LOG_LEVEL
    level: int = getattr(logging, level_name)

    # ─── Handler: a dónde van los logs ───────────────────────────────────────
    handler = logging.StreamHandler(sys.stdout)

    # ─── Formatter: cómo se ve cada línea ────────────────────────────────────
    COLORS = {
        "DEBUG":    "\033[36m",   
        "INFO":     "\033[32m",   
        "WARNING":  "\033[33m",   
        "ERROR":    "\033[31m",   
        "CRITICAL": "\033[35m",   
        "RESET":    "\033[0m",
    }

    class ColorFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            color = COLORS.get(record.levelname, COLORS["RESET"])
            reset = COLORS["RESET"]
            record.levelname = f"{color}{record.levelname:<8}{reset}"
            return super().format(record)

    formatter = ColorFormatter(
        fmt="%(asctime)s | %(levelname)s | %(name)-30s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    
    handler.setFormatter(formatter)  

    # ─── Logger raíz "app" ──────────────────────────────────────────────────
    app_logger = logging.getLogger("app")
    app_logger.setLevel(level)
    app_logger.handlers.clear()
    app_logger.addHandler(handler)
    app_logger.propagate = False

    # ─── Reducir ruido de librerías externas ────────────────────────────────
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Atajo para crear loggers hijos del logger "app".
    Uso típico:
        from app.core.logger import get_logger
        logger = get_logger(__name__)  # __name__ = "app.modules.pedidos.service"
        logger.info("Pedido creado", extra={"pedido_id": 42})
    Devuelve un logger que hereda la configuración del logger "app".
    """
    return logging.getLogger(name)
