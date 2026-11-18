import { useEffect, useState } from 'react';
import { api, buildQuery } from '../api.js';
import { fmtMoney, fmtPct } from '../format.js';
import FilterBar from '../components/FilterBar.jsx';
import Spinner from '../components/Spinner.jsx';
import Alerta from '../components/Alerta.jsx';

const RIESGO_BADGE = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-amber-100 text-amber-800',
  C: 'bg-red-100 text-red-800',
};

const ESTADO_BADGE = {
  cobrado: 'bg-green-100 text-green-800',
  'por cobrar': 'bg-blue-100 text-blue-800',
  'en mora': 'bg-red-100 text-red-800',
};

const COLUMNAS = [
  { key: 'fecha_inversion', label: 'Fecha' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'ruc', label: 'RUC' },
  { key: 'codigo_subasta', label: 'Subasta' },
  { key: 'riesgo', label: 'Riesgo' },
  { key: 'inversion', label: 'Inversión', derecha: true },
  { key: 'moneda', label: 'Moneda' },
  { key: 'retorno_mensual', label: 'Ret. mensual', derecha: true },
  { key: 'tea', label: 'TEA', derecha: true },
  { key: 'plazo_dias', label: 'Plazo (d)', derecha: true },
  { key: 'fecha_cierre', label: 'Cierre' },
  { key: 'fecha_pago', label: 'Pago' },
  { key: 'retorno_esperado', label: 'Ret. esperado', derecha: true },
  { key: 'estado', label: 'Estado' },
];

function Badge({ valor, mapa }) {
  const cls = mapa[valor] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {valor ?? '—'}
    </span>
  );
}

function Celda({ op, col }) {
  switch (col.key) {
    case 'riesgo':
      return <Badge valor={op.riesgo} mapa={RIESGO_BADGE} />;
    case 'estado':
      return <Badge valor={op.en_mora ? 'en mora' : op.estado} mapa={ESTADO_BADGE} />;
    case 'inversion':
      return fmtMoney(op.moneda, op.inversion);
    case 'retorno_esperado':
      return fmtMoney(op.moneda, op.retorno_esperado);
    case 'retorno_mensual':
      return fmtPct(op.retorno_mensual);
    case 'tea':
      return fmtPct(op.tea);
    default:
      return op[col.key] ?? '—';
  }
}

export default function Operaciones() {
  const [filtros, setFiltros] = useState({});
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState({ por: 'fecha_inversion', dir: 'desc' });
  const [operaciones, setOperaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Debounce de la búsqueda de texto
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(busquedaInput.trim()), 400);
    return () => clearTimeout(t);
  }, [busquedaInput]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setCargando(true);
      setError(null);
      const q = buildQuery({
        ...filtros,
        q: busqueda,
        orden_por: orden.por,
        orden_dir: orden.dir,
      });
      try {
        const data = await api.get(`/operaciones${q}`);
        if (!cancelado) setOperaciones(Array.isArray(data) ? data : []);
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
  }, [filtros, busqueda, orden]);

  const cambiarOrden = (key) => {
    setOrden((prev) =>
      prev.por === key ? { por: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { por: key, dir: 'asc' }
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Detalle de cartera</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Operaciones</h2>
      </div>
      <FilterBar filtros={filtros} onChange={setFiltros} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busquedaInput}
          onChange={(e) => setBusquedaInput(e.target.value)}
          placeholder="Buscar por cliente, RUC o subasta…"
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-slate-500">{operaciones.length} operaciones</span>
      </div>

      {error && <Alerta tipo="error">{error}</Alerta>}

      {cargando ? (
        <Spinner />
      ) : operaciones.length === 0 ? (
        <Alerta tipo="info">No se encontraron operaciones con los filtros seleccionados.</Alerta>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {COLUMNAS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => cambiarOrden(col.key)}
                    className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800 ${
                      col.derecha ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                    {orden.por === col.key && (
                      <span className="ml-1">{orden.dir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operaciones.map((op) => (
                <tr key={op.id} className={op.en_mora ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}>
                  {COLUMNAS.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-3 py-2 ${col.derecha ? 'text-right' : 'text-left'} ${
                        op.en_mora ? 'text-red-900' : 'text-slate-700'
                      }`}
                    >
                      <Celda op={op} col={col} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
