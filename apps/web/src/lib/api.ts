export type JsonRecord = Record<string, any>;

const DEFAULT_BASE_URL =
  typeof window !== "undefined" && window.location.port === "5173"
    ? "http://127.0.0.1:8000"
    : "";

const env = (import.meta as any).env || {};

const API_BASE = (
  env.VITE_API_URL ||
  env.VITE_API_BASE_URL ||
  DEFAULT_BASE_URL
).replace(/\/+$/, "");

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error?.safe_message) {
        errorMessage = data.error.safe_message;
      } else if (typeof data?.error === "string") {
        errorMessage = data.error;
      } else if (typeof data?.detail === "string") {
        errorMessage = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
        errorMessage = data.detail.map((d: any) => d.msg).join("; ");
      } else if (data?.message) {
        errorMessage = data.message;
      }
    } catch {
      if (response.statusText) {
        errorMessage = response.statusText;
      }
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON response from server");
  }
}

export async function api<T = JsonRecord>(path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    ...init,
  });
  return handleResponse<T>(response);
}

export async function post<T = JsonRecord>(
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  return handleResponse<T>(response);
}

export async function patch<T = JsonRecord>(
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });
  return handleResponse<T>(response);
}

export async function remove<T = JsonRecord>(path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    ...init,
  });
  return handleResponse<T>(response);
}

export function money(minor: number | null | undefined): string {
  if (minor == null || Number.isNaN(Number(minor))) {
    return "—";
  }
  const rupees = Number(minor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function prettyDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const trimmed = String(iso).trim();
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return iso;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(iso);
  }
}
