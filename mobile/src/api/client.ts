import { AuthSession } from "./types";
import { getApiBaseUrl } from "./baseUrl";

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  session?: AuthSession | null
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      "ngrok-skip-browser-warning": "true",
      ...(method === "DELETE" && !body ? {} : { "content-type": "application/json" }),
      ...(session ? { authorization: `Bearer ${session.accessToken}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof json?.error === "string" ? json.error : "Request failed";
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
