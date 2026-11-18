from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Operacion
from ..schemas import OperacionOut
from ..services import calculations as calc

router = APIRouter()

CAMPOS_ORDEN = {
    "fecha_inversion", "cliente", "ruc", "codigo_subasta", "riesgo",
    "inversion", "moneda", "retorno_mensual", "fecha_cierre", "fecha_pago",
    "estado",
}


def aplicar_filtros(
    stmt,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    moneda: str | None = None,
    riesgo: str | None = None,
    estado: str | None = None,
    cliente: str | None = None,
):
    """Aplica los filtros comunes a un select de Operacion."""
    if fecha_desde:
        stmt = stmt.where(Operacion.fecha_inversion >= datetime.combine(fecha_desde, datetime.min.time()))
    if fecha_hasta:
        stmt = stmt.where(Operacion.fecha_inversion < datetime.combine(fecha_hasta + timedelta(days=1), datetime.min.time()))
    if moneda:
        stmt = stmt.where(Operacion.moneda == moneda.upper())
    if riesgo:
        stmt = stmt.where(Operacion.riesgo == riesgo.upper())
    if estado:
        estado_norm = estado.strip().lower()
        if estado_norm == "en mora":
            stmt = stmt.where(
                Operacion.estado == "por cobrar",
                Operacion.fecha_pago < date.today(),
            )
        else:
            stmt = stmt.where(Operacion.estado == estado_norm)
    if cliente:
        stmt = stmt.where(Operacion.cliente.ilike(f"%{cliente}%"))
    return stmt


def op_a_dict(op: Operacion) -> dict:
    return {
        "fecha_inversion": op.fecha_inversion,
        "cliente": op.cliente,
        "ruc": op.ruc,
        "codigo_subasta": op.codigo_subasta,
        "riesgo": op.riesgo,
        "inversion": op.inversion,
        "moneda": op.moneda,
        "retorno_mensual": op.retorno_mensual,
        "fecha_cierre": op.fecha_cierre,
        "fecha_pago": op.fecha_pago,
        "estado": op.estado,
    }


def operaciones_filtradas(
    db: Session,
    fecha_desde: date | None,
    fecha_hasta: date | None,
    moneda: str | None,
    riesgo: str | None,
    estado: str | None,
    cliente: str | None,
) -> list[Operacion]:
    stmt = aplicar_filtros(
        select(Operacion), fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente
    )
    return list(db.execute(stmt).scalars().all())


@router.get("/operaciones", response_model=list[OperacionOut])
def listar_operaciones(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    moneda: str | None = Query(None),
    riesgo: str | None = Query(None),
    estado: str | None = Query(None),
    cliente: str | None = Query(None),
    q: str | None = Query(None),
    orden_por: str = Query("fecha_inversion"),
    orden_dir: str = Query("desc", pattern="^(asc|desc)$"),
):
    stmt = aplicar_filtros(
        select(Operacion), fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Operacion.cliente.ilike(like),
                Operacion.ruc.ilike(like),
                Operacion.codigo_subasta.ilike(like),
            )
        )
    if orden_por not in CAMPOS_ORDEN:
        raise HTTPException(status_code=422, detail=f"orden_por inválido: {orden_por}")
    columna = getattr(Operacion, orden_por)
    stmt = stmt.order_by(columna.asc() if orden_dir == "asc" else columna.desc())

    hoy = date.today()
    resultado = []
    for op in db.execute(stmt).scalars().all():
        d = op_a_dict(op)
        resultado.append({
            "id": op.id,
            **d,
            "plazo_dias": calc.plazo_dias(d),
            "retorno_esperado": round(calc.retorno_esperado_op(d), 2),
            "tea": round(calc.tea(op.retorno_mensual), 4),
            "en_mora": calc.en_mora(d, hoy),
        })
    return resultado
