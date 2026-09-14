"""
Unit of Work — gestión de transacción.

Abre la sesión de BD, provee acceso a todos los repositorios,
hace commit() automático al salir sin excepciones o rollback() si ocurre error.

Capa: UoW
Conoce a: Repository, Session
NO conoce a: Service, Router

Uso en Service:
    with uow:
        ingrediente = uow.ingredientes.get_by_id(1)
        uow.ingredientes.add(nuevo_ingrediente)
    # commit automático al salir del with, rollback si hay excepción
"""

from sqlmodel import Session

from app.core.database import engine
from app.modules.usuarios.repository import (
    UsuarioRepository, RolRepository, UsuarioRolRepository, RefreshTokenRepository,
)
from app.modules.ingredientes.repository import IngredienteRepository
from app.modules.productos.repository import (
    ProductoRepository, ProductoCategoriaRepository, ProductoIngredienteRepository, UnidadMedidaRepository
)
from app.modules.categorias.repository import CategoriaRepository
from app.modules.pedidos.repository import (
    PedidoRepository,DetallePedidoRepository,HistorialEstadoRepository,
    EstadoPedidoRepository,
    FormaPagoRepository,
)
from app.modules.pagos.repository import PagoRepository

from app.modules.direcciones.repository import DireccionEntregaRepository

class UnitOfWork:
    """
    Context manager que encapsula una transacción de BD.

    Atributos:
        usuarios:          UsuarioRepository
        roles:             RolRepository
        usuario_roles:     UsuarioRolRepository
        refresh_tokens:    RefreshTokenRepository
        ingredientes:      IngredienteRepository
    """

    def __init__(self):
        self.session: Session | None = None

    def __enter__(self):
        self.session = Session(engine, expire_on_commit=False)
        # Dominio 1: Identidad & Acceso
        self.usuarios = UsuarioRepository(self.session)
        self.roles = RolRepository(self.session)
        self.usuario_roles = UsuarioRolRepository(self.session)
        self.refresh_tokens = RefreshTokenRepository(self.session)
        self.direcciones = DireccionEntregaRepository(self.session)
        # Dominio 2: Productos
        self.ingredientes = IngredienteRepository(self.session)
        self.productos = ProductoRepository(self.session)
        self.categorias = CategoriaRepository(self.session)
        self.producto_categorias = ProductoCategoriaRepository(self.session)
        self.producto_ingredientes = ProductoIngredienteRepository(self.session)
        self.unidades_medida = UnidadMedidaRepository(self.session)
        self.pedidos            = PedidoRepository(self.session)
        self.detalles_pedido    = DetallePedidoRepository(self.session)
        self.historial_estados  = HistorialEstadoRepository(self.session)
        self.estados_pedido     = EstadoPedidoRepository(self.session)
        self.formas_pago        = FormaPagoRepository(self.session)
        self.pagos              = PagoRepository(self.session)

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.session.rollback()
        else:
            self.session.commit()
        self.session.close()

    def rollback(self):
        """Rollback explícito."""
        self.session.rollback()


def get_uow() -> UnitOfWork:
    """Dependencia FastAPI: provee un UnitOfWork por request."""
    return UnitOfWork()
