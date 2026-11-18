from datetime import date, datetime

from pydantic import BaseModel


class OperacionOut(BaseModel):
    id: int
    fecha_inversion: datetime
    cliente: str
    ruc: str
    codigo_subasta: str
    riesgo: str
    inversion: float
    moneda: str
    retorno_mensual: float
    fecha_cierre: date
    fecha_pago: date
    estado: str
    plazo_dias: int
    retorno_esperado: float
    tea: float
    en_mora: bool

    model_config = {"from_attributes": True}


class Rechazada(BaseModel):
    fila: int
    error: str


class UploadResponse(BaseModel):
    insertadas: int
    actualizadas: int
    rechazadas: list[Rechazada]
    total_operaciones: int


class ConfigIn(BaseModel):
    tipo_cambio: float | None = None
    plazo_fijo_tea: float | None = None
    inflacion: float | None = None


class ConfigOut(BaseModel):
    tipo_cambio: float | None
    plazo_fijo_tea: float
    inflacion: float
