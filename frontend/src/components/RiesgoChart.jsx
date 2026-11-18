import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { normPct } from '../format.js';

// Barras: retorno mensual ponderado y TEA por categoría de riesgo.
// Línea (eje derecho): tasa de cumplimiento.
export default function RiesgoChart({ data, moneda }) {
  const datos = (data || [])
    .filter((r) => r.por_moneda && r.por_moneda[moneda])
    .map((r) => ({
      riesgo: `Riesgo ${r.riesgo}`,
      retorno: r.por_moneda[moneda].retorno_mensual_ponderado ?? null,
      tea: r.por_moneda[moneda].tea ?? null,
      cumplimiento: r.tasa_cumplimiento != null ? normPct(r.tasa_cumplimiento) : null,
    }));

  if (datos.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos para esta moneda.</p>;
  }

  const fmtTooltip = (v) => (v == null ? '—' : `${Number(v).toFixed(2)}%`);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={datos} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
        <defs>
          <linearGradient id="riesgoRetorno" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#38bdf8" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
          <linearGradient id="riesgoTea" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#c4b5fd" /><stop offset="1" stopColor="#7c3aed" /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e2e8f0" />
        <XAxis dataKey="riesgo" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
        <Tooltip formatter={fmtTooltip} contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 12px 24px rgba(15,23,42,.12)' }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
        <Bar yAxisId="left" dataKey="retorno" name="Retorno mensual" fill="url(#riesgoRetorno)" radius={[7, 7, 2, 2]} maxBarSize={34} />
        <Bar yAxisId="left" dataKey="tea" name="TEA anualizada" fill="url(#riesgoTea)" radius={[7, 7, 2, 2]} maxBarSize={34} />
        <Line yAxisId="right" type="monotone" dataKey="cumplimiento" name="Cumplimiento" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 6 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
