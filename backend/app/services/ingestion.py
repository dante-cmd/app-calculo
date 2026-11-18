"""Ingesta de archivos Excel/CSV con parsing tolerante y validación."""

import io
import math
from datetime import date, datetime, time

import pandas as pd

COLUMNAS_REQUERIDAS = [
    "Fecha",
    "Hora",
    "Cliente",
    "RUC",
    "Codigo de subasta",
    "Riesgo",
    "Inversion",
    "Moneda",
    "Retorno mensual (%)",
    "Fecha de cierre de subasta",
    "Fecha de pago",
    "Estado",
]

_FORMATOS_FECHA = (
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%Y-%m-%d %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
)

# Prestamype puede exportar el pendiente de cobro como “pendiente” en vez de
# “por cobrar”. La aplicación usa un valor interno único para sus filtros y
# reglas de mora.
ESTADOS_NORMALIZADOS = {
    "cobrado": "cobrado",
    "pagado": "cobrado",
    "por cobrar": "por cobrar",
    "por_cobrar": "por cobrar",
    "pendiente": "por cobrar",
}


class ColumnasFaltantesError(Exception):
    def __init__(self, faltantes: list[str]):
        self.faltantes = faltantes
        super().__init__(f"Columnas faltantes: {', '.join(faltantes)}")


def leer_archivo(nombre: str, contenido: bytes) -> pd.DataFrame:
    """Lee .xlsx, .xls o .csv en un DataFrame."""
    nombre = nombre.lower()
    buffer = io.BytesIO(contenido)
    if nombre.endswith((".xlsx", ".xlsm")):
        try:
            df = pd.read_excel(buffer, sheet_name="reporte")
        except ValueError:
            buffer.seek(0)
            df = pd.read_excel(buffer, sheet_name=0)
    elif nombre.endswith(".xls"):
        try:
            df = pd.read_excel(buffer, sheet_name="reporte")
        except ValueError:
            buffer.seek(0)
            df = pd.read_excel(buffer, sheet_name=0)
    elif nombre.endswith(".csv"):
        try:
            df = pd.read_csv(buffer)
        except UnicodeDecodeError:
            buffer.seek(0)
            df = pd.read_csv(buffer, encoding="latin-1")
    else:
        raise ValueError("Formato no soportado. Use .xlsx, .xls o .csv")
    return df


def _parse_fecha(valor) -> date:
    """Acepta datetime, date, Timestamp o str en varios formatos; devuelve date."""
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    if isinstance(valor, pd.Timestamp):
        return valor.date()
    texto = str(valor).strip()
    for fmt in _FORMATOS_FECHA:
        try:
            return datetime.strptime(texto, fmt).date()
        except ValueError:
            continue
    # Último recurso: pandas, con dayfirst si hay '/'
    ts = pd.to_datetime(texto, dayfirst="/" in texto)
    return ts.date()


def _parse_numero(valor) -> float:
    """Acepta números o texto con separadores de miles ('1,500.00' / '1 500,00')."""
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor).strip().replace(" ", "")
    if not texto:
        raise ValueError("valor numérico vacío")
    if "," in texto and "." in texto:
        # Asume ',' como separador de miles si el '.' va después
        if texto.rfind(".") > texto.rfind(","):
            texto = texto.replace(",", "")
        else:
            texto = texto.replace(".", "").replace(",", ".")
    elif "," in texto:
        partes = texto.split(",")
        # '1,500' -> miles si la parte final tiene 3 dígitos; si no, decimal
        if len(partes[-1]) == 3 and len(partes) >= 2:
            texto = texto.replace(",", "")
        else:
            texto = texto.replace(",", ".")
    numero = float(texto)
    if not math.isfinite(numero):
        raise ValueError("valor numérico no válido")
    return numero


def _parse_fecha_hora(fecha_valor, hora_valor) -> datetime:
    fecha = _parse_fecha(fecha_valor)
    hora = time(0, 0)
    if hora_valor is not None and str(hora_valor).strip():
        texto = str(hora_valor).strip()
        for fmt in ("%H:%M:%S", "%H:%M"):
            try:
                hora = datetime.strptime(texto, fmt).time()
                break
            except ValueError:
                continue
    return datetime.combine(fecha, hora)


def parsear_operaciones(df: pd.DataFrame) -> tuple[list[dict], list[dict]]:
    """Valida y limpia el DataFrame. Devuelve (ops válidas, rechazadas)."""
    df.columns = [str(c).strip() for c in df.columns]
    faltantes = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
    if faltantes:
        raise ColumnasFaltantesError(faltantes)

    validas: list[dict] = []
    rechazadas: list[dict] = []

    for idx, fila in df.iterrows():
        fila_num = int(idx) + 2  # +2: encabezado + índice base 0
        try:
            op = {
                "fecha_inversion": _parse_fecha_hora(fila["Fecha"], fila["Hora"]),
                "cliente": str(fila["Cliente"]).strip(),
                "ruc": str(fila["RUC"]).strip().split(".")[0],
                "codigo_subasta": str(fila["Codigo de subasta"]).strip(),
                "riesgo": str(fila["Riesgo"]).strip().upper(),
                "inversion": _parse_numero(fila["Inversion"]),
                "moneda": str(fila["Moneda"]).strip().upper(),
                "retorno_mensual": _parse_numero(fila["Retorno mensual (%)"]),
                "fecha_cierre": _parse_fecha(fila["Fecha de cierre de subasta"]),
                "fecha_pago": _parse_fecha(fila["Fecha de pago"]),
                "estado": ESTADOS_NORMALIZADOS.get(
                    str(fila["Estado"]).strip().lower(),
                    str(fila["Estado"]).strip().lower(),
                ),
            }
            if not op["cliente"]:
                raise ValueError("Cliente vacío")
            if not op["codigo_subasta"]:
                raise ValueError("Codigo de subasta vacío")
            if op["moneda"] not in ("PEN", "USD"):
                raise ValueError(f"Moneda inválida: {op['moneda']}")
            if op["riesgo"] not in ("A", "B", "C"):
                raise ValueError(f"Riesgo inválido: {op['riesgo']}")
            if op["estado"] not in ("cobrado", "por cobrar"):
                raise ValueError("Estado inválido: use cobrado, por cobrar o pendiente")
            if op["inversion"] <= 0:
                raise ValueError("Inversion debe ser positiva")
            if op["retorno_mensual"] < 0:
                raise ValueError("Retorno mensual no puede ser negativo")
            validas.append(op)
        except Exception as exc:  # noqa: BLE001 - acumulamos errores por fila
            rechazadas.append({"fila": fila_num, "error": str(exc)})

    return validas, rechazadas
