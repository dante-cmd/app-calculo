"""Motor de cálculo puro de la cartera de factoring.

Todas las funciones operan sobre listas de diccionarios con las claves:
    fecha_inversion (datetime), cliente, ruc, codigo_subasta, riesgo,
    inversion (float), moneda, retorno_mensual (float, valor porcentual,
    ej. 0.75 = 0.75%), fecha_cierre (date), fecha_pago (date), estado.

Sin dependencias de FastAPI ni SQLAlchemy: testeable con pytest puro.
Regla de oro: NUNCA sumar montos de monedas distintas; la consolidación
solo existe cuando hay tipo de cambio y convierte USD -> PEN.
"""

from collections import defaultdict
from datetime import date

MONEDAS_ORDEN = ("PEN", "USD")


# ---------------------------------------------------------------------------
# Primitivas por operación
# ---------------------------------------------------------------------------

def tea(retorno_mensual: float) -> float:
    """TEA (%) a partir del retorno mensual (%)."""
    return ((1 + retorno_mensual / 100) ** 12 - 1) * 100


def plazo_dias(op: dict) -> int:
    return (op["fecha_pago"] - op["fecha_cierre"]).days


def meses_operacion(op: dict) -> float:
    return plazo_dias(op) / 30.0


def retorno_esperado_op(op: dict) -> float:
    """Retorno esperado en unidades monetarias de la operación."""
    return op["inversion"] * (op["retorno_mensual"] / 100) * meses_operacion(op)


def en_mora(op: dict, hoy: date | None = None) -> bool:
    if hoy is None:
        hoy = date.today()
    return op["estado"] == "por cobrar" and op["fecha_pago"] < hoy


# ---------------------------------------------------------------------------
# Agregados sobre un conjunto de operaciones (una sola moneda)
# ---------------------------------------------------------------------------

def retorno_mensual_ponderado(ops: list[dict]) -> float | None:
    total = sum(op["inversion"] for op in ops)
    if total == 0:
        return None
    return sum(op["inversion"] * op["retorno_mensual"] for op in ops) / total


def tea_ponderada(ops: list[dict]) -> float | None:
    r = retorno_mensual_ponderado(ops)
    if r is None:
        return None
    return tea(r)


def tir_xirr(ops: list[dict]) -> float | None:
    """TIR anual (%) del conjunto tratado como flujos de caja reales:
    desembolso (negativo) en fecha_cierre y cobro de capital + retorno
    esperado (positivo) en fecha_pago. Convención actual/365 vía bisección.
    Devuelve None si falta un flujo de algún signo o no hay raíz."""
    flujos = [(op["fecha_cierre"], -op["inversion"]) for op in ops]
    flujos += [
        (op["fecha_pago"], op["inversion"] + retorno_esperado_op(op)) for op in ops
    ]
    if not any(monto < 0 for _, monto in flujos) or not any(monto > 0 for _, monto in flujos):
        return None
    base = min(f for f, _ in flujos)
    años = [(f - base).days / 365.0 for f, _ in flujos]
    montos = [m for _, m in flujos]

    def van(tasa: float) -> float:
        return sum(m / (1 + tasa) ** a for m, a in zip(montos, años))

    inf, sup = -0.9999, 10.0
    van_inf = van(inf)
    if van_inf * van(sup) > 0:
        return None
    for _ in range(200):
        medio = (inf + sup) / 2
        van_medio = van(medio)
        if abs(van_medio) < 1e-10:
            break
        if van_inf * van_medio < 0:
            sup = medio
        else:
            inf, van_inf = medio, van_medio
    return medio * 100


def plazo_promedio_ponderado(ops: list[dict]) -> float | None:
    total = sum(op["inversion"] for op in ops)
    if total == 0:
        return None
    return sum(op["inversion"] * plazo_dias(op) for op in ops) / total


def hhi(ops: list[dict]) -> dict | None:
    """Índice Herfindahl-Hirschman por RUC sobre el capital del conjunto."""
    capital_por_ruc: dict[str, float] = defaultdict(float)
    for op in ops:
        capital_por_ruc[op["ruc"]] += op["inversion"]
    total = sum(capital_por_ruc.values())
    if total == 0:
        return None
    valor = sum((cap / total) ** 2 for cap in capital_por_ruc.values())
    return {"hhi": round(valor, 6), "hhi_10000": round(valor * 10000, 2)}


