from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DireccionBase(BaseModel):
    alias: str = Field(default="", max_length=50)
    linea1: str = Field(min_length=1, max_length=500)
    linea2: Optional[str] = Field(default=None, max_length=500)
    ciudad: str = Field(min_length=1, max_length=100)
    provincia: str = Field(default="", max_length=100)
    codigo_postal: str = Field(default="", max_length=10)
    es_principal: bool = False


class DireccionCreate(DireccionBase):
    pass


class DireccionUpdate(BaseModel):
    alias: Optional[str] = Field(default=None, max_length=50)
    linea1: Optional[str] = Field(default=None, min_length=1, max_length=500)
    linea2: Optional[str] = Field(default=None, max_length=500)
    ciudad: Optional[str] = Field(default=None, min_length=1, max_length=100)
    provincia: Optional[str] = Field(default=None, max_length=100)
    codigo_postal: Optional[str] = Field(default=None, max_length=10)
    es_principal: Optional[bool] = None


class DireccionResponse(DireccionBase):
    id: int
    usuario_id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}