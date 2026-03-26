import { AuthSession } from "./types";
import { getApiBaseUrl } from "./baseUrl";

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  session?: AuthSession | null
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "ngrok-skip-browser-warning": "true",
        ...(method === "DELETE" && !body ? {} : { "content-type": "application/json" }),
        ...(session ? { authorization: `Bearer ${session.accessToken}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("No internet connection. Please check your network and try again.");
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Auth errors — use backend message if available, else fall back to generic
    if (res.status === 401) {
      const msg = typeof json?.error === "string" ? json.error : "Your session has expired. Please log in again.";
      throw new Error(msg);
    }
    if (res.status === 403) {
      const msg = typeof json?.error === "string" ? json.error : "You don't have permission to perform this action.";
      throw new Error(msg);
    }

    // Zod validation error — extract the first specific field message
    if (Array.isArray(json?.details) && json.details.length > 0) {
      const first = json.details[0];
      const field = Array.isArray(first?.path) && first.path.length > 0
        ? String(first.path[first.path.length - 1])
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase())
            .trim()
        : null;
      const msg: string = typeof first?.message === "string" ? first.message : "Invalid input";
      throw new Error(field ? `${field}: ${msg}` : msg);
    }

    // Server errors
    if (res.status >= 500) throw new Error("Something went wrong on the server. Please try again in a moment.");

    // Standard backend error message
    const message = typeof json?.error === "string" ? json.error : `Unexpected error (${res.status})`;
    throw new Error(message);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, session?: AuthSession | null) => request<T>("GET", path, undefined, session),
  post: <T>(path: string, body: unknown, session?: AuthSession | null) => request<T>("POST", path, body, session),
  patch: <T>(path: string, body: unknown, session?: AuthSession | null) => request<T>("PATCH", path, body, session),
  put: <T>(path: string, body: unknown, session?: AuthSession | null) => request<T>("PUT", path, body, session),
  del: <T>(path: string, session?: AuthSession | null) => request<T>("DELETE", path, undefined, session)
};