# ---------------------------------------------------------------------------
# Agrupación por moneda
# ---------------------------------------------------------------------------

def agrupar_por_moneda(ops: list[dict]) -> dict[str, list[dict]]:
    grupos: dict[str, list[dict]] = defaultdict(list)
    for op in ops:
        grupos[op["moneda"]].append(op)
    return dict(grupos)


def ordenar_monedas(por_moneda: dict) -> list[str]:
    resto = sorted(m for m in por_moneda if m not in MONEDAS_ORDEN)
    return [m for m in MONEDAS_ORDEN if m in por_moneda] + resto


# ---------------------------------------------------------------------------
# KPIs
# ---------------------------------------------------------------------------

def kpis_moneda(ops: list[dict], hoy: date | None = None) -> dict:
    cobradas = [op for op in ops if op["estado"] == "cobrado"]
    por_cobrar = [op for op in ops if op["estado"] == "por cobrar"]
    mora = [op for op in por_cobrar if en_mora(op, hoy)]
    return {
        "capital_total": round(sum(op["inversion"] for op in ops), 2),
        "capital_cobrado": round(sum(op["inversion"] for op in cobradas), 2),
        "capital_por_cobrar": round(sum(op["inversion"] for op in por_cobrar), 2),
        "capital_en_mora": round(sum(op["inversion"] for op in mora), 2),
        "retorno_esperado_total": round(sum(retorno_esperado_op(op) for op in ops), 2),
        "retorno_obtenido": round(sum(retorno_esperado_op(op) for op in cobradas), 2),
        "retorno_por_cobrar": round(sum(retorno_esperado_op(op) for op in por_cobrar), 2),
        "retorno_mensual_ponderado": _redondear(retorno_mensual_ponderado(ops)),
        "tea_ponderada": _redondear(tea_ponderada(ops)),
        "tir_xirr": _redondear(tir_xirr(ops)),
        "plazo_promedio_dias": _redondear(plazo_promedio_ponderado(ops)),
        "num_operaciones": len(ops),
        "num_en_mora": len(mora),
    }


def kpis(ops: list[dict], tipo_cambio: float | None = None, hoy: date | None = None) -> dict:
    por_moneda = agrupar_por_moneda(ops)
    resultado = {
        "por_moneda": {
            moneda: kpis_moneda(por_moneda[moneda], hoy)
            for moneda in ordenar_monedas(por_moneda)
        }
    }
    if tipo_cambio is not None:
        consolidado_ops = ops_en_pen(ops, tipo_cambio)
        if consolidado_ops:
            resultado["consolidado_pen"] = kpis_moneda(consolidado_ops, hoy)
    return resultado


def ops_en_pen(ops: list[dict], tipo_cambio: float) -> list[dict]:
    """Copia las operaciones con montos expresados en PEN (USD * tipo_cambio)."""
    convertidas = []
    for op in ops:
        copia = dict(op)
        if op["moneda"] == "USD":
            copia["inversion"] = op["inversion"] * tipo_cambio
        convertidas.append(copia)
    return convertidas


# ---------------------------------------------------------------------------
# Riesgo
# ---------------------------------------------------------------------------

def analisis_riesgo(ops: list[dict], hoy: date | None = None) -> list[dict]:
    por_moneda = agrupar_por_moneda(ops)
    capital_total_moneda = {
        m: sum(op["inversion"] for op in grupo) for m, grupo in por_moneda.items()
    }
    riesgos = sorted({op["riesgo"] for op in ops})
    resultado = []
    for riesgo in riesgos:
        grupo = [op for op in ops if op["riesgo"] == riesgo]
        bloque_monedas = {}
        grupo_por_moneda = agrupar_por_moneda(grupo)
        for moneda in ordenar_monedas(grupo_por_moneda):
            ops_m = grupo_por_moneda[moneda]
            capital = sum(op["inversion"] for op in ops_m)
            total_m = capital_total_moneda.get(moneda, 0)
            bloque_monedas[moneda] = {
                "capital": round(capital, 2),
                "pct_capital": round(capital / total_m * 100, 2) if total_m else None,
                "retorno_mensual_ponderado": _redondear(retorno_mensual_ponderado(ops_m)),
                "tea": _redondear(tea_ponderada(ops_m)),
            }
        cobradas = sum(1 for op in grupo if op["estado"] == "cobrado")
        mora = sum(1 for op in grupo if en_mora(op, hoy))
        denominador = cobradas + mora
        resultado.append({
            "riesgo": riesgo,
            "por_moneda": bloque_monedas,
            "num_operaciones": len(grupo),
            "tasa_cumplimiento": round(cobradas / denominador * 100, 2)
            if denominador else None,
        })
    return resultado


