import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { fmtMoney } from '../format.js';

// Líneas de proyección de patrimonio con los 3 escenarios (pesimista / base / optimista).
export default function ProyeccionChart({ bloque, moneda }) {
  const escenarios = (bloque && bloque.escenarios) || {};
  const porAnio = {};
  ['pesimista', 'base', 'optimista'].forEach((esc) => {
    (escenarios[esc] || []).forEach((p) => {
      if (!porAnio[p.anios]) porAnio[p.anios] = { anios: p.anios };
      porAnio[p.anios][esc] = p.valor;
    });
  });
  const datos = Object.values(porAnio).sort((a, b) => a.anios - b.anios);

  if (datos.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos de proyección.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={datos} margin={{ top: 12, right: 12, left: -4, bottom: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e2e8f0" />
        <XAxis
          dataKey="anios"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v) => `${v} ${v === 1 ? 'año' : 'años'}`}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip
          formatter={(v) => fmtMoney(moneda, v)}
          labelFormatter={(v) => `Horizonte: ${v} ${v === 1 ? 'año' : 'años'}`}
          contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 12px 24px rgba(15,23,42,.12)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
        <Line type="monotone" dataKey="pesimista" name="Pesimista" stroke="#f43f5e" strokeWidth={2.5} strokeDasharray="5 4" dot={false} />
        <Line type="monotone" dataKey="base" name="Base" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="optimista" name="Optimista" stroke="#10b981" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
