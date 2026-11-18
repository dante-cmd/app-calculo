"""Tests del motor de cálculo puro (sin FastAPI ni SQLAlchemy).

Todos los valores esperados están calculados a mano sobre datos sintéticos.
"""

from datetime import date, datetime

import pytest

from app.services import calculations as calc


def make_op(**kwargs) -> dict:
    base = {
        "fecha_inversion": datetime(2026, 1, 1, 10, 0, 0),
        "cliente": "CLIENTE X",
        "ruc": "20100000001",
        "codigo_subasta": "ABC123",
        "riesgo": "A",
        "inversion": 1000.0,
        "moneda": "PEN",
        "retorno_mensual": 1.0,
        "fecha_cierre": date(2026, 1, 1),
        "fecha_pago": date(2026, 4, 1),
        "estado": "cobrado",
    }
    base.update(kwargs)
    return base


# ---------------------------------------------------------------------------
# Retorno ponderado
# ---------------------------------------------------------------------------

def test_retorno_ponderado_vs_simple():
    ops = [
        make_op(inversion=1000.0, retorno_mensual=1.0),
        make_op(inversion=3000.0, retorno_mensual=0.5, ruc="20100000002"),
    ]
    # ponderado: (1000*1.0 + 3000*0.5) / 4000 = 2500/4000 = 0.625
    assert calc.retorno_mensual_ponderado(ops) == pytest.approx(0.625)
    # el promedio simple sería 0.75: el ponderado debe diferir
    assert calc.retorno_mensual_ponderado(ops) != pytest.approx(0.75)


def test_retorno_ponderado_vacio():
    assert calc.retorno_mensual_ponderado([]) is None


# ---------------------------------------------------------------------------
# TEA
# ---------------------------------------------------------------------------

def test_tea_operacion():
    # (1 + 0.75/100)^12 - 1 = 1.0075^12 - 1 ≈ 0.09381 -> 9.381%
    assert calc.tea(0.75) == pytest.approx(9.381, abs=0.01)


def test_tea_cero():
    assert calc.tea(0.0) == pytest.approx(0.0)


def test_tea_ponderada_cartera():
    ops = [make_op(inversion=1000.0, retorno_mensual=1.0)]
    # (1.01)^12 - 1 = 12.6825%
    assert calc.tea_ponderada(ops) == pytest.approx(12.6825, abs=0.001)


# ---------------------------------------------------------------------------
# Retorno esperado con meses fraccionados
# ---------------------------------------------------------------------------

def test_retorno_esperado_meses_fraccionados():
    op = make_op(
        inversion=1000.0,
        retorno_mensual=1.0,
        fecha_cierre=date(2026, 1, 1),
        fecha_pago=date(2026, 2, 15),  # 45 días = 1.5 meses
    )
    assert calc.meses_operacion(op) == pytest.approx(1.5)
    # 1000 * 0.01 * 1.5 = 15.0
    assert calc.retorno_esperado_op(op) == pytest.approx(15.0)


# ---------------------------------------------------------------------------
# En mora (hoy inyectado)
# ---------------------------------------------------------------------------

def test_en_mora_vencida():
    op = make_op(estado="por cobrar", fecha_pago=date(2026, 1, 1))
    assert calc.en_mora(op, hoy=date(2026, 2, 1)) is True


def test_en_mora_no_vencida():
    op = make_op(estado="por cobrar", fecha_pago=date(2026, 3, 1))
    assert calc.en_mora(op, hoy=date(2026, 2, 1)) is False


def test_en_mora_vence_hoy_no_es_mora():
    op = make_op(estado="por cobrar", fecha_pago=date(2026, 2, 1))
    assert calc.en_mora(op, hoy=date(2026, 2, 1)) is False


def test_en_mora_cobrada_nunca_es_mora():
    op = make_op(estado="cobrado", fecha_pago=date(2026, 1, 1))
    assert calc.en_mora(op, hoy=date(2026, 2, 1)) is False


