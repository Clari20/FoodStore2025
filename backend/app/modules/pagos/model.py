from typing import Optional
from datetime import datetime, timezone
from decimal import Decimal
from sqlmodel import SQLModel, Field, Field as SQLField
from sqlalchemy import Column, Numeric, BigInteger


class Pago(SQLModel, table=True):
    __tablename__ = "pagos"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedidos.id", index=True)

    # Monto en Decimal compatible con la BD de FoodStore (Numeric 10,2)
    monto: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    estado: str = Field(max_length=20)  # pendiente | aprobado | rechazado

    # Identificadores de Mercado Pago
    mp_preference_id: Optional[str] = Field(default=None, max_length=255)
    mp_init_point: Optional[str] = Field(default=None, max_length=500)
    mp_payment_id: Optional[int] = Field(default=None, sa_type=BigInteger)
    mp_merchant_order_id: Optional[int] = Field(default=None, sa_type=BigInteger)
    mp_status: Optional[str] = Field(default=None, max_length=50)
    mp_status_detail: Optional[str] = Field(default=None, max_length=100)

    idempotency_key: str = Field(max_length=36, unique=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default=None)
