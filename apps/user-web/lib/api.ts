const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

type FetchOptions = RequestInit & { token?: string };

export async function apiFetch<TResponse>(path: string, options: FetchOptions = {}): Promise<TResponse> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `Request failed: ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as TResponse;
}
