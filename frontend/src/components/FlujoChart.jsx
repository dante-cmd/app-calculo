import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { fmtMoney } from '../format.js';

// Barras apiladas por mes: tonos verdes para lo cobrado, tonos ámbar para lo por cobrar.
export default function FlujoChart({ data, moneda }) {
  const datos = (data || [])
    .filter((m) => m.por_moneda && m.por_moneda[moneda])
    .map((m) => ({
      mes: m.mes,
      capital_cobrado: m.por_moneda[moneda].capital_cobrado,
      retorno_cobrado: m.por_moneda[moneda].retorno_cobrado,
      capital_por_cobrar: m.por_moneda[moneda].capital_por_cobrar,
      retorno_por_cobrar: m.por_moneda[moneda].retorno_por_cobrar,
    }));

  if (datos.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos para esta moneda.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={datos} margin={{ top: 12, right: 12, left: -4, bottom: 4 }} barCategoryGap="25%">
        <defs>
          <linearGradient id="cobradoCapital" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#34d399" /><stop offset="1" stopColor="#059669" /></linearGradient>
          <linearGradient id="pendienteCapital" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#fbbf24" /><stop offset="1" stopColor="#d97706" /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e2e8f0" />
        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip formatter={(v) => fmtMoney(moneda, v)} contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 12px 24px rgba(15,23,42,.12)' }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
        <Bar stackId="flujo" dataKey="capital_cobrado" name="Capital cobrado" fill="url(#cobradoCapital)" />
        <Bar stackId="flujo" dataKey="retorno_cobrado" name="Retorno cobrado" fill="#a7f3d0" />
        <Bar stackId="flujo" dataKey="capital_por_cobrar" name="Capital por cobrar" fill="url(#pendienteCapital)" />
        <Bar stackId="flujo" dataKey="retorno_por_cobrar" name="Retorno por cobrar" fill="#fde68a" radius={[7, 7, 2, 2]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
