import { useEffect, useState } from 'react';
import { api, buildQuery } from '../api.js';
import { fmtMoney, fmtNum, fmtPct } from '../format.js';
import FilterBar from '../components/FilterBar.jsx';
import KpiCard from '../components/KpiCard.jsx';
import MonedaSection from '../components/MonedaSection.jsx';
import ChartCard from '../components/ChartCard.jsx';
import RiesgoChart from '../components/RiesgoChart.jsx';
import ClientesPie from '../components/ClientesPie.jsx';
import FlujoChart from '../components/FlujoChart.jsx';
import ProyeccionChart from '../components/ProyeccionChart.jsx';
import BenchmarkChart from '../components/BenchmarkChart.jsx';
import HhiBadge from '../components/HhiBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import Alerta from '../components/Alerta.jsx';

function KpisGrid({ bloque, moneda }) {
  if (!bloque) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        titulo="Capital invertido"
        valor={fmtMoney(moneda, bloque.capital_total)}
        subtitulo={`${bloque.num_operaciones ?? 0} operaciones`}
      />
      <KpiCard titulo="Capital cobrado" valor={fmtMoney(moneda, bloque.capital_cobrado)} variante="exito" />
      <KpiCard titulo="Capital por cobrar" valor={fmtMoney(moneda, bloque.capital_por_cobrar)} variante="info" />
      <KpiCard
        titulo="Capital en mora"
        valor={fmtMoney(moneda, bloque.capital_en_mora)}
        variante={bloque.capital_en_mora > 0 ? 'peligro' : 'default'}
        subtitulo={`${bloque.num_en_mora ?? 0} operaciones en mora`}
      />
      <KpiCard titulo="Retorno mensual pond." valor={fmtPct(bloque.retorno_mensual_ponderado)} />
      <KpiCard titulo="TEA ponderada" valor={fmtPct(bloque.tea_ponderada)} />
      <KpiCard titulo="TIR (XIRR)" valor={fmtPct(bloque.tir_xirr)} />
      <KpiCard titulo="Plazo promedio" valor={`${fmtNum(bloque.plazo_promedio_dias, 0)} días`} />
      <KpiCard titulo="Retorno esperado" valor={fmtMoney(moneda, bloque.retorno_esperado_total)} />
      <KpiCard titulo="Retorno obtenido" valor={fmtMoney(moneda, bloque.retorno_obtenido)} variante="exito" />
      <KpiCard titulo="Retorno por cobrar" valor={fmtMoney(moneda, bloque.retorno_por_cobrar)} variante="info" />
    </div>
  );
}