# ---------------------------------------------------------------------------
# HHI
# ---------------------------------------------------------------------------

def test_hhi_dos_clientes():
    ops = [
        make_op(inversion=750.0, ruc="20100000001"),
        make_op(inversion=250.0, ruc="20100000002"),
    ]
    # shares 0.75 y 0.25 -> 0.5625 + 0.0625 = 0.625
    resultado = calc.hhi(ops)
    assert resultado["hhi"] == pytest.approx(0.625)
    assert resultado["hhi_10000"] == pytest.approx(6250.0)


def test_hhi_monopolio():
    ops = [make_op(inversion=1000.0)]
    assert calc.hhi(ops)["hhi"] == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# Consolidación con tipo de cambio
# ---------------------------------------------------------------------------

def test_consolidado_pen_con_tipo_cambio():
    ops = [
        make_op(inversion=1000.0, moneda="PEN", retorno_mensual=1.0),
        make_op(inversion=100.0, moneda="USD", retorno_mensual=2.0,
                ruc="20100000002"),
    ]
    resultado = calc.kpis(ops, tipo_cambio=3.5, hoy=date(2026, 1, 1))
    # consolidado: 1000 + 100*3.5 = 1350
    consolidado = resultado["consolidado_pen"]
    assert consolidado["capital_total"] == pytest.approx(1350.0)
    # retorno ponderado en PEN: (1000*1.0 + 350*2.0) / 1350 = 1700/1350
    assert consolidado["retorno_mensual_ponderado"] == pytest.approx(1700 / 1350, abs=0.0001)
    # sin consolidar, cada moneda va separada
    assert resultado["por_moneda"]["PEN"]["capital_total"] == pytest.approx(1000.0)
    assert resultado["por_moneda"]["USD"]["capital_total"] == pytest.approx(100.0)


def test_sin_tipo_cambio_no_hay_consolidado():
    ops = [make_op()]
    resultado = calc.kpis(ops, tipo_cambio=None, hoy=date(2026, 1, 1))
    assert "consolidado_pen" not in resultado
    assert set(resultado["por_moneda"]) == {"PEN"}


def test_diversificacion_sin_tipo_cambio_no_mezcla_monedas():
    ops = [
        make_op(cliente="Empresa PEN", inversion=1000.0, moneda="PEN"),
        make_op(cliente="Empresa USD", inversion=100.0, moneda="USD", ruc="20100000002"),
    ]
    resultado = calc.analisis_diversificacion(ops, tipo_cambio=None)

    assert resultado["exposicion_moneda"] is None
    assert resultado["alerta_concentracion_moneda"] is None
    assert {cliente["cliente"] for cliente in resultado["clientes"]} == {
        "Empresa PEN", "Empresa USD"
    }
    porcentajes = {cliente["cliente"]: cliente["pct_capital"] for cliente in resultado["clientes"]}
    assert porcentajes["Empresa PEN"] == {"PEN": 100.0, "USD": 0.0}
    assert porcentajes["Empresa USD"] == {"PEN": 0.0, "USD": 100.0}


# ---------------------------------------------------------------------------
# Flujo de caja por mes
# ---------------------------------------------------------------------------

