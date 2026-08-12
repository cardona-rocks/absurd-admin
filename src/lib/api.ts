/**
 * Cliente de absurd-api para el panel.
 *
 * En desarrollo Vite hace de proxy en /api hacia la API local. En producción se
 * usa VITE_API_URL, que en Railway apunta al dominio público del servicio.
 */

const RAW_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
/** Vacío en dev: las peticiones van por el proxy de Vite. */
export const API_BASE = RAW_BASE || '/api';

/** Convierte una ruta de imagen de la API en URL absoluta. */
export function assetUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return RAW_BASE ? `${RAW_BASE}${path}` : path;
}

const TOKEN_KEY = 'absurd_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    // Un 401 significa sesión caducada: el layout lo detecta y saca al login.
    if (res.status === 401) setToken(null);
    throw new ApiError(message || res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const { body, ...rest } = options;
  const token = getToken();

  return handle<T>(
    await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string>),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  );
}

/** Subida de ficheros: sin Content-Type, lo pone el navegador con el boundary. */
export async function upload<T>(path: string, files: File[]): Promise<T> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const token = getToken();

  return handle<T>(
    await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }),
  );
}

export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body });
export const patch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body });
