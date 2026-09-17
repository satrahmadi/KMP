export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: Record<string, unknown>
  ) {
    super(message);
  }
}

const BASE_PATH = "/kmp";

function withBasePath(url: string) {
  if (!url.startsWith("/") || url === BASE_PATH || url.startsWith(`${BASE_PATH}/`)) {
    return url;
  }

  return `${BASE_PATH}${url}`;
}

export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBasePath(url), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? "Terjadi kesalahan.", res.status, data);
  }
  return data as T;
}

export function apiPost<T = unknown>(url: string, body?: unknown) {
  return apiFetch<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function apiPatch<T = unknown>(url: string, body?: unknown) {
  return apiFetch<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
}

export function apiDelete<T = unknown>(url: string, body?: unknown) {
  return apiFetch<T>(url, { method: "DELETE", body: body ? JSON.stringify(body) : undefined });
}
