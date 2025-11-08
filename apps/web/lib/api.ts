const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

type FetchOptions = RequestInit & { token?: string };

export async function apiFetch<TResponse>(path: string, options: FetchOptions = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = options.token;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  return (await response.json()) as TResponse;
}
