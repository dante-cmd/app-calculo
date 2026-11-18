import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { fmtMoney } from '../format.js';

const COLORES = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
const TOP_N = 7;

// Donut con el % de capital de los principales clientes (el resto se agrupa en "Otros").
export default function ClientesPie({ clientes, moneda }) {
  const datos = useMemo(() => {
    const items = (clientes || [])
      .map((c) => ({
        nombre: c.cliente,
        // El API entrega por_moneda como { PEN: 1234.56, USD: 50 }.
        capital: (c.por_moneda && c.por_moneda[moneda]) || 0,
      }))
      .filter((x) => x.capital > 0)
      .sort((a, b) => b.capital - a.capital);
    const top = items.slice(0, TOP_N);
    const resto = items.slice(TOP_N).reduce((s, x) => s + x.capital, 0);
    if (resto > 0) top.push({ nombre: 'Otros', capital: resto });
    return top;
  }, [clientes, moneda]);

  if (datos.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos para esta moneda.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <defs>
          <filter id="pieShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.16" /></filter>
        </defs>
        <Pie
          data={datos}
          dataKey="capital"
          nameKey="nombre"
          innerRadius="56%"
          outerRadius="78%"
          label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
          labelLine={false}
          stroke="#fff"
          strokeWidth={3}
          filter="url(#pieShadow)"
        >
          {datos.map((d, i) => (
            <Cell key={d.nombre} fill={COLORES[i % COLORES.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => fmtMoney(moneda, v)} contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 12px 24px rgba(15,23,42,.12)' }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
