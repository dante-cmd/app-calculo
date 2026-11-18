from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import config_store
from ..database import get_db
from ..schemas import ConfigIn, ConfigOut
from ..services import calculations as calc
from .operaciones import op_a_dict, operaciones_filtradas

router = APIRouter()


def _ops_dicts(
    db: Session,
    fecha_desde: date | None,
    fecha_hasta: date | None,
    moneda: str | None,
    riesgo: str | None,
    estado: str | None,
    cliente: str | None,
) -> list[dict]:
    ops = operaciones_filtradas(db, fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente)
    return [op_a_dict(op) for op in ops]


@router.get("/kpis")
def kpis(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    moneda: str | None = Query(None),
    riesgo: str | None = Query(None),
    estado: str | None = Query(None),
    cliente: str | None = Query(None),
):
    ops = _ops_dicts(db, fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente)
    return calc.kpis(ops, tipo_cambio=config_store.get_tipo_cambio(db), hoy=date.today())


@router.get("/riesgo")
def riesgo(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    moneda: str | None = Query(None),
    riesgo: str | None = Query(None),
    estado: str | None = Query(None),
    cliente: str | None = Query(None),
):
    ops = _ops_dicts(db, fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente)
    return calc.analisis_riesgo(ops, hoy=date.today())


@router.get("/diversificacion")
def diversificacion(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    moneda: str | None = Query(None),
    riesgo: str | None = Query(None),
    estado: str | None = Query(None),
    cliente: str | None = Query(None),
):
    ops = _ops_dicts(db, fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente)
    return calc.analisis_diversificacion(ops, tipo_cambio=config_store.get_tipo_cambio(db))


@router.get("/flujo-caja")
def flujo_caja(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    moneda: str | None = Query(None),
    riesgo: str | None = Query(None),
    estado: str | None = Query(None),
    cliente: str | None = Query(None),
):
    ops = _ops_dicts(db, fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente)
    return calc.flujo_caja(ops)


@router.get("/proyeccion")
def proyeccion(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    moneda: str | None = Query(None),
    riesgo: str | None = Query(None),
    estado: str | None = Query(None),
    cliente: str | None = Query(None),
):
    ops = _ops_dicts(db, fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente)
    return calc.proyeccion(ops)


@router.get("/benchmark")
def benchmark(
    db: Session = Depends(get_db),
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    moneda: str | None = Query(None),
    riesgo: str | None = Query(None),
    estado: str | None = Query(None),
    cliente: str | None = Query(None),
):
    ops = _ops_dicts(db, fecha_desde, fecha_hasta, moneda, riesgo, estado, cliente)
    return calc.benchmark(
        ops,
        plazo_fijo_tea=config_store.get_float_config(db, "plazo_fijo_tea"),
        inflacion=config_store.get_float_config(db, "inflacion"),
    )


@router.get("/config", response_model=ConfigOut)
def leer_config(db: Session = Depends(get_db)):
    return ConfigOut(
        tipo_cambio=config_store.get_tipo_cambio(db),
        plazo_fijo_tea=config_store.get_float_config(db, "plazo_fijo_tea"),
        inflacion=config_store.get_float_config(db, "inflacion"),
    )


@router.put("/config", response_model=ConfigOut)
def actualizar_config(config: ConfigIn, db: Session = Depends(get_db)):
    enviados = config.model_fields_set
    if "tipo_cambio" in enviados:
        config_store.set_config(
            db, "tipo_cambio", "" if config.tipo_cambio is None else str(config.tipo_cambio)
        )
    if "plazo_fijo_tea" in enviados and config.plazo_fijo_tea is not None:
        config_store.set_config(db, "plazo_fijo_tea", str(config.plazo_fijo_tea))
    if "inflacion" in enviados and config.inflacion is not None:
        config_store.set_config(db, "inflacion", str(config.inflacion))
    return leer_config(db)