def test_flujo_caja_agrupacion_mensual():
    ops = [
        make_op(inversion=1000.0, moneda="PEN", estado="cobrado",
                retorno_mensual=1.0,
                fecha_cierre=date(2026, 3, 1), fecha_pago=date(2026, 5, 15)),
        make_op(inversion=500.0, moneda="PEN", estado="por cobrar",
                retorno_mensual=1.0, ruc="20100000002",
                fecha_cierre=date(2026, 3, 1), fecha_pago=date(2026, 5, 20)),
        make_op(inversion=200.0, moneda="USD", estado="cobrado",
                retorno_mensual=0.5, ruc="20100000003",
                fecha_cierre=date(2026, 3, 1), fecha_pago=date(2026, 6, 8)),
    ]
    flujo = calc.flujo_caja(ops)
    assert [f["mes"] for f in flujo] == ["2026-05", "2026-06"]

    mayo = flujo[0]["por_moneda"]["PEN"]
    # cobrado: 1000, ret = 1000*0.01*(75/30) = 25.0
    assert mayo["capital_cobrado"] == pytest.approx(1000.0)
    assert mayo["retorno_cobrado"] == pytest.approx(25.0)
    # por cobrar: 500, ret = 500*0.01*(80/30) = 13.3333, reportado a 2 decimales
    assert mayo["capital_por_cobrar"] == pytest.approx(500.0)
    assert mayo["retorno_por_cobrar"] == pytest.approx(13.33, abs=0.001)
    assert "USD" not in flujo[0]["por_moneda"]

    junio = flujo[1]["por_moneda"]["USD"]
    # ret = 200*0.005*(99/30) = 3.3
    assert junio["capital_cobrado"] == pytest.approx(200.0)
    assert junio["retorno_cobrado"] == pytest.approx(3.3)


# ---------------------------------------------------------------------------
# Proyección compuesta
# ---------------------------------------------------------------------------

def test_proyeccion_compuesta():
    ops = [make_op(inversion=1000.0, retorno_mensual=1.0)]
    resultado = calc.proyeccion(ops)
    esc = resultado["por_moneda"]["PEN"]["escenarios"]

    base = {e["anios"]: e["valor"] for e in esc["base"]}
    # base: 1000 * 1.01^12 = 1126.83
    assert base[1] == pytest.approx(1126.83, abs=0.01)
    # 1000 * 1.01^36 = 1430.77
    assert base[3] == pytest.approx(1430.77, abs=0.01)

    pesimista = {e["anios"]: e["valor"] for e in esc["pesimista"]}
    # pesimista r = 0.7 -> 1000 * 1.007^12 = 1087.31
    assert pesimista[1] == pytest.approx(1087.31, abs=0.01)

    optimista = {e["anios"]: e["valor"] for e in esc["optimista"]}
    # optimista r = 1.15 -> 1000 * 1.0115^12 = 1147.07
    assert optimista[1] == pytest.approx(1147.07, abs=0.01)

    assert "pesimista = 70%" in resultado["parametros"]["descripcion"]


# ---------------------------------------------------------------------------
# KPIs y tasa de cumplimiento
# ---------------------------------------------------------------------------

def test_kpis_mora_y_retornos():
    hoy = date(2026, 2, 1)
    ops = [
        make_op(inversion=1000.0, estado="cobrado",
                fecha_cierre=date(2026, 1, 1), fecha_pago=date(2026, 1, 31)),
        make_op(inversion=500.0, estado="por cobrar", ruc="20100000002",
                fecha_cierre=date(2026, 1, 1), fecha_pago=date(2026, 1, 15)),  # en mora
        make_op(inversion=500.0, estado="por cobrar", ruc="20100000003",
                fecha_cierre=date(2026, 1, 1), fecha_pago=date(2026, 3, 15)),  # vigente
    ]
    k = calc.kpis(ops, hoy=hoy)["por_moneda"]["PEN"]
    assert k["capital_total"] == pytest.approx(2000.0)
    assert k["capital_cobrado"] == pytest.approx(1000.0)
    assert k["capital_por_cobrar"] == pytest.approx(1000.0)
    assert k["capital_en_mora"] == pytest.approx(500.0)
    assert k["num_en_mora"] == 1
    # retorno obtenido: 1000*0.01*(30/30) = 10.0
    assert k["retorno_obtenido"] == pytest.approx(10.0)


