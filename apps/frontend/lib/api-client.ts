import { getAuthState } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getAuthState().token;
}

export type ApiRequestOptions = RequestInit & {
  /** Default true. If true, attach Authorization header with bearer token. */
  auth?: boolean;
};

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Fetch wrapper with consistent auth + error handling.
 * Throws Error(message) on non-2xx responses.
 */
export async function apiFetch(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { auth = true, headers, ...rest } = options;

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  if (auth) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    (finalHeaders as any).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(getApiUrl(path), {
    ...rest,
    headers: finalHeaders,
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return res;
}

/**
 * Same as `apiFetch` but does NOT throw on non-2xx.
 * Useful when caller needs to handle 404/409/etc specifically.
 */
export async function apiFetchRaw(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { auth = true, headers, ...rest } = options;

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  if (auth) {
    const token = getAuthToken();
    if (!token) throw new Error('Not authenticated');
    (finalHeaders as any).Authorization = `Bearer ${token}`;
  }

  return fetch(getApiUrl(path), {
    ...rest,
    headers: finalHeaders,
  });
}

/**
 * Convenience helper for JSON APIs returning `{ data }` or raw JSON.
 */
export async function apiJson<T = any>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const res = await apiFetch(path, options);
  const data = await safeJson(res);
  return (data?.data ?? data) as T;
}

