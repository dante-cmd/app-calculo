from datetime import date

import pandas as pd

from app.services.ingestion import COLUMNAS_REQUERIDAS, parsear_operaciones


def test_estado_pendiente_se_normaliza_a_por_cobrar():
    fila = {
        "Fecha": "17/08/2026",
        "Hora": "17:17:13",
        "Cliente": "EQUINOX INTERNATIONAL S.A.C.",
        "RUC": "2042248815",
        "Codigo de subasta": "Ejemplo-001",
        "Riesgo": "B",
        "Inversion": 1034,
        "Moneda": "PEN",
        "Retorno mensual (%)": 1.4,
        "Fecha de cierre de subasta": "17/08/2026",
        "Fecha de pago": "10/07/2027",
        "Estado": "pendiente",
    }
    df = pd.DataFrame([fila], columns=COLUMNAS_REQUERIDAS)

    validas, rechazadas = parsear_operaciones(df)

    assert not rechazadas
    assert validas[0]["estado"] == "por cobrar"
    assert validas[0]["fecha_pago"] == date(2027, 7, 10)
