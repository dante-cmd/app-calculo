import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const COLORES = ['#2563eb', '#94a3b8', '#d97706', '#16a34a'];

function BenchmarkTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  return (
    <div className="max-w-64 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl shadow-slate-300/50">
      <p className="font-bold text-slate-800">{item.nombre}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{Number(item.valor).toFixed(2)}%</p>
      <p className="mt-2 leading-relaxed text-slate-500">{item.descripcion}</p>
      {item.fuente && <p className="mt-2 border-t border-slate-100 pt-2 font-medium text-blue-700">Fuente: {item.fuente}</p>}
    </div>
  );
}

// Barras: TEA de la cartera vs plazo fijo vs inflación vs retorno real.
export default function BenchmarkChart({ benchmark, moneda }) {
  const b = benchmark || {};
  const fuentes = (b.metadatos && b.metadatos.fuentes) || {};
  const datos = [
    {
      nombre: 'TEA cartera', valor: b.tea_cartera ? b.tea_cartera[moneda] : null,
      descripcion: 'TEA calculada desde el retorno mensual ponderado por capital de tu cartera.',
      fuente: 'Cálculo de la cartera',
    },
    {
      nombre: 'Plazo fijo', valor: b.plazo_fijo_tea,
      descripcion: fuentes.plazo_fijo ? fuentes.plazo_fijo.detalle : 'Tasa referencial configurable.',
      fuente: fuentes.plazo_fijo ? fuentes.plazo_fijo.nombre : 'Configuración',
    },
    {
      nombre: 'Inflación', valor: b.inflacion,
      descripcion: fuentes.inflacion ? fuentes.inflacion.detalle : 'Inflación anual configurable.',
      fuente: fuentes.inflacion ? fuentes.inflacion.nombre : 'Configuración',
    },
    {
      nombre: 'Retorno real', valor: b.retorno_real_cartera ? b.retorno_real_cartera[moneda] : null,
      descripcion: 'TEA descontando inflación con la fórmula de Fisher; expresa el poder adquisitivo estimado.',
      fuente: 'TEA de cartera + inflación',
    },
  ].filter((d) => d.valor !== null && d.valor !== undefined);

  if (datos.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos de benchmark.</p>;
  }

  return (
    <div className="relative h-full">
      <div className="group absolute right-0 top-0 z-10">
        <button type="button" aria-label="Ver fuentes y metodología" className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-700">i</button>
        <div className="pointer-events-none absolute right-0 top-9 hidden w-80 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600 shadow-xl shadow-slate-300/50 group-hover:block group-focus-within:block">
          <p className="font-bold text-slate-800">Fuentes y metodología</p>
          <p className="mt-2">Retorno real = {b.metadatos ? b.metadatos.formula_retorno_real : 'TEA − inflación'}.</p>
          <p className="mt-2">{b.metadatos ? `Referencia: ${b.metadatos.fecha_referencia}.` : 'Actualiza los valores en Configuración.'}</p>
          {fuentes.plazo_fijo && <a className="pointer-events-auto mt-3 block font-semibold text-blue-700 hover:underline" href={fuentes.plazo_fijo.url} target="_blank" rel="noreferrer">↗ {fuentes.plazo_fijo.nombre}</a>}
          {fuentes.inflacion && <a className="pointer-events-auto mt-2 block font-semibold text-blue-700 hover:underline" href={fuentes.inflacion.url} target="_blank" rel="noreferrer">↗ {fuentes.inflacion.nombre}</a>}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 12, right: 12, left: -12, bottom: 4 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e2e8f0" />
          <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
          <Tooltip content={<BenchmarkTooltip />} />
          <Bar dataKey="valor" name="TEA (%)" radius={[8, 8, 2, 2]} maxBarSize={52}>
            {datos.map((d, i) => (
              <Cell key={d.nombre} fill={COLORES[i % COLORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
