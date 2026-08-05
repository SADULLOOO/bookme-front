import { useAuthStore } from "@/lib/stores/auth-store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Attach the current access token and retry through /auth/refresh on 401. Default true. */
  auth?: boolean;
}

async function rawFetch(path: string, options: ApiFetchOptions) {
  const { body, headers, auth = true, ...rest } = options;
  const token = auth ? useAuthStore.getState().accessToken : null;

  return fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const { refreshToken, setTokens, clearSession } = useAuthStore.getState();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await rawFetch("/auth/refresh", {
          method: "POST",
          body: { refresh_token: refreshToken },
          auth: false,
        });
        if (!res.ok) throw new Error("refresh failed");
        const data = (await res.json()) as { access_token: string; refresh_token: string };
        setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/** Fetch wrapper for the FastAPI backend: JSON in/out, Bearer auth, single retry-through-refresh on 401. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && options.auth !== false) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, options);
    }
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    const message = detail && typeof detail === "object" && "detail" in detail ? (detail as { detail: unknown }).detail : detail;
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

/** Uploads a CV PDF ahead of submitting an application — unauthenticated
 * (the registration wizard calls this before an account exists), multipart,
 * so it bypasses apiFetch's JSON-only body handling. Returns the stored
 * file's public URL to attach to the application payload. */
export async function uploadCvFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/uploads/cv`, { method: "POST", body: form });
  if (!res.ok) {
    let detail: unknown;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    const message = detail && typeof detail === "object" && "detail" in detail ? (detail as { detail: unknown }).detail : detail;
    throw new ApiError(res.status, message);
  }
  return res.json();
}
