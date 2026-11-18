import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Spinner from '../components/Spinner.jsx';
import Alerta from '../components/Alerta.jsx';

const INPUT_CLS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function Config() {
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo, texto }
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    api
      .get('/config')
      .then((data) => {
        if (cancelado) return;
        setForm({
          tipo_cambio: data.tipo_cambio != null ? String(data.tipo_cambio) : '',
          plazo_fijo_tea: data.plazo_fijo_tea != null ? String(data.plazo_fijo_tea) : '',
          inflacion: data.inflacion != null ? String(data.inflacion) : '',
        });
      })
      .catch((e) => {
        if (!cancelado) setError(e.message);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    setError(null);
    try {
      const body = {
        tipo_cambio: form.tipo_cambio === '' ? null : parseFloat(form.tipo_cambio),
        plazo_fijo_tea: form.plazo_fijo_tea === '' ? 0 : parseFloat(form.plazo_fijo_tea),
        inflacion: form.inflacion === '' ? 0 : parseFloat(form.inflacion),
      };
      if (body.tipo_cambio !== null && Number.isNaN(body.tipo_cambio)) {
        throw new Error('El tipo de cambio debe ser un número (o dejarse vacío).');
      }
      if (Number.isNaN(body.plazo_fijo_tea) || Number.isNaN(body.inflacion)) {
        throw new Error('La TEA de plazo fijo y la inflación deben ser números.');
      }
      await api.put('/config', body);
      setMensaje({ tipo: 'exito', texto: 'Configuración guardada correctamente.' });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (error && !form) {
    return <Alerta tipo="error">{error}</Alerta>;
  }

  if (!form) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Preferencias</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Configuración</h2>
      </div>
      <form onSubmit={guardar} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">Parámetros de la cartera</h3>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">Tipo de cambio (PEN por USD)</span>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Ej. 3.75"
            className={INPUT_CLS}
            value={form.tipo_cambio}
            onChange={(e) => set('tipo_cambio', e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">TEA plazo fijo referencial (%)</span>
          <input
            type="number"
            step="any"
            placeholder="Ej. 4.28"
            className={INPUT_CLS}
            value={form.plazo_fijo_tea}
            onChange={(e) => set('plazo_fijo_tea', e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-500">Inflación anual esperada (%)</span>
          <input
            type="number"
            step="any"
            placeholder="Ej. 3.01"
            className={INPUT_CLS}
            value={form.inflacion}
            onChange={(e) => set('inflacion', e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </form>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}
      {error && <Alerta tipo="error">{error}</Alerta>}

      <Alerta tipo="info">
        Sin tipo de cambio no hay consolidación: los KPIs y gráficos se muestran siempre separados por moneda
        (PEN y USD nunca se suman). Al configurar un tipo de cambio, el Dashboard ofrece la vista
        «Consolidado (PEN)» que convierte los montos en dólares a soles.
      </Alerta>
      <Alerta tipo="info">
        El benchmark inicia con referencias de SBS (depósito a plazo en PEN de 181–360 días) y BCRP
        (expectativa de inflación a 12 meses). Puedes reemplazarlas por la tasa o proyección que prefieras.
      </Alerta>
    </div>
  );
}