# ---------------------------------------------------------------------------
# Diversificación
# ---------------------------------------------------------------------------

def analisis_diversificacion(ops: list[dict], tipo_cambio: float | None = None) -> dict:
    por_moneda = agrupar_por_moneda(ops)

    # Capital por cliente (agrupado por RUC) y por moneda
    clientes: dict[str, dict] = {}
    for op in ops:
        entrada = clientes.setdefault(op["ruc"], {"cliente": op["cliente"], "ruc": op["ruc"],
                                                  "por_moneda": defaultdict(float)})
        entrada["por_moneda"][op["moneda"]] += op["inversion"]

    capital_total_moneda = {m: sum(op["inversion"] for op in g) for m, g in por_moneda.items()}
    consolidado = tipo_cambio is not None
    total_pen = (
        sum(cap * (tipo_cambio if m == "USD" else 1)
            for m, cap in capital_total_moneda.items())
        if consolidado else 0.0
    )

    def total_cliente_pen(entrada: dict) -> float:
        return sum(
            cap * (tipo_cambio if m == "USD" else 1)
            for m, cap in entrada["por_moneda"].items()
        )

    def pct_cliente(entrada: dict):
        if consolidado:
            return round(total_cliente_pen(entrada) / total_pen * 100, 2) if total_pen else None
        return {
            m: round(entrada["por_moneda"].get(m, 0.0) / capital_total_moneda[m] * 100, 2)
            for m in ordenar_monedas(por_moneda)
            if capital_total_moneda[m]
        }

    # Sin tipo de cambio no es válido ordenar clientes sumando PEN y USD.
    # Se devuelven todos (ordenados alfabéticamente) y cada vista por moneda
    # calcula su propio top de forma independiente. Con consolidación sí se
    # puede ordenar por el total convertido a PEN.
    ordenados = (
        sorted(clientes.values(), key=total_cliente_pen, reverse=True)
        if consolidado
        else sorted(clientes.values(), key=lambda entrada: entrada["cliente"].lower())
    )

    def a_dict(entrada: dict) -> dict:
        return {
            "cliente": entrada["cliente"],
            "ruc": entrada["ruc"],
            "por_moneda": {m: round(v, 2) for m, v in sorted(entrada["por_moneda"].items())},
            "pct_capital": pct_cliente(entrada),
        }

    top = ordenados[:10] if consolidado else ordenados
    resto = ordenados[10:] if consolidado else []
    lista_clientes = [a_dict(e) for e in top]
    if resto:
        otros = {"cliente": "Otros", "ruc": "", "por_moneda": defaultdict(float)}
        for e in resto:
            for m, cap in e["por_moneda"].items():
                otros["por_moneda"][m] += cap
        lista_clientes.append(a_dict(otros))

    hhi_por_moneda = {
        m: hhi(grupo) for m, grupo in por_moneda.items() if hhi(grupo) is not None
    }

    exposicion = None
    alerta = None
    if consolidado and total_pen:
        exposicion = {}
        for m in ordenar_monedas(por_moneda):
            cap_pen = capital_total_moneda[m] * (tipo_cambio if m == "USD" else 1)
            exposicion[m] = round(cap_pen / total_pen * 100, 2)
        for m, pct in exposicion.items():
            if pct > 40:
                alerta = f"Alta concentración en {m}: {pct}% de la exposición total (>40%)"
                break

    return {
        "clientes": lista_clientes,
        "hhi": hhi_por_moneda,
        "exposicion_moneda": exposicion,
        "alerta_concentracion_moneda": alerta,
    }


# ---------------------------------------------------------------------------
# Flujo de caja
# ---------------------------------------------------------------------------

