function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const envValue = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envValue) return normalizeBaseUrl(envValue);

  return "https://eduwave-backend-qx7f.onrender.com";

}
