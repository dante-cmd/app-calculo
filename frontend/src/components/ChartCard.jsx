export default function ChartCard({ titulo, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      <h3 className="mb-4 text-sm font-bold tracking-tight text-slate-800">{titulo}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}
