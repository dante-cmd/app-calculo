import { SIMBOLOS } from '../format.js';

const NOMBRES = { PEN: 'Soles', USD: 'Dólares' };

export default function MonedaSection({ moneda, titulo, children }) {
  const simbolo = SIMBOLOS[moneda] || moneda;
  const nombre = titulo || NOMBRES[moneda] || moneda;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-200/80 pb-3">
        <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white shadow-sm">
          {simbolo} {moneda}
        </span>
        <h2 className="text-lg font-bold tracking-tight text-slate-800">{nombre}</h2>
      </div>
      {children}
    </section>
  );
}
