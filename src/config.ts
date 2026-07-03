const runtimeApiBaseUrl = window.__ROUNDTABLE_CONFIG__?.apiBaseUrl?.trim();
const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const apiBaseUrl = normalizeBaseUrl(runtimeApiBaseUrl || envApiBaseUrl || "");
export const displayedApiBaseUrl = apiBaseUrl || window.location.origin;

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}
