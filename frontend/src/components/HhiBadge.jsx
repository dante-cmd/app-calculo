// Semáforo de concentración: HHI < 0.15 verde, < 0.25 ámbar, >= 0.25 rojo.
export default function HhiBadge({ hhi }) {
  if (hhi === null || hhi === undefined) {
    return <span className="text-sm text-slate-400">Sin datos</span>;
  }

  let estilo = 'bg-green-100 text-green-800 border-green-300';
  let etiqueta = 'Concentración baja';
  if (hhi >= 0.25) {
    estilo = 'bg-red-100 text-red-800 border-red-300';
    etiqueta = 'Concentración alta';
  } else if (hhi >= 0.15) {
    estilo = 'bg-amber-100 text-amber-800 border-amber-300';
    etiqueta = 'Concentración moderada';
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${estilo}`}>
      HHI {Number(hhi).toFixed(4)} · {etiqueta}
    </span>
  );
}
