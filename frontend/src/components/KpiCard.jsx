const VARIANTES = {
  default: 'text-slate-900 from-slate-400',
  peligro: 'text-rose-600 from-rose-500',
  exito: 'text-emerald-600 from-emerald-500',
  info: 'text-blue-600 from-blue-500',
};

export default function KpiCard({ titulo, valor, subtitulo, variante = 'default' }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/70">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${VARIANTES[variante] || VARIANTES.default}`} />
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className={`mt-2 text-xl font-bold tracking-tight ${((VARIANTES[variante] || VARIANTES.default).split(' ')[0])}`}>{valor}</p>
      {subtitulo && <p className="mt-1.5 text-xs text-slate-500">{subtitulo}</p>}
    </div>
  );
}
