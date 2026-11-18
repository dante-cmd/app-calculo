from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Operacion
from ..schemas import UploadResponse
from ..services import ingestion

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload(archivo: UploadFile, db: Session = Depends(get_db)):
    contenido = await archivo.read()
    try:
        df = ingestion.leer_archivo(archivo.filename or "", contenido)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # archivo corrupto, etc.
        raise HTTPException(status_code=422, detail=f"No se pudo leer el archivo: {exc}") from exc

    try:
        validas, rechazadas = ingestion.parsear_operaciones(df)
    except ingestion.ColumnasFaltantesError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Columnas faltantes en el archivo",
                "faltantes": exc.faltantes,
                "esperadas": ingestion.COLUMNAS_REQUERIDAS,
            },
        ) from exc

    insertadas = 0
    actualizadas = 0
    for datos in validas:
        existente = db.execute(
            select(Operacion).where(Operacion.codigo_subasta == datos["codigo_subasta"])
        ).scalar_one_or_none()
        if existente is None:
            db.add(Operacion(**datos))
            insertadas += 1
        else:
            for campo, valor in datos.items():
                setattr(existente, campo, valor)
            actualizadas += 1
    db.commit()

    total = db.execute(select(func.count()).select_from(Operacion)).scalar_one()
    return UploadResponse(
        insertadas=insertadas,
        actualizadas=actualizadas,
        rechazadas=rechazadas,
        total_operaciones=total,
    )
