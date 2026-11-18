from sqlalchemy.orm import Session

from .models import Config

DEFAULTS = {
    "tipo_cambio": "",
    # Valores referenciales actualizados en julio de 2026. El usuario puede
    # modificarlos desde Configuración para usar una tasa/plazo de su elección.
    "plazo_fijo_tea": "4.28",
    "inflacion": "3.01",
}


def get_config(db: Session, clave: str) -> str:
    row = db.get(Config, clave)
    if row is None:
        return DEFAULTS.get(clave, "")
    return row.valor


def set_config(db: Session, clave: str, valor: str) -> None:
    row = db.get(Config, clave)
    if row is None:
        row = Config(clave=clave, valor=valor)
        db.add(row)
    else:
        row.valor = valor
    db.commit()


def get_tipo_cambio(db: Session) -> float | None:
    raw = get_config(db, "tipo_cambio").strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def get_float_config(db: Session, clave: str) -> float:
    return float(get_config(db, clave))