export default function Dashboard() {
  const [filtros, setFiltros] = useState({});
  const [vista, setVista] = useState('moneda'); // 'moneda' | 'consolidado'
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [riesgo, setRiesgo] = useState([]);
  const [diversificacion, setDiversificacion] = useState(null);
  const [flujo, setFlujo] = useState([]);
  const [proyeccion, setProyeccion] = useState(null);
  const [benchmark, setBenchmark] = useState(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      const q = buildQuery(filtros);
      try {
        const [k, r, d, f, p, b] = await Promise.all([
          api.get(`/kpis${q}`),
          api.get(`/riesgo${q}`),
          api.get(`/diversificacion${q}`),
          api.get(`/flujo-caja${q}`),
          api.get(`/proyeccion${q}`),
          api.get(`/benchmark${q}`),
        ]);
        if (cancelado) return;
        setKpis(k);
        setRiesgo(r);
        setDiversificacion(d);
        setFlujo(f);
        setProyeccion(p);
        setBenchmark(b);
      } catch (e) {
        if (!cancelado) setError(e.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [filtros]);

  const monedas = kpis && kpis.por_moneda ? Object.keys(kpis.por_moneda) : [];
  const consolidado = kpis ? kpis.consolidado_pen : null;
  const vistaEfectiva = vista === 'consolidado' && consolidado ? 'consolidado' : 'moneda';
  const exposicion = diversificacion ? diversificacion.exposicion_moneda : null;

  const botonVista = (valor, texto) => (
    <button
      type="button"
      onClick={() => setVista(valor)}
      className={`px-3 py-1.5 text-sm font-medium ${
        vistaEfectiva === valor ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {texto}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-7 text-white shadow-xl shadow-slate-300/50 sm:px-8">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Vista general</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Tu cartera, en perspectiva</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Rendimiento, riesgo y próximos cobros en una sola vista.</p>
        </div>
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
      </div>
      <FilterBar filtros={filtros} onChange={setFiltros} />

      {error && <Alerta tipo="error">{error}</Alerta>}

      {cargando ? (
        <Spinner />
      ) : !kpis || monedas.length === 0 ? (
        <Alerta tipo="info">
          No hay operaciones para los filtros seleccionados. Carga tu archivo en la sección «Cargar datos».
        </Alerta>
      ) : (
        <>
          {diversificacion && diversificacion.alerta_concentracion_moneda && (
            <Alerta tipo="advertencia">
              <strong>Alerta de concentración:</strong> {diversificacion.alerta_concentracion_moneda}
            </Alerta>
          )}

          <div className="flex flex-wrap items-center gap-4">
            {consolidado && (
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
                {botonVista('moneda', 'Por moneda')}
                {botonVista('consolidado', 'Consolidado (PEN)')}
              </div>
            )}
            {exposicion && (
              <div className="flex gap-2 text-xs text-slate-500">
                {Object.entries(exposicion).map(([m, pct]) => (
                  <span key={m} className="rounded-full bg-white border border-slate-200 px-3 py-1">
                    Exposición {m}: {fmtPct(pct, 1)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {vistaEfectiva === 'consolidado' ? (
            <MonedaSection moneda="PEN" titulo="Consolidado en soles (tipo de cambio configurado)">
              <KpisGrid bloque={consolidado} moneda="PEN" />
            </MonedaSection>
          ) : (
            monedas.map((m) => (
              <MonedaSection key={`kpis-${m}`} moneda={m}>
                <KpisGrid bloque={kpis.por_moneda[m]} moneda={m} />
              </MonedaSection>
            ))
          )}

          {monedas.map((m) => {
            const hhiInfo = diversificacion && diversificacion.hhi ? diversificacion.hhi[m] : null;
            return (
              <MonedaSection key={`charts-${m}`} moneda={m} titulo={`Análisis — ${m}`}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard titulo="¿El mayor riesgo está compensado?">
                    <RiesgoChart data={riesgo} moneda={m} />
                  </ChartCard>
                  <ChartCard titulo="Concentración por cliente (% de capital)">
                    <ClientesPie clientes={diversificacion ? diversificacion.clientes : []} moneda={m} />
                  </ChartCard>
                  <ChartCard titulo="Calendario de cobros por mes" className="lg:col-span-2">
                    <FlujoChart data={flujo} moneda={m} />
                  </ChartCard>
                  <ChartCard titulo="Proyección de patrimonio (1 / 3 / 5 años)">
                    <ProyeccionChart bloque={proyeccion && proyeccion.por_moneda ? proyeccion.por_moneda[m] : null} moneda={m} />
                  </ChartCard>
                  <ChartCard titulo="Benchmark: cartera vs alternativas">
                    <BenchmarkChart benchmark={benchmark} moneda={m} />
                  </ChartCard>
                  <ChartCard titulo="Concentración de la cartera (HHI)" className="lg:col-span-2">
                    <div className="flex h-full flex-col items-start justify-center gap-3">
                      <HhiBadge hhi={hhiInfo ? hhiInfo.hhi : null} />
                      {hhiInfo && hhiInfo.hhi_10000 != null && (
                        <p className="text-sm text-slate-500">
                          Equivalente en escala 0–10000: {fmtNum(hhiInfo.hhi_10000, 0)}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        Semáforo: verde &lt; 0.15, ámbar &lt; 0.25, rojo ≥ 0.25. Un HHI alto indica que pocos
                        clientes concentran gran parte del capital.
                      </p>
                    </div>
                  </ChartCard>
                </div>
              </MonedaSection>
            );
          })}
        </>
      )}
    </div>
  );
}
