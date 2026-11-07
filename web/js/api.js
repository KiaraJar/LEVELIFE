export class ApiError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

async function request(method, path, data) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'X-Levelife': '1', ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor.', 'network');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? 'Ocurrió un error inesperado.', body.code);
  return body;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, d = {}) => request('POST', p, d),
  put: (p, d) => request('PUT', p, d),
  patch: (p, d) => request('PATCH', p, d),
  del: (p, d) => request('DELETE', p, d),
};
