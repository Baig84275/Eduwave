import Constants from "expo-constants";
import { Platform } from "react-native";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function getDevHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri === "string" && hostUri.length > 0) return hostUri.split(":")[0];

  const debuggerHost = (Constants as any)?.expoGoConfig?.debuggerHost;
  if (typeof debuggerHost === "string" && debuggerHost.length > 0) return debuggerHost.split(":")[0];

  return null;
}

export function getApiBaseUrl(): string {
  const envValue = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (envValue) return normalizeBaseUrl(envValue);

  const devHost = getDevHost();
  if (devHost) return `http://${devHost}:4010`;

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4010";
  }

  return "http://localhost:4010";
}

