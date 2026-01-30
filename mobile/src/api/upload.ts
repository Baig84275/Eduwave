import { AuthSession } from "./types";
import { getApiBaseUrl } from "./baseUrl";

export async function uploadFile<T>(options: {
  path: string;
  session: AuthSession;
  file: { uri: string; name: string; type: string };
  fields?: Record<string, string>;
}): Promise<T> {
  const url = `${getApiBaseUrl()}${options.path.startsWith("/") ? options.path : `/${options.path}`}`;
  const form = new FormData();
  if (options.fields) {
    for (const [k, v] of Object.entries(options.fields)) {
      form.append(k, v);
    }
  }
  form.append("file", options.file as any);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.session.accessToken}`
    },
    body: form
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof json?.error === "string" ? json.error : "Upload failed";
    throw new Error(message);
  }
  return json as T;
}
