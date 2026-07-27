// In production the API is served from the same origin under /api (Vercel
// serverless function). Locally we default to the dev server on :4000.
// VITE_API_URL can still override either default when set.
const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? '/api' : 'http://localhost:4000');

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Module-level token holder so every request can attach the Authorization
// header. The store sets this on login/bootstrap and clears it on logout.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// Optional hook invoked when the server rejects a token (401), so the app can
// force a logout / redirect to the login screen.
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// Called when the backend reports the club's platform subscription is not
// active (past_due / cancelled). Frontend flips into the suspension screen.
let onSubscriptionSuspended: (() => void) | null = null;

export function setOnSubscriptionSuspended(handler: (() => void) | null) {
  onSubscriptionSuspended = handler;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore non-JSON error bodies
    }
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    if (
      res.status === 403 &&
      message === 'subscription_suspended' &&
      onSubscriptionSuspended
    ) {
      onSubscriptionSuspended();
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
