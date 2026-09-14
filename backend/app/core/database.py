"""
Engine SQLModel y factory de sesión.

Usa PostgreSQL configurado vía variables de entorno en config.py.
Este módulo reemplaza a db/base.py + db/session.py.

Capa: Core (infraestructura)
"""

from sqlmodel import SQLModel, Session, create_engine
from app.core.config import settings

# PostgreSQL no necesita connect_args especiales.
# check_same_thread=False era exclusivo de SQLite; aquí ya no aplica.
engine = create_engine(settings.DATABASE_URL, echo=False)


def get_session():
    """Dependencia FastAPI: provee una sesión de BD por request."""
    with Session(engine) as session:
        yield session


def create_all_tables() -> None:
    """
    Crea las tablas registradas en SQLModel.metadata al arrancar la app.
    Los imports registran cada modelo en el metadata de SQLModel.
    """
    import app.modules.usuarios.model              # noqa: F401
    import app.modules.usuarios.rol_model           # noqa: F401
    import app.modules.usuarios.direccion_model     # noqa: F401
    import app.modules.usuarios.refresh_token_model # noqa: F401
    import app.modules.productos.model              # noqa: F401
    import app.modules.ingredientes.model           # noqa: F401
    import app.modules.categorias.model             # noqa: F401
    import app.modules.pedidos.model                # noqa: F401
    SQLModel.metadata.create_all(engine)
