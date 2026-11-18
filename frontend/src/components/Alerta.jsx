const ESTILOS = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  exito: 'bg-green-50 border-green-200 text-green-800',
  advertencia: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

export default function Alerta({ tipo = 'info', children }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${ESTILOS[tipo] || ESTILOS.info}`}>
      {children}
    </div>
  );
}
