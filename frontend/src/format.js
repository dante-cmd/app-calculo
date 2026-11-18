export const SIMBOLOS = { PEN: 'S/', USD: '$' };

function esNumeroValido(valor) {
  return valor !== null && valor !== undefined && !Number.isNaN(Number(valor));
}

// Monto con símbolo de moneda y separadores de miles (es-PE).
export function fmtMoney(moneda, valor) {
  if (!esNumeroValido(valor)) return '—';
  const simbolo = SIMBOLOS[moneda] || '';
  const numero = Number(valor).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${simbolo} ${numero}`;
}

export function fmtNum(valor, decimales = 0) {
  if (!esNumeroValido(valor)) return '—';
  return Number(valor).toLocaleString('es-PE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

// Porcentaje asumiendo que el valor ya viene en puntos porcentuales (12.5 => "12.50%").
export function fmtPct(valor, decimales = 2) {
  if (!esNumeroValido(valor)) return '—';
  const numero = Number(valor).toLocaleString('es-PE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
  return `${numero}%`;
}

// Normaliza ratios que pueden venir como fracción (0.95) o como porcentaje (95).
export function normPct(valor) {
  if (!esNumeroValido(valor)) return null;
  const n = Number(valor);
  return n <= 1 ? n * 100 : n;
}
