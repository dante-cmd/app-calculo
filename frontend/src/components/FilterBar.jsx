const INPUT_CLS =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLS = 'flex flex-col gap-1 text-xs font-medium text-slate-500';

export default function FilterBar({ filtros, onChange }) {
  const set = (campo, valor) => onChange({ ...filtros, [campo]: valor });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><span className="h-2 w-2 rounded-full bg-cyan-500" />Filtros de cartera</div>
      <div className="flex flex-wrap items-end gap-3">
        <label className={LABEL_CLS}>
          Desde
          <input
            type="date"
            className={INPUT_CLS}
            value={filtros.fecha_desde || ''}
            onChange={(e) => set('fecha_desde', e.target.value)}
          />
        </label>
        <label className={LABEL_CLS}>
          Hasta
          <input
            type="date"
            className={INPUT_CLS}
            value={filtros.fecha_hasta || ''}
            onChange={(e) => set('fecha_hasta', e.target.value)}
          />
        </label>
        <label className={LABEL_CLS}>
          Moneda
          <select
            className={INPUT_CLS}
            value={filtros.moneda || ''}
            onChange={(e) => set('moneda', e.target.value)}
          >
            <option value="">Todas</option>
            <option value="PEN">PEN (S/)</option>
            <option value="USD">USD ($)</option>
          </select>
        </label>
        <label className={LABEL_CLS}>
          Riesgo
          <select
            className={INPUT_CLS}
            value={filtros.riesgo || ''}
            onChange={(e) => set('riesgo', e.target.value)}
          >
            <option value="">Todos</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        <label className={LABEL_CLS}>
          Estado
          <select
            className={INPUT_CLS}
            value={filtros.estado || ''}
            onChange={(e) => set('estado', e.target.value)}
          >
            <option value="">Todos</option>
            <option value="cobrado">Cobrado</option>
            <option value="por cobrar">Por cobrar</option>
            <option value="en mora">En mora</option>
          </select>
        </label>
        <label className={LABEL_CLS}>
          Cliente
          <input
            type="text"
            placeholder="Nombre o RUC"
            className={INPUT_CLS}
            value={filtros.cliente || ''}
            onChange={(e) => set('cliente', e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({})}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
