import { useEffect, useState } from 'react';
import { api, buildQuery } from '../api.js';
import { fmtMoney } from '../format.js';
import FilterBar from '../components/FilterBar.jsx';
import MonedaSection from '../components/MonedaSection.jsx';
import ChartCard from '../components/ChartCard.jsx';
import FlujoChart from '../components/FlujoChart.jsx';
import Spinner from '../components/Spinner.jsx';
import Alerta from '../components/Alerta.jsx';

export default function FlujoCaja() {
  const [filtros, setFiltros] = useState({});
  const [flujo, setFlujo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const data = await api.get(`/flujo-caja${buildQuery(filtros)}`);
        if (!cancelado) setFlujo(Array.isArray(data) ? data : []);
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

  const monedas = [...new Set(flujo.flatMap((m) => Object.keys(m.por_moneda || {})))];

  return (
    <div className="space-y-6">
      <FilterBar filtros={filtros} onChange={setFiltros} />

      {error && <Alerta tipo="error">{error}</Alerta>}

      {cargando ? (
        <Spinner />
      ) : monedas.length === 0 ? (
        <Alerta tipo="info">No hay flujo de caja para los filtros seleccionados.</Alerta>
      ) : (
        monedas.map((m) => {
          const filas = flujo.filter((f) => f.por_moneda && f.por_moneda[m]);
          return (
            <MonedaSection key={m} moneda={m}>
              <ChartCard titulo="Calendario de cobros por mes">
                <FlujoChart data={flujo} moneda={m} />
              </ChartCard>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mes</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Capital cobrado</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Retorno cobrado</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Capital por cobrar</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Retorno por cobrar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filas.map((f) => (
                      <tr key={f.mes} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{f.mes}</td>
                        <td className="px-3 py-2 text-right text-green-700">{fmtMoney(m, f.por_moneda[m].capital_cobrado)}</td>
                        <td className="px-3 py-2 text-right text-green-700">{fmtMoney(m, f.por_moneda[m].retorno_cobrado)}</td>
                        <td className="px-3 py-2 text-right text-amber-700">{fmtMoney(m, f.por_moneda[m].capital_por_cobrar)}</td>
                        <td className="px-3 py-2 text-right text-amber-700">{fmtMoney(m, f.por_moneda[m].retorno_por_cobrar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MonedaSection>
          );
        })
      )}
    </div>
  );
}
