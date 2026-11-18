export default function Spinner({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      <span className="text-sm">{texto}</span>
    </div>
  );
}