def flujo_caja(ops: list[dict]) -> list[dict]:
    meses: dict[str, dict[str, dict[str, float]]] = defaultdict(
        lambda: defaultdict(lambda: {
            "capital_cobrado": 0.0, "retorno_cobrado": 0.0,
            "capital_por_cobrar": 0.0, "retorno_por_cobrar": 0.0,
        })
    )
    for op in ops:
        mes = op["fecha_pago"].strftime("%Y-%m")
        bloque = meses[mes][op["moneda"]]
        ret = retorno_esperado_op(op)
        if op["estado"] == "cobrado":
            bloque["capital_cobrado"] += op["inversion"]
            bloque["retorno_cobrado"] += ret
        else:
            bloque["capital_por_cobrar"] += op["inversion"]
            bloque["retorno_por_cobrar"] += ret

    resultado = []
    for mes in sorted(meses):
        por_moneda = {
            m: {k: round(v, 2) for k, v in bloque.items()}
            for m, bloque in meses[mes].items()
        }
        resultado.append({"mes": mes, "por_moneda": por_moneda})
    return resultado


# ---------------------------------------------------------------------------
# Proyección
# ---------------------------------------------------------------------------

ESCENARIOS = {"pesimista": 0.70, "base": 1.0, "optimista": 1.15}
ANIOS = (1, 3, 5)


def proyeccion(ops: list[dict], anios: tuple[int, ...] = ANIOS) -> dict:
    por_moneda = agrupar_por_moneda(ops)
    resultado: dict[str, dict] = {}
    for moneda in ordenar_monedas(por_moneda):
        grupo = por_moneda[moneda]
        capital = sum(op["inversion"] for op in grupo)
        r = retorno_mensual_ponderado(grupo)
        if r is None:
            continue
        escenarios = {}
        for nombre, factor in ESCENARIOS.items():
            r_esc = r * factor
            escenarios[nombre] = [
                {"anios": a, "valor": round(capital * (1 + r_esc / 100) ** (12 * a), 2)}
                for a in anios
            ]
        resultado[moneda] = {
            "capital_inicial": round(capital, 2),
            "escenarios": escenarios,
        }
    return {
        "por_moneda": resultado,
        "parametros": {
            "descripcion": "pesimista = 70% del retorno ponderado, optimista = 115%"
        },
    }


# ---------------------------------------------------------------------------
# Benchmark
# ---------------------------------------------------------------------------

def benchmark(ops: list[dict], plazo_fijo_tea: float, inflacion: float) -> dict:
    por_moneda = agrupar_por_moneda(ops)
    tea_cartera: dict[str, float] = {}
    retorno_real: dict[str, float] = {}
    for moneda in ordenar_monedas(por_moneda):
        t = tea_ponderada(por_moneda[moneda])
        if t is None:
            continue
        tea_cartera[moneda] = round(t, 4)
        # Fórmula de Fisher: descuenta la inflación compuesta del rendimiento
        # nominal, en lugar de una aproximación por simple resta.
        retorno_real[moneda] = round(((1 + t / 100) / (1 + inflacion / 100) - 1) * 100, 4)
    return {
        "tea_cartera": tea_cartera,
        "plazo_fijo_tea": plazo_fijo_tea,
        "inflacion": inflacion,
        "retorno_real_cartera": retorno_real,
        "metadatos": {
            "fecha_referencia": "Julio de 2026",
            "formula_retorno_real": "((1 + TEA cartera / 100) / (1 + inflación / 100) − 1) × 100",
            "fuentes": {
                "plazo_fijo": {
                    "nombre": "SBS · Tasas pasivas promedio del sistema bancario",
                    "detalle": "Depósito a plazo en PEN, 181–360 días: 4.28% anual referencial (24/07/2026).",
                    "url": "https://www.sbs.gob.pe/app/pp/EstadisticasSAEEPortal/Paginas/TIPasivaDepositoEmpresa.aspx?tip=B",
                },
                "inflacion": {
                    "nombre": "BCRP · Expectativa de inflación a 12 meses",
                    "detalle": "Expectativa de inflación: 3.01% anual (julio de 2026).",
                    "url": "https://estadisticas.bcrp.gob.pe/estadisticas/series/mensuales/resultados/PD12912AM",
                },
            },
        },
    }


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def _redondear(valor: float | None, decimales: int = 4) -> float | None:
    return round(valor, decimales) if valor is not None else None
