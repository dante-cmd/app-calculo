import { useRef, useState } from 'react';
import { api } from '../api.js';
import Alerta from '../components/Alerta.jsx';

export default function Upload() {
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const seleccionar = (file) => {
    if (!file) return;
    setArchivo(file);
    setResultado(null);
    setError(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    seleccionar(file);
  };

  const subir = async () => {
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    setResultado(null);
    try {
      const data = await api.upload(archivo);
      setResultado(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Importación</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Actualiza tu cartera</h2>
        <p className="mt-1 text-sm text-slate-500">Carga el reporte de Prestamype en formato Excel o CSV.</p>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-12 text-center transition-all ${
          arrastrando ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl text-blue-700">↑</span>
        <p className="text-base font-bold text-slate-800">
          Arrastra tu archivo aquí o haz clic para seleccionarlo
        </p>
        <p className="text-xs text-slate-400">Excel (.xlsx / .xls) exportado de Prestamype</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => seleccionar(e.target.files && e.target.files[0])}
        />
      </div>

      <Alerta tipo="info">
        Formato esperado: una fila por operación de factoring con cliente, RUC, código de subasta, fecha de
        inversión, monto invertido, moneda, retorno mensual, fechas de cierre/pago y estado. Las operaciones ya
        existentes se actualizan; las filas con datos inválidos se rechazan y se reportan aquí.
      </Alerta>

      {archivo && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm text-slate-700">{archivo.name}</span>
          <button
            type="button"
            onClick={subir}
            disabled={subiendo}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {subiendo ? 'Subiendo…' : 'Subir archivo'}
          </button>
        </div>
      )}

      {error && <Alerta tipo="error">{error}</Alerta>}

      {resultado && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Resultado de la carga</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{resultado.insertadas ?? 0}</p>
              <p className="text-xs text-green-700">Insertadas</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{resultado.actualizadas ?? 0}</p>
              <p className="text-xs text-blue-700">Actualizadas</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">
                {Array.isArray(resultado.rechazadas) ? resultado.rechazadas.length : 0}
              </p>
              <p className="text-xs text-red-700">Rechazadas</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-2xl font-bold text-slate-700">{resultado.total_operaciones ?? 0}</p>
              <p className="text-xs text-slate-700">Total en cartera</p>
            </div>
          </div>

          {Array.isArray(resultado.rechazadas) && resultado.rechazadas.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">
                Detalle de filas rechazadas
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-800">
                {resultado.rechazadas.map((r, i) => (
                  <li key={i}>
                    <strong>Fila {r.fila}:</strong> {r.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
