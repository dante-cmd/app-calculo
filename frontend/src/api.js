const BASE = '/api';

// Construye la query string a partir del objeto de filtros, omitiendo valores vacíos.
export function buildQuery(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      params.append(clave, valor);
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    let mensaje = `Error ${res.status} al llamar a ${path}`;
    try {
      const data = await res.json();
      if (data && data.detail) {
        mensaje = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch (e) {
      // respuesta sin cuerpo JSON; se mantiene el mensaje genérico
    }
    throw new Error(mensaje);
  }
  return res.json();
}

export const api = {
  get(path) {
    return request(path);
  },
  put(path, body) {
    return request(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  upload(file) {
    const formData = new FormData();
    // El nombre debe coincidir con el parámetro UploadFile del endpoint.
    formData.append('archivo', file);
    return request('/upload', { method: 'POST', body: formData });
  },
};