def test_tasa_cumplimiento():
    hoy = date(2026, 2, 1)
    ops = [
        make_op(riesgo="A", estado="cobrado", fecha_pago=date(2026, 1, 15)),
        make_op(riesgo="A", estado="por cobrar", ruc="20100000002",
                fecha_pago=date(2026, 1, 10)),  # en mora
        make_op(riesgo="A", estado="por cobrar", ruc="20100000003",
                fecha_pago=date(2026, 5, 1)),  # vigente: no cuenta
    ]
    resultado = calc.analisis_riesgo(ops, hoy=hoy)
    assert len(resultado) == 1
    # 1 cobrada / (1 cobrada + 1 en mora) = 50%
    assert resultado[0]["tasa_cumplimiento"] == pytest.approx(50.0)


def test_tasa_cumplimiento_sin_denominador():
    hoy = date(2026, 2, 1)
    ops = [make_op(estado="por cobrar", fecha_pago=date(2026, 5, 1))]
    resultado = calc.analisis_riesgo(ops, hoy=hoy)
    assert resultado[0]["tasa_cumplimiento"] is None


def test_plazo_promedio_ponderado():
    ops = [
        make_op(inversion=1000.0,
                fecha_cierre=date(2026, 1, 1), fecha_pago=date(2026, 1, 31)),  # 30 días
        make_op(inversion=3000.0, ruc="20100000002",
                fecha_cierre=date(2026, 1, 1), fecha_pago=date(2026, 3, 1)),  # 59 días
    ]
    # (1000*30 + 3000*59) / 4000 = 207000/4000 = 51.75
    assert calc.plazo_promedio_ponderado(ops) == pytest.approx(51.75)


def test_benchmark_retorno_real_usa_formula_fisher():
    resultado = calc.benchmark([make_op(retorno_mensual=1.0)], plazo_fijo_tea=4.28, inflacion=3.01)
    tea = calc.tea(1.0)
    esperado = ((1 + tea / 100) / (1 + 3.01 / 100) - 1) * 100
    assert resultado["retorno_real_cartera"]["PEN"] == pytest.approx(esperado, abs=0.0001)
    assert "SBS" in resultado["metadatos"]["fuentes"]["plazo_fijo"]["nombre"]


# ---------------------------------------------------------------------------
# TIR (XIRR)
# ---------------------------------------------------------------------------

def test_tir_xirr_operacion_unica():
    # -1000 en t0, +1030 a los 90 días: (1030/1000)^(365/90) - 1 ≈ 12.74%
    ops = [make_op(inversion=1000.0, retorno_mensual=1.0,
                   fecha_cierre=date(2026, 1, 1), fecha_pago=date(2026, 4, 1))]
    assert calc.tir_xirr(ops) == pytest.approx(12.74, abs=0.01)


def test_tir_xirr_mayor_con_retorno_mayor():
    lentas = [make_op(inversion=1000.0, retorno_mensual=1.0,
                      fecha_cierre=date(2026, 1, 1), fecha_pago=date(2026, 4, 1))]
    rapidas = [make_op(inversion=1000.0, retorno_mensual=1.0,
                       fecha_cierre=date(2026, 1, 1), fecha_pago=date(2026, 2, 1))]
    # mismo retorno absoluto pero cobrado antes: la TIR es mayor
    assert calc.tir_xirr(rapidas) > calc.tir_xirr(lentas)


def test_tir_xirr_sin_flujos_negativos():
    assert calc.tir_xirr([make_op(inversion=0.0)]) is None
    assert calc.tir_xirr([]) is None


def test_kpis_incluyen_tir_xirr_por_moneda_y_consolidado():
    ops = [
        make_op(inversion=1000.0),
        make_op(inversion=500.0, moneda="USD", ruc="20100000002"),
    ]
    k = calc.kpis(ops, tipo_cambio=3.5)
    assert k["por_moneda"]["PEN"]["tir_xirr"] == pytest.approx(12.74, abs=0.01)
    assert k["por_moneda"]["USD"]["tir_xirr"] == pytest.approx(12.74, abs=0.01)
    # el consolidado usa las operaciones convertidas a PEN, mismos flujos relativos
    assert k["consolidado_pen"]["tir_xirr"] == pytest.approx(12.74, abs=0.01)
