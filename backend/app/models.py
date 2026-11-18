from sqlalchemy import Date, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Operacion(Base):
    __tablename__ = "operaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha_inversion: Mapped[DateTime] = mapped_column(DateTime)
    cliente: Mapped[str] = mapped_column(String, index=True)
    ruc: Mapped[str] = mapped_column(String, index=True)
    codigo_subasta: Mapped[str] = mapped_column(String, unique=True, index=True)
    riesgo: Mapped[str] = mapped_column(String)
    inversion: Mapped[float] = mapped_column(Float)
    moneda: Mapped[str] = mapped_column(String, index=True)
    retorno_mensual: Mapped[float] = mapped_column(Float)
    fecha_cierre: Mapped[Date] = mapped_column(Date)
    fecha_pago: Mapped[Date] = mapped_column(Date)
    estado: Mapped[str] = mapped_column(String, index=True)


class Config(Base):
    __tablename__ = "config"

    clave: Mapped[str] = mapped_column(String, primary_key=True)
    valor: Mapped[str] = mapped_column(String, default="")
